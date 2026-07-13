import { useLanguage } from "../context/LanguageContext.jsx";
import Reveal from "./Reveal.jsx";

export default function HowItWorks() {
  const { t } = useLanguage();
  const steps = t("how.steps");

  return (
    <section id="product" className="max-w-6xl mx-auto px-6 py-16">
      <Reveal>
        <span className="inline-block bg-lavender text-ink-soft text-[11px] tracking-wide font-medium px-3 py-1 rounded-full mb-6">
          {t("how.eyebrow")}
        </span>
        <h2 className="font-display text-3xl sm:text-4xl max-w-lg leading-tight mb-10">
          {t("how.title")}
        </h2>
      </Reveal>

      <div className="grid md:grid-cols-3 gap-4">
        {steps.map((step, i) => (
          <Reveal
            key={step.n}
            delay={i * 100}
            className="bg-surface/60 border border-line rounded-card p-6"
          >
            <span className="text-xs text-muted font-mono">{step.n}</span>
            <h3 className="font-medium mt-3 mb-2">{step.title}</h3>
            <p className="text-sm text-ink-soft leading-relaxed">{step.text}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
