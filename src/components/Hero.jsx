  import { useState, useEffect } from "react";
  import { useLanguage } from "../context/LanguageContext.jsx";

  // Promtga qarab mos "generatsiya qilingan" mini-preview tanlanadi.
  function pickPreview(prompt) {
    const p = prompt.toLowerCase();
    if (/netflix|movie|film|kino/.test(p)) return "streaming";
    if (/shop|store|ecommerce|do'kon|magazin/.test(p)) return "shop";
    if (/dashboard|panel|analytics/.test(p)) return "dashboard";
    return "chat";
  }

  function PreviewStreaming() {
    return (
      <div className="bg-[#0b0b0b] p-3 h-full">
        <div className="flex gap-2 mb-3">
          <div className="w-14 h-3 rounded bg-red-500/70" />
          <div className="flex-1" />
          <div className="w-6 h-6 rounded-full bg-white/10" />
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] rounded bg-gradient-to-br from-white/15 to-white/5"
            />
          ))}
        </div>
      </div>
    );
  }

  function PreviewShop() {
    return (
      <div className="bg-white p-3 h-full">
        <div className="flex items-center justify-between mb-3">
          <div className="w-16 h-3 rounded bg-ink/80" />
          <div className="w-8 h-3 rounded bg-forest/70" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-line overflow-hidden">
              <div className="aspect-square bg-lavender" />
              <div className="p-1.5 space-y-1">
                <div className="w-full h-1.5 rounded bg-ink/20" />
                <div className="w-2/3 h-1.5 rounded bg-ink/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function PreviewDashboard() {
    return (
      <div className="bg-[#0b0b0b] p-3 h-full grid grid-cols-3 gap-2">
        <div className="col-span-1 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-3 rounded bg-white/10" />
          ))}
        </div>
        <div className="col-span-2 grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg bg-white/5 border border-white/10 p-2">
              <div className="w-8 h-2 rounded bg-lavender-pill/70 mb-2" />
              <div className="w-full h-8 rounded bg-gradient-to-t from-lavender-deep/40 to-transparent" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  function PreviewChat() {
    return (
      <div className="bg-[#0b0b0b] p-3 h-full flex flex-col gap-2">
        <div className="self-start max-w-[70%] h-6 rounded-lg bg-white/10" />
        <div className="self-end max-w-[60%] h-6 rounded-lg bg-lavender-deep/60" />
        <div className="self-start max-w-[80%] h-10 rounded-lg bg-white/10" />
      </div>
    );
  }

  const PREVIEWS = {
    streaming: PreviewStreaming,
    shop: PreviewShop,
    dashboard: PreviewDashboard,
    chat: PreviewChat,
  };

  export default function Hero() {
    const { t } = useLanguage();
    const [value, setValue] = useState("");
    const [status, setStatus] = useState("idle");
    const [stageIndex, setStageIndex] = useState(-1);
    const [previewKind, setPreviewKind] = useState(null);

    const placeholders = [
      "Kino ko'rish uchun Netflix kloni...",
      "Kiyimlar sotadigan zamonaviy onlayn do'kon...",
      "Kriptovalyuta tahliliy dashboard paneli...",
      "Sun'iy intellekt asosidagi chat interfeysi..."
    ];

    const [currentPlaceholder, setCurrentPlaceholder] = useState("");
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const [subIndex, setSubIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
      if (value) return;

      if (subIndex === placeholders[placeholderIndex].length + 1 && !isDeleting) {
        const timeout = setTimeout(() => setIsDeleting(true), 2500);
        return () => clearTimeout(timeout);
      }

      if (subIndex === 0 && isDeleting) {
        setIsDeleting(false);
        setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
        return;
      }

      const speed = isDeleting ? 35 : 75;
      const timeout = setTimeout(() => {
        setSubIndex((prev) => prev + (isDeleting ? -1 : 1));
      }, speed);

      return () => clearTimeout(timeout);
    }, [subIndex, isDeleting, placeholderIndex, value]);

    useEffect(() => {
      setCurrentPlaceholder(placeholders[placeholderIndex].substring(0, subIndex));
    }, [subIndex, placeholderIndex]);
    // ----------------------------------------


    const [mouseCoords, setMouseCoords] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e) => {
      const { clientX, clientY } = e;

      const x = (clientX - window.innerWidth / 2) / 35; 
      const y = (clientY - window.innerHeight / 2) / 35;
      setMouseCoords({ x, y });
    };

    const handleMouseLeave = () => {

      setMouseCoords({ x: 0, y: 0 });
    };

    

    const stages = t("hero.stages");
    const examples = t("hero.examples");

    const runBuild = (prompt) => {
      setStatus("building");
      setStageIndex(-1);
      setPreviewKind(null);
      stages.forEach((_, i) => {
        setTimeout(() => {
          setStageIndex(i);
          if (i === stages.length - 1) {
            setTimeout(() => {
              setPreviewKind(pickPreview(prompt));
              setStatus("done");
            }, 350);
          }
        }, i * 420);
      });
    };

    const handleSubmit = () => {
      if (!value.trim() || status === "building") return;
      runBuild(value);
    };

    const handleExample = (label) => {
      setValue(label);
      runBuild(label);
    };

    return (
      <section 
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="dot-grid relative overflow-hidden transition-all duration-300 select-none"
        style={{ perspective: "1200px" }}
      >

        <div 
          className="absolute top-10 left-1/4 w-72 h-72 bg-lavender-deep/15 rounded-full blur-[110px] pointer-events-none transition-transform duration-500 ease-out"
          style={{ transform: `translate3d(${mouseCoords.x * -0.6}px, ${mouseCoords.y * -0.6}px, 0)` }}
        />
        <div 
          className="absolute bottom-10 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-[130px] pointer-events-none transition-transform duration-500 ease-out"
          style={{ transform: `translate3d(${mouseCoords.x * 0.4}px, ${mouseCoords.y * -0.4}px, 0)` }}
        />

        <div className="max-w-4xl mx-auto px-6 pt-20 pb-24 text-center relative z-10">
          <span className="inline-flex items-center gap-2 bg-surface border border-line rounded-full px-4 py-1.5 text-xs text-ink-soft shadow-sm mb-8">
            {t("hero.badge")}
          </span>

          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl leading-[1.05] max-w-2xl mx-auto">
            {t("hero.title")}
          </h1>

          <p className="text-ink-soft mt-5 max-w-md mx-auto">{t("hero.subtitle")}</p>

          <div 
            className="mt-10 bg-[#0e0e10] border border-white/10 rounded-2xl shadow-2xl shadow-lavender-deep/10 overflow-hidden text-left transition-transform duration-300 ease-out"
            style={{
              transform: `translate3d(${mouseCoords.x * 0.2}px, ${mouseCoords.y * 0.2}px, 0) rotateX(${mouseCoords.y * -0.12}deg) rotateY(${mouseCoords.x * 0.12}deg)`,
              transformStyle: "preserve-3d"
            }}
          >
            
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/10">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
            </div>

            <div className="p-4 relative">
              <textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                rows={2}
                placeholder={currentPlaceholder}
                className="w-full resize-none text-sm outline-none placeholder:text-white/25 bg-transparent text-white font-mono leading-relaxed"
              />

              {!value && (
                <span
                  className="absolute pointer-events-none bg-lavender-pill w-[2px] h-4 animate-pulse"
                  style={{
                    left: `${currentPlaceholder.length * 8.4 + 16}px`,
                    top: "20px",
                    display: currentPlaceholder.length === placeholders[placeholderIndex].length ? "none" : "inline-block"
                  }}
                />
              )}

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                <div className="flex items-center gap-3 text-white/40">
                  <span title={t("hero.voiceTitle")} className="cursor-not-allowed">🎤</span>
                  <span title={t("hero.attachTitle")} className="cursor-not-allowed">📎</span>
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={status === "building"}
                  className="bg-lavender-pill text-ink rounded-full w-8 h-8 flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  →
                </button>
              </div>
            </div>

            {/* Build stages */}
            {status !== "idle" && (
              <div className="border-t border-white/10 px-4 py-4 font-mono text-sm space-y-1.5">
                {stages.map((stage, i) => {
                  const isDone = i < stageIndex || status === "done";
                  const isActive = i === stageIndex && status === "building";
                  if (i > stageIndex && status === "building") return null;
                  return (
                    <p
                      key={stage}
                      className={
                        isDone
                          ? "text-forest"
                          : isActive
                          ? "text-lavender-pill"
                          : "text-white/30"
                      }
                    >
                      {isDone ? "✓" : isActive ? <span className="spinner mr-1" /> : "•"} {stage}
                    </p>
                  );
                })}
              </div>
            )}

            {status === "done" && previewKind && (
              <div className="border-t border-white/10">
                <div className="flex items-center justify-between px-4 py-2 bg-white/[0.03]">
                  <span className="text-xs text-white/50 font-mono">{t("hero.previewLabel")}</span>
                  <span className="text-xs text-forest">{t("hero.deployedLabel")}</span>
                </div>
                <div className="h-40">
                  {(() => {
                    const Preview = PREVIEWS[previewKind];
                    return <Preview />;
                  })()}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
            {examples.map((label) => (
              <button
                key={label}
                onClick={() => handleExample(label)}
                className="bg-surface/70 border border-line rounded-full px-3.5 py-1.5 text-xs text-ink-soft hover:border-ink/30 hover:text-ink transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>
    );
  }