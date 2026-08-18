import { Section } from "@/components/site/Section";

const SWAPS = [
  ["It learns your executives.", "It keeps sentences people chose to save."],
  ["Nothing can ever leak.", "We test for leaks and publish what we find."],
  [
    "It spent €30,000.",
    "It switched on a €30,000 campaign in a practice account.",
  ],
  [
    "It replaces your security setup.",
    "Security decides what the agent can touch. This decides what people agreed to.",
  ],
];

export function Boundaries() {
  return (
    <Section
      id="honest"
      word="Honest"
      lead="Every line on the left would sound better. None of them are true, so we do not use them."
    >
      <ul className="mx-auto max-w-4xl">
        {SWAPS.map(([avoid, use], i) => (
          <li
            key={avoid}
            data-reveal
            data-reveal-delay={i * 90}
            className="grid gap-2 border-t py-6 last:border-b sm:grid-cols-2 sm:gap-12"
          >
            <p className="text-ink-3 line-through">{avoid}</p>
            <p className="text-pretty">{use}</p>
          </li>
        ))}
      </ul>

      <p className="mx-auto mt-12 max-w-[46ch] text-center text-ink-2 text-pretty">
        Built for a hackathon. The company, the people and the numbers are made
        up, and the account it switches on is a practice account: no billing, no
        ads shown, no money spent. The parts that are still plans are labelled
        as plans.
      </p>
    </Section>
  );
}
