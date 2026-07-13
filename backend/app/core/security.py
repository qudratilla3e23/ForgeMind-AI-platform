"""
Parol xeshlash va JWT token yaratish/tekshirish.

Access token — qisqa muddatli (default 30 daqiqa), so'rovlarni autentifikatsiya
qilish uchun. Refresh token — uzoq muddatli (default 30 kun), yangi access
token olish uchun ishlatiladi va DB'da hash holida saqlanadi (RefreshToken
jadvali), shunda kerak bo'lsa (logout / "barcha qurilmalardan chiqish")
bekor qilish mumkin.
"""
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Literal, Optional

import bcrypt
import jwt

from app.core.config import settings

TokenType = Literal["access", "refresh", "password_reset"]

# Bcrypt algoritmi 72 baytdan uzun parollarni qo'llab-quvvatlamaydi (bu bcrypt'ning
# o'zidagi cheklov). Shuning uchun xeshlashdan oldin xavfsiz tarzda kesamiz.
_MAX_PASSWORD_BYTES = 72


def hash_password(password: str) -> str:
    pw_bytes = password.encode("utf-8")[:_MAX_PASSWORD_BYTES]
    return bcrypt.hashpw(pw_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        pw_bytes = plain_password.encode("utf-8")[:_MAX_PASSWORD_BYTES]
        return bcrypt.checkpw(pw_bytes, hashed_password.encode("utf-8"))
    except Exception:
        return False


def _create_token(subject: str, token_type: TokenType, expires_delta: timedelta, extra_claims: Optional[dict] = None) -> str:
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "iat": now,
        "exp": now + expires_delta,
        "jti": secrets.token_hex(16),
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_access_token(user_id: str, role: str = "user") -> str:
    return _create_token(
        subject=user_id,
        token_type="access",
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        extra_claims={"role": role},
    )


def create_refresh_token(user_id: str) -> str:
    return _create_token(
        subject=user_id,
        token_type="refresh",
        expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )


def create_password_reset_token(user_id: str) -> str:
    return _create_token(
        subject=user_id,
        token_type="password_reset",
        expires_delta=timedelta(minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES),
    )


def decode_token(token: str) -> dict:
    """Tokenni dekodlaydi. Muddati tugagan yoki noto'g'ri bo'lsa jwt.PyJWTError chiqaradi."""
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])


def hash_token(token: str) -> str:
    """Refresh tokenni DB'da saqlashdan oldin xeshlash (plain-text saqlamaslik uchun)."""
    import hashlib

    return hashlib.sha256(token.encode("utf-8")).hexdigest()
