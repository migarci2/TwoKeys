import Image from "next/image";
import { Section } from "@/components/site/Section";

/**
 * The quote is the section. Set it big and open on the sky rather than parked
 * in a card — a box around a sentence adds a frame and no meaning.
 */
export function Adaptation() {
  return (
    <Section
      id="memory"
      word="Memory"
      lead="Every decision comes with an agent that sits on your side of it. Ask before you sign, and be asked back. Every answer names its source. It holds none of your logins, cannot act, and has no plan of its own to defend, so it is the only one here with nothing to sell you. It just remembers how you decide."
    >
      <figure data-reveal className="mx-auto max-w-4xl text-center">
        <blockquote className="text-h2 text-balance">
          &ldquo;For anything over €20,000, show me the smaller version we could
          try first.&rdquo;
        </blockquote>
        <figcaption className="mt-7 flex items-center justify-center gap-3">
          <Image
            src="/people/marco-ceo-v2.webp"
            alt="Marco"
            width={40}
            height={40}
            className="h-10 w-10 rounded-full object-cover ring-1 ring-white/35"
          />
          <span className="text-ink-2">Marco, CEO</span>
        </figcaption>
      </figure>

      <div className="mx-auto mt-20 grid max-w-4xl gap-10 sm:grid-cols-2 sm:gap-16">
        <div data-reveal className="border-t pt-6">
          <p className="label mb-3 text-ink-3">Next time, for Marco</p>
          <p className="text-lead text-pretty">
            The smaller, reversible option is at the top, without him asking
            again.
          </p>
        </div>
        <div data-reveal data-reveal-delay="110" className="border-t pt-6">
          <p className="label mb-3 text-ink-3">Next time, for everyone else</p>
          <p className="text-lead text-pretty">
            Nothing changed. One person&rsquo;s preference does not quietly
            become the company&rsquo;s.
          </p>
        </div>
      </div>
    </Section>
  );
}
