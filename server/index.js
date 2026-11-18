require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Database = require("better-sqlite3");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error("Set JWT_SECRET to a random value of at least 32 characters in .env");
  process.exit(1);
}

const dataDir = path.join(__dirname, "data");
const uploadDir = path.resolve(__dirname, "..", process.env.UPLOAD_DIR || "uploads");
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadDir, { recursive: true });
const db = new Database(path.join(dataDir, "studio.sqlite"));
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
const adminPassword = process.env.ADMIN_PASSWORD || "";
if (adminEmail && adminPassword && adminPassword !== "ChangeThisPassword123!") {
  const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(adminEmail);
  if (!exists) {
    const hash = bcrypt.hashSync(adminPassword, 12);
    db.prepare("INSERT INTO users(email,password_hash,role) VALUES(?,?,?)").run(adminEmail, hash, "admin");
    console.log("Initial admin account created:", adminEmail);
  }
}

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: "draft-7", legacyHeaders: false }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, message: { error: "Too many login attempts. Try again later." } });
const signToken = (user) => jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "2h" });
function auth(required = true) {
  return (req, res, next) => {
    const token = req.cookies.studio_token || (req.headers.authorization || "").replace(/^Bearer /, "");
    if (!token) return required ? res.status(401).json({ error: "Please log in." }) : next();
    try {
      req.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch {
      return res.status(401).json({ error: "Session expired. Please log in again." });
    }
  };
}
function audit(userId, action) {
  db.prepare("INSERT INTO audit_logs(user_id,action) VALUES(?,?)").run(userId || null, action);
}

app.get("/api/health", (_req, res) => res.json({ ok: true, app: "Jakir AI Photo Studio" }));

app.post("/api/auth/register", authLimiter, async (req, res) => {
  const email = String(req.body.email || "").toLowerCase().trim();
  const password = String(req.body.password || "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Enter a valid email." });
  if (password.length < 10) return res.status(400).json({ error: "Password must be at least 10 characters." });
  if (db.prepare("SELECT id FROM users LIMIT 1").get()) return res.status(403).json({ error: "Registration is currently closed. Ask the administrator." });
  try {
    const hash = await bcrypt.hash(password, 12);
    const result = db.prepare("INSERT INTO users(email,password_hash,role) VALUES(?,?,?)").run(email, hash, "admin");
    const user = { id: result.lastInsertRowid, role: "admin" };
    res.cookie("studio_token", signToken(user), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 2 * 60 * 60 * 1000 });
    audit(user.id, "first_admin_registered");
    res.status(201).json({ user: { email, role: "admin" } });
  } catch {
    res.status(409).json({ error: "That email is already registered." });
  }
});

app.post("/api/auth/login", authLimiter, async (req, res) => {
  const email = String(req.body.email || "").toLowerCase().trim();
  const password = String(req.body.password || "");
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    audit(user?.id, "login_failed");
    return res.status(401).json({ error: "Email or password is incorrect." });
  }
  res.cookie("studio_token", signToken(user), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 2 * 60 * 60 * 1000 });
  audit(user.id, "login_success");
  res.json({ user: { email: user.email, role: user.role } });
});
app.post("/api/auth/logout", (_req, res) => {
  res.clearCookie("studio_token", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  res.json({ ok: true });
});
app.get("/api/auth/me", auth(), (req, res) => {
  const user = db.prepare("SELECT email,role FROM users WHERE id = ?").get(req.user.id);
  res.json({ user });
});

app.get("/api/projects", auth(), (req, res) => {
  const rows = db.prepare("SELECT id,title,updated_at FROM projects WHERE user_id=? ORDER BY updated_at DESC").all(req.user.id);
  res.json({ projects: rows });
});
app.post("/api/projects", auth(), (req, res) => {
  const title = String(req.body.title || "Untitled project").slice(0, 100);
  const data = JSON.stringify(req.body.data || {});
  if (data.length > 1_500_000) return res.status(413).json({ error: "Project is too large." });
  const result = db.prepare("INSERT INTO projects(user_id,title,data) VALUES(?,?,?)").run(req.user.id, title, data);
  audit(req.user.id, "project_saved");
  res.status(201).json({ id: result.lastInsertRowid, title });
});
app.get("/api/projects/:id", auth(), (req, res) => {
  const row = db.prepare("SELECT id,title,data,updated_at FROM projects WHERE id=? AND user_id=?").get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: "Project not found." });
  res.json({ ...row, data: JSON.parse(row.data) });
});
app.delete("/api/projects/:id", auth(), (req, res) => {
  const result = db.prepare("DELETE FROM projects WHERE id=? AND user_id=?").run(req.params.id, req.user.id);
  if (!result.changes) return res.status(404).json({ error: "Project not found." });
  audit(req.user.id, "project_deleted");
  res.json({ ok: true });
});

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${require("crypto").randomBytes(8).toString("hex")}${path.extname(file.originalname).toLowerCase()}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    cb(allowed.includes(file.mimetype) ? null : new Error("Only JPG, PNG and WEBP images are allowed."), allowed.includes(file.mimetype));
  }
});
app.post("/api/upload", auth(), upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Choose an image." });
  audit(req.user.id, "image_uploaded");
  res.json({ filename: req.file.filename, size: req.file.size });
});
app.get("/api/admin/summary", auth(), (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only." });
  const users = db.prepare("SELECT COUNT(*) AS count FROM users").get().count;
  const projects = db.prepare("SELECT COUNT(*) AS count FROM projects").get().count;
  const logs = db.prepare("SELECT action,created_at FROM audit_logs ORDER BY id DESC LIMIT 20").all();
  res.json({ users, projects, logs });
});

app.use((err, _req, res, _next) => {
  const status = err instanceof multer.MulterError ? 400 : 400;
  res.status(status).json({ error: err.message || "Request failed." });
});
app.listen(PORT, () => console.log(`Jakir AI Photo Studio API running at http://localhost:${PORT}`));
