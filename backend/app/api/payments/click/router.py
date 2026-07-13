from fastapi import APIRouter, Depends, Form
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.db import get_db
from app.models.schemas import ClickWebhookForm
from app.services.click_service import ClickService

router = APIRouter()


@router.post("/callback")
async def click_webhook_callback(
    click_trans_id: int = Form(...),
    service_id: int = Form(...),
    click_paydoc_id: int = Form(...),
    merchant_trans_id: str = Form(...),
    amount: float = Form(...),
    action: int = Form(...),
    error: int = Form(...),
    sign_time: str = Form(...),
    sign_string: str = Form(...),
    error_note: str = Form(None),
    db: AsyncSession = Depends(get_db),
):
    form_data = ClickWebhookForm(
        click_trans_id=click_trans_id,
        service_id=service_id,
        click_paydoc_id=click_paydoc_id,
        merchant_trans_id=merchant_trans_id,
        amount=amount,
        action=action,
        error=error,
        sign_time=sign_time,
        sign_string=sign_string,
        error_note=error_note,
    )

    result = await ClickService.validate_and_process(db, form_data)
    return result
