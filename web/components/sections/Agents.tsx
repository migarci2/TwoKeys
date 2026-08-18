import { AGENT_LOGOS } from "@/lib/agent-logos";

/**
 * Two marquee rows running in opposite directions.
 *
 * Each track is rendered twice and translated by exactly -50%, so the second
 * copy lands where the first began and the loop has no visible jump. The lower
 * row runs the same animation in reverse, which reads as depth rather than as
 * one belt wrapped twice. Marks are Simple Icons paths (CC0).
 */

function Row({
  logos,
  reverse = false,
  seconds,
}: {
  logos: typeof AGENT_LOGOS;
  reverse?: boolean;
  seconds: number;
}) {
  const track = [...logos, ...logos];

  return (
    <div className="marquee">
      <ul
        className="marquee-track"
        style={{
          animationDuration: `${seconds}s`,
          animationDirection: reverse ? "reverse" : "normal",
        }}
      >
        {track.map((logo, i) => (
          <li
            key={i}
            aria-hidden={i >= logos.length}
            className="flex shrink-0 items-center gap-4 px-8 text-ink/75 transition hover:text-ink sm:px-12"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-10 w-10 shrink-0 sm:h-12 sm:w-12"
              aria-hidden
            >
              <path d={logo.path} fill="currentColor" />
            </svg>
            <span className="text-2xl font-medium tracking-[-0.015em] whitespace-nowrap sm:text-3xl">
              {logo.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Agents() {
  const half = Math.ceil(AGENT_LOGOS.length / 2);

  return (
    <section className="relative z-10 py-16 sm:py-24">
      <p className="text-center text-ink-2">
        One call to propose, one wait for the answer. That is the whole
        integration
      </p>

      <div className="mt-12 flex flex-col gap-8">
        <Row logos={AGENT_LOGOS.slice(0, half)} seconds={38} />
        <Row logos={AGENT_LOGOS.slice(half)} seconds={44} reverse />
      </div>
    </section>
  );
}
