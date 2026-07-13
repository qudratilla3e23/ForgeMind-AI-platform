"""
Billing Repository — PostgreSQL (SQLAlchemy async) asosida.

E'TIBOR: Bu fayl ilgari Supabase jadvallariga (`transactions`, `plans`,
`subscriptions`) murojaat qilar edi. Endi to'g'ridan-to'g'ri bizning
PostgreSQL bazamizdagi `payments`/`subscriptions`/`users` jadvallari bilan
ishlaydi (app/models/db_models.py).

Alohida "plans" jadvali yo'q — narxlar PLAN_PRICES_UZS lug'atida statik
belgilangan (production'da buni admin panel orqali boshqariladigan jadvalga
aylantirish mumkin).
"""
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db_models import (
    Payment,
    PaymentProvider,
    PaymentStatus,
    PlanType,
    Subscription,
    SubscriptionStatus,
    User,
)

# Taxminiy narxlar (so'mda) — o'zingizga moslab sozlang
PLAN_PRICES_UZS: dict[str, float] = {
    "pro": 250_000,
    "enterprise": 1_250_000,
}


class BillingRepository:
    @staticmethod
    async def create_payment(db: AsyncSession, user_id: UUID, plan: str, amount: float, provider: str) -> Payment:
        payment = Payment(
            user_id=user_id,
            plan=PlanType(plan),
            amount=amount,
            provider=PaymentProvider(provider),
            status=PaymentStatus.pending,
        )
        db.add(payment)
        await db.commit()
        await db.refresh(payment)
        return payment

    @staticmethod
    async def get_payment(db: AsyncSession, payment_id: UUID) -> Payment | None:
        result = await db.execute(select(Payment).where(Payment.id == payment_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_payment_by_external_id(db: AsyncSession, external_id: str, provider: str) -> Payment | None:
        result = await db.execute(
            select(Payment).where(
                Payment.external_transaction_id == external_id,
                Payment.provider == PaymentProvider(provider),
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def update_payment(db: AsyncSession, payment: Payment, **fields) -> Payment:
        for key, value in fields.items():
            setattr(payment, key, value)
        await db.commit()
        await db.refresh(payment)
        return payment

    @staticmethod
    async def activate_subscription(db: AsyncSession, user_id: UUID, plan: str) -> Subscription:
        now = datetime.now(timezone.utc)

        # Mavjud faol obunalarni "expired" qilib belgilaymiz
        result = await db.execute(
            select(Subscription).where(Subscription.user_id == user_id, Subscription.status == SubscriptionStatus.active)
        )
        for existing in result.scalars().all():
            existing.status = SubscriptionStatus.expired

        subscription = Subscription(
            user_id=user_id,
            plan=PlanType(plan),
            status=SubscriptionStatus.active,
            started_at=now,
            expires_at=now + timedelta(days=30),
        )
        db.add(subscription)

        # Foydalanuvchining joriy rejasini yangilaymiz
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if user:
            user.plan = PlanType(plan)

        await db.commit()
        await db.refresh(subscription)
        return subscription
