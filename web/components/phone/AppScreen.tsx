import Image from "next/image";
import { Phone } from "./Phone";

export type Answer = "waiting" | "yes" | "gone";
export type Stage = "waiting" | "live" | "spent" | "denied";

export interface ScreenState {
  finance: Answer;
  ceo: Answer;
  changed?: boolean;
  stage?: Stage;
}

const PEOPLE = {
  finance: {
    name: "Ana",
    role: "Finance",
    avatar: "/people/ana-finance-v2.webp",
  },
  ceo: {
    name: "Marco",
    role: "CEO",
    avatar: "/people/marco-ceo-v2.webp",
  },
} as const;

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
        d="m3.4 8.4 2.9 2.8L12.6 5"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StatusBar() {
  return (
    <div className="relative flex items-center justify-between px-7 pt-3.5">
      <span className="text-[0.9375rem] leading-none font-semibold tracking-[-0.01em] tabular-nums text-white">
        9:41
      </span>
      <div className="flex items-center gap-1.5" aria-hidden>
        <div className="flex items-end gap-[2px]">
          {[4, 6, 8, 10].map((height) => (
            <span
              key={height}
              className="w-[3px] rounded-[1px] bg-white"
              style={{ height }}
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

function EuBadge() {
  return (
    <svg viewBox="0 0 48 48" aria-label="European Union" className="h-12 w-12 shrink-0">
      <circle cx="24" cy="24" r="23" fill="#063fb4" stroke="#3977ff" />
      {Array.from({ length: 12 }, (_, index) => {
        const angle = (index * Math.PI * 2) / 12 - Math.PI / 2;
        return (
          <circle
            key={index}
            cx={(24 + Math.cos(angle) * 13).toFixed(3)}
            cy={(24 + Math.sin(angle) * 13).toFixed(3)}
            r="1.55"
            fill="#ffcf19"
          />
        );
      })}
    </svg>
  );
}

function Sparkles() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden className="h-5 w-5 shrink-0 text-[#5f91ff]">
      <path d="M8.2 2.3c.5 3.3 2.1 5 5.3 5.5-3.2.5-4.8 2.2-5.3 5.5-.5-3.3-2.1-5-5.3-5.5 3.2-.5 4.8-2.2 5.3-5.5Z" fill="currentColor" />
      <path d="M15.2 11.2c.25 1.7 1.1 2.55 2.75 2.8-1.65.25-2.5 1.1-2.75 2.8-.25-1.7-1.1-2.55-2.75-2.8 1.65-.25 2.5-1.1 2.75-2.8Z" fill="currentColor" />
    </svg>
  );
}

function Person({ who, answer }: { who: keyof typeof PEOPLE; answer: Answer }) {
  const person = PEOPLE[who];
  const gone = answer === "gone";

  return (
    <div className="flex items-center gap-2.5 py-2 first:pt-1.5 last:pb-1.5 [&+&]:border-t [&+&]:border-white/8">
      <Image
        src={person.avatar}
        alt=""
        width={36}
        height={36}
        className={`h-9 w-9 rounded-full object-cover ring-1 ring-white/15 ${gone ? "opacity-45 grayscale" : ""}`}
      />
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[0.875rem] leading-tight font-semibold ${gone ? "text-white/45" : "text-white"}`}>
          {person.name}
        </p>
        <p className="mt-0.5 truncate text-[0.6875rem] leading-tight text-[#90a5cc]">
          {answer === "yes" ? "Approved · just now" : gone ? "Approval expired" : person.role}
        </p>
      </div>
      {answer === "yes" ? (
        <span className="grid h-[1.5rem] w-[1.5rem] shrink-0 place-items-center rounded-full bg-[#2d72ff] text-white shadow-[0_0_12px_rgb(45_114_255/0.5)]">
          <Check className="h-3 w-3" />
        </span>
      ) : (
        <span className={`h-[1.5rem] w-[1.5rem] shrink-0 rounded-full ${gone ? "border border-dashed border-amber-300/55" : "border border-[#8fa7d5]"}`} />
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
  const status = {
    waiting: ["Waiting for Ana and Marco", "bg-amber-400", "text-[#b8c7e3]"],
    live: ["Both approved", "bg-emerald-400", "text-emerald-300"],
    spent: ["Launch permission used", "bg-[#6f8fca]", "text-[#aab9d5]"],
    denied: ["Second launch blocked", "bg-rose-400", "text-rose-300"],
  }[stage];

  const rationale = changed
    ? "The plan changed. Ana’s earlier approval expired, so both people must approve this version again."
    : "Finance and CEO are required because €30,000 exceeds the €20,000 sign-off threshold.";

  return (
    <Phone>
      <div className="phone-sky relative flex h-full flex-col text-white">
        <StatusBar />

        <div className="relative flex flex-1 flex-col gap-2.5 px-4 pt-2.5 pb-2">
          <Panel i={0} className="px-0.5">
            <div className="flex items-center justify-between">
              <span aria-hidden className="text-[2rem] leading-none font-light text-[#d9e5fb]">‹</span>
              <h2 className="text-[1.35rem] leading-none font-bold tracking-[-0.03em]">Approval</h2>
              <span aria-hidden className="w-6 text-right text-[1.15rem] leading-none tracking-[0.1em] text-[#d9e5fb]">•••</span>
            </div>
            <div className="mt-1 flex items-center justify-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${status[1]}`} />
              <span className={`text-[0.6875rem] font-medium ${status[2]}`}>{status[0]}</span>
            </div>
          </Panel>

          <Panel i={1} className="lg px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[1rem] font-semibold tracking-[-0.015em]">EU launch campaign</p>
                <p className="mt-2 text-[2.25rem] leading-none font-bold tracking-[-0.04em] tabular-nums">€30,000</p>
                <p className="mt-2 text-[0.8125rem] text-[#93a8cc]">Total budget</p>
              </div>
              <EuBadge />
            </div>
          </Panel>

          <Panel i={2} className="lg flex gap-3 px-4 py-3.5">
            <Sparkles />
            <div>
              <p className="text-[0.8125rem] font-semibold text-[#8bacff]">Why two approvals?</p>
              <p className="mt-1 text-[0.8125rem] leading-[1.45] text-[#d3def1]">{rationale}</p>
            </div>
          </Panel>

          <Panel i={3} className="lg px-4 py-3.5">
            <p className="text-[0.8125rem] font-semibold text-[#a5b6d5]">At a glance</p>
            <div className="mt-3 grid grid-cols-2 divide-x divide-white/10 border-t border-white/8 pt-3">
              <div className="pr-4">
                <p className="text-[0.75rem] text-[#93a8cc]">Budget left</p>
                <p className="mt-1 text-[1.35rem] font-bold tracking-[-0.025em] tabular-nums">€22,200</p>
              </div>
              <div className="pl-4">
                <p className="text-[0.75rem] text-[#93a8cc]">Projected ROAS</p>
                <p className="mt-1 text-[1.35rem] font-bold tracking-[-0.025em] tabular-nums">2.1x</p>
              </div>
            </div>
          </Panel>

          <Panel i={4} className="lg px-4 pt-3 pb-1.5">
            <p className="text-[0.8125rem] font-semibold text-[#a5b6d5]">Who must approve</p>
            <Person who="finance" answer={finance} />
            <Person who="ceo" answer={ceo} />
          </Panel>

          <Panel i={5} className="mt-auto space-y-2 pt-1">
            {stage === "spent" ? (
              <div className="lg px-4 py-2.5 text-center text-[0.8125rem] font-semibold text-[#aab9d5]">Campaign launched · permission used</div>
            ) : stage === "denied" ? (
              <div className="rounded-[0.75rem] border border-dashed border-rose-300/40 px-4 py-2.5 text-center text-[0.8125rem] font-semibold text-rose-200">Blocked — nothing runs twice</div>
            ) : (
              <>
                <span className="flex items-center justify-center gap-2 rounded-[0.75rem] bg-[#246bfd] py-3 text-[0.9375rem] font-semibold shadow-[0_8px_24px_-12px_rgb(36_107_253)]">
                  <Check className="h-4 w-4" />
                  {stage === "live" ? "Approved" : "Approve"}
                </span>
                <span className="block rounded-[0.75rem] border border-[#4c6fae] py-2.5 text-center text-[0.8125rem] font-medium text-[#d7e3f7]">Request changes</span>
              </>
            )}
          </Panel>

          <div className="flex justify-center pt-1" aria-hidden><span className="home-bar" /></div>
        </div>
      </div>
    </Phone>
  );
}
