export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Qaytaradi: { ok, offline, reply?, error? }
 *   - offline: true — backend umuman ishlamayapti (tarmoq xatosi yoki hali
 *     ishga tushirilmagan). Chaqiruvchi tomon demo javobga o'tishi mumkin.
 *   - offline: false, ok: false — backend ishlayapti, lekin xato qaytardi
 *     (masalan API kalit sozlanmagan). Bu holatni foydalanuvchiga ANIQ
 *     ko'rsatish kerak — demo javob bilan yashirish emas.
 */
export async function askAI(provider, messages) {
  try {
    const res = await fetch(`${API_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        provider,
        messages: messages.map((m) => ({ role: m.role, content: m.text || "" })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, offline: false, error: data.detail || "AI xatosi" };
    return { ok: true, offline: false, reply: data.reply, provider: data.provider };
  } catch {
    return { ok: false, offline: true, error: "Backend bilan aloqa yo'q" };
  }
}

/**
 * Auto-routing: backend promptni tahlil qilib eng mos modelni tanlaydi
 * va TANLASH SABABINI qaytaradi.
 */
export async function askAIAuto(messages) {
  try {
    const res = await fetch(`${API_URL}/api/chat/auto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        messages: messages.map((m) => ({ role: m.role, content: m.text || "" })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, offline: false, error: data.detail || "AI xatosi" };
    return { ok: true, offline: false, reply: data.reply, provider: data.provider, reason: data.reason };
  } catch {
    return { ok: false, offline: true, error: "Backend bilan aloqa yo'q" };
  }
}

/**
 * Auth so'rovlari uchun umumiy yordamchi.
 * Qaytaradi: { ok, offline, data?, error? }
 */
async function authRequest(path, body) {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, offline: false, error: data.detail || "Xatolik yuz berdi" };
    }
    return { ok: true, offline: false, data };
  } catch {
    return { ok: false, offline: true, error: "Backend bilan aloqa yo'q" };
  }
}

export async function registerUser(name, email, password) {
  const result = await authRequest("/api/auth/register", { username: name, email, password });
  return _normalizeTokenResponse(result);
}

export async function loginUser(email, password) {
  const result = await authRequest("/api/auth/login", { email, password, remember_me: true });
  return _normalizeTokenResponse(result);
}

export async function googleAuth(idToken) {
  const result = await authRequest("/api/auth/google", { id_token: idToken });
  return _normalizeTokenResponse(result);
}

/**
 * Backend {access_token, refresh_token, user} qaytaradi. Qolgan frontend kodi
 * (AuthModal, App.jsx) result.data.token / result.data.user shaklida kutadi —
 * shu yerda bitta joyda moslaymiz, boshqa joyларни o'zgartirish shart emas.
 */
function _normalizeTokenResponse(result) {
  if (!result.ok || !result.data?.access_token) return result;
  if (result.data.refresh_token) {
    window.localStorage.setItem("cw-refresh-token", result.data.refresh_token);
  }
  const backendUser = result.data.user;
  const user = backendUser
    ? { ...backendUser, name: backendUser.username, is_admin: backendUser.role === "admin" }
    : backendUser;
  return {
    ...result,
    data: { ...result.data, token: result.data.access_token, user },
  };
}

/** Bearer token bilan himoyalangan GET so'rov. */
async function authedGet(path, token) {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, offline: false, error: data.detail || "Xatolik yuz berdi" };
    return { ok: true, offline: false, data };
  } catch {
    return { ok: false, offline: true, error: "Backend bilan aloqa yo'q" };
  }
}

export function fetchAdminUsers(token) {
  return authedGet("/api/admin/users", token);
}

/**
 * Umumiy so'rov yordamchisi: har qanday method (GET/POST/PATCH/DELETE) va
 * Bearer token bilan. /api/chats/* uchun ishlatiladi.
 */
async function authedRequest(path, token, method = "GET", body) {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(25000),
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
    if (res.status === 204) return { ok: true, offline: false, data: null };
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, offline: false, error: data.detail || "Xatolik yuz berdi" };
    return { ok: true, offline: false, data };
  } catch {
    return { ok: false, offline: true, error: "Backend bilan aloqa yo'q" };
  }
}

/** Suhbatlar ro'yxati (Sidebar uchun). archived=true bo'lsa — Archive sahifasi. */
export function listChats(token, { search, favoriteOnly, archived } = {}) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (favoriteOnly) params.set("favorite_only", "true");
  if (archived) params.set("archived", "true");
  const qs = params.toString();
  return authedRequest(`/api/chats${qs ? `?${qs}` : ""}`, token);
}

export function createChatApi(token, title) {
  return authedRequest("/api/chats", token, "POST", { title });
}

export function getChatApi(token, chatId) {
  return authedRequest(`/api/chats/${chatId}`, token);
}

export function updateChatApi(token, chatId, payload) {
  return authedRequest(`/api/chats/${chatId}`, token, "PATCH", payload);
}

export function deleteChatApi(token, chatId) {
  return authedRequest(`/api/chats/${chatId}`, token, "DELETE");
}

/** Xabar yuborish — DB'da saqlanadi va AI javobini qaytaradi. */
export function sendChatMessageApi(token, chatId, content, provider = "auto", image = null) {
  return authedRequest(`/api/chats/${chatId}/messages`, token, "POST", {
    content,
    provider,
    ...(image && { image }),
  });
}

/** To'lov: Click.uz/Payme.uz orqali checkout sessiyasi yaratadi. */
const PLAN_KEY_MAP = { team: "enterprise", pro: "pro", free: "free" };

export async function createCheckout(plan, method, token, promo = null, extraData = {}) {
  // WalletPage "pro_monthly" / "team_yearly" kabi kalitlar yuboradi — backend
  // faqat asosiy reja nomini ("pro" | "enterprise") kutadi.
  const basePlanKey = plan.split("_")[0];
  const normalizedPlan = PLAN_KEY_MAP[basePlanKey] || basePlanKey;

  try {
    const res = await fetch(`${API_URL}/api/payments/checkout/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        plan: normalizedPlan,
        provider: method,
        ...(promo && { promo }),
        ...(Object.keys(extraData).length > 0 && { extra_data: extraData }),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, offline: false, error: data.detail || "Xatolik yuz berdi" };
    return { ok: true, offline: false, data: { ...data, redirect_url: data.url } };
  } catch {
    return { ok: false, offline: true, error: "Backend bilan aloqa yo'q" };
  }
}

