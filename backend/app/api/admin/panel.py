"""
/api/admin/* — Admin Panel (PostgreSQL asosida).

Kirish faqat .env dagi ADMIN_EMAILS ro'yxatidagi email bilan ro'yxatdan
o'tgan (yoki role='admin' bo'lgan) foydalanuvchilarga ochiq (get_current_admin).
"""
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.db import get_db
from app.middleware.auth_middleware import get_current_admin
from app.models.db_models import Payment, PaymentStatus, Subscription, SubscriptionStatus, User

router = APIRouter()


@router.get("/dashboard/stats", dependencies=[Depends(get_current_admin)])
async def get_billing_statistics(db: AsyncSession = Depends(get_db)):
    total_income_result = await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.status == PaymentStatus.completed)
    )
    total_income = float(total_income_result.scalar_one())

    async def count_by_status(status: PaymentStatus) -> int:
        result = await db.execute(select(func.count(Payment.id)).where(Payment.status == status))
        return result.scalar_one()

    active_subs_result = await db.execute(
        select(func.count(Subscription.id)).where(Subscription.status == SubscriptionStatus.active)
    )
    total_users_result = await db.execute(select(func.count(User.id)))

    recent_payments_result = await db.execute(
        select(Payment).order_by(Payment.created_at.desc()).limit(50)
    )

    return {
        "metrics": {
            "total_income_uzs": total_income,
            "total_users": total_users_result.scalar_one(),
            "active_premium_users": active_subs_result.scalar_one(),
            "status_counters": {
                "pending": await count_by_status(PaymentStatus.pending),
                "failed": await count_by_status(PaymentStatus.failed),
                "refunded_or_canceled": await count_by_status(PaymentStatus.canceled),
                "completed": await count_by_status(PaymentStatus.completed),
            },
        },
        "raw_transactions": [
            {
                "id": str(p.id),
                "user_id": str(p.user_id),
                "amount": float(p.amount),
                "plan": p.plan.value,
                "provider": p.provider.value,
                "status": p.status.value,
                "created_at": p.created_at.isoformat(),
            }
            for p in recent_payments_result.scalars().all()
        ],
    }


@router.get("/users", dependencies=[Depends(get_current_admin)])
async def list_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    return {
        "total": len(users),
        "by_plan": {
            plan: sum(1 for u in users if u.plan.value == plan) for plan in ("free", "pro", "enterprise")
        },
        "users": [
            {
                "id": str(u.id),
                "name": u.username,
                "username": u.username,
                "email": u.email,
                "plan": u.plan.value,
                "role": u.role.value,
                "provider": "google" if u.google_id else "email",
                "is_banned": u.is_banned,
                "created_at": u.created_at.isoformat(),
            }
            for u in users
        ],
    }
