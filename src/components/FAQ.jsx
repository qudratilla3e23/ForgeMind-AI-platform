import { useState } from "react";
import { useLanguage } from "../context/LanguageContext.jsx";
import Reveal from "./Reveal.jsx";

export default function FAQ() {
  const { t } = useLanguage();
  const items = t("faq.items");
  const [open, setOpen] = useState(null);

  return (
    <section className="max-w-4xl mx-auto px-6 py-20">
      <Reveal className="flex items-center justify-between mb-8">
        <h2 className="font-display text-3xl">{t("faq.title")}</h2>
        <a
          href="#contact"
          className="bg-ink text-cream text-sm font-medium px-4 py-2 rounded-full whitespace-nowrap"
        >
          {t("faq.contact")}
        </a>
      </Reveal>

      <Reveal className="divide-y divide-line border-t border-b border-line">
        {items.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={i}>
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between py-4 text-left"
              >
                <span className="text-sm sm:text-base">{item.q}</span>
                <span className={`text-xl text-muted transition-transform ${isOpen ? "rotate-45" : ""}`}>
                  +
                </span>
              </button>
              {isOpen && (
                <p className="text-sm text-ink-soft leading-relaxed pb-4 max-w-2xl">{item.a}</p>
              )}
            </div>
          );
        })}
      </Reveal>
    </section>
  );
}
