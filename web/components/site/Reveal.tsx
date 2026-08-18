"use client";

import { useEffect } from "react";

/**
 * Scroll reveal for anything marked `data-reveal`.
 *
 * One observer for the whole page rather than one component per element. The
 * hidden state is applied by a flag this sets on <html>, so if JS never runs
 * the page is simply fully visible instead of blank.
 */
export function Reveal() {
  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    root.dataset.revealReady = "";

    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    );

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          const delay = el.dataset.revealDelay;
          if (delay) el.style.animationDelay = `${delay}ms`;
          el.dataset.shown = "";
          observer.unobserve(el);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );

    for (const node of nodes) observer.observe(node);
    return () => {
      observer.disconnect();
      delete root.dataset.revealReady;
    };
  }, []);

  return null;
}
