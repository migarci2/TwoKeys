"use client";

import { useEffect, useRef, useState } from "react";
import { Section } from "@/components/site/Section";
import { AppScreen, type ScreenState } from "@/components/phone/AppScreen";

/**
 * Three features, each played as a short loop inside the phone.
 *
 * A tab is not one screen, it is a whole part of the process: its frames run
 * one after another so you watch the thing happen rather than read a caption
 * about it. When a feature finishes its last frame the next tab takes over, so
 * left alone the section plays the entire product start to finish.
 *
 * The timer only runs while the section is on screen — an invisible carousel
 * burning CPU behind the fold is the classic version of this bug. Any click,
 * or a reduced-motion preference, hands control to the reader for good.
 */

const FRAME_MS = 1900;

interface Feature {
  tab: string;
  title: string;
  body: string;
  frames: ScreenState[];
}

const FEATURES: Feature[] = [
  {
    tab: "Who signs",
    title: "The plan picks its signers.",
    body: "The agent writes down exactly what it wants to do, and the plan itself decides who must agree: it does not get to choose. A routine action resolves to nobody and just runs. €30,000 resolves to Ana and Marco, and nothing happens until both say yes to that same plan.",
    frames: [
      { finance: "waiting", ceo: "waiting" },
      { finance: "yes", ceo: "waiting" },
      { finance: "yes", ceo: "yes", stage: "live" },
    ],
  },
  {
    tab: "A change resets it",
    title: "Move the plan and the yes goes with it.",
    body: "Marco adds a condition, so this is no longer what Ana agreed to. Her approval does not quietly carry over. It expires, on both their phones, and everyone answers again.",
    frames: [
      { finance: "yes", ceo: "waiting" },
      { finance: "gone", ceo: "waiting", changed: true },
      { finance: "yes", ceo: "yes", changed: true, stage: "live" },
    ],
  },
  {
    tab: "One shot only",
    title: "Permission that spends itself.",
    body: "Agreement buys exactly one action, for a few minutes. The moment it is used it is gone, so the same approval can never be replayed into a second campaign.",
    frames: [
      { finance: "yes", ceo: "yes", changed: true, stage: "live" },
      { finance: "yes", ceo: "yes", changed: true, stage: "spent" },
      { finance: "yes", ceo: "yes", changed: true, stage: "denied" },
    ],
  },
];

export function How() {
  const [feature, setFeature] = useState(0);
  const [frame, setFrame] = useState(0);
  const [auto, setAuto] = useState(
    () => typeof window === "undefined" || !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.3 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!auto || !visible) return;
    const id = setTimeout(
      () => {
        const last = FEATURES[feature].frames.length - 1;
        if (frame < last) {
          setFrame(frame + 1);
        } else {
          setFeature((feature + 1) % FEATURES.length);
          setFrame(0);
        }
        // Hold the closing frame a beat longer than the others.
      },
      FRAME_MS * (frame === FEATURES[feature].frames.length - 1 ? 1.6 : 1),
    );
    return () => clearTimeout(id);
  }, [auto, visible, feature, frame]);

  const current = FEATURES[feature];

  function pick(i: number) {
    setFeature(i);
    setFrame(0);
    setAuto(false);
  }

  return (
    <Section
      id="how"
      word="How"
      lead="Whoever the plan resolves gets it on their phone, and the agent waits as long as they take. Watch each piece of it run."
    >
      <div ref={sectionRef}>
        <div className="glass mx-auto mb-10 grid max-w-2xl gap-1 p-1 sm:grid-cols-3">
          {FEATURES.map((f, i) => (
            <button
              key={f.tab}
              type="button"
              onClick={() => pick(i)}
              aria-pressed={i === feature}
              className={[
                "relative overflow-hidden rounded-[0.5rem] px-3 py-2.5 text-sm font-medium transition",
                i === feature
                  ? "bg-accent text-on-accent"
                  : "text-ink-2 hover:bg-glass hover:text-ink",
              ].join(" ")}
            >
              {f.tab}
              {i === feature && auto && visible && (
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-on-accent/30"
                  style={{
                    transform: `scaleX(${(frame + 1) / f.frames.length})`,
                    transition: "transform 400ms linear",
                  }}
                />
              )}
            </button>
          ))}
        </div>

        <div className="mx-auto mb-10 min-h-[9.5rem] max-w-[52ch] text-center">
          <h3 className="text-h3 text-balance">{current.title}</h3>
          <p className="text-lead mt-3 text-pretty">{current.body}</p>
        </div>

        {/* One slot. Every frame of every feature is stacked in it, so a change
            is a crossfade in place and the phone never moves or reflows. */}
        <div className="grid justify-items-center">
          {FEATURES.flatMap((f, fi) =>
            f.frames.map((state, si) => {
              const shown = fi === feature && si === frame;
              return (
                <div
                  key={`${fi}-${si}`}
                  aria-hidden={!shown}
                  inert={!shown ? true : undefined}
                  className={[
                    "col-start-1 row-start-1 transition-opacity duration-500",
                    shown ? "opacity-100" : "pointer-events-none opacity-0",
                  ].join(" ")}
                >
                  <AppScreen {...state} />
                </div>
              );
            }),
          )}
        </div>
      </div>
    </Section>
  );
}
