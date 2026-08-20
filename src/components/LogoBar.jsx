import { useLanguage } from "../context/LanguageContext.jsx";
import Marquee from "./Marquee.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faGoogle, 
  faMicrosoft, 
  faAmazon, 
  faApple 
} from "@fortawesome/free-brands-svg-icons";
import { faMicrochip } from "@fortawesome/free-solid-svg-icons";

const logos = [
  { name: "Google", icon: faGoogle },
  { name: "AMD", icon: faMicrochip },
  { name: "Microsoft", icon: faMicrosoft },
  { name: "Amazon", icon: faAmazon },
  { name: "Apple", icon: faApple }
];

export default function LogoBar() {
  const { t } = useLanguage();

  return (
    <section className="max-w-6xl mx-auto px-6 py-16">
      <div className="flex flex-col md:flex-row items-center gap-8 md:gap-14">
        <p className="text-[11px] tracking-wide text-muted font-mono leading-relaxed shrink-0 max-w-[9rem] text-center md:text-left">
          {t("logos.eyebrow")}
        </p>
        
        <Marquee 
          duration={25} 
          className="cursor-default flex-1 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]"
        >
          {logos.map((logo) => (
            <div
              key={logo.name}
              className="flex items-center gap-3 px-10 font-sans text-xl md:text-2xl font-bold tracking-wider text-ink-soft opacity-60 hover:opacity-100 transition-opacity duration-300"
            >
              {/* Ikonka va matn 1 ga 1 o'lchamda */}
              <FontAwesomeIcon icon={logo.icon} className="w-7 h-7 md:w-8 md:h-8" />
              <span className="cursor-pointer whitespace-nowrap">{logo.name}</span>
            </div>
          ))}
        </Marquee>
      </div>
    </section>
  );
}