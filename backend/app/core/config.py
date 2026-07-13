"""
Markaziy sozlamalar (Settings).

Barcha environment o'zgaruvchilar shu yerda bitta joyda e'lon qilinadi.
E'TIBOR: Payme/Click/Supabase kabi ixtiyoriy integratsiyalar default="" bilan
belgilangan — ular sozlanmagan bo'lsa ham backend ishga tushaveradi
(faqat o'sha xususiyat o'chiq turadi). Bu development va hackathon-demo
muhitida qulaylik uchun muhim.
"""
from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "ForgeMind AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENV: str = Field(default="development", description="development | staging | production")

    # --- Database (PostgreSQL) ---
    # Lokal ishga tushirish uchun default qiymat docker-compose'dagi
    # "postgres" xizmatiga mos keladi.
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://forgemind:forgemind@localhost:5432/forgemind",
        description="SQLAlchemy async DSN, masalan: postgresql+asyncpg://user:pass@host:5432/db",
    )
    DATABASE_ECHO: bool = False

    # --- Redis (cache, rate-limit, sessiya) ---
    REDIS_URL: str = Field(default="redis://localhost:6379/0")

    # --- JWT / Auth ---
    JWT_SECRET: str = Field(default="CHANGE_ME_IN_PRODUCTION", env="JWT_SECRET")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 30

    # --- CORS ---
    ALLOWED_ORIGINS_RAW: str = Field(default="http://localhost:5173", env="ALLOWED_ORIGINS")

    @property
    def ALLOWED_ORIGINS(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS_RAW.split(",") if o.strip()]

    # --- Admin ---
    ADMIN_EMAILS_RAW: str = Field(default="", env="ADMIN_EMAILS")

    @property
    def ADMIN_EMAILS(self) -> List[str]:
        return [e.strip().lower() for e in self.ADMIN_EMAILS_RAW.split(",") if e.strip()]

    # --- AI Providerlar ---
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    FIREWORKS_API_KEY: str = ""

    # --- Google OAuth ---
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # --- Payme.uz ---
    PAYME_MERCHANT_ID: str = ""
    PAYME_SECRET_KEY: str = ""
    PAYME_TEST_KEY: str = ""

    # --- Click.uz ---
    CLICK_SERVICE_ID: str = ""
    CLICK_MERCHANT_ID: str = ""
    CLICK_SECRET_KEY: str = ""

    # --- Stripe (ixtiyoriy, xalqaro kartalar uchun) ---
    STRIPE_SECRET_KEY: str = ""

    # --- Supabase (legacy — bosqichma-bosqich PostgreSQL'ga ko'chirilmoqda) ---
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
