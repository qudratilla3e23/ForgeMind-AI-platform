import { useLanguage } from "../context/LanguageContext.jsx";
import Reveal from "./Reveal.jsx";

function initials(role) {
  return role
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
}

const ACCENTS = ["bg-lavender-deep", "bg-forest", "bg-maroon"];

export default function AgentMarketplace() {
  const { t } = useLanguage();
  const agents = t("agents.list");

  const handleSelect = (role) => {
    window.dispatchEvent(new CustomEvent("forgemind-agent-select", { detail: role }));
    document.getElementById("top")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="agents" className="bg-surface/60 border-y border-line py-20">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal>
          <span className="inline-block bg-lavender text-ink-soft text-[11px] tracking-wide font-medium px-3 py-1 rounded-full mb-6">
            {t("agents.eyebrow")}
          </span>
          <h2 className="font-display text-3xl sm:text-4xl mb-3">{t("agents.title")}</h2>
          <p className="text-ink-soft max-w-xl mb-10">{t("agents.subtitle")}</p>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent, i) => (
            <Reveal
              key={agent.role}
              delay={(i % 6) * 60}
              className="bg-surface border border-line rounded-card p-5 flex flex-col"
            >
              <div className="flex items-center gap-3 mb-3">
                <span
                  className={`w-9 h-9 rounded-full ${ACCENTS[i % ACCENTS.length]} text-cream flex items-center justify-center text-xs font-semibold shrink-0`}
                >
                  {initials(agent.role)}
                </span>
                <div className="min-w-0">
                  <h3 className="font-medium text-sm truncate">{agent.role}</h3>
                  <span className="text-[11px] text-forest flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-forest inline-block" /> Online
                  </span>
                </div>
              </div>
              <p className="text-xs text-ink-soft mb-3 leading-relaxed">{agent.desc}</p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {agent.tools.map((tool) => (
                  <span
                    key={tool}
                    className="text-[10px] bg-cream border border-line rounded-full px-2 py-0.5 text-muted"
                  >
                    {tool}
                  </span>
                ))}
              </div>
              <button
                onClick={() => handleSelect(agent.role)}
                className="mt-auto text-xs bg-ink text-cream rounded-full px-3 py-2 hover:opacity-85 transition-opacity"
              >
                {t("agents.chatCta")}
              </button>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
