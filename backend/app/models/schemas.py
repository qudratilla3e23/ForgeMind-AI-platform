"""To'lov (billing) bilan bog'liq Pydantic sxemalari."""
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class CheckoutRequest(BaseModel):
    plan: str = Field(description="'pro' yoki 'enterprise'")
    provider: str = Field(description="'click', 'payme' yoki 'stripe'")


class CheckoutResponse(BaseModel):
    status: str = "success"
    configured: bool = True
    url: str
    payment_id: str


class ClickWebhookForm(BaseModel):
    click_trans_id: int
    service_id: int
    click_paydoc_id: int
    merchant_trans_id: str
    amount: float
    action: int
    error: int
    error_note: Optional[str] = None
    sign_time: str
    sign_string: str


class PaymeRPCRequest(BaseModel):
    method: str
    params: Dict[str, Any]
    id: Optional[int] = None
