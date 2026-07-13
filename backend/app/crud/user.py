import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_password, hash_token
from app.models.db_models import RefreshToken, User, UserRole


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email.lower()))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_user_by_google_id(db: AsyncSession, google_id: str) -> User | None:
    result = await db.execute(select(User).where(User.google_id == google_id))
    return result.scalar_one_or_none()


async def create_user(
    db: AsyncSession,
    email: str,
    username: str,
    password: str | None = None,
    google_id: str | None = None,
    avatar_url: str | None = None,
) -> User:
    email_lower = email.lower()
    role = UserRole.admin if email_lower in settings.ADMIN_EMAILS else UserRole.user

    user = User(
        email=email_lower,
        username=username,
        hashed_password=hash_password(password) if password else None,
        google_id=google_id,
        avatar_url=avatar_url,
        role=role,
        is_verified=bool(google_id),  # Google orqali kirgan foydalanuvchi darhol tasdiqlangan hisoblanadi
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def update_password(db: AsyncSession, user: User, new_password: str) -> None:
    user.hashed_password = hash_password(new_password)
    await db.commit()


async def store_refresh_token(db: AsyncSession, user_id: uuid.UUID, raw_token: str, expire_days: int) -> None:
    token_row = RefreshToken(
        user_id=user_id,
        token_hash=hash_token(raw_token),
        expires_at=datetime.now(timezone.utc) + timedelta(days=expire_days),
    )
    db.add(token_row)
    await db.commit()


async def is_refresh_token_valid(db: AsyncSession, raw_token: str) -> bool:
    token_hash = hash_token(raw_token)
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked.is_(False),
        )
    )
    row = result.scalar_one_or_none()
    if row is None:
        return False
    if row.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        return False
    return True


async def revoke_refresh_token(db: AsyncSession, raw_token: str) -> None:
    token_hash = hash_token(raw_token)
    await db.execute(
        update(RefreshToken).where(RefreshToken.token_hash == token_hash).values(revoked=True)
    )
    await db.commit()


async def revoke_all_user_tokens(db: AsyncSession, user_id: uuid.UUID) -> None:
    await db.execute(
        update(RefreshToken).where(RefreshToken.user_id == user_id).values(revoked=True)
    )
    await db.commit()
