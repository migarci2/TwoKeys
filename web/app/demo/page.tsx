import type { Metadata } from "next";
import { ViewTransition } from "react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { DemoExperience } from "@/components/demo/DemoExperience";
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
        <main className="relative z-10">
          <DemoExperience localDemo={localDemo} />
        </main>
        <Footer />
      </div>
    </ViewTransition>
  );
}
