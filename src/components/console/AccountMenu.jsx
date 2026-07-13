import { useState, useEffect, useRef } from "react";
import { useLanguage } from "../../context/LanguageContext.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";
import { languages } from "../../i18n/translations.js";
import Console from "../Console.jsx";

const items = [
  ["profile", "fa-regular fa-user", "profile"],
  ["wallet", "fa-solid fa-wallet", "wallet"],
  ["usage", "fa-solid fa-chart-simple", null],
  ["apiKeys", "fa-solid fa-key", null],
  ["integrations", "fa-solid fa-plug", null],
];

export default function AccountMenu({ user, onNavigate, onSignOut, onClose }) {
  const { t, lang, setLang } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const m = t("console.accountMenu");

  const [showSupportOptions, setShowSupportOptions] = useState(false);
  const menuRef = useRef(null);

  console.log("AccountMenu ichidagi user ma'lumoti:", user);

  // Tashqariga bosganda yopilish logikasi (Click Outside)
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div 
      ref={menuRef}
      /* Gemini AI uslubidagi maxsus fon ranglari (#1e1e1f) va juda yumshoq burchaklar */
      className="absolute bottom-full left-2 mb-3 w-72 bg-[#1e1e1f] border border-zinc-800 rounded-2xl shadow-2xl p-2 text-[#e3e3e3] text-xs z-50 transform transition-all duration-200"
    >
      
      {/* 1. FOYDALANUVCHI PROFILLI (Gemini uslubida toza va tekis jo'ylashuv) */}
      {user ? (
        <div className="flex items-center gap-3 px-3 py-3 border-b border-zinc-800/60 mb-1.5">
          <img
            src={user.picture || user.avatar || "https://ui-avatars.com/api/?name=" + (user.name || "U") + "&background=1a73e8&color=fff"}
            alt="User profile"
            className="w-9 h-9 rounded-full object-cover ring-1 ring-white/10"
          />
          <div className="flex flex-col truncate flex-1">
            <span className="text-[#f2f2f2] font-medium text-sm truncate">{user.name || "Foydalanuvchi"}</span>
            <span className="text-[#b4b4b4] text-[11px] truncate mt-0.5">{user.email || "Email yo'q"}</span>
          </div>
        </div>
      ) : (
        <div className="px-3 py-2.5 text-zinc-500 text-[11px] border-b border-zinc-800 mb-1.5">
          Ma'lumot topilmadi (user undefined)
        </div>
      )}

      {/* 2. GEMINI ADVANCED SUB-CARD (O'sha mashhur AI gradientli premium reklama bloki) */}
      <div className="mx-1 my-1.5 p-3 rounded-xl bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-500/10 border border-purple-500/20 relative overflow-hidden group">
        <div className="flex items-center gap-2 mb-1">
          {/* Gemini yulduzcha ikonkasining Tailwind varianti */}
          <i className="fa-solid fa-wand-magic-sparkles text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-xs" />
          <span className="font-semibold text-[11px] text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-300 to-pink-400 uppercase tracking-wider">
            Gemini Advanced
          </span>
        </div>
        <p className="text-[#b4b4b4] text-[10px] leading-normal">
          Yanada kuchliroq modellar va kengaytirilgan API limitlariga ega bo'ling.
        </p>
        <button 
          onClick={() => { onNavigate("wallet"); onClose(); }}
          className="mt-2 w-full py-1 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-lg transition-colors text-[10px] border border-zinc-700"
        >
          Tarifni yangilash
        </button>
      </div>

      {/* 3. ASOSIY RO'YXAT (Minimalist piktogrammalar va tekis tekstlar) */}
      <div className="space-y-[2px] px-1">
        {items.map(([key, icon, page]) => (
          <button
            key={key}
            onClick={() => {
              if (page) onNavigate(page);
              onClose();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[#28292a] rounded-lg transition-colors text-left text-[#e3e3e3]/90 hover:text-white"
          >
            <i className={`${icon} w-4 text-center text-[#b4b4b4] text-[13px]`} aria-hidden="true" />
            <span className="text-[11px] font-normal">{m[key] || key}</span>
          </button>
        ))}

        {/* Support (Yordam) qismi */}
        <div
          className="relative"
          onMouseEnter={() => setShowSupportOptions(true)}
          onMouseLeave={() => setShowSupportOptions(false)}
        >
          <button
            type="button"
            className="w-full group px-3 py-2 flex items-center justify-between text-[#e3e3e3]/90 hover:bg-[#28292a] rounded-lg transition-colors text-left"
          >
            <span className="flex items-center gap-3">
              <i className="fa-regular fa-circle-question w-4 text-center text-[#b4b4b4] text-[13px]" aria-hidden="true" />
              <span className="text-[11px]">{m.support}</span>
            </span>
            <i className={`fa-solid fa-chevron-right text-[9px] text-zinc-600 transition-transform ${showSupportOptions ? 'translate-x-0.5 text-purple-400' : ''}`} />
          </button>

          {/* O'ngga chiqadigan nozik mini-menyu */}
          <div className={`absolute left-full top-0 ml-1.5 w-40 bg-[#1e1e1f] border border-zinc-800 rounded-xl p-1 shadow-2xl transition-all duration-150 z-50 ${
            showSupportOptions ? "opacity-100 visible translate-x-0" : "opacity-0 invisible -translate-x-1 pointer-events-none"
          }`}>
            <a
              href="https://t.me/your_support_username"
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#e3e3e3] hover:bg-[#28292a] text-[11px]"
            >
              <i className="fa-brands fa-telegram text-sky-400 w-3.5 text-center text-xs" />
              <span>Telegram</span>
            </a>
            <a
              href="https://discord.gg/your_invite_link"
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#e3e3e3] hover:bg-[#28292a] text-[11px]"
            >
              <i className="fa-brands fa-discord text-indigo-400 w-3.5 text-center text-xs" />
              <span>Discord</span>
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-800/60 my-1 mx-1" />

      {/* 4. SOZLAMALAR (Tema va Tillar bloki - nihoyatda ixcham va integrallashgan) */}
      <div className="px-2 py-2 bg-zinc-900/40 rounded-xl border border-zinc-800/60 mx-1 my-1">
        <div className="flex items-center justify-between text-[11px] mb-2 px-1">
          <span className="text-zinc-500 font-medium">{m.settings}</span>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-800 hover:bg-zinc-700 transition-all text-[10px] text-white/90 border border-zinc-700"
          >
            {theme === "dark" ? <i className="fa-solid fa-moon text-indigo-400 text-[10px]" /> : <i className="fa-solid fa-sun text-amber-400 text-[10px]" />}
            <span>{theme === "dark" ? "Dark" : "Light"}</span>
          </button>
        </div>

        {/* Tillar paneli */}
        <div className="grid grid-cols-3 gap-1">
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={`text-[9px] font-semibold py-1 rounded-md border transition-all ${
                lang === l.code
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent shadow-md"
                  : "bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              }`}
            >
              {l.code.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-zinc-800/60 my-1 mx-1" />

      {/* 5. TIZIMDAN CHIQISH (Pastki silliq tugma) */}
      <div className="px-1">
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3 py-1.5 hover:bg-red-500/10 transition-colors text-left text-red-400 font-medium rounded-lg text-[11px]"
        >
          <i className="fa-solid fa-right-from-bracket w-4 text-center text-red-400/80" aria-hidden="true" />
          <span>{m.signOut}</span>
        </button>
      </div>

    </div>
  );
}