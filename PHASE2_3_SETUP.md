# ForgeMind AI — 2- va 3-bosqich: To'lov va AI Chat (TUGADI ✅)

## Nima ishlaydi endi

### 3-bosqich — AI Chat
- `POST /api/chat` va `POST /api/chat/auto` — **avtorizatsiyasiz**, frontend hozirgi holida (`askAI`, `askAIAuto`) hech narsa o'zgartirmasdan ishlaydi
- `/api/chat/auto` — promptni tahlil qilib eng mos providerni tanlaydi (kod → Claude, rasm → GPT Vision, standart → Fireworks va h.k.)
- **Yangi**: `/api/chats/*` — PostgreSQL'da saqlanadigan suhbat tarixi (yaratish, ro'yxat, qidiruv, pin/favorite, o'chirish, xabar yuborish) — JWT bilan himoyalangan. Bu Sidebar'dagi Rename/Search/Favorite/History funksiyalari uchun tayyor backend fundament (frontendni ularga ulash keyingi qadam).
- **MUHIM TOPILMA**: eski `backend/main.py`da fayl oxirida `app = FastAPI()` ikkinchi marta yozilgan bo'lib, bu birinchi `app`dagi BARCHA auth/chat/memory endpointlarini o'chirib qo'ygan edi — ular hech qachon ishlamagan. Yangi `backend/app/main.py`da bu muammo yo'q.

### 2-bosqich — To'lov (Click.uz / Payme.uz)
- `POST /api/payments/checkout/create` — `{plan: "pro"|"enterprise", provider: "click"|"payme"}` bilan chaqiriladi, PostgreSQL'da `Payment` yozuvi yaratiladi va checkout URL qaytaradi
- `POST /api/payments/click/callback` — Click.uz'ning Prepare/Complete oqimi, **MD5 imzo tekshiruvi bilan** (soxta so'rovlar rad etiladi)
- `POST /api/payments/payme/callback` — Payme.uz JSON-RPC (CheckPerformTransaction → CreateTransaction → PerformTransaction), Basic Auth kalit tekshiruvi bilan
- To'lov muvaffaqiyatli yakunlansa: `Subscription` yaratiladi va `User.plan` avtomatik yangilanadi
- Barchasi **haqiqiy PostgreSQL** ustida (Supabase emas) — `app/repositories/billing_repository.py`

## Test qilindi (5 ta avtomatik test to'plami, barchasi o'tdi)

1. Auth flow (register → login → JWT → refresh → logout)
2. To'liq HTTP oqim (xato holatlar bilan)
3. AI Chat (stateless + persistent, ruxsatsiz kirish rad etilishi bilan)
4. Click.uz to'lov oqimi (checkout → prepare → complete → plan yangilanishi → noto'g'ri imzo rad etilishi)
5. Payme.uz RPC oqimi (checkout → 3 bosqichli tranzaksiya → plan yangilanishi → noto'g'ri kalit rad etilishi)

## Haqiqiy Click.uz/Payme.uz bilan sinash uchun

Bular **test rejimida ham ishlaydi** (Click "Test to'lov" va Payme "Test Key" orqali) — haqiqiy pul kerak emas:

1. https://merchant.click.uz — biznes sifatida ro'yxatdan o'ting, SERVICE_ID va MERCHANT_ID oling (test rejimi mavjud)
2. https://business.payme.uz — MERCHANT_ID va **Test Key** oling (test to'lovlar uchun)
3. `backend/.env` fayliga kalitlarni yozing
4. Backend'ni qayta ishga tushiring — `docker compose restart backend` yoki `uvicorn app.main:app --reload`

## Hali qilinmagan (keyingi qadamlar)

- Frontend Sidebar'ni yangi `/api/chats/*` endpointlariga ulash (hozircha localStorage'da ishlaydi — bu ham ishlaydi, faqat ko'p qurilmada sinxron emas)
- Admin Panel frontend'i — backend endpointlari (`/api/admin/*`) tayyor, lekin `AdminPage.jsx` hali ularni chaqirmayapti
- Streaming AI javoblar (hozir to'liq javob kutiladi, so'z-so'z chiqmaydi)
- Voice/File upload backend qismi
- Google Login uchun `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` sozlansa — kod tayyor, faqat kalit kerak
