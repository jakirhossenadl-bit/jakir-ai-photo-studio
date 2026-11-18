# Jakir AI Photo Studio — Netlify deploy guide (বাংলা)

## Netlify-তে কী চলবে
এই project-এর React/Vite photo editor Netlify-তে static website হিসেবে deploy হবে। Local photo upload, canvas editing, generated filter/background presets, text overlay এবং PNG export browser-এ চলে।

## গুরুত্বপূর্ণ সীমাবদ্ধতা
`server/`-এর Express + SQLite backend Netlify static deploy-এর সঙ্গে deploy হয় না। তাই আলাদা API hosting ও persistent database configure না করা পর্যন্ত Login, account, server-side project save, admin dashboard এবং server upload কাজ করবে না। শুধু Netlify deploy করলেই এগুলো চালু হবে না। SQLite database-কে Netlify function-এর temporary filesystem-এ রাখা নিরাপদ/স্থায়ী নয়।

AI face retouch, face swap, background removal এবং generative AI-ও এখনো কোনো AI provider-এর সঙ্গে যুক্ত নয়। 10,000 filters ও 100,000 backgrounds হলো generated presets/gradient design, curated photo library নয়।

## Netlify deploy
1. ZIP extract করে project-এর সব file একটি GitHub repository-তে upload করুন।
2. Netlify-তে login করে **Add new site → Import an existing project** চাপুন।
3. GitHub connect করে `Jakir AI Photo Studio` repository নির্বাচন করুন।
4. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Deploy চাপুন। `netlify.toml`-এ এই settings আগেই রাখা আছে, তাই সাধারণত auto-detect হবে।
6. Deploy শেষ হলে Netlify একটি `*.netlify.app` link দেবে।

## Backend পরে যুক্ত করতে
Express backend-কে আলাদা Node.js host-এ এবং database-কে persistent managed database-এ নিতে হবে। API host প্রস্তুত হলে Netlify site-এর Environment variables-এ `VITE_API_BASE_URL` নামে API URL দিন এবং নতুন deploy করুন। Production-এ cookie/CORS/CSRF ও persistent storage পরীক্ষা না করে public account খুলবেন না।

## Local development
Node.js 20+ এবং npm লাগবে। `npm install`, `.env.example` থেকে `.env` তৈরি, `JWT_SECRET` সেট, তারপর `npm run dev`।
