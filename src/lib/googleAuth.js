let scriptPromise = null;

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google skripti yuklanmadi"));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export function isGoogleConfigured() {
  return Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
}

/**
 * Haqiqiy Google Sign-In oynasini ochadi (Google Identity Services).
 * Muvaffaqiyatli bo'lsa Google ID tokenini (JWT) qaytaradi — buni
 * backendga yuborib tekshirtirish kerak (src/lib/api.js -> googleAuth).
 */
export function signInWithGoogle() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    return Promise.reject(new Error("VITE_GOOGLE_CLIENT_ID sozlanmagan"));
  }

  return loadGoogleScript().then(
    () =>
      new Promise((resolve, reject) => {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => resolve(response.credential),
        });
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed?.() || notification.isSkippedMoment?.()) {
            reject(new Error("Google oynasi ko'rsatilmadi (popup bloklangan bo'lishi mumkin)"));
          }
        });
      })
  );
}
