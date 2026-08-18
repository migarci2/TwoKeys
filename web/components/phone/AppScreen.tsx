import { Mark } from "@/components/site/Mark";
import { Phone } from "./Phone";

/**
 * One decision, as a keyholder sees it on their phone.
 *
 * The surface is glass over deep blue, so the device belongs to the same world
 * as the page instead of being a white cut-out pasted onto it.
 *
 * The screen is meant to read as composed rather than rendered: a status line
 * says who assembled it and when, panels land in sequence via the `composing`
 * animation, and the key counter is live state rather than decoration — it is
 * the one thing that must be right on every frame, including the frame where a
 * change knocks it back down.
 */

export type Answer = "waiting" | "yes" | "gone";
export type Stage = "waiting" | "live" | "spent" | "denied";

export interface ScreenState {
  finance: Answer;
  ceo: Answer;
  changed?: boolean;
  stage?: Stage;
}

const PEOPLE = {
  finance: { name: "Ana", role: "Finance" },
  ceo: { name: "Marco", role: "CEO" },
} as const;

/** Panels carry their order so the stagger reads as assembly. */
function Panel({
  i,
  className = "",
  children,
}: {
  i: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`composing ${className}`}
      style={{ "--i": i } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

// ponytail: total defaults to the demo's two holders; pass it when a scenario
// resolves to a different number.
function KeyMeter({ held, total = 2 }: { held: number; total?: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[0.6875rem] font-medium tracking-[0.04em] text-paper-ink-3 uppercase">
        Keys held
      </span>
      <div className="flex items-center gap-2">
        <div className="flex gap-1" aria-hidden>
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={`h-1 w-7 rounded-full transition-colors duration-700 ${
                i < held ? "bg-paper-blue" : "bg-white/15"
              }`}
            />
          ))}
        </div>
        <span className="text-[0.6875rem] font-semibold tabular-nums text-paper-ink">
          {held}/{total}
        </span>
      </div>
    </div>
  );
}

function Person({ who, answer }: { who: keyof typeof PEOPLE; answer: Answer }) {
  const p = PEOPLE[who];

  return (
    <div
      className={[
        "flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition-colors duration-500",
        answer === "yes"
          ? "border-paper-blue/40 bg-paper-blue/12"
          : answer === "gone"
            ? "border-dashed border-white/20 bg-transparent"
            : "border-paper-line bg-paper-2",
      ].join(" ")}
    >
      <span
        aria-hidden
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border text-[0.8125rem] font-bold transition-opacity duration-500 ${
          answer === "gone"
            ? "border-white/15 text-paper-ink-3 opacity-50"
            : "border-white/25 bg-white/10 text-paper-ink"
        }`}
      >
        {p.name[0]}
      </span>

      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-[0.9375rem] font-semibold ${
            answer === "gone" ? "text-paper-ink-3" : "text-paper-ink"
          }`}
        >
          {p.name}
        </p>
        <p className="truncate text-[0.6875rem] text-paper-ink-3">
          {answer === "yes"
            ? "Approved · just now"
            : answer === "gone"
              ? "Approval expired"
              : `${p.role} · waiting`}
        </p>
      </div>

      {answer === "yes" ? (
        <span
          aria-hidden
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-paper-blue text-[0.75rem] font-bold text-[#06183f]"
        >
          ✓
        </span>
      ) : (
        <span
          aria-hidden
          className={`h-6 w-6 shrink-0 rounded-full border-2 ${
            answer === "gone"
              ? "border-dashed border-white/25"
              : "border-white/20"
          }`}
        />
      )}
    </div>
  );
}

export function AppScreen({
  finance,
  ceo,
  changed,
  stage = "waiting",
}: ScreenState) {
  const held = [finance, ceo].filter((a) => a === "yes").length;

  return (
    <Phone>
      <div className="relative flex h-full flex-col bg-paper text-paper-ink">
        {/* A wash so the glass panels have something to sit on. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_60%_at_50%_0%,rgba(110,162,255,0.22),transparent_60%)]"
        />

        <div className="relative flex items-center justify-between px-5 pt-11 pb-3">
          <Mark id="phone" tone="mono" className="h-4 w-auto text-white" />
          <span className="text-[0.6875rem] font-medium text-paper-ink-3">
            9:41
          </span>
        </div>

        <div className="relative flex flex-1 flex-col gap-3 px-4 pb-5">
          {/* Composed-by line: names the agent, and the scanning rule says the
              surface is being assembled live rather than fetched. */}
          <Panel i={0} className="flex items-center gap-2 px-1">
            <span
              aria-hidden
              className="pulse-dot h-1.5 w-1.5 rounded-full bg-paper-blue"
            />
            <span className="text-[0.6875rem] font-semibold text-paper-ink-2">
              Revenue Agent
            </span>
            <span className="text-[0.6875rem] text-paper-ink-3">
              composed this view · 4m ago
            </span>
          </Panel>

          <Panel
            i={1}
            className="relative overflow-hidden rounded-2xl border border-paper-line bg-paper-2 px-4 py-3.5 backdrop-blur-md"
          >
            <span
              aria-hidden
              className="scan absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/8 to-transparent"
            />
            <p className="relative text-[1.1875rem] leading-[1.2] font-bold tracking-[-0.02em] text-balance">
              Turn on the EU launch campaign
            </p>
            <p className="relative mt-2.5 flex items-baseline gap-2">
              <span className="text-[1.75rem] leading-none font-extrabold tracking-[-0.035em] tabular-nums text-paper-blue">
                €30,000
              </span>
              <span className="text-[0.8125rem] text-paper-ink-2">cap</span>
            </p>
            <p className="relative mt-2 text-[0.6875rem] text-paper-ink-3">
              14 days · Google Ads · EU
            </p>
          </Panel>

          {changed && (
            <Panel
              i={2}
              className="rounded-2xl border border-paper-blue/45 bg-paper-blue/12 px-4 py-3 backdrop-blur-md"
            >
              <p className="text-[0.625rem] font-semibold tracking-[0.05em] text-paper-blue uppercase">
                Plan changed by Marco
              </p>
              <p className="mt-1.5 text-[0.8125rem] leading-snug text-pretty">
                Only if the product is ready, and only before launch day.
              </p>
            </Panel>
          )}

          <Panel
            i={changed ? 3 : 2}
            className="flex flex-col gap-2.5 rounded-2xl border border-paper-line bg-paper-2 p-3 backdrop-blur-md"
          >
            <KeyMeter held={held} />
            <Person who="finance" answer={finance} />
            <Person who="ceo" answer={ceo} />
          </Panel>

          <Panel i={changed ? 4 : 3} className="mt-auto">
            {stage === "live" ? (
              <div className="rounded-full bg-paper-blue px-5 py-3.5 text-center">
                <p className="text-[0.9375rem] font-bold text-[#06183f]">
                  Campaign is live
                </p>
              </div>
            ) : stage === "spent" ? (
              <div className="rounded-2xl border border-paper-line bg-paper-2 px-4 py-3 text-center backdrop-blur-md">
                <p className="text-[0.8125rem] font-semibold">
                  Permission used
                </p>
                <p className="mt-0.5 text-[0.6875rem] text-paper-ink-3">
                  Good for one action, once.
                </p>
              </div>
            ) : stage === "denied" ? (
              <div className="rounded-2xl border border-dashed border-white/25 px-4 py-3 text-center">
                <p className="text-[0.8125rem] font-semibold text-paper-ink-3">
                  Blocked — nothing runs twice
                </p>
              </div>
            ) : (
              <div className="flex gap-2">
                <span className="flex-1 rounded-full bg-paper-blue px-4 py-3 text-center text-[0.9375rem] font-semibold text-[#06183f]">
                  Approve
                </span>
                <span className="rounded-full border border-paper-line px-4 py-3 text-[0.9375rem] font-semibold text-paper-ink-2">
                  Change
                </span>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </Phone>
  );
}
