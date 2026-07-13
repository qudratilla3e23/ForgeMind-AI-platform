import { useState } from "react";
import { useLanguage } from "../context/LanguageContext.jsx";
import { findUser, registerUser as mockRegister, checkPassword, getLastUser } from "../lib/mockAuth.js";
import { loginUser, registerUser, googleAuth } from "../lib/api.js";
import { isGoogleConfigured, signInWithGoogle } from "../lib/googleAuth.js";
import { startOAuthRedirect } from "../lib/oauth.js";

const FALLBACK_GOOGLE_ACCOUNT = { name: "Alex Carter", email: "alex.carter@gmail.com" };
const FALLBACK_LINKEDIN_ACCOUNT = { name: "Jordan Lee", email: "jordan.lee@linkedin.com" };
const FALLBACK_GITHUB_ACCOUNT = { name: "Sam Rivera", email: "sam.rivera@users.noreply.github.com" };
const FALLBACK_MICROSOFT_ACCOUNT = { name: "Taylor Kim", email: "taylor.kim@outlook.com" };
const FALLBACK_APPLE_ACCOUNT = { name: "Morgan Lee", email: "morgan.lee@icloud.com" };

const PROVIDER_META = {
  google: { icon: "fa-brands fa-google", title: "console.google.title", fallback: FALLBACK_GOOGLE_ACCOUNT },
  linkedin: { icon: "fa-brands fa-linkedin", title: null, fallback: FALLBACK_LINKEDIN_ACCOUNT },
  github: { icon: "fa-brands fa-github", title: null, fallback: FALLBACK_GITHUB_ACCOUNT },
  microsoft: { icon: "fa-brands fa-microsoft", title: null, fallback: FALLBACK_MICROSOFT_ACCOUNT },
  apple: { icon: "fa-brands fa-apple", title: null, fallback: FALLBACK_APPLE_ACCOUNT },
};

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export default function AuthModal({ open, onClose, onSuccess }) {
  const { t } = useLanguage();
  const [step, setStep] = useState("form");
  const [prevStep, setPrevStep] = useState("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [demoCode, setDemoCode] = useState("");
  const [pendingUser, setPendingUser] = useState(null);
  const [error, setError] = useState("");

  if (!open) return null;

  const reset = () => {
    setStep("form");
    setEmail("");
    setPassword("");
    setName("");
    setOtp(["", "", "", "", "", ""]);
    setPendingUser(null);
    setError("");
  };

  const finish = (user, token) => {
    if (token) window.localStorage.setItem("cw-token", token);
    onSuccess(user);
    reset();
    onClose();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // --- Email/parol oqimi ---
  const handleEmailSubmit = (e) => {
    e.preventDefault();
    setError("");
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setError(t("auth.notRegistered"));
      return;
    }
    // Email mavjudligini oldindan bildirmaymiz (xavfsizlik amaliyoti) —
    // haqiqiy tekshiruv parol yuborilganda backendda amalga oshadi.
    setPendingUser({ email: cleanEmail, name: null });
    setStep("password");
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const result = await loginUser(pendingUser.email, password);

    if (result.ok) {
      finish(result.data.user, result.data.token);
      return;
    }

    if (!result.offline) {
      setError(t("auth.wrongPassword"));
      return;
    }

    // Backend ishlamayapti — mahalliy (demo) autentifikatsiyaga o'tamiz
    const localUser = findUser(pendingUser.email);
    if (!localUser) {
      setError(t("auth.notRegistered"));
    } else if (checkPassword(localUser.email, password)) {
      finish({ name: localUser.name, email: localUser.email });
    } else {
      setError(t("auth.wrongPassword"));
    }
  };

  const goToOtp = () => {
    setDemoCode(generateOtp());
    setOtp(["", "", "", "", "", ""]);
    setError("");
    setStep("otp");
  };

  const handleOtpChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) document.getElementById(`otp-${i + 1}`)?.focus();
  };

  const handleOtpSubmit = (e) => {
    e.preventDefault();
    if (otp.join("") === demoCode) {
      finish({ name: pendingUser.name, email: pendingUser.email });
    } else {
      setError(t("auth.wrongOtp"));
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    const cleanEmail = email.trim().toLowerCase();

    const result = await registerUser(name, cleanEmail, password);
    if (result.ok) {
      finish(result.data.user, result.data.token);
      return;
    }
    if (!result.offline) {
      setError(result.error);
      return;
    }
    // Backend ishlamayapti — mahalliy (demo) ro'yxatga olishga o'tamiz
    mockRegister({ name, email: cleanEmail, password });
    finish({ name, email: cleanEmail });
  };

  // --- Google/GitHub/Microsoft/Apple/LinkedIn oqimi ---
  const startGoogle = async () => {
    if (isGoogleConfigured()) {
      setError("");
      setStep("google-loading");
      try {
        const credential = await signInWithGoogle();
        const result = await googleAuth(credential);
        if (result.ok) {
          finish(result.data.user, result.data.token);
        } else {
          setError(result.error || t("auth.notRegistered"));
          setStep("form");
        }
      } catch (err) {
        setError(err.message || t("auth.notRegistered"));
        setStep("form");
      }
      return;
    }
    // GOOGLE_CLIENT_ID sozlanmagan — demo (namunaviy) oqimga o'tamiz
    setStep("google-loading");
    setTimeout(() => setStep("google"), 900);
  };

  const startOAuth = async (provider) => {
    setError("");
    try {
      await startOAuthRedirect(provider); // muvaffaqiyatli bo'lsa, sahifa providerga o'tib ketadi
    } catch {
      // Backendda GITHUB_CLIENT_ID / MICROSOFT_CLIENT_ID hali sozlanmagan —
      // demo (namunaviy akkaunt tanlash) oqimiga o'tamiz
      setStep(`${provider}-loading`);
      setTimeout(() => setStep(provider), 900);
    }
  };
  const chooseAccount = (account) => {
    setStep("account-loading");
    setTimeout(() => finish(account), 800);
  };

  const openLegal = (which) => {
    setPrevStep(step);
    setStep(which);
  };

  const inputClass =
    "w-full bg-transparent border border-white/20 rounded-lg px-3 py-2.5 text-sm mb-1 outline-none focus:border-white/50 placeholder:text-white/30";

  if (step === "legal-privacy" || step === "legal-terms") {
    const isPrivacy = step === "legal-privacy";
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4" onClick={handleClose}>
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-[#131314] text-white rounded-2xl overflow-hidden max-h-[80vh] flex flex-col"
        >
          <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10 shrink-0">
            <button
              onClick={() => setStep(prevStep)}
              aria-label={t("auth.back")}
              className="text-white/60 hover:text-white"
            >
              ←
            </button>
            <span className="text-sm text-white/80">
              {isPrivacy ? t("legal.privacyTitle") : t("legal.termsTitle")}
            </span>
          </div>
          <div className="px-6 py-6 overflow-y-auto text-sm text-white/70 leading-relaxed">
            {isPrivacy ? t("legal.privacyBody") : t("legal.termsBody")}
          </div>
        </div>
      </div>
    );
  }

  // ---------- OAuth akkaunt tanlash ekrani (Google/GitHub/Microsoft/Apple/LinkedIn) ----------
  if (PROVIDER_META[step]) {
    const meta = PROVIDER_META[step];
    const isGoogle = step === "google";
    const lastUser = getLastUser();
    const account = lastUser ? { name: lastUser.name, email: lastUser.email } : meta.fallback;

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4">
        <div className="w-full max-w-lg bg-[#131314] text-white rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
            <button
              onClick={() => setStep("form")}
              aria-label={t("auth.back")}
              className="text-white/60 hover:text-white mr-1"
            >
              ←
            </button>
            <i className={`${meta.icon} text-lg`} aria-hidden="true" />
            <span className="text-sm text-white/80">
              {isGoogle ? t("console.google.title") : `${t(`auth.${step}`)}`}
            </span>
          </div>

          <div className="px-6 py-8">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-black text-xl mb-5">
              ✳︎
            </div>
            <h2 className="text-2xl mb-2">{t("console.google.choose")}</h2>
            <p className="text-sm text-white/50 mb-6">
              {t("console.google.continueTo")} <span className="text-lavender-pill">"ForgeMind AI"</span>
            </p>

            <button
              onClick={() => chooseAccount(account)}
              className="w-full flex items-center gap-3 border-t border-b border-white/10 py-3 hover:bg-white/5 transition-colors text-left"
            >
              <span className="w-8 h-8 rounded-full bg-lavender-deep text-ink flex items-center justify-center text-sm font-semibold shrink-0">
                {account.name.charAt(0)}
              </span>
              <span>
                <span className="block text-sm">{account.name}</span>
                <span className="block text-xs text-white/50">{account.email}</span>
              </span>
            </button>

            <button
              onClick={() => setStep("form")}
              className="w-full flex items-center gap-3 py-3 hover:bg-white/5 transition-colors text-left text-sm text-white/70"
            >
              <span className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center shrink-0">
                ☺
              </span>
              {t("console.google.useAnother")}
            </button>

            <p className="text-xs text-white/40 mt-6 leading-relaxed">
              {t("console.google.before")}{" "}
              <button onClick={() => openLegal("legal-privacy")} className="text-lavender-pill underline">
                {t("console.google.privacy")}
              </button>{" "}
              {t("console.google.and")}{" "}
              <button onClick={() => openLegal("legal-terms")} className="text-lavender-pill underline">
                {t("console.google.terms")}
              </button>
              .
            </p>
            {!isGoogleConfigured() || step !== "google" ? (
              <p className="text-[11px] text-amber-400/80 mt-4">{t("auth.oauthDemoNote")}</p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  // ---------- Akkaunt tanlangandan keyingi yuklanish ----------
  if (step === "account-loading") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4">
        <div className="w-full max-w-lg bg-[#131314] text-white rounded-2xl py-24 flex flex-col items-center gap-4">
          <span className="spinner text-2xl" aria-hidden="true" />
          <p className="text-sm text-white/60">{t("console.google.choose")}...</p>
        </div>
      </div>
    );
  }

  // ---------- Asosiy modal (form / password / otp / signup) ----------
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4" onClick={handleClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-[#111111] text-white rounded-2xl p-8 relative"
      >
        <button
          onClick={handleClose}
          aria-label={t("auth.close")}
          className="absolute top-4 right-4 text-white/50 hover:text-white text-lg leading-none"
        >
          ✕
        </button>

        <div className="flex flex-col items-center text-center">
          <span className="text-3xl mb-4" aria-hidden="true">
            ✳︎
          </span>

          {step === "form" && (
            <>
              <h2 className="font-display text-xl font-semibold mb-6">{t("auth.welcome")}</h2>
              <form className="w-full text-left" onSubmit={handleEmailSubmit}>
                <label className="text-xs text-white/60 mb-1 block">{t("auth.email")}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("auth.emailPlaceholder")}
                  className={inputClass}
                />
                {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
                <button
                  type="submit"
                  className="w-full bg-white text-black text-sm font-medium py-2.5 rounded-lg hover:bg-white/90 transition-colors mt-3"
                >
                  {t("auth.continue")}
                </button>
              </form>

              <div className="flex items-center gap-3 w-full my-5">
                <span className="h-px flex-1 bg-white/15" />
                <span className="text-[11px] text-white/40">{t("auth.or")}</span>
                <span className="h-px flex-1 bg-white/15" />
              </div>

              <div className="w-full space-y-3">
                <button
                  onClick={startGoogle}
                  className="w-full flex items-center justify-center gap-2 border border-white/20 rounded-lg py-2.5 text-sm hover:bg-white/5 transition-colors"
                >
                  <i className="fa-brands fa-google" aria-hidden="true" /> {t("auth.google")}
                </button>
                <button
                  onClick={() => startOAuth("github")}
                  className="w-full flex items-center justify-center gap-2 border border-white/20 rounded-lg py-2.5 text-sm hover:bg-white/5 transition-colors"
                >
                  <i className="fa-brands fa-github" aria-hidden="true" /> {t("auth.github")}
                </button>
                <button
                  onClick={() => startOAuth("microsoft")}
                  className="w-full flex items-center justify-center gap-2 border border-white/20 rounded-lg py-2.5 text-sm hover:bg-white/5 transition-colors"
                >
                  <i className="fa-brands fa-microsoft" aria-hidden="true" /> {t("auth.microsoft")}
                </button>
                <button
                  onClick={() => startOAuth("apple")}
                  className="w-full flex items-center justify-center gap-2 border border-white/20 rounded-lg py-2.5 text-sm hover:bg-white/5 transition-colors"
                >
                  <i className="fa-brands fa-apple" aria-hidden="true" /> {t("auth.apple")}
                </button>
              </div>

              <p className="text-[11px] text-white/30 mt-4">{t("auth.oauthDemoNote")}</p>

              <p className="text-xs text-white/50 mt-6">
                {t("auth.noAccount")}{" "}
                <button onClick={() => setStep("signup")} className="text-white underline">
                  {t("auth.signUp")}
                </button>
              </p>
            </>
          )}

          {step.endsWith("-loading") && step !== "account-loading" && (
            <>
              <h2 className="font-display text-xl font-semibold mb-6">{t("auth.welcome")}</h2>
              <div className="w-full space-y-3">
                <button
                  disabled
                  className="w-full flex items-center justify-center gap-2 border border-white/20 rounded-lg py-2.5 text-sm opacity-70"
                >
                  <span className="spinner" aria-hidden="true" />
                  {t(`auth.${step.replace("-loading", "")}`)}
                </button>
              </div>
            </>
          )}

          {step === "password" && (
            <>
              <h2 className="font-display text-xl font-semibold mb-1">{t("auth.password")}</h2>
              <p className="text-xs text-white/50 mb-6">
                {t("auth.signingInAs")} <span className="text-white">{pendingUser?.email}</span>{" "}
                ·{" "}
                <button onClick={() => setStep("form")} className="underline">
                  {t("auth.notYou")}
                </button>
              </p>
              <form className="w-full text-left" onSubmit={handlePasswordSubmit}>
                <label className="text-xs text-white/60 mb-1 block">{t("auth.password")}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("auth.passwordPlaceholder")}
                  autoFocus
                  className={inputClass}
                />
                {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
                <button
                  type="submit"
                  className="w-full bg-white text-black text-sm font-medium py-2.5 rounded-lg hover:bg-white/90 transition-colors mt-3"
                >
                  {t("auth.continue")}
                </button>
              </form>
              <button onClick={goToOtp} className="text-xs text-white/50 underline mt-4">
                {t("auth.forgotPassword")}
              </button>
            </>
          )}

          {step === "otp" && (
            <>
              <h2 className="font-display text-xl font-semibold mb-1">{t("auth.verify")}</h2>
              <p className="text-xs text-white/50 mb-3">
                {t("auth.otpSent")} <span className="text-white">{pendingUser?.email}</span>
              </p>
              <p className="text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-2 mb-5 text-lavender-pill">
                {t("auth.demoCode")} <span className="font-mono tracking-widest">{demoCode}</span>
              </p>
              <form onSubmit={handleOtpSubmit} className="w-full">
                <div className="flex justify-center gap-2 mb-2">
                  {otp.map((d, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      value={d}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      maxLength={1}
                      inputMode="numeric"
                      className="w-10 h-12 text-center bg-transparent border border-white/20 rounded-lg text-lg outline-none focus:border-white/50"
                    />
                  ))}
                </div>
                {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
                <button
                  type="submit"
                  className="w-full bg-white text-black text-sm font-medium py-2.5 rounded-lg hover:bg-white/90 transition-colors mt-2"
                >
                  {t("auth.verify")}
                </button>
              </form>
              <button onClick={() => setStep("form")} className="text-xs text-white/50 underline mt-4">
                {t("auth.backToSignIn")}
              </button>
            </>
          )}

          {step === "signup" && (
            <>
              <h2 className="font-display text-xl font-semibold mb-6">{t("auth.signUpTitle")}</h2>
              <form className="w-full text-left" onSubmit={handleSignup}>
                <label className="text-xs text-white/60 mb-1 block">{t("auth.name")}</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("auth.namePlaceholder")}
                  required
                  className={inputClass}
                />
                <label className="text-xs text-white/60 mb-1 block mt-3">{t("auth.email")}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("auth.emailPlaceholder")}
                  required
                  className={inputClass}
                />
                <label className="text-xs text-white/60 mb-1 block mt-3">{t("auth.password")}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("auth.passwordPlaceholder")}
                  required
                  className={inputClass}
                />
                <button
                  type="submit"
                  className="w-full bg-white text-black text-sm font-medium py-2.5 rounded-lg hover:bg-white/90 transition-colors mt-4"
                >
                  {t("auth.createAccount")}
                </button>
              </form>
              <p className="text-xs text-white/50 mt-6">
                {t("auth.alreadyHaveAccount")}{" "}
                <button onClick={() => setStep("form")} className="text-white underline">
                  {t("auth.signIn")}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
