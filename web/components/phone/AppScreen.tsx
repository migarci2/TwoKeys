import { Phone } from "./Phone";

/**
 * One decision, as a keyholder sees it on their phone.
 *
 * Built as an iOS surface rather than a web card stack. The differences that
 * matter: real status bar and home indicator, so it reads as an app and not a
 * screenshot of a website; grouped rows with inset separators instead of a
 * bordered box per row; capsule controls in a floating tray at the thumb; and
 * every pane made of the `lg` liquid-glass material, over a blurred sky that
 * gives the blur something with structure to bend.
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

function Check({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
      <path
        d="M3.5 8.4 6.4 11.2 12.5 5"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Signal, wi-fi and battery, drawn rather than iconographed so they stay
    crisp at the 0.75 scale the phone is displayed at. */
function StatusBar() {
  return (
    <div className="relative flex items-center justify-between px-7 pt-3.5">
      <span className="text-[0.9375rem] leading-none font-semibold tracking-[-0.01em] tabular-nums text-white">
        9:41
      </span>

      <div className="flex items-center gap-1.5" aria-hidden>
        <div className="flex items-end gap-[2px]">
          {[4, 6, 8, 10].map((h) => (
            <span
              key={h}
              className="w-[3px] rounded-[1px] bg-white"
              style={{ height: h }}
            />
          ))}
        </div>

        <svg viewBox="0 0 16 12" className="h-3 w-4 text-white">
          <path
            d="M8 10.2a1.15 1.15 0 1 0 0-.02M4.6 6.9a4.8 4.8 0 0 1 6.8 0M2.1 4.3a8.4 8.4 0 0 1 11.8 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>

        <span className="relative flex h-[11px] w-[23px] items-center rounded-[3.5px] px-[2px] ring-1 ring-white/45">
          <span className="h-[6px] w-full rounded-[1.5px] bg-white" />
          <span className="absolute -right-[2.5px] h-[4px] w-[1.5px] rounded-r-[1px] bg-white/45" />
        </span>
      </div>
    </div>
  );
}

/** Two segments, filled as the keys land. Live state, not decoration. */
function KeyMeter({ held, total = 2 }: { held: number; total?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex gap-1" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-[3px] w-6 rounded-full transition-colors duration-700 ${
              i < held
                ? "bg-paper-blue shadow-[0_0_8px_rgb(110_162_255/0.7)]"
                : "bg-white/18"
            }`}
          />
        ))}
      </div>
      <span className="text-[0.75rem] leading-none font-semibold tabular-nums text-paper-ink">
        {held}/{total}
      </span>
    </div>
  );
}

/** A grouped-list row: separator inset to the text column, iOS style. */
function Person({
  who,
  answer,
  first,
}: {
  who: keyof typeof PEOPLE;
  answer: Answer;
  first?: boolean;
}) {
  const p = PEOPLE[who];
  const gone = answer === "gone";

  return (
    <div className={first ? "" : "border-t border-white/10"}>
      <div className="flex items-center gap-3 py-3 pr-1">
        <span
          aria-hidden
          className={`lg-thin grid h-9 w-9 shrink-0 place-items-center text-[0.8125rem] font-semibold transition-opacity duration-500 ${
            gone ? "text-paper-ink-3 opacity-50" : "text-white"
          }`}
        >
          {p.name[0]}
        </span>

        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-[0.9375rem] leading-tight font-semibold tracking-[-0.01em] ${
              gone ? "text-paper-ink-3" : "text-white"
            }`}
          >
            {p.name}
          </p>
          <p className="mt-0.5 truncate text-[0.75rem] leading-tight text-paper-ink-3">
            {answer === "yes"
              ? "Approved · just now"
              : gone
                ? "Approval expired"
                : `${p.role} · waiting`}
          </p>
        </div>

        {answer === "yes" ? (
          <span
            aria-hidden
            className="grid h-[1.375rem] w-[1.375rem] shrink-0 place-items-center rounded-full bg-paper-blue text-[#06183f] shadow-[0_0_12px_rgb(110_162_255/0.55)]"
          >
            <Check className="h-3 w-3" />
          </span>
        ) : (
          <span
            aria-hidden
            className={`h-[1.375rem] w-[1.375rem] shrink-0 rounded-full ${
              gone
                ? "border border-dashed border-white/30"
                : "ring-1 ring-white/25 ring-inset"
            }`}
          />
        )}
      </div>
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
  const eyebrow = {
    waiting: "Waiting on you",
    live: "Approved by both",
    spent: "Permission spent",
    denied: "Blocked",
  }[stage];

  return (
    <Phone>
      <div className="phone-sky relative flex h-full flex-col text-paper-ink">
        <StatusBar />

        <div className="relative flex flex-1 flex-col gap-3 px-4 pt-2.5 pb-2">
          <Panel
            i={0}
            className="flex items-baseline justify-between px-0.5 pb-0.5"
          >
            <h2 className="text-[1.375rem] leading-none font-bold tracking-[-0.03em] text-white">
              Approval
            </h2>
            <span className="text-[0.6875rem] text-paper-ink-3">
              composed 4m ago
            </span>
          </Panel>

          {/* Composed-by line. The pulse and the scanning rule below say the
              surface is being assembled live rather than fetched. */}
          <Panel i={0} className="flex items-center px-0.5">
            <div className="lg-thin flex items-center gap-1.5 py-1.5 pr-3 pl-2.5">
              <span
                aria-hidden
                className="pulse-dot h-1.5 w-1.5 rounded-full bg-paper-blue shadow-[0_0_6px_rgb(110_162_255/0.9)]"
              />
              <span className="text-[0.6875rem] leading-none font-semibold tracking-[-0.005em] text-white">
                Revenue Agent composed this view
              </span>
            </div>
          </Panel>

          <Panel i={1} className="lg overflow-hidden px-4 pt-4 pb-5">
            <span
              aria-hidden
              className="scan absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            />
            <p className="relative text-[0.625rem] font-semibold tracking-[0.09em] text-sky-key uppercase">
              {eyebrow}
            </p>
            <p className="relative mt-2 text-[1.3125rem] leading-[1.16] font-bold tracking-[-0.025em] text-balance">
              Turn on the EU launch campaign
            </p>
            <p className="relative mt-3 flex items-baseline gap-2">
              <span className="text-[2.375rem] leading-none font-extrabold tracking-[-0.04em] tabular-nums text-white">
                €30,000
              </span>
              <span className="text-[0.8125rem] font-medium text-paper-ink-2">
                cap
              </span>
            </p>
            <div className="relative mt-3.5 flex gap-1.5 border-t border-white/12 pt-3">
              {["14 days", "Google Ads", "EU"].map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-white/10 px-2 py-1 text-[0.6875rem] leading-none font-medium text-paper-ink-2"
                >
                  {t}
                </span>
              ))}
            </div>
          </Panel>

          {changed && (
            <Panel i={2} className="lg-tint px-4 py-3">
              <p className="text-[0.625rem] font-semibold tracking-[0.07em] text-sky-key uppercase">
                Plan changed by Marco
              </p>
              <p className="mt-1.5 text-[0.8125rem] leading-snug text-pretty text-white">
                Only if the product is ready, and only before launch day.
              </p>
            </Panel>
          )}

          {/* Why it reached this person specifically. The panel that turns a
              notification into a decision: without it the keyholder is being
              asked to rubber-stamp a number. Figures are the demo's frozen
              synthetic evidence, same as the cap above. */}
          <Panel i={changed ? 3 : 2} className="lg px-4 pt-3 pb-2.5">
            <p className="border-b border-white/12 pb-2.5 text-[0.6875rem] font-semibold tracking-[0.06em] text-paper-ink-3 uppercase">
              Why you
            </p>
            {[
              ["Over your sign-off", "€20,000"],
              ["Budget left this quarter", "€84,000"],
              ["Last EU test", "2.1× ROAS"],
            ].map(([label, value], i) => (
              <div
                key={label}
                className={`flex items-baseline justify-between py-2 ${
                  i === 0 ? "" : "border-t border-white/10"
                }`}
              >
                <span className="text-[0.8125rem] text-paper-ink-2">
                  {label}
                </span>
                <span className="text-[0.8125rem] font-semibold tabular-nums text-white">
                  {value}
                </span>
              </div>
            ))}
          </Panel>

          <Panel i={changed ? 4 : 3} className="lg px-4 pt-3 pb-1.5">
            <div className="flex items-center justify-between border-b border-white/12 pb-2.5">
              <span className="text-[0.6875rem] font-semibold tracking-[0.06em] text-paper-ink-3 uppercase">
                Keys held
              </span>
              <KeyMeter held={held} />
            </div>
            <Person who="finance" answer={finance} first />
            <Person who="ceo" answer={ceo} />
          </Panel>

          <Panel i={changed ? 5 : 4} className="mt-auto pt-1">
            {stage === "live" ? (
              <div className="rounded-full bg-paper-blue py-3.5 text-center shadow-[0_10px_30px_-10px_rgb(110_162_255/0.9)]">
                <p className="text-[0.9375rem] font-bold tracking-[-0.01em] text-[#06183f]">
                  Campaign is live
                </p>
              </div>
            ) : stage === "spent" ? (
              <div className="lg px-4 py-3 text-center">
                <p className="text-[0.8125rem] font-semibold">
                  Permission used
                </p>
                <p className="mt-0.5 text-[0.6875rem] text-paper-ink-3">
                  Good for one action, once.
                </p>
              </div>
            ) : stage === "denied" ? (
              <div className="rounded-[1.375rem] border border-dashed border-white/25 px-4 py-3 text-center">
                <p className="text-[0.8125rem] font-semibold text-paper-ink-3">
                  Blocked — nothing runs twice
                </p>
              </div>
            ) : (
              <div className="flex gap-2">
                <span className="flex-1 rounded-full bg-white py-3.5 text-center text-[0.9375rem] font-bold tracking-[-0.01em] text-[#06183f] shadow-[0_10px_28px_-12px_rgb(255_255_255/0.8)]">
                  Approve
                </span>
                <span className="lg-thin px-5 py-3.5 text-[0.9375rem] font-semibold text-white">
                  Change
                </span>
              </div>
            )}
          </Panel>

          <div className="flex justify-center pt-2 pb-1" aria-hidden>
            <span className="home-bar" />
          </div>
        </div>
      </div>
    </Phone>
  );
}
