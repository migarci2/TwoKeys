"use client";

import { useEffect, useState } from "react";

/**
 * A line that cycles through phrases.
 *
 * Every phrase is rendered, stacked in a single grid cell, so the box is
 * already as wide as the longest one and nothing reflows on a swap. The
 * movement is vertical only: animating the width instead makes a centred line
 * slide sideways on every change, which is far more distracting than the dead
 * space it saves.
 *
 * Only the active phrase is exposed to assistive tech; the rest are hidden
 * from the accessibility tree rather than read as a jumble. Holds still for
 * anyone who has asked for reduced motion.
 */
export function RotatingText({
  phrases,
  intervalMs = 3200,
  className = "",
}: {
  phrases: string[];
  intervalMs?: number;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const [animate] = useState(
    () => typeof window !== "undefined" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    if (!animate) return;
    const id = setTimeout(
      () => setIndex((i) => (i + 1) % phrases.length),
      intervalMs,
    );
    return () => clearTimeout(id);
  }, [animate, index, intervalMs, phrases.length]);

  return (
    <span className={`grid justify-items-center ${className}`}>
      {phrases.map((phrase, i) => (
        <span
          key={phrase}
          aria-hidden={i !== index}
          className={[
            "col-start-1 row-start-1 text-center transition-all duration-500 ease-out",
            i === index
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-1.5 opacity-0",
          ].join(" ")}
        >
          {phrase}
        </span>
      ))}
    </span>
  );
}
