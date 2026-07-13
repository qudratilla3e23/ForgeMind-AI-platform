import { useState, useRef, useEffect } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { useTheme } from "../context/ThemeContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { languages } from "../i18n/translations.js";
import AuthModal from "./AuthModal.jsx";

export default function Header({ onLogin }) {
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t } = useLanguage();
  const [authOpen, setAuthOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // Mobil menyu holati

  const langRef = useRef(null);

  // Google Login logikasi
  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const userInfo = await res.json();
        
        onLogin(userInfo, tokenResponse.access_token);
        setMobileMenuOpen(false); // Login bo'lganda mobil menyuni yopish
      } catch (error) {
        console.error("User info fetch error:", error);
      }
    },
    onError: (error) => console.log('Login Failed', error),
  });

  useEffect(() => {
    function handleClickOutside(event) {
      if (langRef.current && !langRef.current.contains(event.target)) {
        setLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navItems = [
    { key: "product", label: t("nav.product") },
    { key: "resources", label: t("nav.resources") },
    { key: "customers", label: t("nav.customers") },
    { key: "pricing", label: t("nav.pricing") },
  ];

  return (
    <div className="sticky top-0 z-50">
      <header className="bg-cream/95 backdrop-blur border-b border-line">
        <nav className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          {/* Logo */}
          <a href="#top" className="font-display text-lg font-semibold">
            ForgeMind<span aria-hidden="true">*</span>
          </a>

          {/* Desktop Navigatsiya */}
          <ul className="hidden md:flex items-center gap-8 text-sm text-ink-soft">
            {navItems.map((item) => (
              <li key={item.key}>
                <a
                  href={`#${item.key}`}
                  className="hover:text-ink transition-colors flex items-center gap-1"
                >
                  {item.label}
                  {(item.key === "product" || item.key === "resources") && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                      <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                  )}
                </a>
              </li>
            ))}
          </ul>

          {/* O'ng tarafdagi tugmalar */}
          <div className="flex items-center gap-3">
            {/* Til tanlash */}
            <div className="relative" ref={langRef}>
              <button
                onClick={() => setLangOpen((v) => !v)}
                className="text-sm text-ink-soft hover:text-ink transition-colors uppercase px-1"
              >
                {lang}
              </button>
              {langOpen && (
                <ul className="absolute right-0 mt-2 w-36 bg-surface border border-line rounded-lg shadow-sm overflow-hidden text-sm">
                  {languages.map((l) => (
                    <li key={l.code}>
                      <button
                        onClick={() => { setLang(l.code); setLangOpen(false); }}
                        className={`w-full text-left px-3 py-2 hover:bg-lavender/60 ${l.code === lang ? "text-ink font-medium" : "text-ink-soft"}`}
                      >
                        {l.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Tema almashtirish */}
            <button
              onClick={toggleTheme}
              className="cursor-pointer w-8 h-8 rounded-full border border-line flex items-center justify-center text-ink-soft hover:text-ink transition-colors"
            >
              {theme === "dark" ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="3.2" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M7 0.8v1.6M7 11.6v1.6M13.2 7h-1.6M2.4 7H0.8M11.3 2.7l-1.1 1.1M3.8 10.2l-1.1 1.1M11.3 11.3l-1.1-1.1M3.8 3.8L2.7 2.7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M11.5 8.7A5 5 0 016.3 2.5a5 5 0 105.2 6.2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                </svg>
              )}
            </button>

            {/* Desktop Sign In tugmasi */}
            <button
              onClick={() => login()}
              className="cursor-pointer hidden md:inline text-sm text-ink-soft hover:text-ink transition-colors"
            >
              {t("signIn")}
            </button>

            {/* Mobil Tugma: 3 ta nuqta (Ochilganda X ga aylanadi) */}
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden w-8 h-8 flex items-center justify-center text-ink-soft hover:text-ink transition-colors focus:outline-none"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                // Menyu ochiqligida X belgisi
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              ) : (
                // Menyu yopiqligida 3 ta nuqta (Vertical Dots)
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="19" r="2" />
                </svg>
              )}
            </button>
          </div>
        </nav>

        {/* Mobil Menyu Paneli */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-line bg-cream/95 backdrop-blur">
            <div className="px-6 py-4 flex flex-col gap-4">
              <ul className="flex flex-col gap-3 text-sm text-ink-soft">
                {navItems.map((item) => (
                  <li key={item.key}>
                    <a
                      href={`#${item.key}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className="hover:text-ink transition-colors block py-1.5 w-full"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
              
              <div className="pt-2 border-t border-line">
                <button
                  onClick={() => login()}
                  className="w-full text-center py-2.5 px-4 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-500 transition-colors"
                >
                  {t("signIn")}
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onSuccess={onLogin} />
    </div>
  );
}