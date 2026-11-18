import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  WandSparkles, ImagePlus, SlidersHorizontal, Crop, Type, Layers, Download,
  Undo2, Redo2, RotateCcw, FlipHorizontal, FlipVertical, Search, Sparkles,
  UserRound, Eraser, Brush, Palette, ShieldCheck, FolderOpen, Save, X,
  ChevronDown, Sun, Contrast, Droplets, Maximize2, LogIn, LogOut, LayoutGrid,
  Settings2, Trash2, ZoomIn, ZoomOut, Heart, Upload, Check, LockKeyhole
} from "lucide-react";
import "./style.css";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const apiUrl = (path) => `${API_BASE}${path}`;

const FILTERS = Array.from({ length: 10000 }, (_, i) => {
  const names = ["Cinematic", "Vintage", "Portrait", "Golden", "Matte", "Noir", "Dream", "Vivid", "Soft", "Arctic"];
  return { id: i + 1, name: `${names[i % names.length]} ${String(i + 1).padStart(4, "0")}`, hue: (i * 37) % 360, sat: 75 + (i % 5) * 8, bright: 92 + (i % 7) * 3, contrast: 92 + (i % 9) * 3 };
});
const BG_CATEGORIES = ["All", "Nature", "Studio", "Office", "Luxury", "Wedding", "City", "Beach", "Gradient", "Abstract"];
const BG_COLORS = [["#0f766e","#a7f3d0"],["#1d4ed8","#bfdbfe"],["#7c2d12","#fed7aa"],["#581c87","#e9d5ff"],["#9f1239","#fecdd3"],["#164e63","#a5f3fc"],["#365314","#d9f99d"],["#312e81","#c7d2fe"]];
const initialAdjust = { brightness: 100, contrast: 100, saturation: 100, blur: 0, grayscale: 0, sepia: 0, hue: 0, opacity: 100 };
function App() {
  const canvasRef = useRef(null), imageRef = useRef(null), fileRef = useRef(null);
  const [image, setImage] = useState(null), [fileName, setFileName] = useState("Untitled design");
  const [activeTab, setActiveTab] = useState("Adjust"), [adjust, setAdjust] = useState(initialAdjust);
  const [filterSearch, setFilterSearch] = useState(""), [filterPage, setFilterPage] = useState(0), [filterCategory, setFilterCategory] = useState("All");
  const [bgCategory, setBgCategory] = useState("All"), [bgPage, setBgPage] = useState(0);
  const [selectedFilter, setSelectedFilter] = useState(null), [background, setBackground] = useState(null);
  const [textItems, setTextItems] = useState([]), [textInput, setTextInput] = useState("Your text");
  const [zoom, setZoom] = useState(100), [history, setHistory] = useState([]), [historyIndex, setHistoryIndex] = useState(-1);
  const [modal, setModal] = useState(""), [email, setEmail] = useState(""), [password, setPassword] = useState("");
  const [user, setUser] = useState(null), [message, setMessage] = useState(""), [projects, setProjects] = useState([]);
  const [adminData, setAdminData] = useState(null), [busy, setBusy] = useState(false), [favorites, setFavorites] = useState([]);
  const [exportSize, setExportSize] = useState("original"), [customW, setCustomW] = useState(1080), [customH, setCustomH] = useState(1080);
  const [brushMode, setBrushMode] = useState("none");

  const backgrounds = useMemo(() => Array.from({length: 100000}, (_, i) => ({
    id: i + 1, category: BG_CATEGORIES[1 + (i % (BG_CATEGORIES.length - 1))],
    colors: BG_COLORS[i % BG_COLORS.length], style: i % 4
  })), []);
  const filteredFilters = useMemo(() => {
    let list = FILTERS;
    if (filterCategory === "Favorites") list = list.filter(f => favorites.includes(f.id));
    if (filterSearch) list = list.filter(f => f.name.toLowerCase().includes(filterSearch.toLowerCase()) || String(f.id).includes(filterSearch));
    return list.slice(filterPage * 48, filterPage * 48 + 48);
  }, [filterSearch, filterPage, filterCategory, favorites]);
  const filteredBackgrounds = useMemo(() => backgrounds.filter(b => bgCategory === "All" || b.category === bgCategory).slice(bgPage * 40, bgPage * 40 + 40), [backgrounds, bgCategory, bgPage]);

  useEffect(() => { fetch(apiUrl("/api/auth/me"), {credentials:"include"}).then(r=>r.ok?r.json():null).then(d=>d && setUser(d.user)).catch(()=>{}); }, []);
  useEffect(() => { drawCanvas(); }, [image, adjust, selectedFilter, background, textItems, zoom]);
  useEffect(() => { if (message) { const t = setTimeout(() => setMessage(""), 3200); return () => clearTimeout(t); } }, [message]);

  function snapshot(next) {
    const h = [...history.slice(0, historyIndex + 1), next].slice(-40);
    setHistory(h); setHistoryIndex(h.length - 1);
  }
  function loadImage(file) {
    if (!file) return;
    if (!["image/jpeg","image/png","image/webp"].includes(file.type)) return setMessage("Please choose a JPG, PNG or WEBP image.");
    if (file.size > 12 * 1024 * 1024) return setMessage("Maximum image size is 12 MB.");
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => { imageRef.current = img; setImage(url); setFileName(file.name.replace(/\.[^.]+$/, "")); setAdjust(initialAdjust); setSelectedFilter(null); setBackground(null); setTextItems([]); snapshot({ image: url }); };
    img.src = url;
  }
  function drawCanvas() {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); const img = imageRef.current;
    const w = img?.naturalWidth || 1200, h = img?.naturalHeight || 800;
    canvas.width = Math.min(w, 1600); canvas.height = Math.min(h, 1200);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if (background) {
      const g = ctx.createLinearGradient(0,0,canvas.width,canvas.height); g.addColorStop(0,background.colors[0]); g.addColorStop(1,background.colors[1]); ctx.fillStyle=g; ctx.fillRect(0,0,canvas.width,canvas.height);
      if (background.style === 1) { ctx.globalAlpha=.22; for(let i=0;i<18;i++){ctx.beginPath();ctx.arc((i*137)%canvas.width,(i*89)%canvas.height,30+(i%4)*18,0,Math.PI*2);ctx.fillStyle="#fff";ctx.fill();} ctx.globalAlpha=1; }
    } else { ctx.fillStyle="#20283a"; ctx.fillRect(0,0,canvas.width,canvas.height); }
    if (img) {
      const scale = Math.min(canvas.width/img.naturalWidth, canvas.height/img.naturalHeight);
      const iw=img.naturalWidth*scale, ih=img.naturalHeight*scale;
      ctx.save();
      const f = selectedFilter;
      const hue = (adjust.hue + (f?.hue || 0)) % 360;
      ctx.filter = `brightness(${adjust.brightness*(f?.bright||100)/100}%) contrast(${adjust.contrast*(f?.contrast||100)/100}%) saturate(${adjust.saturation*(f?.sat||100)/100}%) blur(${adjust.blur}px) grayscale(${adjust.grayscale}%) sepia(${adjust.sepia}%) hue-rotate(${hue}deg)`;
      ctx.globalAlpha=adjust.opacity/100;
      ctx.drawImage(img,(canvas.width-iw)/2,(canvas.height-ih)/2,iw,ih); ctx.restore();
    }
    textItems.forEach(t=>{ctx.save();ctx.font=`bold ${t.size}px Arial`;ctx.fillStyle=t.color;ctx.textAlign="center";ctx.fillText(t.text,canvas.width/2,canvas.height/2+t.y);ctx.restore();});
  }
  function updateAdjust(k,v) { setAdjust(a=>({...a,[k]:Number(v)})); }
  function applyPreset(p) { setSelectedFilter(p); setMessage(`${p.name} applied`); }
  function addText() { setTextItems(a=>[...a,{text:textInput,size:48,color:"#ffffff",y:a.length*58}]); }
  function exportImage() {
    const c=canvasRef.current; if(!c) return;
    const out=document.createElement("canvas"); let w=c.width,h=c.height;
    if(exportSize==="square"){w=1080;h=1080;} else if(exportSize==="story"){w=1080;h=1920;} else if(exportSize==="youtube"){w=1280;h=720;} else if(exportSize==="custom"){w=Number(customW);h=Number(customH);}
    out.width=w;out.height=h;const ctx=out.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,w,h);ctx.drawImage(c,0,0,w,h);
    const a=document.createElement("a");a.download=`${fileName || "jakir-edit"}.png`;a.href=out.toDataURL("image/png");a.click();
    setMessage("Image exported as PNG.");
  }
  async function authAction(kind) {
    setBusy(true);
    try {
      const r=await fetch(apiUrl(`/api/auth/${kind}`),{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({email,password})});
      const d=await r.json(); if(!r.ok) throw new Error(d.error||"Request failed");
      setUser(d.user);setModal("");setPassword("");setMessage(kind==="login"?"Welcome back!":"Admin account created.");
    } catch(e){setMessage(e.message);} finally{setBusy(false);}
  }
  async function logout(){await fetch(apiUrl("/api/auth/logout"),{method:"POST",credentials:"include"});setUser(null);setAdminData(null);setMessage("Logged out.");}
  async function saveProject() {
    if(!user) return setModal("login");
    const data={fileName,adjust,selectedFilter,background,textItems};
    const r=await fetch(apiUrl("/api/projects"),{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({title:fileName,data})});
    const d=await r.json(); if(!r.ok) return setMessage(d.error||"Save failed.");
    setMessage("Project saved to your account.");
  }
  async function loadProjects(){if(!user)return setModal("login");const r=await fetch(apiUrl("/api/projects"),{credentials:"include"});const d=await r.json();setProjects(d.projects||[]);setModal("projects");}
  async function adminSummary(){if(!user)return setModal("login");const r=await fetch(apiUrl("/api/admin/summary"),{credentials:"include"});const d=await r.json();if(!r.ok)return setMessage(d.error);setAdminData(d);setModal("admin");}
  async function uploadToServer(file) {
    if(!user) return setMessage("Log in to upload to secure cloud storage. Local editing still works.");
    const fd=new FormData();fd.append("image",file);
    const r=await fetch(apiUrl("/api/upload"),{method:"POST",body:fd,credentials:"include"});const d=await r.json();setMessage(r.ok?"Secure upload complete.":d.error);
  }
  function setTool(t){setActiveTab(t);setBrushMode(t==="Brush"?"brush":t==="Eraser"?"eraser":"none");}
  const tabs=["Adjust","Filters","Backgrounds","Face AI","Text","Layers","Crop"];
  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><WandSparkles size={20}/></div><div><b>JAKIR <span>AI</span> PHOTO STUDIO</b><small>CREATIVE WORKSPACE</small></div></div>
      <div className="top-actions"><button className="ghost" onClick={loadProjects}><FolderOpen size={16}/> Projects</button><button className="ghost" onClick={saveProject}><Save size={16}/> Save</button>
        {user?.role==="admin"&&<button className="ghost" onClick={adminSummary}><ShieldCheck size={16}/> Admin</button>}
        {user?<button className="ghost" onClick={logout}><LogOut size={16}/> Logout</button>:<button className="login-btn" onClick={()=>setModal("login")}><LogIn size={16}/> Login</button>}
        <button className="export-btn" onClick={exportImage}><Download size={16}/> Export</button>
      </div>
    </header>
    <main className="workspace">
      <aside className="tool-rail">
        {[[ImagePlus,"Upload"],[SlidersHorizontal,"Adjust"],[Sparkles,"Filters"],[LayoutGrid,"Backgrounds"],[UserRound,"Face AI"],[Type,"Text"],[Layers,"Layers"],[Crop,"Crop"],[Brush,"Brush"],[Eraser,"Eraser"]].map(([Icon,name])=><button key={name} className={activeTab===name?"rail-item active":"rail-item"} title={name} onClick={()=>name==="Upload"?fileRef.current.click():setTool(name)}><Icon size={19}/><span>{name}</span></button>)}
        <input ref={fileRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{const f=e.target.files?.[0];if(f){loadImage(f);uploadToServer(f);}}}/>
      </aside>
      <section className="center-stage">
        <div className="canvas-toolbar"><div><span className="live-dot"></span> Editing canvas <small>• {image?`${imageRef.current?.naturalWidth||0} × ${imageRef.current?.naturalHeight||0}`:"No image loaded"}</small></div><div className="canvas-tools"><button onClick={()=>setZoom(Math.max(25,zoom-10))}><ZoomOut size={16}/></button><span>{zoom}%</span><button onClick={()=>setZoom(Math.min(200,zoom+10))}><ZoomIn size={16}/></button><button onClick={()=>setAdjust(initialAdjust)} title="Reset adjustments"><RotateCcw size={16}/></button></div></div>
        <div className="canvas-wrap"><div className="canvas-frame" style={{transform:`scale(${zoom/100})`}}><canvas ref={canvasRef}/>{!image&&<div className="empty-canvas"><div className="upload-orb"><ImagePlus size={34}/></div><h2>Bring your vision to life</h2><p>Upload a photo to start editing with AI-powered tools.</p><button className="export-btn" onClick={()=>fileRef.current.click()}><Upload size={16}/> Upload image</button><small>JPG, PNG or WEBP · Max 12 MB</small></div>}</div></div>
        <div className="bottom-bar"><button onClick={()=>{if(historyIndex>0)setHistoryIndex(historyIndex-1);}}><Undo2 size={16}/> Undo</button><button onClick={()=>setHistoryIndex(Math.min(history.length-1,historyIndex+1))}><Redo2 size={16}/> Redo</button><span className="hint">Tip: Use the right panel to fine-tune your image.</span><button onClick={()=>setZoom(100)}><Maximize2 size={16}/> Fit</button></div>
      </section>
      <aside className="properties-panel">
        <div className="panel-heading"><div><b>{activeTab==="Face AI"?"AI Face Studio":activeTab==="Backgrounds"?"Background Library":activeTab==="Filters"?"Filter Library":activeTab+" tools"}</b><small>Make every detail yours</small></div><Settings2 size={18}/></div>
        {activeTab==="Adjust"&&<div className="panel-content">
          <div className="section-title">LIGHT & COLOR <button onClick={()=>setAdjust(initialAdjust)}>Reset</button></div>
          {[["brightness","Brightness",Sun,0,200],["contrast","Contrast",Contrast,0,200],["saturation","Saturation",Droplets,0,200],["hue","Hue",Palette,-180,180],["blur","Blur",Sparkles,0,20],["grayscale","Grayscale",Palette,0,100],["sepia","Sepia",Palette,0,100],["opacity","Opacity",Layers,0,100]].map(([key,label,Icon,min,max])=><div className="slider-row" key={key}><div><span><Icon size={15}/>{label}</span><b>{adjust[key]}{key==="hue"?"°":"%"}</b></div><input type="range" min={min} max={max} value={adjust[key]} onChange={e=>updateAdjust(key,e.target.value)}/></div>)}
          <div className="section-title">TRANSFORM</div><div className="button-grid"><button onClick={()=>{if(imageRef.current){const c=document.createElement("canvas");c.width=imageRef.current.height;c.height=imageRef.current.width;const x=c.getContext("2d");x.translate(c.width/2,c.height/2);x.rotate(Math.PI/2);x.drawImage(imageRef.current,-imageRef.current.width/2,-imageRef.current.height/2);const im=new Image();im.onload=()=>{imageRef.current=im;setImage(im.src);};im.src=c.toDataURL();}}}><RotateCcw/> Rotate 90°</button><button onClick={()=>setMessage("Flip tool: use transform controls in a future layer update.")}><FlipHorizontal/> Flip</button></div>
        </div>}
        {activeTab==="Filters"&&<div className="panel-content"><div className="search-box"><Search size={16}/><input placeholder="Search 10,000+ filters" value={filterSearch} onChange={e=>{setFilterSearch(e.target.value);setFilterPage(0);}}/></div><div className="chips"><button className={filterCategory==="All"?"chip selected":"chip"} onClick={()=>setFilterCategory("All")}>All</button><button className={filterCategory==="Favorites"?"chip selected":"chip"} onClick={()=>setFilterCategory("Favorites")}>Favorites</button></div><div className="filter-grid">{filteredFilters.map(f=><button key={f.id} className={selectedFilter?.id===f.id?"filter-tile chosen":"filter-tile"} onClick={()=>applyPreset(f)}><div className="filter-preview" style={{background:`linear-gradient(135deg,hsl(${f.hue},65%,35%),hsl(${(f.hue+65)%360},75%,70%))`}}/><span>{f.name}</span><small>#{f.id}</small><i onClick={e=>{e.stopPropagation();setFavorites(a=>a.includes(f.id)?a.filter(x=>x!==f.id):[...a,f.id]);}}><Heart size={13} fill={favorites.includes(f.id)?"currentColor":"none"}/></i></button>)}</div><div className="pagination"><button disabled={filterPage===0} onClick={()=>setFilterPage(p=>p-1)}>Previous</button><span>{filterPage+1} / 209</span><button onClick={()=>setFilterPage(p=>p+1)}>Next</button></div></div>}
        {activeTab==="Backgrounds"&&<div className="panel-content"><div className="section-title">100,000+ BACKGROUNDS</div><div className="chips wrap">{BG_CATEGORIES.map(c=><button key={c} className={bgCategory===c?"chip selected":"chip"} onClick={()=>{setBgCategory(c);setBgPage(0);}}>{c}</button>)}</div><div className="background-grid">{filteredBackgrounds.map(b=><button key={b.id} className="bg-tile" onClick={()=>{setBackground(b);setMessage(`Background ${b.id} selected`);}} style={{background:`linear-gradient(${b.style===2?"45deg":"135deg"},${b.colors[0]},${b.colors[1]})`}}><span>BG {b.id}</span></button>)}</div><div className="pagination"><button disabled={bgPage===0} onClick={()=>setBgPage(p=>p-1)}>Previous</button><span>Page {bgPage+1}</span><button onClick={()=>setBgPage(p=>p+1)}>Next</button></div><p className="muted-note">These are generated gradient/background designs. Connect a licensed image library or image-generation service for photographic backgrounds.</p></div>}
        {activeTab==="Face AI"&&<div className="panel-content"><div className="ai-card"><div className="ai-icon"><UserRound/></div><h3>AI Face Studio</h3><p>Face retouch, makeup, hairstyle and age effects.</p><span className="coming">AI provider connection required</span></div>{["Beauty Retouch","Skin Smooth","Virtual Makeup","Hair Color","Hairstyle Try-on","Beard Preview","Face Swap","Age Effect","Cartoon Portrait"].map(x=><button className="action-row" key={x} onClick={()=>setMessage(`${x}: connect an AI image API/model to enable this operation.`)}><Sparkles size={16}/>{x}<ChevronDown size={14}/></button>)}</div>}
        {activeTab==="Text"&&<div className="panel-content"><div className="section-title">ADD TEXT</div><input className="field" value={textInput} onChange={e=>setTextInput(e.target.value)} placeholder="Enter text"/><button className="wide-primary" onClick={addText}><Type size={16}/> Add to canvas</button><p className="muted-note">Text appears centered on the image. Advanced typography and drag positioning can be added next.</p></div>}
        {activeTab==="Layers"&&<div className="panel-content"><div className="section-title">LAYERS</div><div className="layer-row"><ImagePlus size={16}/> {image?fileName:"No image"} <span>Base</span></div>{textItems.map((t,i)=><div className="layer-row" key={i}><Type size={16}/>{t.text}<button onClick={()=>setTextItems(a=>a.filter((_,j)=>j!==i))}><Trash2 size={14}/></button></div>)}</div>}
        {activeTab==="Crop"&&<div className="panel-content"><div className="section-title">AUTO SIZE & CANVAS</div><label className="field-label">Preset size</label><select className="field" value={exportSize} onChange={e=>setExportSize(e.target.value)}><option value="original">Original dimensions</option><option value="square">Square 1080 × 1080</option><option value="story">Story / Shorts 1080 × 1920</option><option value="youtube">YouTube 1280 × 720</option><option value="custom">Custom dimensions</option></select>{exportSize==="custom"&&<div className="custom-size"><input className="field" type="number" value={customW} onChange={e=>setCustomW(e.target.value)}/><input className="field" type="number" value={customH} onChange={e=>setCustomH(e.target.value)}/></div>}<p className="muted-note">Choose a preset, then Export. The current version scales the image to the selected output size.</p></div>}
        {["Brush","Eraser"].includes(activeTab)&&<div className="panel-content"><div className="ai-card"><Brush/><h3>{activeTab} tool</h3><p>Drawing and pixel erasing need pointer-based canvas layers. This starter includes the tool slot; connect a layer painting engine to enable full brush strokes.</p></div></div>}
      </aside>
    </main>
    <footer className="footer"><span>© 2026 Jakir AI Photo Studio</span><span><ShieldCheck size={14}/> Secure workspace · Local editing available</span><span>AI cloud tools require a configured provider</span></footer>
    {message&&<div className="toast">{message}<button onClick={()=>setMessage("")}><X size={14}/></button></div>}
    {modal&&<div className="modal-backdrop" onClick={()=>setModal("")}><div className="modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setModal("")}><X/></button>
      {modal==="login"&&<><div className="modal-icon"><LockKeyhole/></div><h2>Secure Studio Login</h2><p>Sign in to save projects and use your account.</p><input className="field" type="email" placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)}/><input className="field" type="password" placeholder="Password (10+ characters)" value={password} onChange={e=>setPassword(e.target.value)}/><button className="wide-primary" disabled={busy} onClick={()=>authAction("login")}>{busy?"Please wait":"Login"}</button><small className="muted-note">First run: create the first administrator from the server using POST /api/auth/register, or configure ADMIN_EMAIL and ADMIN_PASSWORD in .env.</small></>}
      {modal==="projects"&&<><h2>Your Projects</h2>{projects.length?projects.map(p=><div className="project-row" key={p.id}>{p.title}<small>{p.updated_at}</small></div>):<p>No saved projects yet.</p>}</>}
      {modal==="admin"&&<><h2>Admin Overview</h2>{adminData&&<><div className="stats"><div><b>{adminData.users}</b><small>Users</small></div><div><b>{adminData.projects}</b><small>Projects</small></div></div><h3>Recent security activity</h3>{adminData.logs.map((l,i)=><div className="project-row" key={i}>{l.action}<small>{l.created_at}</small></div>)}</>}</>}
    </div></div>}
  </div>;
}
createRoot(document.getElementById("root")).render(<App/>);
