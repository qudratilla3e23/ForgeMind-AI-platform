"""
SQLAlchemy ORM modellari (PostgreSQL jadvallari).

Bu fayldagi klasslar Alembic autogenerate uchun "source of truth" hisoblanadi.
Pydantic (request/response) sxemalari uchun ``app/schemas/`` papkasiga qarang.
"""
import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.db import Base


def _uuid_pk() -> Mapped[uuid.UUID]:
    return mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


class PlanType(str, PyEnum):
    free = "free"
    pro = "pro"
    enterprise = "enterprise"


class UserRole(str, PyEnum):
    user = "user"
    admin = "admin"


class SubscriptionStatus(str, PyEnum):
    active = "active"
    canceled = "canceled"
    expired = "expired"


class PaymentProvider(str, PyEnum):
    click = "click"
    payme = "payme"


class PaymentStatus(str, PyEnum):
    pending = "pending"
    completed = "completed"
    failed = "failed"
    canceled = "canceled"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = _uuid_pk()
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    username: Mapped[str] = mapped_column(String(100), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="user_role"), default=UserRole.user, nullable=False)
    plan: Mapped[PlanType] = mapped_column(Enum(PlanType, name="plan_type"), default=PlanType.free, nullable=False)

    language: Mapped[str] = mapped_column(String(5), default="uz")
    theme: Mapped[str] = mapped_column(String(10), default="dark")

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_banned: Mapped[bool] = mapped_column(Boolean, default=False)

    google_id: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    chats: Mapped[list["Chat"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    subscriptions: Mapped[list["Subscription"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    payments: Mapped[list["Payment"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[uuid.UUID] = _uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="refresh_tokens")


class ChatFolder(Base):
    __tablename__ = "chat_folders"

    id: Mapped[uuid.UUID] = _uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    chats: Mapped[list["Chat"]] = relationship(back_populates="folder")


class Chat(Base):
    __tablename__ = "chats"

    id: Mapped[uuid.UUID] = _uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    folder_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("chat_folders.id", ondelete="SET NULL"), nullable=True)

    title: Mapped[str] = mapped_column(String(255), default="Yangi suhbat")
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship(back_populates="chats")
    folder: Mapped["ChatFolder | None"] = relationship(back_populates="chats")
    messages: Mapped[list["Message"]] = relationship(back_populates="chat", cascade="all, delete-orphan", order_by="Message.created_at")

    __table_args__ = (Index("ix_chats_user_updated", "user_id", "updated_at"),)


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = _uuid_pk()
    chat_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("chats.id", ondelete="CASCADE"), index=True)

    role: Mapped[str] = mapped_column(String(20))  # "user" | "assistant" | "system"
    content: Mapped[str] = mapped_column(Text)
    provider: Mapped[str | None] = mapped_column(String(50), nullable=True)  # qaysi AI provider javob berdi
    tokens_used: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    chat: Mapped["Chat"] = relationship(back_populates="messages")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[uuid.UUID] = _uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)

    plan: Mapped[PlanType] = mapped_column(Enum(PlanType, name="sub_plan_type"))
    status: Mapped[SubscriptionStatus] = mapped_column(Enum(SubscriptionStatus, name="sub_status"), default=SubscriptionStatus.active)

    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship(back_populates="subscriptions")


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = _uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)

    provider: Mapped[PaymentProvider] = mapped_column(Enum(PaymentProvider, name="payment_provider"))
    status: Mapped[PaymentStatus] = mapped_column(Enum(PaymentStatus, name="payment_status"), default=PaymentStatus.pending)

    amount: Mapped[float] = mapped_column(Numeric(12, 2))
    plan: Mapped[PlanType] = mapped_column(Enum(PlanType, name="payment_plan_type"))
    external_transaction_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship(back_populates="payments")

    __table_args__ = (UniqueConstraint("provider", "external_transaction_id", name="uq_provider_external_tx"),)
