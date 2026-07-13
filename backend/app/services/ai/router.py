"""
AI Auto Routing — foydalanuvchi model tanlamasa, promptni tahlil qilib eng
mos providerni tanlaydi va TANLASH SABABINI qaytaradi (frontendda ko'rsatiladi).

Ustuvorlik tartibi (agar tanlangan provider sozlanmagan bo'lsa, keyingisiga o'tadi):
    1. Fireworks AI (AMD)  — tezkor, arzon, default
    2. Claude              — kod va murakkab mulohaza
    3. GPT (OpenAI)        — umumiy maqsad
    4. Gemini              — vizual/multimodal
    5. DeepSeek            — matematik/mantiqiy vazifalar
    6. Llama               — ochiq, umumiy zaxira variant
"""
import re

from fastapi import HTTPException

from app.services.ai.providers import PROVIDER_CONFIGURED

CODE_PATTERN = re.compile(
    r"\b(code|kod|dastur|function|funksiya|script|bug|debug|algorithm|python|javascript|react|sql)\b",
    re.IGNORECASE,
)
VISION_PATTERN = re.compile(r"\b(image|rasm|photo|surat|screenshot|vision|tasvir)\b", re.IGNORECASE)
REASONING_PATTERN = re.compile(r"\b(tahlil qil|compare|strategy|strategiya|nega|why|reasoning|xulosa)\b", re.IGNORECASE)
MATH_PATTERN = re.compile(r"\b(hisobla|calculate|equation|tenglama|matemat|logic|mantiq)\b", re.IGNORECASE)


def classify_prompt(text: str, has_image: bool = False) -> tuple[str, str]:
    """Prompt matnini (va rasm biriktirilganini) tahlil qilib, (provider, sabab) qaytaradi."""
    if has_image:
        candidate, reason = "openai", "Rasm biriktirilgani aniqlandi — GPT Vision tasvirni tahlil qilish uchun tanlandi."
    elif VISION_PATTERN.search(text):
        candidate, reason = "gemini", "Rasm/vizual tahlil so'rovi aniqlandi — Gemini vizual modelga yo'naltirildi."
    elif CODE_PATTERN.search(text):
        candidate, reason = "claude", "Kod bilan bog'liq so'rov aniqlandi — Claude kodlashda kuchli bo'lgani uchun tanlandi."
    elif REASONING_PATTERN.search(text):
        candidate, reason = "gemini", "Murakkab tahlil/mulohaza so'rovi — kengaytirilgan mulohaza uchun Gemini tanlandi."
    elif MATH_PATTERN.search(text):
        candidate, reason = "deepseek", "Matematik/mantiqiy vazifa aniqlandi — DeepSeek shu turdagi vazifalarda kuchli."
    else:
        candidate, reason = "fireworks", "Standart so'rov — AMD GPU'da ishlaydigan Fireworks AI (default, eng tezkor) tanlandi."

    priority = ["openai", "claude", "gemini"] if has_image else ["fireworks", "claude", "openai", "gemini", "deepseek", "llama"]
    if PROVIDER_CONFIGURED.get(candidate, lambda: False)():
        return candidate, reason

    for p in priority:
        if PROVIDER_CONFIGURED.get(p, lambda: False)():
            return p, f"{reason} ({candidate} sozlanmagan, shuning uchun ustuvorlik bo'yicha {p} ishlatildi.)"

    raise HTTPException(500, "Hech qanday AI provider sozlanmagan. .env faylida kamida bitta API kalit kiriting.")
