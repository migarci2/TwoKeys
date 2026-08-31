import type { Metadata } from "next";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { SkyBackground } from "@/components/sky/SkyBackground";
import { Container } from "@/components/site/Section";
import { DecisionConsole } from "@/components/demo/DecisionConsole";

export const metadata: Metadata = { title: "Live demo" };

export default function DemoPage() {
  const localDemo =
    process.env.NODE_ENV !== "production" && process.env.LOCAL_DEMO_AUTH === "true";

  return (
    <div className="relative isolate min-h-[100dvh]">
      <SkyBackground volumetric={false} />
      <Nav demo />
      <main className="relative z-10 py-10 sm:py-14 lg:py-16">
        <Container>
          <div className="mb-10 max-w-3xl">
            <p className="label mb-3 text-ink-3">Interactive example</p>
            <h1 className="text-hero text-balance">Approve one €30,000 campaign.</h1>
            <p className="mt-4 text-lead">
              An agent wants to turn on an EU ad campaign. Ana and Marco must approve the same final plan. Then it can launch once.
            </p>
          </div>
          <ol className="glass mb-10 grid gap-px overflow-hidden p-px sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["1", "Ana approves", "She checks the budget."],
              ["2", "Marco adds a rule", "The plan changes."],
              ["3", "Both approve again", "Now the plan matches."],
              ["4", "Launch once", "A second try is blocked."],
            ].map(([number, title, body]) => (
              <li key={number} className="bg-[#071d52]/70 p-4 sm:p-5">
                <p className="text-sm font-bold text-paper-blue">Step {number}</p>
                <p className="mt-2 font-semibold">{title}</p>
                <p className="mt-1 text-sm text-ink-3">{body}</p>
              </li>
            ))}
          </ol>
          <DecisionConsole localDemo={localDemo} />
        </Container>
      </main>
      <Footer />
    </div>
  );
}
