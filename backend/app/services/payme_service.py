"""
Payme.uz (Paycom) integratsiyasi — Merchant API (JSON-RPC 2.0).

Hujjat: https://developer.help.paycom.uz
Oqim: CheckPerformTransaction -> CreateTransaction -> PerformTransaction
(muvaffaqiyatli bo'lsa) yoki CancelTransaction (bekor qilinsa).
Har bir so'rov HTTP Basic Auth orqali Secret/Test Key bilan tasdiqlanadi.
"""
import base64
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.db_models import PaymentStatus
from app.repositories.billing_repository import BillingRepository


class PaymeService:
    @staticmethod
    def is_configured() -> bool:
        return bool(settings.PAYME_MERCHANT_ID)

    @staticmethod
    def generate_checkout_url(transaction_id: UUID, amount: float) -> str:
        amount_in_tiyin = int(amount * 100)  # Payme summani tiyinda kutadi (1 so'm = 100 tiyin)
        params = f"m={settings.PAYME_MERCHANT_ID};ac.order_id={transaction_id};a={amount_in_tiyin}"
        encoded_params = base64.b64encode(params.encode("utf-8")).decode("utf-8")
        return f"https://checkout.paycom.uz/{encoded_params}"

    @classmethod
    async def process_rpc_request(cls, db: AsyncSession, request_data: dict, auth_header: str) -> dict:
        if not auth_header or not auth_header.startswith("Basic "):
            return {"error": {"code": -32300, "message": "Avtorizatsiya xatoligi (Basic token topilmadi)."}}

        try:
            encoded_credentials = auth_header.split(" ")[1]
            decoded = base64.b64decode(encoded_credentials).decode("utf-8")
            _username, password = decoded.split(":")
            if password != settings.PAYME_SECRET_KEY and password != settings.PAYME_TEST_KEY:
                return {"error": {"code": -32300, "message": "Kalit noto'g'ri (Bad credentials)."}}
        except Exception:
            return {"error": {"code": -32300, "message": "Xavfsizlik tekshiruvida xatolik yuz berdi."}}

        method = request_data.get("method")
        params = request_data.get("params", {})
        request_id = request_data.get("id")

        if method == "CheckPerformTransaction":
            return await cls._check_perform_transaction(db, params, request_id)
        elif method == "CreateTransaction":
            return await cls._create_transaction(db, params, request_id)
        elif method == "PerformTransaction":
            return await cls._perform_transaction(db, params, request_id)
        elif method == "CancelTransaction":
            return await cls._cancel_transaction(db, params, request_id)
        elif method == "CheckTransaction":
            return await cls._check_transaction(db, params, request_id)

        return {"error": {"code": -32601, "message": "Metod topilmadi."}, "id": request_id}

    @staticmethod
    async def _check_perform_transaction(db: AsyncSession, params: dict, request_id: int) -> dict:
        order_id = params.get("account", {}).get("order_id")
        if not order_id:
            return {"error": {"code": -31050, "message": "Hisob topilmadi (account.order_id bo'sh)."}, "id": request_id}

        payment = await BillingRepository.get_payment(db, UUID(order_id))
        if not payment:
            return {"error": {"code": -31050, "message": "Loyiha tizimida bunday shartnoma mavjud emas."}, "id": request_id}

        if payment.status in (PaymentStatus.completed, PaymentStatus.failed, PaymentStatus.canceled):
            return {"error": {"code": -31050, "message": "Tranzaksiya yakuniy statusda turibdi, to'lov amalga oshmaydi."}, "id": request_id}

        if int(float(payment.amount) * 100) != int(params.get("amount")):
            return {"error": {"code": -31001, "message": "To'lov summasi tizimdagi summa bilan mos emas."}, "id": request_id}

        return {"result": {"allow": True}, "id": request_id}

    @staticmethod
    async def _create_transaction(db: AsyncSession, params: dict, request_id: int) -> dict:
        order_id = params.get("account", {}).get("order_id")
        external_id = params.get("id")
        payme_time = params.get("time")

        payment = await BillingRepository.get_payment(db, UUID(order_id))
        if not payment:
            return {"error": {"code": -31050, "message": "Tranzaksiya topilmadi."}, "id": request_id}

        if payment.external_transaction_id and payment.external_transaction_id != external_id:
            return {"error": {"code": -31051, "message": "Ushbu shartnoma uchun boshqa faol to'lov ochilgan."}, "id": request_id}

        if payment.status == PaymentStatus.pending:
            await BillingRepository.update_payment(
                db, payment, status=PaymentStatus.pending, external_transaction_id=external_id
            )

        return {
            "result": {"create_time": payme_time, "transaction": str(payment.id), "state": 1},
            "id": request_id,
        }

    @staticmethod
    async def _perform_transaction(db: AsyncSession, params: dict, request_id: int) -> dict:
        external_id = params.get("id")
        payment = await BillingRepository.get_payment_by_external_id(db, external_id, "payme")

        if not payment:
            return {"error": {"code": -31003, "message": "Payme tranzaksiyasi bazadan topilmadi."}, "id": request_id}

        now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)

        if payment.status == PaymentStatus.completed:
            return {"result": {"transaction": str(payment.id), "perform_time": now_ms, "state": 2}, "id": request_id}

        if payment.status != PaymentStatus.pending:
            return {"error": {"code": -31008, "message": "Tranzaksiyani yakunlash imkonsiz holatda."}, "id": request_id}

        await BillingRepository.update_payment(db, payment, status=PaymentStatus.completed)
        await BillingRepository.activate_subscription(db, payment.user_id, payment.plan.value)

        return {"result": {"transaction": str(payment.id), "perform_time": now_ms, "state": 2}, "id": request_id}

    @staticmethod
    async def _cancel_transaction(db: AsyncSession, params: dict, request_id: int) -> dict:
        external_id = params.get("id")
        payment = await BillingRepository.get_payment_by_external_id(db, external_id, "payme")

        if not payment:
            return {"error": {"code": -31003, "message": "Tranzaksiya topilmadi."}, "id": request_id}

        now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)

        if payment.status == PaymentStatus.canceled:
            state = -1 if payment.status == PaymentStatus.pending else -2
            return {"result": {"transaction": str(payment.id), "cancel_time": now_ms, "state": state}, "id": request_id}

        await BillingRepository.update_payment(db, payment, status=PaymentStatus.canceled)

        return {"result": {"transaction": str(payment.id), "cancel_time": now_ms, "state": -1}, "id": request_id}

    @staticmethod
    async def _check_transaction(db: AsyncSession, params: dict, request_id: int) -> dict:
        external_id = params.get("id")
        payment = await BillingRepository.get_payment_by_external_id(db, external_id, "payme")

        if not payment:
            return {"error": {"code": -31003, "message": "Tranzaksiya topilmadi."}, "id": request_id}

        state = 1
        if payment.status == PaymentStatus.completed:
            state = 2
        elif payment.status == PaymentStatus.canceled:
            state = -1

        created_ms = int(payment.created_at.timestamp() * 1000)
        updated_ms = int(payment.updated_at.timestamp() * 1000)

        return {
            "result": {
                "create_time": created_ms,
                "perform_time": updated_ms if payment.status == PaymentStatus.completed else 0,
                "cancel_time": updated_ms if payment.status == PaymentStatus.canceled else 0,
                "transaction": str(payment.id),
                "state": state,
                "reason": None,
            },
            "id": request_id,
        }
