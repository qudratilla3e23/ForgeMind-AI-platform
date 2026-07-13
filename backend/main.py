"""
ForgeMind AI backend — HACKATHON versiyasi (bitta main.py).

Bu fayl hozircha ataylab BITTA faylda saqlanadi (hackathon talabi bo'yicha).
Har bir bo'lim yuqorisida [PRODUCTION: ...] izohi bilan, u kelajakda qaysi
enterprise-arxitektura fayliga ko'chirilishi kerakligi ko'rsatilgan:

    backend/
    ├── main.py            <- FastAPI, middleware, CORS, router ro'yxati
    ├── config/config.py   <- barcha os.getenv() o'zgaruvchilari
    ├── api/
    │   ├── auth.py        <- /api/auth/*
    │   └── dashboard.py   <- /api/dashboard/*
    ├── ai/
    │   ├── router.py      <- classify_prompt(), call_provider()
    │   ├── openai.py      <- call_openai()
    │   ├── claude.py      <- call_claude()
    │   ├── gemini.py      <- call_gemini()
    │   ├── fireworks.py   <- call_fireworks() (AMD, DeepSeek, Llama)
    │   └── memory.py      <- MEMORY_STORE va /api/memory/*
    ├── database/          <- users.json o'rniga PostgreSQL/SQLAlchemy
    ├── middleware/        <- logger, rate-limit
    ├── models/            <- Pydantic modellar (hozir shu faylda)
    ├── services/          <- business logika
    └── utils/             <- hash_password/create_token kabi yordamchilar

Bu bo'linish FAQAT fayllarni ko'chirish va import qo'shishni talab qiladi —
mantiq (funksiyalar ichidagi kod) o'zgarmaydi, chunki har bir funksiya
allaqachon o'z mas'uliyat doirasida yozilgan.

AI PROVIDER USTUVORLIGI (auto-routing, /api/chat/auto):
    1. Fireworks AI (AMD)  — standart, eng tezkor
    2. Claude              — kod va murakkab mulohaza
    3. GPT (OpenAI)        — umumiy maqsad
    4. Gemini              — vizual/multimodal
    5. DeepSeek            — matematik/mantiqiy
    6. Llama               — ochiq zaxira variant
Foydalanuvchi model tanlamasa (/api/chat/auto), tizim shu tartib va
promptning mazmuniga qarab eng mos providerni tanlaydi hamda TANLASH
SABABINI qaytaradi (pastdagi classify_prompt() funksiyasiga qarang).

Ishga tushirish:
    pip install -r requirements.txt
    cp .env.example .env      # va .env ichiga kalitlar/JWT_SECRET yozing
    uvicorn main:app --reload --port 8000
"""

# ---------------------------------------------------------------------------
# [PRODUCTION: config/config.py] — importlar va sozlamalar
# ---------------------------------------------------------------------------

import hashlib
import hmac
import json
import os
import random
import re
import secrets
import time
from pathlib import Path
from typing import Literal, Optional

import httpx
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
FIREWORKS_API_KEY = os.getenv("FIREWORKS_API_KEY", "")  # AMD Developer Cloud orqali ishlaydi
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

JWT_SECRET = os.getenv("JWT_SECRET", "")
if not JWT_SECRET:
    JWT_SECRET = secrets.token_hex(32)
    print(
        "⚠️  JWT_SECRET .env faylida topilmadi — vaqtinchalik kalit yaratildi.\n"
        "   Server qayta ishga tushganda barcha tokenlar bekor bo'ladi.\n"
        "   .env fayliga JWT_SECRET=<istalgan uzun tasodifiy matn> qo'shing."
    )

app = FastAPI(title="ForgeMind AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# [PRODUCTION: database/] — Foydalanuvchilar saqlash: SQLite (haqiqiy DB)
#
# Nega SQLite: bitta fayl, tashqi server kerak emas (hackathon uchun ideal),
# lekin JSON faylidan farqli o'laroq — parallel yozishlarda ma'lumot
# yo'qolmaydi (ACID tranzaksiyalar), email bo'yicha tezkor qidiruv (UNIQUE
# indeks) va admin panel uchun SQL so'rovlar imkonini beradi. Productionda
# shu funksiyalarning ichini o'zgartirmasdan, ulanish satrini
# PostgreSQL/SQLAlchemy'ga almashtirish kifoya.
# ---------------------------------------------------------------------------

import sqlite3  # noqa: E402

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)
DB_FILE = DATA_DIR / "forgemind.db"

ADMIN_EMAILS = {e.strip().lower() for e in os.getenv("ADMIN_EMAILS", "").split(",") if e.strip()}


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT,
                salt TEXT,
                provider TEXT NOT NULL DEFAULT 'password',
                avatar TEXT,
                plan TEXT NOT NULL DEFAULT 'free',
                created_at REAL NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS payments (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                plan TEXT NOT NULL,
                amount REAL NOT NULL,
                method TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                created_at REAL NOT NULL
            )
            """
        )


init_db()


def _row_to_dict(row: sqlite3.Row) -> dict:
    d = dict(row)
    d["is_admin"] = d["email"].lower() in ADMIN_EMAILS
    return d


def find_user_by_email(email: str) -> Optional[dict]:
    with get_db() as conn:
        row = conn.execute("SELECT * FROM users WHERE lower(email) = ?", (email.lower(),)).fetchone()
    return _row_to_dict(row) if row else None


def find_user_by_id(user_id: str) -> Optional[dict]:
    with get_db() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return _row_to_dict(row) if row else None


def insert_user(user: dict) -> None:
    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO users (id, name, email, password_hash, salt, provider, avatar, plan, created_at)
            VALUES (:id, :name, :email, :password_hash, :salt, :provider, :avatar, :plan, :created_at)
            """,
            {
                "password_hash": None,
                "salt": None,
                "avatar": None,
                "plan": "free",
                "created_at": time.time(),
                **user,
            },
        )


def list_all_users() -> list[dict]:
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM users ORDER BY created_at DESC").fetchall()
    return [_row_to_dict(r) for r in rows]


def set_user_plan(user_id: str, plan: str) -> None:
    with get_db() as conn:
        conn.execute("UPDATE users SET plan = ? WHERE id = ?", (plan, user_id))


def insert_payment(payment: dict) -> None:
    with get_db() as conn:
        conn.execute(
            "INSERT INTO payments (id, user_id, plan, amount, method, status, created_at) "
            "VALUES (:id, :user_id, :plan, :amount, :method, :status, :created_at)",
            payment,
        )


# ---------------------------------------------------------------------------
# [PRODUCTION: middleware/rate_limit.py] — login urinishlarini cheklash
# Brute-force hujumlarning oldini olish uchun: 15 daqiqada 5 tadan ortiq
# noto'g'ri urinish bo'lsa, shu email 15 daqiqaga vaqtincha bloklanadi.
# ---------------------------------------------------------------------------

LOGIN_ATTEMPTS: dict[str, list[float]] = {}
MAX_ATTEMPTS = 5
WINDOW_SECONDS = 15 * 60


def check_rate_limit(email: str) -> None:
    now = time.time()
    attempts = [t for t in LOGIN_ATTEMPTS.get(email, []) if now - t < WINDOW_SECONDS]
    if len(attempts) >= MAX_ATTEMPTS:
        raise HTTPException(429, "Juda ko'p urinish. 15 daqiqadan so'ng qayta urinib ko'ring.")
    LOGIN_ATTEMPTS[email] = attempts


def record_failed_attempt(email: str) -> None:
    LOGIN_ATTEMPTS.setdefault(email, []).append(time.time())


def clear_attempts(email: str) -> None:
    LOGIN_ATTEMPTS.pop(email, None)


# ---------------------------------------------------------------------------
# Parolni xeshlash — PBKDF2 (stdlib, tashqi paket kerak emas)
# ---------------------------------------------------------------------------


def hash_password(password: str, salt: Optional[str] = None) -> tuple[str, str]:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000).hex()
    return digest, salt


def verify_password(password: str, salt: str, digest: str) -> bool:
    check, _ = hash_password(password, salt)
    return hmac.compare_digest(check, digest)



# ---------------------------------------------------------------------------
# JWT (HS256) — qo'lda amalga oshirilgan, faqat stdlib
# ---------------------------------------------------------------------------

import base64  # noqa: E402


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _b64url_decode(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def create_token(payload: dict, expires_in: int = 60 * 60 * 24 * 7) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    body = {**payload, "exp": int(time.time()) + expires_in}
    segments = [_b64url(json.dumps(header).encode()), _b64url(json.dumps(body).encode())]
    signing_input = ".".join(segments).encode()
    signature = hmac.new(JWT_SECRET.encode(), signing_input, hashlib.sha256).digest()
    segments.append(_b64url(signature))
    return ".".join(segments)


def verify_token(token: str) -> Optional[dict]:
    try:
        header_b64, payload_b64, sig_b64 = token.split(".")
        signing_input = f"{header_b64}.{payload_b64}".encode()
        expected = hmac.new(JWT_SECRET.encode(), signing_input, hashlib.sha256).digest()
        if not hmac.compare_digest(_b64url(expected), sig_b64):
            return None
        payload = json.loads(_b64url_decode(payload_b64))
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None


def current_user(authorization: str = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Token topilmadi")
    payload = verify_token(authorization.removeprefix("Bearer "))
    if not payload:
        raise HTTPException(401, "Token yaroqsiz yoki muddati o'tgan")
    user = find_user_by_id(payload.get("sub"))
    if not user:
        raise HTTPException(404, "Foydalanuvchi topilmadi")
    return user


def require_admin(authorization: str = Header(None)) -> dict:
    user = current_user(authorization)
    if not user.get("is_admin"):
        raise HTTPException(403, "Faqat administrator uchun")
    return user


# ---------------------------------------------------------------------------
# Auth modellari va endpointlari
# ---------------------------------------------------------------------------


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleAuthRequest(BaseModel):
    credential: str  # Google Identity Services'dan kelgan ID token


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    avatar: Optional[str] = None
    plan: str = "free"
    is_admin: bool = False


class AuthResponse(BaseModel):
    token: str
    user: UserOut


def _user_out(u: dict) -> UserOut:
    return UserOut(
        id=u["id"],
        name=u["name"],
        email=u["email"],
        avatar=u.get("avatar"),
        plan=u.get("plan", "free"),
        is_admin=u.get("is_admin", False),
    )


PASSWORD_PATTERN = re.compile(r"^(?=.*[A-Za-z])(?=.*\d).{6,}$")


@app.post("/api/auth/register", response_model=AuthResponse)
async def register(req: RegisterRequest):
    email = req.email.lower()
    if find_user_by_email(email):
        raise HTTPException(409, "Bu email bilan akkaunt allaqachon mavjud")
    if not PASSWORD_PATTERN.match(req.password):
        raise HTTPException(
            400, "Parol kamida 6 belgi, hech bo'lmasa 1 harf va 1 raqamdan iborat bo'lishi kerak"
        )

    digest, salt = hash_password(req.password)
    user = {
        "id": secrets.token_hex(8),
        "name": req.name.strip()[:80],
        "email": email,
        "password_hash": digest,
        "salt": salt,
        "provider": "password",
        "avatar": None,
        "plan": "free",
        "created_at": time.time(),
    }
    insert_user(user)
    user["is_admin"] = email in ADMIN_EMAILS

    token = create_token({"sub": user["id"], "email": user["email"]})
    return AuthResponse(token=token, user=_user_out(user))


@app.post("/api/auth/login", response_model=AuthResponse)
async def login(req: LoginRequest):
    email = req.email.lower()
    check_rate_limit(email)

    user = find_user_by_email(email)
    if not user or user.get("provider") != "password":
        record_failed_attempt(email)
        raise HTTPException(401, "Email yoki parol noto'g'ri")
    if not verify_password(req.password, user["salt"], user["password_hash"]):
        record_failed_attempt(email)
        raise HTTPException(401, "Email yoki parol noto'g'ri")

    clear_attempts(email)
    token = create_token({"sub": user["id"], "email": user["email"]})
    return AuthResponse(token=token, user=_user_out(user))


@app.post("/api/auth/google", response_model=AuthResponse)
async def google_auth(req: GoogleAuthRequest):
    """
    Frontend Google Identity Services (GIS) orqali oladigan ID tokenni
    shu yerda tekshiramiz. Buning uchun sizga kerak:
      1. https://console.cloud.google.com -> OAuth client ID (Web) yarating
      2. .env fayliga GOOGLE_CLIENT_ID=... yozing
      3. Frontend .env fayliga ham VITE_GOOGLE_CLIENT_ID=... yozing (bir xil ID)
    """
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": req.credential},
        )
    if resp.status_code != 200:
        raise HTTPException(401, "Google tokenini tasdiqlab bo'lmadi")

    info = resp.json()
    if GOOGLE_CLIENT_ID and info.get("aud") != GOOGLE_CLIENT_ID:
        raise HTTPException(401, "Google client ID mos kelmadi")

    email = info.get("email", "").lower()
    if not email:
        raise HTTPException(400, "Google javobida email topilmadi")

    user = find_user_by_email(email)
    if not user:
        user = {
            "id": secrets.token_hex(8),
            "name": info.get("name", email.split("@")[0]),
            "email": email,
            "provider": "google",
            "avatar": info.get("picture"),
            "plan": "free",
            "created_at": time.time(),
        }
        insert_user(user)
        user["is_admin"] = email in ADMIN_EMAILS

    token = create_token({"sub": user["id"], "email": user["email"]})
    return AuthResponse(token=token, user=_user_out(user))


@app.get("/api/auth/me", response_model=UserOut)
async def me(authorization: str = Header(None)):
    return _user_out(current_user(authorization))


# ---------------------------------------------------------------------------
# [PRODUCTION: api/auth.py -> oauth_github.py / oauth_microsoft.py]
# GitHub va Microsoft — standart OAuth2 "Authorization Code" oqimi.
#
# Google'dan farqi: bular client-side ID-token bermaydi, shuning uchun
# frontend foydalanuvchini providerning o'z sahifasiga yo'naltiradi, u yerda
# ruxsat berilgach, "code" bilan qaytadi — shu "code"ni BIZ (backend) haqiqiy
# access_token'ga almashtiramiz (bu almashinuv client_secret talab qiladi,
# shuning uchun frontendda emas, shu yerda bo'lishi SHART — aks holda
# client_secret oshkor bo'lib qoladi).
#
# Sozlash:
#   GitHub:    https://github.com/settings/developers -> New OAuth App
#              Authorization callback URL: <frontend-url>/oauth/callback/github
#   Microsoft: https://portal.azure.com -> App registrations -> New registration
#              Redirect URI: <frontend-url>/oauth/callback/microsoft
# .env ga GITHUB_CLIENT_ID/SECRET yoki MICROSOFT_CLIENT_ID/SECRET qo'shing.
# ---------------------------------------------------------------------------

import urllib.parse  # noqa: E402

MICROSOFT_TENANT = os.getenv("MICROSOFT_TENANT", "common")

OAUTH_CONFIGS = {
    "github": {
        "client_id": os.getenv("GITHUB_CLIENT_ID", ""),
        "client_secret": os.getenv("GITHUB_CLIENT_SECRET", ""),
        "authorize_url": "https://github.com/login/oauth/authorize",
        "token_url": "https://github.com/login/oauth/access_token",
        "scope": "read:user user:email",
    },
    "microsoft": {
        "client_id": os.getenv("MICROSOFT_CLIENT_ID", ""),
        "client_secret": os.getenv("MICROSOFT_CLIENT_SECRET", ""),
        "authorize_url": f"https://login.microsoftonline.com/{MICROSOFT_TENANT}/oauth2/v2.0/authorize",
        "token_url": f"https://login.microsoftonline.com/{MICROSOFT_TENANT}/oauth2/v2.0/token",
        "scope": "openid profile email User.Read",
    },
}


@app.get("/api/auth/oauth/{provider}/start")
async def oauth_start(provider: str, redirect_uri: str):
    cfg = OAUTH_CONFIGS.get(provider)
    if not cfg or not cfg["client_id"]:
        raise HTTPException(
            400,
            f"{provider} orqali kirish hali sozlanmagan. .env fayliga "
            f"{provider.upper()}_CLIENT_ID va {provider.upper()}_CLIENT_SECRET qo'shing.",
        )
    params = {
        "client_id": cfg["client_id"],
        "redirect_uri": redirect_uri,
        "scope": cfg["scope"],
        "response_type": "code",
        "state": secrets.token_urlsafe(12),
    }
    return {"url": f"{cfg['authorize_url']}?{urllib.parse.urlencode(params)}"}


class OAuthCallbackRequest(BaseModel):
    code: str
    redirect_uri: str


@app.post("/api/auth/oauth/{provider}/callback", response_model=AuthResponse)
async def oauth_callback(provider: str, req: OAuthCallbackRequest):
    cfg = OAUTH_CONFIGS.get(provider)
    if not cfg or not cfg["client_id"]:
        raise HTTPException(400, f"{provider} orqali kirish sozlanmagan")

    async with httpx.AsyncClient(timeout=15) as client:
        token_resp = await client.post(
            cfg["token_url"],
            headers={"Accept": "application/json"},
            data={
                "client_id": cfg["client_id"],
                "client_secret": cfg["client_secret"],
                "code": req.code,
                "redirect_uri": req.redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        token_data = token_resp.json()
        access_token = token_data.get("access_token")
        if not access_token:
            raise HTTPException(400, f"{provider} tokenini olishda xato: {token_data}")

        auth_header = {"Authorization": f"Bearer {access_token}"}
        email, name, avatar = None, None, None

        if provider == "github":
            profile = (await client.get("https://api.github.com/user", headers=auth_header)).json()
            name = profile.get("name") or profile.get("login")
            avatar = profile.get("avatar_url")
            email = profile.get("email")
            if not email:
                emails = (await client.get("https://api.github.com/user/emails", headers=auth_header)).json()
                primary = next((e["email"] for e in emails if e.get("primary")), None)
                email = primary or (emails[0]["email"] if emails else None)

        elif provider == "microsoft":
            profile = (await client.get("https://graph.microsoft.com/v1.0/me", headers=auth_header)).json()
            name = profile.get("displayName")
            email = profile.get("mail") or profile.get("userPrincipalName")

    if not email:
        raise HTTPException(400, f"{provider} hisobingizdan email olinmadi")
    email = email.lower()

    user = find_user_by_email(email)
    if not user:
        user = {
            "id": secrets.token_hex(8),
            "name": name or email.split("@")[0],
            "email": email,
            "provider": provider,
            "avatar": avatar,
            "plan": "free",
            "created_at": time.time(),
        }
        insert_user(user)
        user["is_admin"] = email in ADMIN_EMAILS

    token = create_token({"sub": user["id"], "email": user["email"]})
    return AuthResponse(token=token, user=_user_out(user))


# ---------------------------------------------------------------------------
# AI chat proxy (mavjud)
# ---------------------------------------------------------------------------


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    image: Optional[str] = None  # data:image/png;base64,... — faqat oxirgi user xabarida ishlatiladi


def _parse_data_url(data_url: str) -> tuple[str, str]:
    """'data:image/png;base64,AAAA...' -> ('image/png', 'AAAA...')"""
    header, _, b64data = data_url.partition(",")
    mime = "image/png"
    if header.startswith("data:") and ";base64" in header:
        mime = header[5:].split(";")[0] or mime
    return mime, b64data


class ChatRequest(BaseModel):
    provider: Literal["openai", "claude", "gemini", "fireworks", "deepseek", "llama"]
    messages: list[ChatMessage]


class ChatResponse(BaseModel):
    reply: str
    provider: str


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "providers_configured": {
            "openai": bool(OPENAI_API_KEY),
            "claude": bool(ANTHROPIC_API_KEY),
            "gemini": bool(GOOGLE_API_KEY),
            "fireworks": bool(FIREWORKS_API_KEY),
        },
        "google_oauth_configured": bool(GOOGLE_CLIENT_ID),
    }


def _openai_message(m: "ChatMessage") -> dict:
    if m.image:
        return {
            "role": m.role,
            "content": [
                {"type": "text", "text": m.content or "What's in this image?"},
                {"type": "image_url", "image_url": {"url": m.image}},
            ],
        }
    return {"role": m.role, "content": m.content}


async def call_openai(messages: list[ChatMessage]) -> str:
    if not OPENAI_API_KEY:
        raise HTTPException(500, "OPENAI_API_KEY sozlanmagan (.env faylini tekshiring)")

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
            json={
                "model": "gpt-4o-mini",  # vision'ni ham qo'llab-quvvatlaydi
                "messages": [_openai_message(m) for m in messages],
            },
        )
    if resp.status_code != 200:
        raise HTTPException(resp.status_code, f"OpenAI xatosi: {resp.text}")
    data = resp.json()
    return data["choices"][0]["message"]["content"]


def _claude_message(m: "ChatMessage") -> dict:
    if m.image:
        mime, b64data = _parse_data_url(m.image)
        return {
            "role": m.role,
            "content": [
                {"type": "text", "text": m.content or "What's in this image?"},
                {"type": "image", "source": {"type": "base64", "media_type": mime, "data": b64data}},
            ],
        }
    return {"role": m.role, "content": m.content}


async def call_claude(messages: list[ChatMessage]) -> str:
    if not ANTHROPIC_API_KEY:
        raise HTTPException(500, "ANTHROPIC_API_KEY sozlanmagan (.env faylini tekshiring)")

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-sonnet-4-5",
                "max_tokens": 1024,
                "messages": [_claude_message(m) for m in messages],
            },
        )
    if resp.status_code != 200:
        raise HTTPException(resp.status_code, f"Claude xatosi: {resp.text}")
    data = resp.json()
    return "".join(block.get("text", "") for block in data.get("content", []))


def _gemini_parts(m: "ChatMessage") -> list[dict]:
    parts = [{"text": m.content}] if m.content else []
    if m.image:
        mime, b64data = _parse_data_url(m.image)
        parts.append({"inline_data": {"mime_type": mime, "data": b64data}})
    return parts or [{"text": ""}]


async def call_gemini(messages: list[ChatMessage]) -> str:
    if not GOOGLE_API_KEY:
        raise HTTPException(500, "GOOGLE_API_KEY sozlanmagan (.env faylini tekshiring)")

    contents = [
        {"role": "model" if m.role == "assistant" else "user", "parts": _gemini_parts(m)}
        for m in messages
    ]
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"gemini-2.0-flash:generateContent?key={GOOGLE_API_KEY}",
            json={"contents": contents},
        )
    if resp.status_code != 200:
        raise HTTPException(resp.status_code, f"Gemini xatosi: {resp.text}")
    data = resp.json()
    try:
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError):
        raise HTTPException(500, "Gemini javobini o'qib bo'lmadi")


# ---------------------------------------------------------------------------
# [PRODUCTION: ai/fireworks.py]
# Fireworks AI — AMD Developer Cloud'dagi MI300X GPU'larda ishlaydigan
# yuqori tezlikdagi inference. Fireworks bitta OpenAI-compatible endpoint
# orqali ko'plab ochiq modellarni (Llama, DeepSeek va h.k.) taqdim etadi —
# shuning uchun DeepSeek va Llama ham shu funksiya orqali chaqiriladi,
# faqat "model" satri farq qiladi.
# ---------------------------------------------------------------------------

FIREWORKS_MODELS = {
    "fireworks": "accounts/fireworks/models/llama-v3p1-405b-instruct",  # AMD MI300X'da default flagman model
    "llama": "accounts/fireworks/models/llama-v3p1-70b-instruct",
    "deepseek": "accounts/fireworks/models/deepseek-v3",
}


async def call_fireworks(messages: list[ChatMessage], model_key: str = "fireworks") -> str:
    if not FIREWORKS_API_KEY:
        raise HTTPException(500, "FIREWORKS_API_KEY sozlanmagan (.env faylini tekshiring)")

    model = FIREWORKS_MODELS.get(model_key, FIREWORKS_MODELS["fireworks"])
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.fireworks.ai/inference/v1/chat/completions",
            headers={"Authorization": f"Bearer {FIREWORKS_API_KEY}"},
            json={
                "model": model,
                "messages": [{"role": m.role, "content": m.content} for m in messages],
            },
        )
    if resp.status_code != 200:
        raise HTTPException(resp.status_code, f"Fireworks AI xatosi: {resp.text}")
    data = resp.json()
    return data["choices"][0]["message"]["content"]


PROVIDER_CONFIGURED = {
    "fireworks": lambda: bool(FIREWORKS_API_KEY),
    "llama": lambda: bool(FIREWORKS_API_KEY),
    "deepseek": lambda: bool(FIREWORKS_API_KEY),
    "claude": lambda: bool(ANTHROPIC_API_KEY),
    "openai": lambda: bool(OPENAI_API_KEY),
    "gemini": lambda: bool(GOOGLE_API_KEY),
}


async def call_provider(provider: str, messages: list[ChatMessage]) -> str:
    if provider == "openai":
        return await call_openai(messages)
    if provider == "claude":
        return await call_claude(messages)
    if provider == "gemini":
        return await call_gemini(messages)
    if provider in ("fireworks", "llama", "deepseek"):
        return await call_fireworks(messages, model_key=provider)
    raise HTTPException(400, "Noma'lum provider")


# ---------------------------------------------------------------------------
# [PRODUCTION: ai/router.py]
# AI Auto Routing — foydalanuvchi model tanlamasa, promptni tahlil qilib
# eng mos providerni tanlaydi va TANLASH SABABINI qaytaradi (frontendda
# ko'rsatiladi). Ustuvorlik tartibi (agar bir nechtasi mos kelsa va
# tarkib-asosli qoida ishga tushmasa):
#   1. Fireworks AI (AMD)  — tezkor, arzon, default
#   2. Claude              — kod va murakkab mulohaza
#   3. GPT (OpenAI)        — umumiy maqsad
#   4. Gemini              — vizual/multimodal
#   5. DeepSeek            — matematik/mantiqiy vazifalar
#   6. Llama               — ochiq, umumiy zaxira variant
# ---------------------------------------------------------------------------

CODE_PATTERN = re.compile(
    r"\b(code|kod|dastur|function|funksiya|script|bug|debug|algorithm|python|javascript|react|sql)\b",
    re.IGNORECASE,
)
VISION_PATTERN = re.compile(
    r"\b(image|rasm|photo|surat|screenshot|vision|tasvir)\b", re.IGNORECASE
)
REASONING_PATTERN = re.compile(
    r"\b(tahlil qil|compare|strategy|strategiya|nega|why|reasoning|xulosa)\b", re.IGNORECASE
)
MATH_PATTERN = re.compile(
    r"\b(hisobla|calculate|equation|tenglama|matemat|logic|mantiq)\b", re.IGNORECASE
)


def classify_prompt(text: str, has_image: bool = False) -> tuple[str, str]:
    """Prompt matnini (va rasm biriktirilganini) tahlil qilib, (provider, sabab) qaytaradi."""
    if has_image:
        candidate, reason = "openai", "Rasm biriktirilgani aniqlandi — GPT Vision tasvirni tahlil qilish uchun tanlandi."
    elif VISION_PATTERN.search(text):
        candidate, reason = "gemini", "Rasm/vizual tahlil so'rovi aniqlandi — Gemini vizual modelga yo'naltirildi."
    elif CODE_PATTERN.search(text):
        candidate, reason = "claude", "Kod bilan bog'liq so'rov aniqlandi — Claude kodlashda kuchli bo'lgani uchun tanlandi."
    elif REASONING_PATTERN.search(text):
        candidate, reason = "gemini", "Murakkab tahlil/mulohaza so'rovi — kengaytirilgan mulohaza uchun Gemini tanlandi."
    elif MATH_PATTERN.search(text):
        candidate, reason = "deepseek", "Matematik/mantiqiy vazifa aniqlandi — DeepSeek shu turdagi vazifalarda kuchli."
    else:
        candidate, reason = "fireworks", "Standart so'rov — AMD GPU'da ishlaydigan Fireworks AI (default, eng tezkor) tanlandi."

    # Agar tanlangan provider sozlanmagan bo'lsa — ustuvorlik zanjiri bo'yicha keyingisiga o'tamiz
    # (rasm bo'lsa, faqat vision'ni qo'llab-quvvatlaydigan providerlar orasida)
    priority = ["openai", "claude", "gemini"] if has_image else ["fireworks", "claude", "openai", "gemini", "deepseek", "llama"]
    if PROVIDER_CONFIGURED.get(candidate, lambda: False)():
        return candidate, reason

    for p in priority:
        if PROVIDER_CONFIGURED.get(p, lambda: False)():
            return p, f"{reason} ({candidate} sozlanmagan, shuning uchun ustuvorlik bo'yicha {p} ishlatildi.)"

    raise HTTPException(500, "Hech qanday AI provider sozlanmagan. .env faylida kamida bitta API kalit kiriting.")


class AutoChatRequest(BaseModel):
    messages: list[ChatMessage]


class AutoChatResponse(BaseModel):
    reply: str
    provider: str
    reason: str


@app.post("/api/chat/auto", response_model=AutoChatResponse)
async def chat_auto(req: AutoChatRequest):
    last_user_msg = next((m for m in reversed(req.messages) if m.role == "user"), None)
    last_user_text = last_user_msg.content if last_user_msg else ""
    has_image = bool(last_user_msg and last_user_msg.image)
    provider, reason = classify_prompt(last_user_text, has_image)
    reply = await call_provider(provider, req.messages)
    return AutoChatResponse(reply=reply, provider=provider, reason=reason)


# ---------------------------------------------------------------------------
# [PRODUCTION: api/dashboard.py]
# Dashboard — hozircha simulyatsiya qilingan ko'rsatkichlar qaytaradi.
# Productionda bu yerga haqiqiy AMD ROCm GPU telemetriyasi (rocm-smi) va
# Fireworks AI hisobingizdagi haqiqiy so'rov statistikasi ulanadi.
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# [PRODUCTION: api/admin.py]
# Admin Panel — faqat .env dagi ADMIN_EMAILS ro'yxatidagi email bilan
# ro'yxatdan o'tgan/kirgan foydalanuvchilar ko'ra oladi (require_admin).
# ---------------------------------------------------------------------------


@app.get("/api/admin/users")
async def admin_list_users(admin: dict = Depends(require_admin)):
    users = list_all_users()
    return {
        "total": len(users),
        "by_plan": {
            plan: sum(1 for u in users if u["plan"] == plan) for plan in ("free", "pro", "business")
        },
        "users": [
            {
                "id": u["id"],
                "name": u["name"],
                "email": u["email"],
                "plan": u["plan"],
                "provider": u["provider"],
                "created_at": u["created_at"],
            }
            for u in users
        ],
    }


# ---------------------------------------------------------------------------
# [PRODUCTION: api/billing.py] + [services/payment_service.py]
# To'lov — O'zbekiston uchun Click.uz / Payme.uz orqali (Uzcard, Humo,
# ba'zi hollarda Visa/Mastercard ham shu gatewaylar orqali qabul qilinadi).
#
# MUHIM: bu yerda HAQIQIY to'lov qabul qilinmaydi — buning uchun sizga
# Click.uz yoki Payme.uz saytida BIZNES sifatida ro'yxatdan o'tib,
# MERCHANT_ID / SERVICE_ID olishingiz kerak (bank hisobingiz bilan
# bog'lanadi). Bu kalitlar .env ga qo'shilgach, quyidagi funksiya haqiqiy
# to'lov sahifasi URL manzilini generatsiya qiladi. Hozircha, kalitlar
# bo'lmasa, aniq va halol xabar qaytaradi.
# Hujjat: https://docs.click.uz  /  https://developer.help.paycom.uz
# ---------------------------------------------------------------------------

CLICK_MERCHANT_ID = os.getenv("CLICK_MERCHANT_ID", "")
CLICK_SERVICE_ID = os.getenv("CLICK_SERVICE_ID", "")
PAYME_MERCHANT_ID = os.getenv("PAYME_MERCHANT_ID", "")

PLAN_PRICES_UZS = {"pro": 250_000, "business": 1_250_000}  # taxminiy, o'zingiz sozlang


class CheckoutRequest(BaseModel):
    plan: Literal["pro", "business"]
    method: Literal["click", "payme"] = "click"


@app.post("/api/billing/checkout")
async def billing_checkout(req: CheckoutRequest, authorization: str = Header(None)):
    user = current_user(authorization)
    amount = PLAN_PRICES_UZS[req.plan]

    payment_id = secrets.token_hex(8)
    insert_payment(
        {
            "id": payment_id,
            "user_id": user["id"],
            "plan": req.plan,
            "amount": amount,
            "method": req.method,
            "status": "pending",
            "created_at": time.time(),
        }
    )

    if req.method == "click" and CLICK_MERCHANT_ID and CLICK_SERVICE_ID:
        checkout_url = (
            "https://my.click.uz/services/pay"
            f"?service_id={CLICK_SERVICE_ID}&merchant_id={CLICK_MERCHANT_ID}"
            f"&amount={amount}&transaction_param={payment_id}"
        )
        return {"configured": True, "checkout_url": checkout_url, "payment_id": payment_id}

    if req.method == "payme" and PAYME_MERCHANT_ID:
        import base64 as _b64

        params = _b64.b64encode(
            f"m={PAYME_MERCHANT_ID};ac.order_id={payment_id};a={amount * 100}".encode()
        ).decode()
        checkout_url = f"https://checkout.paycom.uz/{params}"
        return {"configured": True, "checkout_url": checkout_url, "payment_id": payment_id}

    return {
        "configured": False,
        "payment_id": payment_id,
        "message": (
            f"{req.method.upper()} hali sozlanmagan. Click.uz yoki Payme.uz'da biznes "
            "sifatida ro'yxatdan o'ting, MERCHANT_ID (va Click uchun SERVICE_ID) oling, "
            "so'ng .env fayliga qo'shing."
        ),
    }


@app.post("/api/billing/webhook/{provider}")
async def billing_webhook(provider: str, payload: dict):
    """
    Click/Payme to'lov tugagach shu manzilga so'rov yuboradi (haqiqiy
    imzo/tekshiruv logikasi provayder hujjatiga qarab shu yerga yoziladi).
    Hozircha faqat skelet — productionda HMAC imzo tekshiruvi SHART.
    """
    payment_id = payload.get("transaction_param") or payload.get("order_id")
    if not payment_id:
        raise HTTPException(400, "payment_id topilmadi")
    with get_db() as conn:
        row = conn.execute("SELECT * FROM payments WHERE id = ?", (payment_id,)).fetchone()
        if not row:
            raise HTTPException(404, "To'lov topilmadi")
        conn.execute("UPDATE payments SET status = 'paid' WHERE id = ?", (payment_id,))
        set_user_plan(row["user_id"], row["plan"])
    return {"ok": True}



async def dashboard_stats():
    return {
        "gpu": {
            "provider": "AMD Instinct MI300X (Fireworks AI Developer Cloud)",
            "utilization_percent": round(random.uniform(35, 82), 1),
            "status": "online" if FIREWORKS_API_KEY else "not_configured",
        },
        "active_models": [p for p, fn in PROVIDER_CONFIGURED.items() if fn()],
        "inference_time_ms": round(random.uniform(180, 650), 0),
        "latency_ms": round(random.uniform(40, 180), 0),
        "requests_last_hour": random.randint(20, 400),
        "token_usage_last_hour": random.randint(5_000, 120_000),
        "note": "Bu ko'rsatkichlar demo/simulyatsiya. Haqiqiy AMD ROCm va Fireworks "
        "hisobot API'lari ulangach, bu yerdagi random qiymatlar haqiqiy "
        "telemetriya bilan almashtiriladi.",
    }


# ---------------------------------------------------------------------------
# [PRODUCTION: ai/memory.py]
# Conversation Memory — hozircha jarayon xotirasida (RAM) saqlanadi, ya'ni
# server qayta ishga tushganda tozalanadi. Bu RAG/vector-database (masalan
# pgvector yoki Pinecone) bilan almashtirishga tayyor struktura: har bir
# session_id ostida xabarlar ketma-ketligi saqlanadi.
# ---------------------------------------------------------------------------

MEMORY_STORE: dict[str, list[dict]] = {}


class MemoryAppendRequest(BaseModel):
    session_id: str
    role: Literal["user", "assistant"]
    content: str


@app.post("/api/memory/append")
async def memory_append(req: MemoryAppendRequest):
    MEMORY_STORE.setdefault(req.session_id, []).append(
        {"role": req.role, "content": req.content, "ts": time.time()}
    )
    return {"ok": True, "length": len(MEMORY_STORE[req.session_id])}


@app.get("/api/memory/{session_id}")
async def memory_get(session_id: str):
    return {"session_id": session_id, "messages": MEMORY_STORE.get(session_id, [])}


@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    reply = await call_provider(req.provider, req.messages)
    return ChatResponse(reply=reply, provider=req.provider)

import uvicorn
from app.core.config import settings
from app.api.payments import checkout
from app.api.payments.payme import router as payme_router
from app.api.payments.click import router as click_router
from app.api.admin import panel as admin_router

# API endpoint yo'llarini xaritalash
app.include_router(checkout.router, prefix=settings.API_V1_STR, tags=["Checkout Manager"])
app.include_router(payme_router.router, prefix=f"{settings.API_V1_STR}/payments/payme", tags=["Payme Webhook Integration"])
app.include_router(click_router.router, prefix=f"{settings.API_V1_STR}/payments/click", tags=["Click Webhook Integration"])
app.include_router(admin_router.router, prefix=f"{settings.API_V1_STR}/admin", tags=["FinTech Admin Management"])

@app.get("/", tags=["Health Check"])
def health_check():
    return {
        "status": "operational",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION
    }

if __name__ == "__main__":
    # Serverni mahalliy yoki tashqi muhitda port 8000 da xavfsiz boshlash
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)