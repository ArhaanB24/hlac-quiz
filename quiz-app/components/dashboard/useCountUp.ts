import { useEffect, useRef, useState } from "react";

/**
 * Animates a number toward `target`, starting from wherever it currently is so a
 * filter change glides between values instead of replaying from zero.
 * Skips the animation for people who prefer reduced motion.
 */
export function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  const current = useRef(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      current.current = target;
      setValue(target);
      return;
    }
    const from = current.current;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const next = from + (target - from) * (1 - Math.pow(1 - t, 3));
      current.current = next;
      setValue(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}
