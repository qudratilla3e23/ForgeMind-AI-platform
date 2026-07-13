"""
/api/payments/checkout/* — Premium reja uchun to'lov sessiyasi yaratish.

Qo'llab-quvvatlanadigan provayderlar: Click.uz, Payme.uz (asosiy — O'zbekiston
uchun), va ixtiyoriy ravishda Stripe (xalqaro kartalar, sozlangan bo'lsa).
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.database.db import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.db_models import User
from app.models.schemas import CheckoutRequest, CheckoutResponse
from app.repositories.billing_repository import PLAN_PRICES_UZS, BillingRepository
from app.services.click_service import ClickService
from app.services.payme_service import PaymeService

router = APIRouter()


@router.post("/checkout/create", response_model=CheckoutResponse, status_code=status.HTTP_201_CREATED)
async def create_checkout_session(
    payload: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    plan = payload.plan.lower()
    provider = payload.provider.lower()

    if plan not in PLAN_PRICES_UZS:
        raise HTTPException(status_code=404, detail="Ko'rsatilgan Premium reja topilmadi (pro | enterprise).")

    amount = PLAN_PRICES_UZS[plan]

    if provider == "payme":
        if not PaymeService.is_configured():
            raise HTTPException(status_code=503, detail=_not_configured_message("Payme"))
        payment = await BillingRepository.create_payment(db, current_user.id, plan, amount, "payme")
        checkout_url = PaymeService.generate_checkout_url(payment.id, amount)

    elif provider == "click":
        if not ClickService.is_configured():
            raise HTTPException(status_code=503, detail=_not_configured_message("Click"))
        payment = await BillingRepository.create_payment(db, current_user.id, plan, amount, "click")
        checkout_url = ClickService.generate_checkout_url(payment.id, amount)

    elif provider in ("visa", "mastercard", "stripe", "direct_card"):
        checkout_url = await _create_stripe_session(plan, amount, current_user.id)
        # Stripe uchun ham izlash imkoni bo'lishi uchun "click" enum qiymati bilan yozamiz emas —
        # bu yerda alohida provider ustunga yozish uchun DB modelida "stripe" ni ham
        # PaymentProvider enumiga qo'shish tavsiya etiladi (hozircha click/payme asosiy yo'nalish).
        raise HTTPException(
            status_code=501,
            detail="Stripe integratsiyasi hozircha PostgreSQL modeliga to'liq ko'chirilmagan "
            "(faqat Click/Payme production-ready). Iltimos, 'click' yoki 'payme' tanlang.",
        )
    else:
        raise HTTPException(status_code=400, detail="Noma'lum billing provayder.")

    return CheckoutResponse(url=checkout_url, payment_id=str(payment.id))


def _not_configured_message(provider_name: str) -> str:
    return (
        f"{provider_name} hali sozlanmagan. {provider_name}.uz'da biznes sifatida ro'yxatdan "
        "o'ting, kerakli kalitlarni oling va backend/.env fayliga qo'shing."
    )


async def _create_stripe_session(plan: str, amount: float, user_id) -> str:
    if not getattr(settings, "STRIPE_SECRET_KEY", ""):
        raise HTTPException(status_code=503, detail="Stripe sozlanmagan (STRIPE_SECRET_KEY yo'q).")
    import stripe

    stripe.api_key = settings.STRIPE_SECRET_KEY
    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[
            {
                "price_data": {
                    "currency": "uzs",
                    "product_data": {"name": f"ForgeMind {plan.upper()} Plan"},
                    "unit_amount": int(amount) * 100,
                },
                "quantity": 1,
            }
        ],
        mode="payment",
        success_url=f"{settings.ALLOWED_ORIGINS[0]}/console/wallet?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{settings.ALLOWED_ORIGINS[0]}/console/wallet?status=cancel",
        client_reference_id=str(user_id),
    )
    return session.url
