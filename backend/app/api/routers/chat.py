"""
/api/chat/* — AI suhbat endpointlari.

IKKI XIL ISHLASH REJIMI:
  1) Stateless (frontend bilan hozirgi mos): POST /api/chat, POST /api/chat/auto
     — autentifikatsiya SHART EMAS, tarix frontendning o'zida (localStorage) saqlanadi.
     Bu eski endpoint kontrakti bilan bir xil, shuning uchun frontendni o'zgartirmasdan
     ham AI javob bera boshlaydi.
  2) Persistent (DB-backed, keyingi bosqichlar uchun fundament): /api/chats/*
     — JWT bilan himoyalangan, suhbatlar va xabarlar PostgreSQL'da saqlanadi
     (Rename/Pin/Favorite/Search/Infinite History uchun tayyor).
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.db import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.db_models import Chat, Message, User
from app.schemas.chat import (
    AutoChatRequest,
    AutoChatResponse,
    ChatDetailOut,
    ChatOut,
    ChatRequest,
    ChatResponse,
    CreateChatRequest,
    MessageOut,
    SendMessageRequest,
    SendMessageResponse,
    UpdateChatRequest,
)
from app.services.ai.providers import call_provider
from app.services.ai.router import classify_prompt

router = APIRouter()


# --- 1) Stateless — frontendning hozirgi askAI/askAIAuto bilan bir xil kontrakt ---

@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    reply = await call_provider(req.provider, req.messages)
    return ChatResponse(reply=reply, provider=req.provider)


@router.post("/chat/auto", response_model=AutoChatResponse)
async def chat_auto(req: AutoChatRequest):
    last_user_msg = next((m for m in reversed(req.messages) if m.role == "user"), None)
    last_user_text = last_user_msg.content if last_user_msg else ""
    has_image = bool(last_user_msg and last_user_msg.image)
    provider, reason = classify_prompt(last_user_text, has_image)
    reply = await call_provider(provider, req.messages)
    return AutoChatResponse(reply=reply, provider=provider, reason=reason)


# --- 2) Persistent — DB-backed suhbat tarixi (JWT bilan himoyalangan) ---

@router.get("/chats", response_model=list[ChatOut])
async def list_chats(
    search: str | None = None,
    favorite_only: bool = False,
    archived: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Chat).where(Chat.user_id == current_user.id, Chat.is_archived.is_(archived))
    if search:
        query = query.where(Chat.title.ilike(f"%{search}%"))
    if favorite_only:
        query = query.where(Chat.is_favorite.is_(True))
    query = query.order_by(Chat.is_pinned.desc(), Chat.updated_at.desc())

    result = await db.execute(query)
    return result.scalars().all()


@router.post("/chats", response_model=ChatOut, status_code=201)
async def create_chat(
    payload: CreateChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    chat_row = Chat(user_id=current_user.id, title=payload.title)
    db.add(chat_row)
    await db.commit()
    await db.refresh(chat_row)
    return chat_row


async def _get_owned_chat(db: AsyncSession, chat_id: uuid.UUID, user_id: uuid.UUID) -> Chat:
    result = await db.execute(select(Chat).where(Chat.id == chat_id, Chat.user_id == user_id))
    chat_row = result.scalar_one_or_none()
    if not chat_row:
        raise HTTPException(status_code=404, detail="Suhbat topilmadi.")
    return chat_row


@router.get("/chats/{chat_id}", response_model=ChatDetailOut)
async def get_chat(
    chat_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    chat_row = await _get_owned_chat(db, chat_id, current_user.id)
    msg_result = await db.execute(select(Message).where(Message.chat_id == chat_id).order_by(Message.created_at))
    messages = msg_result.scalars().all()
    detail = ChatDetailOut.model_validate(chat_row)
    detail.messages = [MessageOut.model_validate(m) for m in messages]
    return detail


@router.patch("/chats/{chat_id}", response_model=ChatOut)
async def update_chat(
    chat_id: uuid.UUID,
    payload: UpdateChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    chat_row = await _get_owned_chat(db, chat_id, current_user.id)
    if payload.title is not None:
        chat_row.title = payload.title
    if payload.is_pinned is not None:
        chat_row.is_pinned = payload.is_pinned
    if payload.is_favorite is not None:
        chat_row.is_favorite = payload.is_favorite
    if payload.is_archived is not None:
        chat_row.is_archived = payload.is_archived
    await db.commit()
    await db.refresh(chat_row)
    return chat_row


@router.delete("/chats/{chat_id}", status_code=204)
async def delete_chat(
    chat_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    chat_row = await _get_owned_chat(db, chat_id, current_user.id)
    await db.delete(chat_row)
    await db.commit()
    return None


@router.post("/chats/{chat_id}/messages", response_model=SendMessageResponse)
async def send_message(
    chat_id: uuid.UUID,
    payload: SendMessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    chat_row = await _get_owned_chat(db, chat_id, current_user.id)

    user_msg = Message(chat_id=chat_row.id, role="user", content=payload.content)
    db.add(user_msg)
    await db.commit()
    await db.refresh(user_msg)

    # Suhbat tarixini AI provider uchun tayyorlaymiz
    from app.schemas.chat import ChatMessage as AIChatMessage

    hist_result = await db.execute(select(Message).where(Message.chat_id == chat_row.id).order_by(Message.created_at))
    history = [AIChatMessage(role=m.role, content=m.content) for m in hist_result.scalars().all()]

    reason = None
    if payload.provider == "auto":
        provider, reason = classify_prompt(payload.content, has_image=bool(payload.image))
    else:
        provider = payload.provider

    reply_text = await call_provider(provider, history)

    assistant_msg = Message(chat_id=chat_row.id, role="assistant", content=reply_text, provider=provider)
    db.add(assistant_msg)

    # Birinchi xabar bo'lsa, suhbat sarlavhasini avtomatik belgilaymiz
    if chat_row.title == "Yangi suhbat":
        chat_row.title = (payload.content[:50] + "…") if len(payload.content) > 50 else payload.content

    await db.commit()
    await db.refresh(assistant_msg)

    return SendMessageResponse(
        user_message=MessageOut.model_validate(user_msg),
        assistant_message=MessageOut.model_validate(assistant_msg),
        provider=provider,
        reason=reason,
    )
