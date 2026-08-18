import Link from "next/link";
import { Container } from "@/components/site/Section";
import { FitText } from "@/components/site/FitText";
import { RotatingText } from "@/components/site/RotatingText";

export function Hero() {
  return (
    <section className="relative">
      <Container>
        <div className="flex min-h-[calc(100svh-4.5rem)] flex-col items-center justify-center pb-24 text-center">
          {/* Short enough for the poster caps. The hollow word carries the
              contrast; the sentence that used to be up here now leads the
              paragraph, where it can actually be read. */}
          {/* Two lines, each scaled by fitty to fill the same box, so they end
              up flush whatever the words are. */}
          <h1 className="text-display w-full max-w-[26rem] sm:max-w-[32rem]">
            {/* Justifying a four-letter word to the width of a seven-letter one
                makes it very tall, so each line carries its own leading: the
                big one needs room for its box, the small one closes the gap. */}
            <FitText className="hollow leading-[0.96]" maxSize={300}>
              Keep
            </FitText>
            <FitText className="leading-[0.88]" maxSize={200}>
              control
            </FitText>
          </h1>

          <p className="text-lead mt-8 max-w-[42ch] text-pretty">
            A plugin for the agents you already run. It makes a fixed harness
            fluid: most actions run free, and the ones that matter reach a
            person who knows what they&rsquo;re agreeing to.
          </p>

          {/* Decision and owners rotate together, because who has to sign off
              is read off each action: the count changes with the stakes, and
              a routine action resolves to nobody at all. */}
          <RotatingText
            className="text-lead mt-2 justify-items-center"
            phrases={[
              "A €30,000 campaign waits for Finance and the CEO.",
              "A production deploy waits for Security and the CTO.",
              "A €5,000 refund waits for one person in Support.",
              "A public commitment waits for Legal, Finance and the CEO.",
              "A routine report waits for nobody, and just runs.",
            ]}
          />

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="#how"
              className="rounded-btn bg-accent px-6 py-3.5 font-medium text-on-accent transition hover:opacity-90"
            >
              See how it works
            </Link>
            <Link
              href="/demo"
              className="rounded-btn border border-hairline-strong px-6 py-3.5 font-medium transition hover:bg-glass"
            >
              Watch the demo
            </Link>
          </div>
        </div>

        {/* Scroll cue. */}
        <a
          href="#why"
          aria-label="Scroll to why it matters"
          className="absolute bottom-8 left-1/2 -translate-x-1/2 p-3 text-ink-2 transition hover:text-ink"
        >
          <svg viewBox="0 0 20 26" className="nudge h-6 w-5" aria-hidden>
            <path
              d="M10 1v22M3 16l7 7 7-7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      </Container>
    </section>
  );
}
