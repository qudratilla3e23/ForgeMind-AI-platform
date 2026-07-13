import { API_URL } from "./api.js";

function redirectUri(provider) {
  return `${window.location.origin}/oauth/callback/${provider}`;
}

/**
 * Foydalanuvchini providerning (GitHub/Microsoft) o'z login sahifasiga
 * yo'naltiradi. Agar backendda shu provider sozlanmagan bo'lsa, xato
 * qaytaradi — chaqiruvchi tomon bu holatda demo (namunaviy) oqimga
 * o'tishi kerak.
 */
export async function startOAuthRedirect(provider) {
  const uri = redirectUri(provider);
  const res = await fetch(
    `${API_URL}/api/auth/oauth/${provider}/start?redirect_uri=${encodeURIComponent(uri)}`
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `${provider} sozlanmagan`);
  }
  const { url } = await res.json();
  window.sessionStorage.setItem("cw-oauth-provider", provider);
  window.location.href = url;
}

/**
 * Sahifa `/oauth/callback/{provider}?code=...` bilan qaytganda chaqiriladi.
 * Kodni backendga yuborib, {token, user} oladi.
 */
export async function completeOAuthRedirect() {
  const path = window.location.pathname;
  const match = path.match(/^\/oauth\/callback\/(github|microsoft)$/);
  if (!match) return null;

  const provider = match[1];
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  if (!code) return null;

  const uri = redirectUri(provider);
  const res = await fetch(`${API_URL}/api/auth/oauth/${provider}/callback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, redirect_uri: uri }),
  });

  // URL'ni tozalab, asosiy sahifaga qaytaramiz (code qayta ishlatilmasin)
  window.history.replaceState({}, "", "/");

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { ok: false, error: err.detail || `${provider} orqali kirishda xato` };
  }
  const data = await res.json();
  return { ok: true, data };
}
