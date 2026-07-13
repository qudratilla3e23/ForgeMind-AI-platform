"""
Supabase mijozi — LEGACY qatlam.

Payment (Click/Payme) va Admin panelning eski qismlari hozircha shu orqali
ishlaydi. Bular Phase 2 (To'lov tizimi) va Phase 4 (Admin Panel) davomida
to'liq PostgreSQL (app/database/db.py, SQLAlchemy) ga ko'chiriladi.

Muhim: SUPABASE_URL/SUPABASE_KEY sozlanmagan bo'lsa ham backend ishga
tushishi kerak (masalan, faqat Auth funksiyasini sinab ko'rayotgan bo'lsangiz).
Shuning uchun client "lazy" (kechiktirilgan) tarzda, faqat chaqirilganda
yaratiladi.
"""
from typing import Optional

from app.core.config import settings

_supabase_client: Optional[object] = None


def get_supabase():
    """Dependency injection uchun xizmat qiladi. Sozlanmagan bo'lsa xato qaytaradi."""
    global _supabase_client
    if _supabase_client is None:
        if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
            raise RuntimeError(
                "SUPABASE_URL / SUPABASE_KEY sozlanmagan. .env faylga qiymat yozing "
                "(bu funksiya faqat legacy to'lov/admin endpointlari uchun kerak)."
            )
        from supabase import create_client

        _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    return _supabase_client


class _LazySupabaseProxy:
    """``supabase_client`` nomi bilan eski kodlarda ishlatilgan joylar uchun mos qoldiruvchi."""

    def __getattr__(self, item):
        return getattr(get_supabase(), item)


supabase_client = _LazySupabaseProxy()
