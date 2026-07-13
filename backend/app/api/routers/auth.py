"""
/api/auth/* — Ro'yxatdan o'tish, kirish, token yangilash, parolni tiklash.

Barcha endpointlar PostgreSQL (SQLAlchemy async) ustida ishlaydi.
Google Login uchun frontend Google Identity Services orqali id_token oladi
va shu yerga yuboradi — biz uni Google'ning tokeninfo endpoint'i orqali
tekshiramiz (network yo'q muhitda test qilinganda mock qilinishi mumkin).
"""
import uuid

import httpx
import jwt as pyjwt
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_password_reset_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from app.crud.user import (
    create_user,
    get_user_by_email,
    get_user_by_google_id,
    get_user_by_id,
    is_refresh_token_valid,
    revoke_all_user_tokens,
    revoke_refresh_token,
    store_refresh_token,
    update_password,
)
from app.database.db import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.db_models import User
from app.schemas.auth import (
    AccessTokenOut,
    ForgotPasswordRequest,
    GoogleLoginRequest,
    LoginRequest,
    MessageResponse,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenPair,
    UserOut,
)

router = APIRouter()


def _issue_token_pair(user: User) -> tuple[str, str]:
    access = create_access_token(str(user.id), role=user.role.value)
    refresh = create_refresh_token(str(user.id))
    return access, refresh


@router.post("/register", response_model=TokenPair, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await get_user_by_email(db, payload.email)
    if existing:
        raise HTTPException(status_code=409, detail="Bu email bilan foydalanuvchi allaqachon mavjud.")

    user = await create_user(db, email=payload.email, username=payload.username, password=payload.password)
    access, refresh = _issue_token_pair(user)
    await store_refresh_token(db, user.id, refresh, settings.REFRESH_TOKEN_EXPIRE_DAYS)

    return TokenPair(access_token=access, refresh_token=refresh, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenPair)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await get_user_by_email(db, payload.email)
    if not user or not user.hashed_password or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email yoki parol noto'g'ri.")
    if user.is_banned:
        raise HTTPException(status_code=403, detail="Hisobingiz bloklangan.")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Hisobingiz faol emas.")

    access, refresh = _issue_token_pair(user)
    expire_days = settings.REFRESH_TOKEN_EXPIRE_DAYS if payload.remember_me else 1
    await store_refresh_token(db, user.id, refresh, expire_days)

    return TokenPair(access_token=access, refresh_token=refresh, user=UserOut.model_validate(user))


@router.post("/google", response_model=TokenPair)
async def google_login(payload: GoogleLoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Google ID tokenini tekshiradi (Google's tokeninfo endpoint orqali),
    mos foydalanuvchini topadi yoki yaratadi, va odatdagi token juftligini qaytaradi.
    """
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Google Login backend'da sozlanmagan (GOOGLE_CLIENT_ID yo'q).")

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            "https://oauth2.googleapis.com/tokeninfo", params={"id_token": payload.id_token}
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Google tokeni yaroqsiz.")

    info = resp.json()
    if info.get("aud") != settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=401, detail="Google tokeni bu ilova uchun emas.")

    google_id = info["sub"]
    email = info["email"]
    name = info.get("name") or email.split("@")[0]
    avatar = info.get("picture")

    user = await get_user_by_google_id(db, google_id)
    if not user:
        user = await get_user_by_email(db, email)
        if not user:
            user = await create_user(db, email=email, username=name, google_id=google_id, avatar_url=avatar)

    access, refresh = _issue_token_pair(user)
    await store_refresh_token(db, user.id, refresh, settings.REFRESH_TOKEN_EXPIRE_DAYS)
    return TokenPair(access_token=access, refresh_token=refresh, user=UserOut.model_validate(user))


@router.post("/refresh", response_model=AccessTokenOut)
async def refresh_access_token(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    try:
        decoded = decode_token(payload.refresh_token)
        if decoded.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Noto'g'ri token turi.")
    except pyjwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Refresh token yaroqsiz yoki muddati tugagan.")

    if not await is_refresh_token_valid(db, payload.refresh_token):
        raise HTTPException(status_code=401, detail="Refresh token bekor qilingan. Qaytadan kiring.")

    user = await get_user_by_id(db, uuid.UUID(decoded["sub"]))
    if not user or not user.is_active or user.is_banned:
        raise HTTPException(status_code=401, detail="Foydalanuvchi topilmadi yoki bloklangan.")

    new_access = create_access_token(str(user.id), role=user.role.value)
    return AccessTokenOut(access_token=new_access)


@router.post("/logout", response_model=MessageResponse)
async def logout(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    await revoke_refresh_token(db, payload.refresh_token)
    return MessageResponse(message="Tizimdan muvaffaqiyatli chiqdingiz.")


@router.post("/logout-all", response_model=MessageResponse)
async def logout_all_devices(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await revoke_all_user_tokens(db, current_user.id)
    return MessageResponse(message="Barcha qurilmalardan chiqdingiz.")


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(payload: ForgotPasswordRequest, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    user = await get_user_by_email(db, payload.email)
    # Xavfsizlik uchun: email mavjud bo'lmasa ham har doim bir xil javob qaytariladi
    # (bu orqali email ro'yxatdan o'tganini tashqi kishi bilib ololmaydi).
    if user:
        reset_token = create_password_reset_token(str(user.id))
        # [PRODUCTION]: bu yerda email yuborish xizmati (SMTP / SendGrid / Postmark)
        # ulanadi. Hozircha reset havolasi background task orqali "yuborilgan" deb
        # loglanadi (demo/dev muhiti uchun).
        background_tasks.add_task(
            print, f"[EMAIL] Parolni tiklash havolasi: https://forgemind.ai/reset-password?token={reset_token}"
        )
    return MessageResponse(message="Agar email ro'yxatdan o'tgan bo'lsa, tiklash havolasi yuborildi.")


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(payload: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    try:
        decoded = decode_token(payload.token)
        if decoded.get("type") != "password_reset":
            raise HTTPException(status_code=400, detail="Noto'g'ri token turi.")
    except pyjwt.PyJWTError:
        raise HTTPException(status_code=400, detail="Tiklash havolasi yaroqsiz yoki muddati tugagan.")

    user = await get_user_by_id(db, uuid.UUID(decoded["sub"]))
    if not user:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi.")

    await update_password(db, user, payload.new_password)
    await revoke_all_user_tokens(db, user.id)  # xavfsizlik: parol o'zgargach barcha sessiyalar bekor qilinadi
    return MessageResponse(message="Parol muvaffaqiyatli yangilandi. Qaytadan tizimga kiring.")
