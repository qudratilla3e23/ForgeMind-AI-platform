import { useReveal } from "../hooks/useReveal.js";

export default function Reveal({ as: Tag = "div", delay = 0, className = "", children }) {
  const [ref, visible] = useReveal();

  return (
    <Tag
      ref={ref}
      className={`reveal ${visible ? "is-visible" : ""} ${className}`}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
    >
      {children}
    </Tag>
  );
}
