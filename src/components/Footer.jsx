import { useLanguage } from "../context/LanguageContext.jsx";
import Marquee from "./Marquee.jsx";

// Ijtimoiy tarmoq piktogrammalari
const socialIcons = [
  { icon: <i className="fa-brands fa-x-twitter"></i>, link: "https://twitter.com" },
  { icon: <i className="fa-brands fa-linkedin-in"></i>, link: "https://linkedin.com" },
  { icon: <i className="fa-solid fa-diamond"></i>, link: "#" },
  { icon: <i className="fa-brands fa-youtube"></i>, link: "https://youtube.com" }
];

export default function Footer() {
  const { t } = useLanguage();
  
  // Ma'lumotlarni tarjima faylidan olish
  const columns = t("footer.columns");

  return (
    <footer className="border-t border-line">
      <div className="max-w-6xl mx-auto px-6 py-14">
        <div className="flex flex-wrap justify-between gap-10">
          
          {/* Logo va ijtimoiy tarmoqlar */}
          <div>
            <p className="font-display text-xl font-semibold mb-6">ForgeMind</p>
            <p className="text-xs text-muted max-w-[10rem] mb-6">{t("footer.tagline")}</p>
            
            <div className="flex gap-3 text-muted">
              {socialIcons.map((item, i) => (
                <a
                  key={i}
                  href={item.link}
                  target="_blank"
                  rel="noreferrer"
                  className="w-7 h-7 rounded-full border border-line flex items-center justify-center text-xs hover:text-ink hover:border-ink transition-colors"
                >
                  {item.icon}
                </a>
              ))}
            </div>
          </div>

          {columns && columns.map((col) => (
            <div key={col.title}>
              <p className="text-xs text-muted mb-3 uppercase tracking-wider">{col.title}</p>
              <ul className="space-y-2 text-sm">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-ink-soft hover:text-ink transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}