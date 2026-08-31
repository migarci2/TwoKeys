import Link from "next/link";
import { Container } from "./Section";
import { Lockup } from "./Mark";

const LINKS = [
  { href: "#why", label: "Why" },
  { href: "#how", label: "How" },
  { href: "#proof", label: "Proof" },
  { href: "#honest", label: "Honest" },
];

export function Nav({ demo = false }: { demo?: boolean }) {
  return (
    <header className="sticky top-0 z-50" style={{ viewTransitionName: "site-header" }}>
      {/* Scrim. A fixed-colour gradient does not work here: it is keyed to
          --canvas-top, but the canvas gets much lighter further down the page,
          so by mid-scroll the band no longer covered what passed under it and
          the logo marquee was legible through the bar. Blurring the backdrop
          works at any scroll depth because it takes whatever is actually
          behind it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24 backdrop-blur-xl"
        style={{
          background: "color-mix(in srgb, var(--canvas-top) 42%, transparent)",
          maskImage: "linear-gradient(to bottom, black 58%, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, black 58%, transparent)",
        }}
      />

      <Container className="relative">
        <div className="grid h-[4.5rem] grid-cols-[1fr_auto_1fr] items-center gap-4">
          <nav aria-label="Sections" className={demo ? "hidden" : "hidden md:block"}>
            <ul className="flex items-center gap-7">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className="text-ink-2 transition hover:text-ink"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Centre column on desktop; falls to the left edge on mobile, where
              there are no links to balance it against. */}
          <Link
            href="/"
            transitionTypes={demo ? ["nav-back"] : undefined}
            className="col-start-1 flex items-center gap-2.5 justify-self-start md:col-start-2 md:justify-self-center"
          >
            <Lockup id="nav" />
          </Link>

          <div className="col-start-3 flex items-center gap-2 justify-self-end">
            <Link
              href={demo ? "/" : "/demo"}
              transitionTypes={[demo ? "nav-back" : "nav-forward"]}
              className="rounded-btn border border-hairline-strong px-4 py-2.5 text-sm font-medium whitespace-nowrap transition hover:bg-glass"
            >
              {demo ? "Back to the story" : "Open the demo"}
            </Link>
          </div>
        </div>
      </Container>
    </header>
  );
}
