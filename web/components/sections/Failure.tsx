import { Section } from "@/components/site/Section";

const CARDS = [
  {
    title: "It only has one key",
    body: "The agent holds the logins it needs to spend the money. That is capability. Nobody ever handed it the authority.",
  },
  {
    title: "Yes, but to different plans",
    body: "One signs on Tuesday, another on Thursday, and the plan moved in between.",
  },
  {
    title: "An old yes gets reused",
    body: "Something important changes, and yesterday's approval quietly comes along for the ride.",
  },
];

export function Failure() {
  return (
    <Section
      id="why"
      word="Why"
      lead="None of these look like a disaster while they are happening. That is exactly the problem."
    >
      {/* Columns divided by a rule, not three floating boxes. */}
      <ul className="grid gap-12 sm:grid-cols-3 sm:gap-10">
        {CARDS.map((c, i) => (
          <li
            key={c.title}
            data-reveal
            data-reveal-delay={i * 110}
            className="border-t pt-6"
          >
            <span className="label text-ink-3 tabular-nums">0{i + 1}</span>
            <h3 className="text-h3 mt-4 text-balance">{c.title}</h3>
            <p className="text-lead mt-3 text-pretty">{c.body}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
