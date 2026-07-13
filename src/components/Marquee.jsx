export default function Marquee({ children, reverse = false, duration = 28, className = "" }) {
  return (
    <div className={`marquee-group overflow-hidden ${className}`}>
      <div
        className={`marquee-track ${reverse ? "reverse" : ""}`}
        style={{ "--marquee-duration": `${duration}s` }}
      >
        <div className="flex shrink-0 items-center gap-3">{children}</div>
        <div className="flex shrink-0 items-center gap-3" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
