# Jakir AI Photo Studio

A full-stack starter project for a browser-based photo editor.

## Included and working in this starter
- Responsive dark photo-editing workspace.
- Local JPG / PNG / WEBP upload (12 MB limit).
- Canvas-based brightness, contrast, saturation, hue, blur, grayscale, sepia and opacity controls.
- 10,000 generated filter presets with search, paging and favorites.
- 100,000 generated gradient/background designs with category browsing and paging.
- Text overlay, zoom controls and PNG export with original, square, story, YouTube and custom output dimensions.
- Express backend with first-admin setup, password hashing, signed HttpOnly cookie sessions, rate limits, Helmet headers, upload validation, user-owned project records and admin activity summary.
- Projects and secure server upload require login.

## Important scope notes
This is a working foundation, not a finished commercial Photoshop/AI replacement:
- The 10,000 filters and 100,000 backgrounds are algorithmically generated presets/gradients, not 110,000 curated photographic assets.
- Face retouch, face swap, generative fill, background removal and AI image generation need an actual model or paid/free-tier AI provider. The UI marks these integrations as requiring a provider; no fake AI action is claimed.
- Brush/eraser painting, advanced crop handles, drag-and-drop layers, true undo/redo snapshots and loading saved project data into the canvas are extension points.
- Email OTP, password reset, production backups, malware scanning and deployment hardening must be configured before public production use.
- Do not promise unlimited free cloud AI: model inference, storage and bandwidth can cost money.

## Requirements
- Node.js 20 or newer
- npm

## Setup
1. Extract the ZIP and open the folder in VS Code.
2. Run `npm install`.
3. Copy `.env.example` to `.env`.
4. Set `JWT_SECRET` to a long random secret (at least 32 characters).
5. Set `ADMIN_EMAIL` and a strong `ADMIN_PASSWORD` (at least 10 characters). Do not use the sample password.
6. Run `npm run dev`.
7. Open `http://localhost:5173`.

The API runs on `http://localhost:4000`. The first admin is created on server startup if the configured email does not already exist.

## Production checklist
- Deploy behind HTTPS.
- Set `NODE_ENV=production`, `CLIENT_ORIGIN` to the exact frontend origin and a unique `JWT_SECRET`.
- Use a persistent encrypted disk/managed database and private object storage.
- Add CSRF protection for cookie-authenticated write routes, email verification/OTP, password reset and account lockout.
- Scan uploaded images, enforce quotas and periodically remove unused uploads.
- Add actual AI model/provider endpoints on the server; keep all provider API keys server-side.
- Configure backups, monitoring, privacy policy, terms and deletion/export workflows.

## API routes
- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/register` (only allowed while no account exists; creates first admin)
- `GET/POST /api/projects`
- `GET/DELETE /api/projects/:id`
- `POST /api/upload`
- `GET /api/admin/summary` (admin only)
