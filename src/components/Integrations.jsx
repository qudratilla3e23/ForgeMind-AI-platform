import { useLanguage } from "../context/LanguageContext.jsx";
import Reveal from "./Reveal.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faWhatsapp, faGoogle, faHubspot, faSlack, faShopify, faGoogleDrive 
} from "@fortawesome/free-brands-svg-icons";
import { faTable, faFileLines } from "@fortawesome/free-solid-svg-icons";

// Ikonalar, nomlar va ularning rasmiy URL manzillari
const tools = [
  { name: "WhatsApp", icon: faWhatsapp, url: "https://www.whatsapp.com" },
  { name: "Google Sheets", icon: faTable, url: "https://sheets.google.com" },
  { name: "HubSpot", icon: faHubspot, url: "https://www.hubspot.com" },
  { name: "Notion", icon: faFileLines, url: "https://www.notion.so" },
  { name: "Gmail", icon: faGoogle, url: "https://mail.google.com" },
  { name: "Airtable", icon: faTable, url: "https://www.airtable.com" },
  { name: "Shopify", icon: faShopify, url: "https://www.shopify.com" },
  { name: "Slack", icon: faSlack, url: "https://www.slack.com" },
];

export default function Integrations() {
  const { t } = useLanguage();

  return (
    <section className="py-20">
      <div className="max-w-4xl mx-auto px-6">
        <Reveal className="bg-surface/60 border border-line rounded-card p-10 md:p-14 text-center">
          <h2 className="font-display text-3xl sm:text-4xl mb-8 whitespace-pre-line">
            {t("integrations.title")}
          </h2>

          <div className="flex flex-wrap justify-center gap-3">
            {tools.map((tool) => (
              <a
                key={tool.name}
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-surface border border-line rounded-full px-5 py-2.5 text-sm text-ink-soft inline-flex items-center gap-2 hover:border-lavender-deep hover:shadow-md transition-all duration-300 hover:scale-105"
              >
                <FontAwesomeIcon icon={tool.icon} className="text-muted" />
                {tool.name}
              </a>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}