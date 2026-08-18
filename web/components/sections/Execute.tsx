import { Section } from "@/components/site/Section";

/**
 * The one state change, at poster scale.
 *
 * Off is hollow and On is solid — the same device the hero uses for KEEP /
 * CONTROL, where the empty word is the one nothing has happened to. Reusing it
 * makes it read as the site's language rather than a one-off flourish.
 *
 * The refusals are bare rows. Boxing four one-line facts in glass adds a
 * border per fact and says nothing.
 */

const REFUSALS = [
  ["Try it twice", "The permission is already used up."],
  ["Wait too long", "It expires on its own."],
  ["Change your mind", "Any keyholder can pull it back."],
  ["Change the plan", "Everyone answers again, or nothing happens."],
];

export function Execute() {
  return (
    <Section
      id="proof"
      word="Proof"
      lead="Not a mockup with a green tick. The agent makes one real call, then checks the result to prove it happened."
    >
      <div
        data-reveal
        className="flex items-center justify-center gap-6 sm:gap-12"
      >
        <span className="text-display hollow text-[clamp(3rem,10vw,6.5rem)]">
          Off
        </span>
        <span aria-hidden className="text-3xl text-ink-3 sm:text-4xl">
          →
        </span>
        <span className="text-display text-[clamp(3rem,10vw,6.5rem)]">On</span>
      </div>

      <p
        data-reveal
        data-reveal-delay="120"
        className="text-lead mx-auto mt-10 max-w-[42ch] text-center text-pretty"
      >
        One action, once, because the people who own it agreed to it. Then it
        is read back and written down.
      </p>

      <ul className="mx-auto mt-16 max-w-3xl">
        {REFUSALS.map(([what, why], i) => (
          <li
            key={what}
            data-reveal
            data-reveal-delay={i * 90}
            className="flex flex-col gap-1 border-t py-5 last:border-b sm:flex-row sm:items-baseline sm:justify-between sm:gap-10"
          >
            <span className="text-h3">{what}</span>
            <span className="text-ink-2 sm:text-right">{why}</span>
          </li>
        ))}
      </ul>

      <p className="mt-10 text-center text-sm text-ink-3">
        Practice account · no billing · no ads shown · no money spent
      </p>
    </Section>
  );
}
