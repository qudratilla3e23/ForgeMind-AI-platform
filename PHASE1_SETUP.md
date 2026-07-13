# ForgeMind AI — Backend Fundament (1-bosqich)

Bu hujjat 1-bosqichda nima qilinganini va uni qanday ishga tushirishni tushuntiradi.

## Nima qo'shildi

- **PostgreSQL + SQLAlchemy 2.0 (async)** — `app/database/db.py`, `app/models/db_models.py`
  Jadvallar: `users`, `refresh_tokens`, `chat_folders`, `chats`, `messages`, `subscriptions`, `payments`
- **Alembic migratsiyalari** — `alembic/`, boshlang'ich migratsiya `alembic/versions/0001_initial.py`
- **Real JWT Auth** (Supabase emas, o'zimizning tizim) — `app/core/security.py`, `app/api/routers/auth.py`
  - Register / Login / Google Login / Refresh / Logout / Logout-all / Me / Forgot-password / Reset-password
  - Access token (30 daqiqa) + Refresh token (30 kun, DB'da xeshlangan holda saqlanadi va bekor qilinishi mumkin)
  - Bcrypt bilan parol xeshlash
- **Docker** — `backend/Dockerfile`, `Dockerfile.frontend`, root `docker-compose.yml` (Postgres + Redis + Backend + Frontend)
- **Redis** — docker-compose orqali tayyor, keyingi bosqichlarda (rate-limit, cache) ishlatiladi

## E'tibor: o'tish davri

Loyihada hozircha **ikkita backend** bor:

| Fayl | Vazifasi |
|---|---|
| `backend/main.py` | Eski hackathon versiyasi — AI chat, provider routing. Hali mustaqil ishlaydi, buzilmadi. |
| `backend/app/main.py` | **Yangi** enterprise versiya — PostgreSQL + real Auth + Docker. |

AI chat logikasi 3-bosqichda (`Chat funksiyalari`) yangi tizimga ko'chiriladi — shunda ikkalasi birlashadi.

Shuningdek, to'lov (Click/Payme) va Admin panel kodi hozircha Supabase'ga bog'liqligicha qoldi — bular mos ravishda 2- va 4-bosqichlarda to'liq PostgreSQL'ga ko'chiriladi. Supabase sozlanmagan bo'lsa ham backend muammosiz ishga tushadi (faqat o'sha eski endpointlar chaqirilganda xato qaytaradi).

## Ishga tushirish

### Variant A — Docker bilan (tavsiya etiladi)

```bash
cp backend/.env.example backend/.env
# backend/.env ichiga JWT_SECRET kiriting: openssl rand -hex 32

docker compose up --build
```

- Backend: http://localhost:8000/docs (Swagger UI)
- Frontend: http://localhost:5173
- PostgreSQL: localhost:5432 (user/pass/db: forgemind)
- Redis: localhost:6379

### Variant B — Lokal (Docker'siz)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# .env ichida DATABASE_URL'ni o'zingizning lokal PostgreSQL'ingizga moslang

# Jadvallarni yaratish (birinchi marta):
alembic upgrade head

uvicorn app.main:app --reload --port 8000
```

## Tekshirish (smoke test)

```bash
# Ro'yxatdan o'tish
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@forgemind.ai","password":"strongpass123","username":"Qudratilla"}'

# Kirish
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@forgemind.ai","password":"strongpass123"}'
```

To'liq API hujjatlari: http://localhost:8000/docs

## Keyingi bosqichlar

1. ~~Backend fundament (PostgreSQL + Alembic + JWT Auth + Docker)~~ ✅ **TUGADI**
2. To'lov tizimi (Payme/Click) — Supabase'dan PostgreSQL'ga ko'chirish, real webhook + subscription faollashtirish
3. Chat funksiyalari — eski `main.py`dagi AI provider routing'ni yangi tizimga ko'chirish, History/Search/Favorite/Streaming
4. Admin Panel — to'liq PostgreSQL asosida foydalanuvchi/to'lov/statistika boshqaruvi
