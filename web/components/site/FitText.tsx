"use client";

import { useEffect, useRef, type ReactNode } from "react";
import fitty, { type FittyInstance } from "fitty";

/**
 * A line of type scaled to exactly fill its container.
 *
 * Stack two of these and both words end up the same width, whatever they say —
 * which is the point, and what a hand-measured font-size ratio cannot survive
 * once the copy changes.
 *
 * fitty measures the rendered text, so it has to run after the webfont has
 * actually arrived: measuring against the fallback and then swapping in Anton
 * leaves the line either overflowing or short. `document.fonts.ready` is the
 * signal for that.
 */
export function FitText({
  children,
  className = "",
  minSize = 28,
  maxSize = 400,
}: {
  children: ReactNode;
  className?: string;
  minSize?: number;
  maxSize?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let instance: FittyInstance | undefined;
    let cancelled = false;

    document.fonts.ready.then(() => {
      if (cancelled || !ref.current) return;
      instance = fitty(ref.current, {
        minSize,
        maxSize,
        multiLine: false,
      });
    });

    return () => {
      cancelled = true;
      instance?.unsubscribe();
    };
  }, [minSize, maxSize]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
