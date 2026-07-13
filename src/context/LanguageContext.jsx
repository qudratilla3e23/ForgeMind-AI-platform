import { createContext, useContext, useState } from "react";
import { translations, resources } from "../i18n/translations.js";

const LanguageContext = createContext(null);

function getInitialLang() {
  if (typeof window === "undefined") return "uz";
  return window.localStorage.getItem("cw-lang") || "uz";
}

// "hero.placeholders" kabi nuqta bilan ajratilgan yo'llarni chuqur qidirish funksiyasi
function getPath(obj, path) {
  return path.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), obj);
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(getInitialLang);

  const setLang = (code) => {
    if (["uz", "en", "ru"].includes(code)) {
      setLangState(code);
      window.localStorage.setItem("cw-lang", code);
    }
  };

  const t = (path) => {
    // 1-qadam: translations faylidan qidirish
    const dict = translations[lang] || translations.uz || translations.en;
    let val = getPath(dict, path) ?? getPath(translations.en, path);
    if (val !== undefined) return val;

    // 2-qadam: Agar u yerdan topilmasa, resources (i18n fayli) ichidan qidirish
    const resDict = resources[lang]?.translation || resources.uz?.translation || resources.en?.translation;
    val = getPath(resDict, path) ?? getPath(resources.en?.translation || {}, path);
    
    return val ?? path;
  };

  return (
    <LanguageContext.Provider value={{ lang, language: lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}