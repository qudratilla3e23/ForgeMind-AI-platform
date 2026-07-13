"""
AI Providerlarni chaqiruvchi funksiyalar.

Har bir funksiya bir xil interfeysga ega: ChatMessage ro'yxatini qabul qiladi,
matn javobini qaytaradi. Xato bo'lsa HTTPException ko'taradi (aniq sabab bilan).
"""
from fastapi import HTTPException

from app.core.config import settings
from app.schemas.chat import ChatMessage

import httpx


def _parse_data_url(data_url: str) -> tuple[str, str]:
    """'data:image/png;base64,AAAA...' -> ('image/png', 'AAAA...')"""
    header, _, b64data = data_url.partition(",")
    mime = "image/png"
    if header.startswith("data:") and ";base64" in header:
        mime = header[5:].split(";")[0] or mime
    return mime, b64data


# --- OpenAI (ChatGPT) ---

def _openai_message(m: ChatMessage) -> dict:
    if m.image:
        return {
            "role": m.role,
            "content": [
                {"type": "text", "text": m.content or "What's in this image?"},
                {"type": "image_url", "image_url": {"url": m.image}},
            ],
        }
    return {"role": m.role, "content": m.content}


async def call_openai(messages: list[ChatMessage]) -> str:
    if not settings.OPENAI_API_KEY:
        raise HTTPException(500, "OPENAI_API_KEY sozlanmagan (.env faylini tekshiring)")

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
            json={
                "model": "gpt-4o-mini",
                "messages": [_openai_message(m) for m in messages],
            },
        )
    if resp.status_code != 200:
        raise HTTPException(resp.status_code, f"OpenAI xatosi: {resp.text}")
    data = resp.json()
    return data["choices"][0]["message"]["content"]


# --- Claude (Anthropic) ---

def _claude_message(m: ChatMessage) -> dict:
    if m.image:
        mime, b64data = _parse_data_url(m.image)
        return {
            "role": m.role,
            "content": [
                {"type": "text", "text": m.content or "What's in this image?"},
                {"type": "image", "source": {"type": "base64", "media_type": mime, "data": b64data}},
            ],
        }
    return {"role": m.role, "content": m.content}


async def call_claude(messages: list[ChatMessage]) -> str:
    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(500, "ANTHROPIC_API_KEY sozlanmagan (.env faylini tekshiring)")

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": settings.ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-sonnet-4-5",
                "max_tokens": 1024,
                "messages": [_claude_message(m) for m in messages],
            },
        )
    if resp.status_code != 200:
        raise HTTPException(resp.status_code, f"Claude xatosi: {resp.text}")
    data = resp.json()
    return "".join(block.get("text", "") for block in data.get("content", []))


# --- Gemini (Google) ---

def _gemini_parts(m: ChatMessage) -> list[dict]:
    parts = [{"text": m.content}] if m.content else []
    if m.image:
        mime, b64data = _parse_data_url(m.image)
        parts.append({"inline_data": {"mime_type": mime, "data": b64data}})
    return parts or [{"text": ""}]


async def call_gemini(messages: list[ChatMessage]) -> str:
    if not settings.GOOGLE_API_KEY:
        raise HTTPException(500, "GOOGLE_API_KEY sozlanmagan (.env faylini tekshiring)")

    contents = [
        {"role": "model" if m.role == "assistant" else "user", "parts": _gemini_parts(m)}
        for m in messages
    ]
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"gemini-2.0-flash:generateContent?key={settings.GOOGLE_API_KEY}",
            json={"contents": contents},
        )
    if resp.status_code != 200:
        raise HTTPException(resp.status_code, f"Gemini xatosi: {resp.text}")
    data = resp.json()
    try:
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError):
        raise HTTPException(500, "Gemini javobini o'qib bo'lmadi")


# --- Fireworks AI (AMD MI300X — Llama, DeepSeek shu orqali ham ishlaydi) ---

FIREWORKS_MODELS = {
    "fireworks": "accounts/fireworks/models/llama-v3p1-405b-instruct",
    "llama": "accounts/fireworks/models/llama-v3p1-70b-instruct",
    "deepseek": "accounts/fireworks/models/deepseek-v3",
}


async def call_fireworks(messages: list[ChatMessage], model_key: str = "fireworks") -> str:
    if not settings.FIREWORKS_API_KEY:
        raise HTTPException(500, "FIREWORKS_API_KEY sozlanmagan (.env faylini tekshiring)")

    model = FIREWORKS_MODELS.get(model_key, FIREWORKS_MODELS["fireworks"])
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.fireworks.ai/inference/v1/chat/completions",
            headers={"Authorization": f"Bearer {settings.FIREWORKS_API_KEY}"},
            json={
                "model": model,
                "messages": [{"role": m.role, "content": m.content} for m in messages],
            },
        )
    if resp.status_code != 200:
        raise HTTPException(resp.status_code, f"Fireworks AI xatosi: {resp.text}")
    data = resp.json()
    return data["choices"][0]["message"]["content"]


PROVIDER_CONFIGURED = {
    "fireworks": lambda: bool(settings.FIREWORKS_API_KEY),
    "llama": lambda: bool(settings.FIREWORKS_API_KEY),
    "deepseek": lambda: bool(settings.FIREWORKS_API_KEY),
    "claude": lambda: bool(settings.ANTHROPIC_API_KEY),
    "openai": lambda: bool(settings.OPENAI_API_KEY),
    "gemini": lambda: bool(settings.GOOGLE_API_KEY),
}


async def call_provider(provider: str, messages: list[ChatMessage]) -> str:
    if provider == "openai":
        return await call_openai(messages)
    if provider == "claude":
        return await call_claude(messages)
    if provider == "gemini":
        return await call_gemini(messages)
    if provider in ("fireworks", "llama", "deepseek"):
        return await call_fireworks(messages, model_key=provider)
    raise HTTPException(400, "Noma'lum provider")
