from fastapi import APIRouter, Depends, HTTPException
from app.middleware.auth_middleware import get_current_user
from app.models.schemas import UserSession
from app.database.session import supabase_client
import httpx
import os

router = APIRouter()

FIREWORKS_API_KEY = os.getenv("FIREWORKS_API_KEY")
FIREWORKS_URL = "https://api.fireworks.ai/inference/v1/chat/completions"

@router.post("/ai/generate")
async def generate_ai_response(prompt: str, current_user: UserSession = Depends(get_current_user)):
    # 1. Foydalanuvchining limitini (urinishlarini) tekshirish
    sub_res = supabase_client.table("subscriptions").select("status").eq("user_id", str(current_user.id)).eq("status", "active").execute()
    
    # Agar premium bo'lmasa, tekin urinishlar sonini tekshirish
    if not sub_res.data:
        usage_res = supabase_client.table("user_usage").select("runs").eq("user_id", str(current_user.id)).execute()
        runs = usage_res.data[0]["runs"] if usage_res.data else 0
        if runs >= 100: # Free limit
            raise HTTPException(status_code=403, detail="Siz oylik bepul limitga yetdingiz. Iltimos tarifni yangilang.")
        
        # Urinishni 1 taga oshirish
        supabase_client.table("user_usage").upsert({"user_id": str(current_user.id), "runs": runs + 1}).execute()

    # 2. Fireworks AI API (DeepSeek / Llama) ga so'rov yuborish
    if not FIREWORKS_API_KEY:
        raise HTTPException(status_code=500, detail="AI API Kaliti topilmadi (.env faylini tekshiring).")

    headers = {
        "Authorization": f"Bearer {FIREWORKS_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "accounts/fireworks/models/deepseek-v3", # yoki llama-v3-70b
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 1024,
        "temperature": 0.7
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(FIREWORKS_URL, json=payload, headers=headers, timeout=30.0)
            if response.status_code != 200:
                raise HTTPException(status_code=500, detail="AI provayderida xatolik yuz berdi.")
            
            result = response.json()
            ai_text = result["choices"][0]["message"]["content"]
            return {"status": "success", "response": ai_text}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Aloqa xatosi: {str(e)}")