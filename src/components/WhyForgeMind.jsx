import { useLanguage } from "../context/LanguageContext.jsx";
import Reveal from "./Reveal.jsx";

export default function WhyForgeMind() {
  const { t } = useLanguage();
  const card1 = t("why.card1");
  const card2 = t("why.card2");
  const quote = t("why.quote");
  const card3 = t("why.card3");
  const card4 = t("why.card4");

  return (
    <section className="bg-lavender py-20">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal>
          <span className="inline-block bg-surface/60 text-ink-soft text-[11px] tracking-wide font-medium px-3 py-1 rounded-full mb-6">
            {t("why.eyebrow")}
          </span>
          <h2 className="font-display text-3xl sm:text-4xl mb-10">{t("why.title")}</h2>
        </Reveal>

        <div className="grid md:grid-cols-2 gap-5">
          {/* Card 1: build prompt */}
          <Reveal className="bg-surface rounded-card p-6">
            <span className="text-[11px] text-muted font-mono">[01]</span>
            <div className="mt-3 flex items-center justify-between bg-cream border border-line rounded-full px-4 py-2 text-sm">
              <span>{card1.prompt}</span>
              <span className="w-6 h-6 rounded-full bg-ink text-cream flex items-center justify-center text-xs shrink-0">
                ↗
              </span>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-ink-soft">
              {card1.bullets.map((b, i) => (
                <li key={i} className={i === card1.bullets.length - 1 ? "text-ink" : ""}>
                  • {b}
                </li>
              ))}
            </ul>
            <h3 className="font-medium mt-6 mb-1">{card1.title}</h3>
            <p className="text-sm text-ink-soft leading-relaxed">{card1.text}</p>
          </Reveal>

          <Reveal delay={100} className="bg-surface rounded-card p-6">
            <span className="text-[11px] text-muted font-mono">[02]</span>
            <div className="mt-3 space-y-2 text-sm">
              {card2.status.map((txt) => (
                <div key={txt} className="flex items-center gap-2 text-ink-soft">
                  <span className="text-forest">✓</span> {txt}
                </div>
              ))}
              <div className="flex items-center gap-2 text-ink-soft">
                <span className="text-maroon">●</span> {card2.deploying}
              </div>
            </div>
            <button className="mt-4 bg-ink text-cream text-sm px-4 py-2 rounded-full">
              {card2.golive}
            </button>
            <h3 className="font-medium mt-6 mb-1">{card2.title}</h3>
            <p className="text-sm text-ink-soft leading-relaxed">{card2.text}</p>
          </Reveal>
        </div>

        <Reveal className="bg-ink text-cream rounded-card p-8 md:p-10 my-5">
          <p className="font-display text-xl md:text-2xl leading-snug max-w-2xl">{quote.text}</p>
          <p className="text-sm text-cream/60 mt-4">
            {quote.author} <span className="text-cream/40">· {quote.role}</span>
          </p>
        </Reveal>

        <div className="grid md:grid-cols-2 gap-5">
          {/* Card 3: chat conversation */}
          <Reveal className="bg-surface rounded-card p-6">
            <span className="text-[11px] text-muted font-mono">[03]</span>
            <div className="mt-3 bg-cream rounded-xl overflow-hidden border border-line">
              <div className="bg-forest text-white text-sm px-4 py-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-mint text-forest text-[10px] font-bold flex items-center justify-center">
                  C
                </span>
                <div>
                  <p className="leading-none">Cody</p>
                  <p className="text-[10px] text-cream/60">Online</p>
                </div>
              </div>
              <div className="p-4 space-y-2 text-sm">
                <p className="bg-surface border border-line rounded-lg px-3 py-2 inline-block">
                  {card3.chat.c1}
                </p>
                <p className="bg-mint text-onmint rounded-lg px-3 py-2 whitespace-pre-line">
                  {card3.chat.c2}
                  {"\n"}
                  {card3.chat.options}
                </p>
                <p className="bg-surface border border-line rounded-lg px-3 py-2 inline-block">
                  {card3.chat.c3}
                </p>
                <p className="bg-mint text-onmint rounded-lg px-3 py-2">
                  {card3.chat.c4} <strong>RD-5541 ✓</strong>
                </p>
              </div>
            </div>
            <h3 className="font-medium mt-6 mb-1">{card3.title}</h3>
            <p className="text-sm text-ink-soft leading-relaxed">{card3.text}</p>
          </Reveal>

          {/* Card 4: handoff */}
          <Reveal delay={100} className="bg-surface rounded-card p-6">
            <span className="text-[11px] text-muted font-mono">[04]</span>
            <div className="mt-3 bg-cream rounded-xl border border-line p-4 space-y-2 text-sm">
              <p className="bg-surface border border-line rounded-lg px-3 py-2 inline-block">
                {card4.chat.c1}
              </p>
              <p className="bg-mint text-onmint rounded-lg px-3 py-2">{card4.chat.c2}</p>
              <p className="bg-surface border border-line rounded-lg px-3 py-2 inline-block">
                {card4.chat.c3}
              </p>
              <p className="bg-ink text-cream rounded-lg px-3 py-2">
                {card4.chat.c4} <span className="text-cream/60">→ {card4.chat.handoff}</span>
              </p>
            </div>
            <h3 className="font-medium mt-6 mb-1">{card4.title}</h3>
            <p className="text-sm text-ink-soft leading-relaxed">{card4.text}</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
