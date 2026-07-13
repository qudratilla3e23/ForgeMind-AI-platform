"""
PostgreSQL bilan asosiy aloqa qatlami — SQLAlchemy 2.0 (async).

Bu fayl Supabase client'ga bog'liq emas: to'g'ridan-to'g'ri PostgreSQL'ga
ulanadi (DATABASE_URL orqali). Jadval sxemalari Alembic migratsiyalari
bilan boshqariladi (backend/alembic/).
"""
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


class Base(DeclarativeBase):
    """Barcha ORM modellar shu klassdan meros oladi."""
    pass


engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DATABASE_ECHO,
    pool_pre_ping=True,
    future=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency: har bir so'rov uchun alohida DB sessiyasi beradi."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_models() -> None:
    """
    Development/demo uchun qulaylik: jadvallarni Alembic'siz to'g'ridan-to'g'ri
    yaratadi (CREATE TABLE IF NOT EXISTS). Production'da buning o'rniga
    ``alembic upgrade head`` ishlatilishi kerak — bu funksiya faqat
    ilova birinchi marta ko'tarilganda "bo'sh DB" holatini yengillashtiradi.
    """
    from app.models import db_models  # noqa: F401  (modellarni Base.metadata'ga ro'yxatdan o'tkazish uchun)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
