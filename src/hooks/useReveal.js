import { useEffect, useRef, useState } from "react";

export function useReveal(options = {}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const { threshold, rootMargin, root } = options;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(node);
        }
      },
      { threshold: threshold ?? 0.15, rootMargin: rootMargin ?? "0px 0px -60px 0px", root }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin, root]);

  return [ref, visible];
}

