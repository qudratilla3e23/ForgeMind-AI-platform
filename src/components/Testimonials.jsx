import { useLanguage } from "../context/LanguageContext.jsx";
import Marquee from "./Marquee.jsx";
import Reveal from "./Reveal.jsx";

const bars = ["bg-maroon", "bg-forest", "bg-lavender-deep"];

function Card({ q, i }) {
  return (
    <div className="w-72 shrink-0 bg-surface border border-line rounded-card overflow-hidden">
      <div className={`h-1.5 ${bars[i % bars.length]}`} />
      <div className="p-5">
        <p className="text-sm leading-relaxed mb-6">{q.text}</p>
        <p className="text-sm font-medium">{q.name}</p>
        <p className="text-xs text-muted">{q.role}</p>
      </div>
    </div>
  );
}

export default function Testimonials() {
  const { t } = useLanguage();
  const row1 = t("testimonials.row1");
  const row2 = t("testimonials.row2");
  const card1 = t("testimonials.card1");
  const card2 = t("testimonials.card2");

  return (
    <section id="customers" className="py-20 bg-surface/60 border-b border-line overflow-hidden">
      <Reveal className="max-w-6xl mx-auto px-6 mb-8">
        <div className="space-y-4">
          <Marquee duration={38} className="[mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
            {row1.map((q, i) => (
              <Card key={i} q={q} i={i} />
            ))}
          </Marquee>
          <Marquee
            duration={34}
            reverse
            className="[mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]"
          >
            {row2.map((q, i) => (
              <Card key={i} q={q} i={i + 1} />
            ))}
          </Marquee>
        </div>
      </Reveal>

      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-5">
          <Reveal className="bg-surface border border-line rounded-card p-8">
            <p className="font-display text-xl mb-4 whitespace-pre-line">{card1.title}</p>
            <p className="text-sm text-ink-soft leading-relaxed mb-6">{card1.quote}</p>
            <p className="text-sm font-medium">{card1.name}</p>
            <p className="text-xs text-muted">{card1.role}</p>
          </Reveal>
          <Reveal delay={120} className="bg-surface border border-line rounded-card p-8">
            <p className="font-display text-xl mb-4 whitespace-pre-line">{card2.title}</p>
            <p className="text-sm text-ink-soft leading-relaxed mb-6">{card2.quote}</p>
            <p className="text-sm font-medium">{card2.name}</p>
            <p className="text-xs text-muted">{card2.role}</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
