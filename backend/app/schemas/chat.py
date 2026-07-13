from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel


class ChatMessage(BaseModel):
    """Frontend bilan mos — bitta xabar (rol + matn + ixtiyoriy rasm)."""
    role: Literal["user", "assistant"]
    content: str = ""
    image: Optional[str] = None  # data:image/png;base64,... — faqat oxirgi user xabarida


class ChatRequest(BaseModel):
    provider: Literal["openai", "claude", "gemini", "fireworks", "deepseek", "llama"]
    messages: list[ChatMessage]


class ChatResponse(BaseModel):
    reply: str
    provider: str


class AutoChatRequest(BaseModel):
    messages: list[ChatMessage]


class AutoChatResponse(BaseModel):
    reply: str
    provider: str
    reason: str


# --- Persistent chat (DB-backed history, Sidebar/Search/Favorite/Pin uchun) ---

class MessageOut(BaseModel):
    id: UUID
    role: str
    content: str
    provider: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatOut(BaseModel):
    id: UUID
    title: str
    is_pinned: bool
    is_favorite: bool
    is_archived: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ChatDetailOut(ChatOut):
    messages: list[MessageOut] = []


class CreateChatRequest(BaseModel):
    title: str = "Yangi suhbat"


class UpdateChatRequest(BaseModel):
    title: str | None = None
    is_pinned: bool | None = None
    is_favorite: bool | None = None
    is_archived: bool | None = None


class SendMessageRequest(BaseModel):
    content: str
    image: Optional[str] = None
    provider: Literal["auto", "openai", "claude", "gemini", "fireworks", "deepseek", "llama"] = "auto"


class SendMessageResponse(BaseModel):
    user_message: MessageOut
    assistant_message: MessageOut
    provider: str
    reason: str | None = None
