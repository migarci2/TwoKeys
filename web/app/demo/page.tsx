import type { Metadata } from "next";
import { ViewTransition } from "react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Container } from "@/components/site/Section";
import { DecisionConsole } from "@/components/demo/DecisionConsole";

export const metadata: Metadata = { title: "Live demo" };

export default function DemoPage() {
  const localDemo =
    process.env.NODE_ENV !== "production" && process.env.LOCAL_DEMO_AUTH === "true";

  return (
    <ViewTransition
      enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      default="none"
    >
      <div className="relative isolate min-h-[100dvh]">
        <Nav demo />
        <main className="relative z-10 py-10 sm:py-14 lg:py-16">
          <Container>
            <div className="mb-10 max-w-3xl">
              <h1 className="text-hero text-balance">One action. Two views. Two matching keys.</h1>
              <p className="mt-4 text-lead">
                Run the authority transition against the real backend. Business data is synthetic; production execution targets a Google Ads test account.
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
