"""
Click.uz integratsiyasi.

Hujjat: https://docs.click.uz
Oqim: Click "Prepare" (action=0) va "Complete" (action=1) so'rovlarini
merchant_trans_id (bizning Payment.id) orqali yuboradi. Har bir so'rovda
MD5 imzo tekshiriladi — bu XAVFSIZLIK UCHUN MUHIM (soxta so'rovlarning
oldini oladi).
"""
import hashlib
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.db_models import PaymentStatus
from app.models.schemas import ClickWebhookForm
from app.repositories.billing_repository import BillingRepository


class ClickService:
    @staticmethod
    def is_configured() -> bool:
        return bool(settings.CLICK_SERVICE_ID and settings.CLICK_MERCHANT_ID)

    @staticmethod
    def generate_checkout_url(transaction_id: UUID, amount: float) -> str:
        return (
            "https://my.click.uz/services/pay"
            f"?service_id={settings.CLICK_SERVICE_ID}"
            f"&merchant_id={settings.CLICK_MERCHANT_ID}"
            f"&amount={amount:.2f}"
            f"&transaction_param={transaction_id}"
        )

    @classmethod
    async def validate_and_process(cls, db: AsyncSession, form: ClickWebhookForm) -> dict:
        # Click xavfsizlik hujjati bo'yicha MD5 xesh tekshiruvi (soxta so'rovlar oldini olish)
        sign_str = (
            f"{form.click_trans_id}{form.service_id}{settings.CLICK_MERCHANT_ID}"
            f"{form.merchant_trans_id}{form.amount}{form.action}"
            f"{form.sign_time}{settings.CLICK_SECRET_KEY}"
        )
        calculated_sign = hashlib.md5(sign_str.encode("utf-8")).hexdigest()

        if calculated_sign != form.sign_string:
            return {"error": -1, "error_note": "Sign string tekshiruvi muvaffaqiyatsiz tugadi (Imzo xato)."}

        payment = await BillingRepository.get_payment(db, UUID(form.merchant_trans_id))
        if not payment:
            return {"error": -5, "error_note": "Tizimda bunday buyurtma/shartnoma topilmadi."}

        if float(payment.amount) != float(form.amount):
            return {"error": -2, "error_note": "To'lov summasi bazadagi narx bilan mos kelmadi."}

        if payment.status == PaymentStatus.canceled:
            return {"error": -9, "error_note": "Tranzaksiya allaqachon bekor qilingan."}

        # Action = 0: Prepare bosqichi
        if form.action == 0:
            if payment.status == PaymentStatus.pending:
                await BillingRepository.update_payment(
                    db, payment, status=PaymentStatus.pending, external_transaction_id=str(form.click_trans_id)
                )
            return {
                "click_trans_id": form.click_trans_id,
                "merchant_trans_id": form.merchant_trans_id,
                "merchant_prepare_id": form.merchant_trans_id,
                "error": 0,
                "error_note": "Success",
            }

        # Action = 1: Complete bosqichi
        elif form.action == 1:
            if payment.status == PaymentStatus.completed:
                return {
                    "click_trans_id": form.click_trans_id,
                    "merchant_trans_id": form.merchant_trans_id,
                    "merchant_confirm_id": form.merchant_trans_id,
                    "error": 0,
                    "error_note": "Success",
                }

            await BillingRepository.update_payment(db, payment, status=PaymentStatus.completed)
            await BillingRepository.activate_subscription(db, payment.user_id, payment.plan.value)

            return {
                "click_trans_id": form.click_trans_id,
                "merchant_trans_id": form.merchant_trans_id,
                "merchant_confirm_id": form.merchant_trans_id,
                "error": 0,
                "error_note": "Success",
            }

        return {"error": -3, "error_note": "Action qiymati noto'g'ri yuborildi."}
