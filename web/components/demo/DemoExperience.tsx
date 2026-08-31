"use client";

import { startTransition, useLayoutEffect, useState, ViewTransition } from "react";

import { Container } from "@/components/site/Section";
import { DecisionConsole } from "@/components/demo/DecisionConsole";

export function DemoExperience({ localDemo }: { localDemo: boolean }) {
  const [screen, setScreen] = useState<"intro" | "unlocking" | "demo">("intro");

  useLayoutEffect(() => {
    if (screen === "demo") window.scrollTo(0, 0);
  }, [screen]);

  const openDemo = () => startTransition(() => setScreen("demo"));

  const beginUnlock = (keyboard: boolean) => {
    if (keyboard || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      openDemo();
      return;
    }
    setScreen("unlocking");
  };

  if (screen === "demo") {
    return (
      <ViewTransition name="demo-screen" share="demo-screen-forward" default="none">
        <section className="min-h-[calc(100svh-4.5rem)] py-10 sm:py-14">
          <Container>
            <div className="mb-8 max-w-3xl sm:mb-10">
              <p className="text-xs font-black tracking-[0.14em] text-ink-2">LIVE BACKEND · 2 MIN · NO LIVE SPEND</p>
              <h1 className="mt-3 text-h2 text-balance">Now make the decision.</h1>
              <p className="mt-3 text-lead">
                Start as Ana in Finance, then hand the same plan to Marco. The campaign stays locked until both keys match.
              </p>
            </div>
            <DecisionConsole localDemo={localDemo} />
          </Container>
        </section>
      </ViewTransition>
    );
  }

  return (
    <ViewTransition name="demo-screen" share="demo-screen-forward" default="none">
      <section className="flex min-h-[calc(100svh-4.5rem)] items-center py-10 sm:py-14">
        <Container>
          <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)] lg:gap-16">
            <div>
              <div className="mb-5 flex flex-wrap gap-2 text-xs font-bold tracking-[0.12em] text-ink-2">
                <span className="rounded-full border border-hairline-strong bg-white/10 px-3 py-1.5">THE PROBLEM</span>
                <span className="rounded-full border border-hairline bg-white/5 px-3 py-1.5">€30K · ONE LIVE DECISION</span>
              </div>
              <h1 className="text-hero max-w-[15ch] text-balance">
                The agent is ready to spend €30,000. Who gets to say yes?
              </h1>
              <p className="mt-5 max-w-[62ch] text-lead">
                A revenue agent has prepared a 14-day EU campaign and can switch it on. Finance owns the budget; the CEO owns the timing. Neither approval should count unless both people reviewed the exact same plan.
              </p>

              <ol className="mt-8 grid gap-px overflow-hidden rounded-card border border-hairline bg-white/15 sm:grid-cols-3">
                {[
                  ["01", "The agent can act", "It already has the tools and data to launch the campaign."],
                  ["02", "Authority is split", "Ana checks affordability. Marco checks readiness and risk."],
                  ["03", "The plan can change", "A new budget, date, or guardrail must invalidate the old yes."],
                ].map(([number, title, body]) => (
                  <li key={number} className="bg-[#082b78]/90 p-5 sm:min-h-44">
                    <span className="text-xs font-black tracking-[0.14em] text-ink-3">{number}</span>
                    <h2 className="mt-5 text-lg font-bold">{title}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-ink-2">{body}</p>
                  </li>
                ))}
              </ol>
            </div>

            <aside className="glass-strong p-6 sm:p-8">
              <p className="text-xs font-black tracking-[0.14em] text-ink-2">THE TWOKEYS RULE</p>
              <h2 className="mt-4 text-h2 text-balance">Two matching keys. One execution.</h2>
              <p className="mt-4 leading-relaxed text-ink-2">
                Each approval is locked to the action, its evidence, and its policy. Change any of them and the old key expires. Match both keys and the agent receives a permission that works once.
              </p>
              <button
                type="button"
                disabled={screen === "unlocking"}
                onClick={(event) => beginUnlock(event.detail === 0)}
                className="mt-7 inline-flex w-full items-center justify-between gap-4 rounded-full bg-white px-6 py-3.5 font-black text-on-accent shadow-[0_10px_30px_rgb(2_12_40/0.25)] transition-[background-color,box-shadow] duration-150 hover:bg-white/90 active:bg-white/80 disabled:cursor-wait"
              >
                {screen === "unlocking" ? "Turning both keys..." : "Start the demo"}
                <span aria-hidden="true" className="text-xl">→</span>
              </button>
            </aside>
          </div>
        </Container>

        {screen === "unlocking" && (
          <div
            className="demo-unlock-sequence"
            role="status"
            aria-label="Both keys aligned. Opening the demo."
            onAnimationEnd={(event) => {
              if (event.animationName === "demo-unlock-sequence") openDemo();
            }}
          >
            <div aria-hidden="true" className="demo-unlock-backdrop" />
            <div aria-hidden="true" className="demo-unlock-stage">
              <div className="demo-unlock-ring">
                <span />
              </div>
              <div className="demo-unlock-pair">
                {(["left", "right"] as const).map((side) => (
                  <span key={side} className={`demo-unlock-key demo-unlock-key--${side}`}>
                    <svg
                      viewBox="0 0 64 32"
                      className={side === "right" ? "rotate-180" : undefined}
                      fill="none"
                    >
                      <circle cx="16" cy="16" r="9" stroke="currentColor" strokeWidth="3" />
                      <path
                        d="M25 16h31m-8 0V9m-8 7v7"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                ))}
              </div>
              <p className="demo-unlock-label">TWO KEYS · ONE ACTION</p>
            </div>
            <div aria-hidden="true" className="demo-unlock-flash" />
          </div>
        )}
      </section>
    </ViewTransition>
  );
}
