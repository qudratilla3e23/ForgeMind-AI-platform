import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

# Local Imports
from app.api.admin.panel import router as admin_router
from app.api.payments.checkout import router as checkout_router
from app.api.payments.click.router import router as click_router
from app.api.payments.payme.router import router as payme_router
from app.api.routers.auth import router as auth_router
from app.api.routers.chat import router as chat_router
from app.core.config import settings
from app.database.db import init_models

# --- Logging Configuration ---
logging.basicConfig(
    level=logging.INFO if settings.ENV == "production" else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)

# --- Lifespan Manager ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Database initialization & Resource setup
    logger.info("Initializing ForgeMind Enterprise Backend...")
    try:
        await init_models()
        logger.info("Database models initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
    
    yield
    
    # Shutdown: Cleanup resources
    logger.info("Shutting down ForgeMind Backend...")

# --- FastAPI App Initialization ---
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="ForgeMind Enterprise AI SaaS Platform. Unified Backend for multi-model AI routing.",
    version=settings.VERSION,
    lifespan=lifespan,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)

# --- Middlewares ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.ALLOWED_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.ALLOWED_HOSTS or ["*"])
app.add_middleware(GZipMiddleware, minimum_size=1000)

# --- Exception Handlers ---
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors(), "message": "Validation failed"},
    )

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

# --- Routers ---
app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])
app.include_router(chat_router, prefix="/api", tags=["Chat"])
app.include_router(checkout_router, prefix="/api/payments", tags=["Payments"])
app.include_router(click_router, prefix="/api/payments/click", tags=["Payments - Click"])
app.include_router(payme_router, prefix="/api/payments/payme", tags=["Payments - Payme"])
app.include_router(admin_router, prefix="/api/admin", tags=["Admin"])

# --- Base Endpoints ---
@app.get("/", tags=["General"])
async def root():
    return {"message": f"Welcome to {settings.PROJECT_NAME} API"}

@app.get("/api/health", tags=["General"])
async def health_check():
    from app.services.ai.providers import PROVIDER_CONFIGURED
    return {
        "status": "healthy",
        "version": settings.VERSION,
        "environment": settings.ENV,
        "providers": {name: fn() for name, fn in PROVIDER_CONFIGURED.items()},
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=settings.ENV != "production")