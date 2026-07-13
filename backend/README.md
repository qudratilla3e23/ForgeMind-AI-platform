# ForgeMind AI — Backend

Bitta `main.py` faylida yozilgan FastAPI backend (hackathon talabi bo'yicha —
qarang: fayl boshidagi izoh, u kelajakda `app/api/`, `app/ai/` va h.k.
enterprise strukturaga qanday bo'linishi kerakligini ko'rsatadi).

Ichida:
- **Auth**: register/login (JWT, PBKDF2 parol xeshlash), Google OAuth
- **AI Router**: 6 ta provider (Fireworks/AMD, Claude, GPT, Gemini, DeepSeek, Llama), promptga qarab avtomatik tanlov
- **Dashboard**: GPU/latency/token statistikasi (hozircha simulyatsiya)
- **Memory**: suhbat xotirasi (RAM, keyinroq vector DB bilan almashtirishga tayyor)

## ⚠️ Xavfsizlik — muhim

- `.env` faylini **hech qachon** git'ga, ochiq repo'ga yoki chatga yubormang.
- Agar biror kalit tasodifan oshkor bo'lsa, darhol tegishli provayder
  saytida (OpenAI/Anthropic/Google/Fireworks) uni bekor qilib, yangisini yarating.
- Productionda `ALLOWED_ORIGINS`ni faqat haqiqiy domeningizga cheklang.
- `JWT_SECRET`ni albatta `.env`ga yozing — bo'lmasa server har safar qayta
  ishga tushganda barcha foydalanuvchilar tizimdan chiqarib yuboriladi.

## O'rnatish

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
```

`.env` faylini oching va kamida bittasini to'ldiring:

| O'zgaruvchi | Nima uchun | Qayerdan olinadi |
|---|---|---|
| `FIREWORKS_API_KEY` | Default AI provider (AMD GPU'da ishlaydi, DeepSeek/Llama ham shu orqali) | fireworks.ai → API Keys |
| `ANTHROPIC_API_KEY` | Claude | console.anthropic.com |
| `OPENAI_API_KEY` | ChatGPT | platform.openai.com |
| `GOOGLE_API_KEY` | Gemini | aistudio.google.com |
| `JWT_SECRET` | Login tokenlarini imzolash | `openssl rand -hex 32` |
| `GOOGLE_CLIENT_ID` | Haqiqiy "Continue with Google" tugmasi | console.cloud.google.com → OAuth Client ID |

So'ng ishga tushiring:

```bash
uvicorn main:app --reload --port 8000
```

`http://localhost:8000/api/health` — qaysi provayderlar sozlanganini ko'rsatadi.

## Asosiy endpointlar

| Endpoint | Vazifasi |
|---|---|
| `POST /api/auth/register` | Ro'yxatdan o'tish → `{token, user}` |
| `POST /api/auth/login` | Kirish → `{token, user}` |
| `POST /api/auth/google` | Google ID tokenini tekshirish → `{token, user}` |
| `GET /api/auth/me` | Joriy foydalanuvchi (`Authorization: Bearer <token>`) |
| `POST /api/chat` | Aniq provider bilan chat (`provider: "claude"` va h.k.) |
| `POST /api/chat/auto` | **AI Router** — promptga qarab avtomatik provider tanlaydi, sababini qaytaradi |
| `GET /api/dashboard/stats` | GPU/latency/token statistikasi |
| `POST /api/memory/append`, `GET /api/memory/{session_id}` | Suhbat xotirasi |

### AI Router misoli

```bash
curl -X POST localhost:8000/api/chat/auto \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"write a python function"}]}'
```

```json
{
  "reply": "...",
  "provider": "claude",
  "reason": "Kod bilan bog'liq so'rov aniqlandi — Claude kodlashda kuchli bo'lgani uchun tanlandi."
}
```

Hech qanday provider tanlanmasa (frontendda "⚡ Auto" rejimi), tizim avval
**Fireworks AI (AMD)** ni sinaydi; agar u sozlanmagan bo'lsa, promptning
mazmuniga qarab eng mos providerni tanlaydi va sababini ko'rsatadi.

## Frontend bilan ulash

Frontend `.env` (loyiha ildizida):

```
VITE_API_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=   # backend'dagi GOOGLE_CLIENT_ID bilan bir xil bo'lsin
```

Backend ishlamasa yoki biror kalit yo'q bo'lsa, frontend avtomatik ravishda
demo (localStorage asosidagi) rejimga o'tadi — sayt hech qachon buzilmaydi.
