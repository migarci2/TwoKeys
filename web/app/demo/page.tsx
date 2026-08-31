import type { Metadata } from "next";
import { ViewTransition } from "react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Container } from "@/components/site/Section";
import { DecisionConsole } from "@/components/demo/DecisionConsole";
import { publicDemoMode } from "@/lib/server/demo-mode";

export const metadata: Metadata = { title: "Live demo" };
export const dynamic = "force-dynamic";

export default function DemoPage() {
  const localDemo =
    (process.env.NODE_ENV !== "production" && process.env.LOCAL_DEMO_AUTH === "true") ||
    publicDemoMode();

  return (
    <ViewTransition
      enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      default="none"
    >
      <div className="relative isolate min-h-[100dvh]">
        <Nav demo />
        <main className="relative z-10 py-8 sm:py-12 lg:py-14">
          <Container>
            <div className="mb-8 max-w-4xl sm:mb-10">
              <div className="mb-5 flex flex-wrap gap-2 text-xs font-bold tracking-[0.12em] text-ink-2">
                <span className="rounded-full border border-hairline-strong bg-white/10 px-3 py-1.5">LIVE BACKEND</span>
                <span className="rounded-full border border-hairline bg-white/5 px-3 py-1.5">2 MIN · NO LIVE SPEND</span>
              </div>
              <h1 className="text-hero text-balance">Turn two keys. Watch the agent unlock.</h1>
              <p className="mt-4 max-w-3xl text-lead">
                Play Finance and CEO on one €30k decision. We’ll guide every handoff; the final action runs only when both keys approve the exact same version.
              </p>
            </div>
            <DecisionConsole localDemo={localDemo} />
          </Container>
        </main>
        <Footer />
      </div>
    </ViewTransition>
  );
}
