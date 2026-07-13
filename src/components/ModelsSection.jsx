import { useLanguage } from "../context/LanguageContext.jsx";
import Reveal from "./Reveal.jsx";

function Bar({ value, max = 5 }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 w-3 rounded-full ${i < value ? "bg-lavender-deep" : "bg-line"}`}
        />
      ))}
    </div>
  );
}

export default function ModelsSection() {
  const { t } = useLanguage();
  const cards = t("models.cards");

  return (
    <section id="models" className="max-w-6xl mx-auto px-6 py-20">
      <Reveal>
        <span className="inline-block bg-lavender text-ink-soft text-[11px] tracking-wide font-medium px-3 py-1 rounded-full mb-6">
          {t("models.eyebrow")}
        </span>
        <h2 className="font-display text-3xl sm:text-4xl mb-3">{t("models.title")}</h2>
        <p className="text-ink-soft max-w-xl mb-10">{t("models.subtitle")}</p>
      </Reveal>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, i) => (
          <Reveal
            key={card.name}
            delay={i * 60}
            className="bg-surface border border-line rounded-card p-5 flex flex-col"
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-medium">{card.name}</h3>
              <span className="text-xs text-muted font-mono">{card.price}</span>
            </div>
            <p className="text-xs text-ink-soft mb-4">{card.tagline}</p>

            <div className="space-y-2 text-xs text-ink-soft mb-4">
              <div className="flex items-center justify-between">
                <span>Speed</span> <Bar value={card.speed} />
              </div>
              <div className="flex items-center justify-between">
                <span>Context</span> <Bar value={card.context} />
              </div>
              <div className="flex items-center justify-between">
                <span>Reasoning</span> <Bar value={card.reasoning} />
              </div>
              <div className="flex items-center justify-between">
                <span>Coding</span> <Bar value={card.coding} />
              </div>
              <div className="flex items-center justify-between">
                <span>Vision</span>
                <span>{card.vision ? "✓" : "—"}</span>
              </div>
            </div>

            <div className="mt-auto pt-3 border-t border-line text-xs space-y-1">
              {card.pros.map((p) => (
                <p key={p} className="text-forest">+ {p}</p>
              ))}
              {card.cons.map((c) => (
                <p key={c} className="text-maroon">− {c}</p>
              ))}
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
