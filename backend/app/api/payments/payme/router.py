from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.db import get_db
from app.services.payme_service import PaymeService

router = APIRouter()


@router.post("/callback")
async def payme_webhook_callback(
    request: Request,
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db),
):
    body = await request.json()
    response = await PaymeService.process_rpc_request(db, body, authorization)
    return response
