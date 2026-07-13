"""
Real PostgreSQL-asosli autentifikatsiya dependency'lari.

E'TIBOR: Bu fayl ilgari Supabase JWT'ni tekshirar edi. Endi backend o'zining
PostgreSQL bazasi va o'zi imzolagan JWT (app/core/security.py) orqali
ishlaydi — Supabase'ga bog'liqlik yo'q.
"""
import uuid

import jwt
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token
from app.crud.user import get_user_by_id
from app.database.db import get_db
from app.models.db_models import User, UserRole

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Noto'g'ri token turi.")
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token tarkibi yaroqsiz.")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sessiya muddati tugagan, qayta kiring.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Avtorizatsiya tokeni noto'g'ri.")

    user = await get_user_by_id(db, uuid.UUID(user_id))
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="Foydalanuvchi topilmadi yoki bloklangan.")
    if user.is_banned:
        raise HTTPException(status_code=403, detail="Hisobingiz bloklangan.")
    return user


async def get_current_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sizda ushbu bo'limga kirish ruxsati yo'q.")
    return user