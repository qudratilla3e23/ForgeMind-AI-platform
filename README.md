# ForgeMind AI

React 19 + Tailwind CSS v4 frontend va bitta-fayl FastAPI backend: AI Router
(Fireworks/AMD, Claude, GPT, Gemini, DeepSeek, Llama), JWT autentifikatsiya,
Agent Marketplace, Model kartalari, jonli "AI Console" hero.

## ⚠️ API kalitlar haqida — muhim

API kalitlar hech qachon frontend kodiga yozilmaydi. Ular faqat `backend/.env`
faylida turadi (`.gitignore`da — repo'ga hech qachon tushmaydi). Agar biror
kalitni tasodifan boshqa joyga (chat, kod, screenshot) yozib yuborgan
bo'lsangiz — uni provayder saytida darhol bekor qiling va yangisini yarating.

## Ishga tushirish

### 1. Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# .env ichiga: FIREWORKS_API_KEY (default), ANTHROPIC_API_KEY, OPENAI_API_KEY,
# GOOGLE_API_KEY, JWT_SECRET, GOOGLE_CLIENT_ID — kerak bo'lganlarini yozing
uvicorn main:app --reload --port 8000
```

Batafsil: `backend/README.md`

### 2. Frontend

```bash
cp .env.example .env
# VITE_API_URL va (ixtiyoriy) VITE_GOOGLE_CLIENT_ID
npm install
npm run dev
```

Sayt: `http://localhost:5173`.

## Nima ishlaydi (haqiqiy, backend ulanganda)

- **Ro'yxatdan o'tish / kirish** — JWT bilan, parollar PBKDF2 xeshlanadi
- **"Continue with Google"** — `VITE_GOOGLE_CLIENT_ID` sozlansa, haqiqiy Google Identity Services orqali ishlaydi
- **AI Router** (`⚡ Auto` rejimi) — promptni tahlil qilib eng mos modelni tanlaydi (Fireworks → Claude → GPT → Gemini → DeepSeek → Llama ustuvorligi) va tanlash sababini ko'rsatadi
- **Hero AI Console** — "Netflix clone" kabi so'rov yozsangiz, Planning → Thinking → Architecture → Code → Testing → Preview animatsiyasi va mos mini-preview chiqadi

## Demo/hali ulanmagan qismlar (halol ro'yxat)

- **GitHub / Microsoft / Apple orqali kirish** — UI tayyor, lekin haqiqiy OAuth
  ilova (client ID/secret) ulanmagan, shuning uchun namunaviy hisob bilan
  ishlaydi ("demo rejimi" belgisi ko'rinadi)
- **AI Agent Marketplace** — vizual, interaktiv kartalar; haqiqiy agent
  bajarilishi (kod yozish, deploy qilish) hali yo'q
- **Team Collaboration, Plugin System, Deployment Center, Admin Panel,
  Notification Center** — bular hali boshlanmagan (quyidagi Roadmap'ga qarang)

## Papka strukturasi

```
forgemind-ai/
├── backend/
│   ├── main.py          # AUTH + AI ROUTER + DASHBOARD + MEMORY — bitta faylda
│   │                     # (har bo'lim [PRODUCTION: ...] izohi bilan belgilangan)
│   ├── requirements.txt
│   └── .env.example
├── src/
│   ├── components/
│   │   ├── Hero.jsx              # AI Console + build animatsiyasi
│   │   ├── ModelsSection.jsx     # Claude/GPT/Gemini/DeepSeek/Llama/Fireworks kartalari
│   │   ├── AgentMarketplace.jsx  # 17 ta agent kartasi
│   │   ├── AuthModal.jsx         # Google/GitHub/Microsoft/Apple/Email
│   │   └── console/              # Login qilingandan keyingi ilova (chat, wallet, home)
│   ├── context/                  # Theme va til (uz/en/ru)
│   ├── i18n/translations.js
│   └── lib/
│       ├── api.js         # Backendga so'rovlar (auth, chat, auto-router)
│       ├── googleAuth.js  # Google Identity Services
│       └── mockAuth.js    # Backend offline bo'lganda fallback
└── .env.example
```

## Production Roadmap

**Phase 1 — Hozirgi holat (hackathon MVP)**
AI Router, real auth (email + Google), Hero Console, Agent Marketplace UI,
Model kartalari. Backend — bitta `main.py`.

**Phase 2 — Backend arxitekturasini bo'lish**
`main.py`ni yuqoridagi enterprise strukturaga (`api/`, `ai/`, `services/`,
`middleware/`) hech qanday mantiqiy o'zgarishsiz bo'lish; PostgreSQL'ga
o'tish (hozirgi `users.json` o'rniga).

**Phase 3 — Real integratsiyalar**
GitHub/Microsoft/Apple OAuth ilovalari; Agent Marketplace'dagi agentlarni
haqiqiy bajariladigan qilish (kod yozish + fayl yaratish); Vercel/Netlify/
Docker'ga real deploy.

**Phase 4 — Enterprise**
Team Collaboration (realtime), Plugin System, Notification Center, Admin
Panel, to'liq Analytics Dashboard, 2FA.
