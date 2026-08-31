"use client";

import { useEffect, useRef, useState } from "react";

import { SCENARIOS, eur } from "@/lib/fixture";
import type { Role } from "@/lib/server/authority";
import type { DecisionView } from "@/lib/server/dto";
import type {
  DeliberationTurnView,
  GeneratedSurfaceResponse,
  RevenueAgentResponse,
  SurfaceComparisonResponse,
  SurfaceModule,
} from "@/lib/types";

type Command =
  | { type: "approve" }
  | { type: "condition"; executeBefore: string }
  | { type: "issue_lease" }
  | { type: "execute" }
  | { type: "reconcile" }
  | { type: "settle" }
  | { type: "revoke_lease"; leaseId: string };

const roleNames: Record<Role, string> = { finance: "Ana · Finance", ceo: "Marco · CEO" };

const statusText: Record<DecisionView["status"], string> = {
  PENDING_KEYS: "Waiting for both people",
  PARTIALLY_APPROVED: "1 of 2 approved",
  STALE: "Plan changed · approve again",
  FULLY_APPROVED: "2 of 2 approved",
  LEASED: "Ready to launch once",
  CONSUMED: "Launch sent · checking",
  CONFIRMED: "Campaign is on",
};

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || `Request failed with ${response.status}.`);
  return body;
}

function shortHash(hash: string): string {
  const value = hash.replace("sha256:", "");
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(value));
}

function LoadingState() {
  return (
    <div className="grid min-h-[34rem] gap-5 lg:grid-cols-[1.15fr_0.85fr]" aria-label="Loading decision">
      <div className="glass-strong animate-pulse p-6 sm:p-8">
        <div className="h-4 w-28 rounded-full bg-white/15" />
        <div className="mt-8 h-12 w-4/5 rounded-xl bg-white/15" />
        <div className="mt-4 h-7 w-2/5 rounded-lg bg-white/10" />
      </div>
      <div className="glass animate-pulse p-6 sm:p-8">
        <div className="h-4 w-36 rounded-full bg-white/15" />
        <div className="mt-8 h-28 rounded-xl bg-white/10" />
        <div className="mt-4 h-28 rounded-xl bg-white/10" />
      </div>
    </div>
  );
}

function KeyGlyph({ complete = false }: { complete?: boolean }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="h-9 w-9" fill="none">
      <circle cx="17" cy="20" r="9" stroke="currentColor" strokeWidth="4" />
      <path d="M23.5 26.5 38 41m-5-5 4-4m-10 0 4-4" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      {complete && <path d="m12.5 20 3 3 6-7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}

function DemoProgress({ view }: { view: DecisionView }) {
  const keysReady = view.approvals.every((approval) => approval.status === "APPROVED");
  const executed = view.status === "CONFIRMED";
  const steps = [
    { label: "Review action", detail: "€30k launch", complete: true },
    { label: "Match both keys", detail: `${view.approvals.filter((approval) => approval.status === "APPROVED").length}/2 valid`, complete: keysReady || executed },
    { label: "Execute safely", detail: executed ? "Confirmed" : "Locked", complete: executed },
  ];

  return (
    <ol className="grid gap-2 sm:grid-cols-3" aria-label="Demo progress">
      {steps.map((step, index) => {
        const active = !step.complete && steps.slice(0, index).every((item) => item.complete);
        return (
          <li
            key={step.label}
            aria-current={active ? "step" : undefined}
            className={`relative overflow-hidden rounded-xl border px-4 py-3 transition duration-500 ${
              step.complete
                ? "border-white/35 bg-white/14"
                : active
                  ? "border-white/45 bg-[#071d55]/80 shadow-[0_0_35px_rgb(169_200_255/0.18)]"
                  : "border-hairline bg-white/5 text-ink-3"
            }`}
          >
            {active && <span aria-hidden="true" className="scan absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-white/15 to-transparent" />}
            <div className="relative flex items-center gap-3">
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-black ${step.complete ? "bg-white text-on-accent" : "border border-current"}`}>
                {step.complete ? "✓" : index + 1}
              </span>
              <span>
                <span className="block text-sm font-bold text-ink">{step.label}</span>
                <span className="mt-0.5 block text-xs">{step.detail}</span>
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Login({
  localDemo,
  role,
  setRole,
  accessCode,
  setAccessCode,
  busy,
  error,
  signIn,
}: {
  localDemo: boolean;
  role: Role;
  setRole: (role: Role) => void;
  accessCode: string;
  setAccessCode: (value: string) => void;
  busy: boolean;
  error: string | null;
  signIn: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl overflow-hidden glass-strong p-6 sm:p-9">
      <p className="text-sm font-semibold text-ink-2">Start the example</p>
      <h2 className="mt-3 text-h2 text-balance">First, open Ana’s screen.</h2>
      <p className="mt-4 max-w-[52ch] text-ink-2">
        Approve as Ana, switch to Marco, and follow the next-step prompt. The whole demo takes four simple steps.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2" aria-label="Keyholder role">
        {(["finance", "ceo"] as const).map((candidate) => (
          <button
            key={candidate}
            type="button"
            onClick={() => setRole(candidate)}
            aria-pressed={role === candidate}
            className={`group rounded-xl border p-5 text-left transition duration-300 active:translate-y-px ${
              role === candidate
                ? "border-white/70 bg-white text-on-accent shadow-[0_16px_45px_rgb(2_12_40/0.25)]"
                : "border-hairline-strong bg-white/5 text-ink hover:-translate-y-0.5 hover:bg-white/10"
            }`}
          >
            <span className="flex items-center justify-between gap-4">
              <KeyGlyph complete={role === candidate} />
              <span className="rounded-full border border-current/25 px-2 py-1 text-[0.65rem] font-black tracking-wider">
                {candidate === "finance" ? "START HERE" : "SECOND KEY"}
              </span>
            </span>
            <span className="mt-4 block text-lg font-bold">{roleNames[candidate]}</span>
            <span className={`mt-1 block text-sm ${role === candidate ? "text-on-accent/70" : "text-ink-2"}`}>
              {candidate === "finance" ? "Check budget and downside" : "Set strategy and guardrails"}
            </span>
          </button>
        ))}
      </div>

      {!localDemo && (
        <label className="mt-6 block">
          <span className="text-sm font-medium text-ink-2">Role access code</span>
          <input
            type="password"
            autoComplete="current-password"
            value={accessCode}
            onChange={(event) => setAccessCode(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && signIn()}
            className="mt-2 w-full rounded-lg border border-hairline-strong bg-[#061a4d]/85 px-4 py-3 text-ink placeholder:text-white/55 focus:border-white"
            placeholder={`Enter the ${roleNames[role]} code`}
          />
        </label>
      )}

      {localDemo && (
        <p className="mt-6 rounded-lg border border-hairline bg-white/5 px-4 py-3 text-sm text-ink-2">
          Demo mode: no access code needed.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-white/35 bg-white/10 px-4 py-3 text-sm">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={signIn}
        className="mt-6 w-full rounded-full bg-white px-5 py-3.5 font-bold text-on-accent transition hover:bg-white/90 active:translate-y-px disabled:cursor-wait disabled:opacity-60"
      >
        {busy ? "Opening..." : `Open ${roleNames[role]}`}
      </button>
    </div>
  );
}

function ActionCapsule({ view }: { view: DecisionView }) {
  const action = view.action;
  return (
    <section className="glass-strong p-5 sm:p-7" aria-labelledby="action-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-ink-2">Step 1 · Campaign request</p>
          <h2 id="action-title" className="mt-2 text-h2 text-balance">
            Turn on the EU launch campaign
          </h2>
        </div>
        <span className="rounded-full border border-hairline-strong bg-white/8 px-3 py-1.5 text-sm font-semibold">
          {statusText[view.status]}
        </span>
      </div>

      <div className="mt-7 grid gap-6 border-t border-hairline pt-6 sm:grid-cols-[1fr_auto]">
        <div>
          <p className="text-4xl font-bold tracking-[-0.04em] tabular-nums sm:text-5xl">€30,000</p>
          <p className="mt-2 text-ink-2">14 days · Google Ads test account</p>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:text-right">
          <div>
            <p className="text-ink-3">Now</p>
            <p className="mt-1 font-semibold">Paused</p>
          </div>
          <div>
            <p className="text-ink-3">If approved</p>
            <p className="mt-1 font-semibold">On</p>
          </div>
        </div>
      </div>

      {action.executionConditions.length > 0 && (
        <div className="mt-6 rounded-lg border border-white/25 bg-white/8 p-4">
          <p className="text-sm font-semibold">Safety rule added</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">
            Only launch while product readiness is GREEN and before {formatDate(
              action.executionConditions.find((item) => item.type === "execute_before")!.timestamp,
            )}.
          </p>
        </div>
      )}

      <details className="mt-6 border-t border-hairline pt-4 text-sm">
        <summary className="cursor-pointer font-semibold text-ink-2">Show technical proof</summary>
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-ink-3">Plan fingerprint</dt>
            <dd className="mt-1 font-mono text-xs" title={action.actionHash}>{shortHash(action.actionHash)}</dd>
          </div>
          <div>
            <dt className="text-ink-3">Evidence fingerprint</dt>
            <dd className="mt-1 font-mono text-xs" title={action.evidenceBundleHash}>{shortHash(action.evidenceBundleHash)}</dd>
          </div>
          <div>
            <dt className="text-ink-3">Rule version</dt>
            <dd className="mt-1 font-mono text-xs">{action.policyVersion}</dd>
          </div>
        </dl>
      </details>
    </section>
  );
}

function Approvals({ view }: { view: DecisionView }) {
  const approved = view.approvals.filter((item) => item.status === "APPROVED").length;
  return (
    <section className="glass p-5 sm:p-6" aria-labelledby="approvals-title" aria-live="polite">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-ink-2">Step 2 · Authority lock</p>
          <h2 id="approvals-title" className="mt-1 text-h3">Both people approve version {view.action.version}</h2>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-sm font-black tabular-nums ${approved === 2 ? "bg-white text-on-accent" : "border border-hairline-strong bg-white/8"}`}>
          {approved}/2 approved
        </span>
      </div>
      <div className="relative mt-6 grid gap-3 sm:grid-cols-2">
        <div aria-hidden="true" className={`absolute left-1/2 top-1/2 hidden h-0.5 w-8 -translate-x-1/2 -translate-y-1/2 sm:block ${approved === 2 ? "bg-white shadow-[0_0_18px_white]" : "bg-white/20"}`} />
        {view.approvals.map((approval) => (
          <div
            key={approval.role}
            className={`relative rounded-xl border p-4 transition duration-500 ${
              approval.status === "APPROVED"
                ? "border-white/55 bg-white/16 shadow-[0_12px_40px_rgb(169_200_255/0.14)]"
                : approval.status === "STALE"
                  ? "border-amber-200/45 bg-amber-100/10"
                  : "border-hairline bg-[#061a4d]/45"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${approval.status === "APPROVED" ? "bg-white text-on-accent" : "border border-hairline-strong text-ink-2"}`}>
                <KeyGlyph complete={approval.status === "APPROVED"} />
              </span>
              <div className="min-w-0">
                <p className="font-bold">{roleNames[approval.role]}</p>
                <p className="mt-0.5 text-xs font-black tracking-wider text-ink-2">
                  {approval.status === "APPROVED" ? "KEY LOCKED" : approval.status === "STALE" ? "KEY EXPIRED" : "WAITING"}
                </p>
              </div>
            </div>
            <p className="mt-2 text-sm text-ink-2">
              {approval.status === "APPROVED"
                ? "Approved this exact plan"
                : approval.status === "STALE"
                  ? "The plan changed, so the old approval no longer counts"
                  : "Has not approved this plan yet"}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FinanceContext({ view }: { view: DecisionView }) {
  const available = Number(view.evidence.facts["marketing.availableBudgetMicros"].value) / 1_000_000;
  const cap = Number(view.action.businessDecision.budgetCapMicros) / 1_000_000;
  return (
    <section className="glass p-5 sm:p-6" aria-labelledby="finance-context">
      <h2 id="finance-context" className="text-h3">What Ana checks</h2>
      <dl className="mt-5 grid grid-cols-2 gap-5">
        <div>
          <dt className="text-sm text-ink-3">Budget before</dt>
          <dd className="mt-1 text-2xl font-bold tabular-nums">{eur(available)}</dd>
        </div>
        <div>
          <dt className="text-sm text-ink-3">Budget after</dt>
          <dd className="mt-1 text-2xl font-bold tabular-nums">{eur(available - cap)}</dd>
        </div>
      </dl>
      <div className="mt-6 border-t border-hairline pt-5">
        <p className="text-sm font-semibold">Risks to review</p>
        {view.evidence.counterevidence.map((item) => (
          <p key={item.factId} className="mt-3 text-sm leading-relaxed text-ink-2">
            {item.statement}
          </p>
        ))}
      </div>
    </section>
  );
}

function CeoContext() {
  return (
    <section className="glass p-5 sm:p-6" aria-labelledby="ceo-context">
      <h2 id="ceo-context" className="text-h3">What Marco compares</h2>
      <div className="mt-5 space-y-3">
        {SCENARIOS.map((scenario) => (
          <div key={scenario.name} className="rounded-lg border border-hairline bg-white/5 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-semibold">{scenario.name}</p>
              <p className="text-sm font-semibold tabular-nums">Up to {eur(scenario.upsideEur)}</p>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">{scenario.note}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function MetricStrip({ view }: { view: DecisionView }) {
  const available = Number(view.evidence.facts["marketing.availableBudgetMicros"].value) / 1_000_000;
  const periodDays = Math.round(
    (Date.parse(view.action.businessDecision.endDate) -
      Date.parse(view.action.businessDecision.startDate)) /
      86_400_000,
  ) + 1;
  const metrics =
    view.viewerRole === "finance"
      ? [
          { label: "Budget cap", value: eur(Number(view.action.businessDecision.budgetCapMicros) / 1_000_000) },
          { label: "Available", value: eur(available) },
          { label: "Period", value: `${periodDays} days` },
        ]
      : [
          { label: "Readiness", value: view.evidence.facts["product.readiness"].value },
          { label: "Reversible options", value: String(SCENARIOS.filter((item) => item.reversible).length) },
          { label: "Period", value: `${periodDays} days` },
        ];
  return (
    <section className="glass p-5 sm:p-6" aria-labelledby="metric-strip-title">
      <h2 id="metric-strip-title" className="text-h3">Quick facts</h2>
      <dl className="mt-5 grid grid-cols-3 gap-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="min-w-0">
            <dt className="text-xs text-ink-3">{metric.label}</dt>
            <dd className="mt-1 break-words font-semibold tabular-nums">{metric.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Evidence({ view }: { view: DecisionView }) {
  return (
    <details className="glass p-5 sm:p-6">
      <summary className="cursor-pointer font-semibold">See shared data sources</summary>
      <div className="mt-5 space-y-4">
        {Object.entries(view.evidence.facts).map(([factId, fact]) => (
          <div key={factId} className="grid gap-1 sm:grid-cols-[1fr_auto] sm:gap-5">
            <div>
              <p className="font-mono text-xs text-ink-3">{factId}</p>
              <p className="mt-1 text-sm text-ink-2">{fact.sourceId}</p>
            </div>
            <p className="font-semibold tabular-nums sm:text-right">{fact.value}</p>
          </div>
        ))}
      </div>
    </details>
  );
}

function LeaseAndReceipt({ view }: { view: DecisionView }) {
  if (!view.lease && !view.receipt) return null;
  return (
    <section className="glass p-5 sm:p-6" aria-labelledby="lease-title">
      <h2 id="lease-title" className="text-h3">Step 3 · One launch only</h2>
      {view.lease && (
        <div className="mt-5">
          <p className="font-semibold">TwoKeys allows this campaign to launch once.</p>
          <p className="mt-2 text-sm text-ink-2">After that, the same permission cannot be reused.</p>
          <details className="mt-4 text-sm text-ink-2">
            <summary className="cursor-pointer font-semibold">Show permission details</summary>
            <p className="mt-3 break-all font-mono text-xs">{view.lease.leaseId}</p>
            <p className="mt-2">Expires {formatDate(view.lease.expiresAt)}</p>
          </details>
        </div>
      )}
      {view.receipt && (
        <div className="mt-6 rounded-lg border border-white/30 bg-white/10 p-4">
          <p className="font-semibold">Google Ads says the campaign is on.</p>
          <p className="mt-2 text-sm text-ink-2">The one-use permission is now spent.</p>
        </div>
      )}
    </section>
  );
}

function RevenueAgentPanel({
  run,
  busy,
  start,
}: {
  run: RevenueAgentResponse | null;
  busy: boolean;
  start: () => void;
}) {
  return (
    <section className="glass p-5 sm:p-6" aria-labelledby="revenue-agent-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-ink-2">Background workflow</p>
          <h2 id="revenue-agent-title" className="mt-2 text-h3">Revenue Agent</h2>
        </div>
        <span className="rounded-full border border-hairline-strong bg-white/8 px-3 py-1.5 text-xs font-bold tracking-wide">
          {run ? `${run.source === "adk" ? "ADK LIVE" : "LOCAL FALLBACK"} · ${run.decision.state}` : "READY"}
        </span>
      </div>
      {run ? (
        <div className="mt-5">
          <p className="text-sm leading-relaxed text-ink-2">
            Parsed the launch thread, proposed the governed campaign, and resolved {run.decision.requiredRoles.length} organizational keys through {run.decision.matchedRuleIds.join(", ")}.
          </p>
          <p className="mt-3 break-all font-mono text-xs text-ink-3">{run.decision.decisionId}</p>
        </div>
      ) : (
        <>
          <p className="mt-4 text-sm leading-relaxed text-ink-2">
            Marketing, Product, and Finance left one messy launch thread. The agent extracts the action and evidence, then proposes it without choosing its approvers.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={start}
            className="mt-5 rounded-full border border-hairline-strong px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10 active:translate-y-px disabled:opacity-60"
          >
            {busy ? "Reading launch thread..." : "Run Revenue Agent"}
          </button>
        </>
      )}
    </section>
  );
}

function DeliberationPanel({
  role,
  turns,
  value,
  busy,
  setValue,
  send,
}: {
  role: Role;
  turns: DeliberationTurnView[];
  value: string;
  busy: boolean;
  setValue: (value: string) => void;
  send: (message?: string) => void;
}) {
  const transcript = useRef<HTMLDivElement>(null);
  const suggestions =
    role === "finance"
      ? ["Can we afford the full launch?", "What downside could change this decision?"]
      : ["Only if we're launch-ready.", "What is the smallest reversible alternative?"];

  useEffect(() => {
    transcript.current?.scrollTo({
      top: transcript.current.scrollHeight,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }, [busy, role, turns.length]);

  return (
    <section className="glass p-5 sm:p-6" aria-labelledby="deliberation-title">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-ink-2">Private to {roleNames[role]}</p>
          <h2 id="deliberation-title" className="mt-2 text-h3">Deliberate before you decide</h2>
        </div>
        <span className="rounded-full border border-hairline px-3 py-1 text-xs text-ink-3">ADK · grounded tools</span>
      </div>

      <div
        ref={transcript}
        className="mt-5 max-h-80 space-y-3 overflow-y-auto pr-1"
        aria-live="polite"
      >
        {turns.map((turn) => (
          <div
            key={turn.turnId}
            className={`max-w-[92%] rounded-xl border px-4 py-3 text-sm leading-relaxed ${
              turn.speaker === "keyholder"
                ? "ml-auto border-white/30 bg-white text-on-accent"
                : "border-hairline bg-white/6 text-ink-2"
            }`}
          >
            <p>{turn.text}</p>
            {turn.citations.length > 0 && (
              <p className={`mt-2 font-mono text-[0.68rem] ${turn.speaker === "keyholder" ? "text-on-accent/60" : "text-ink-3"}`}>
                {turn.citations.join(" · ")}
              </p>
            )}
          </div>
        ))}
        {busy && <p className="text-sm text-ink-3">Checking the source ledger...</p>}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            disabled={busy}
            onClick={() => send(suggestion)}
            className="rounded-full border border-hairline px-3 py-2 text-xs text-ink-2 transition hover:border-hairline-strong hover:bg-white/8 disabled:opacity-50"
          >
            {suggestion}
          </button>
        ))}
      </div>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <label className="sr-only" htmlFor="deliberation-message">Message the deliberation agent</label>
        <input
          id="deliberation-message"
          value={value}
          maxLength={1000}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Ask, challenge, or state a condition..."
          className="min-w-0 flex-1 rounded-full border border-hairline-strong bg-[#061a4d]/70 px-4 py-3 text-sm text-ink placeholder:text-white/50 focus:border-white"
        />
        <button
          type="submit"
          disabled={busy || !value.trim()}
          className="rounded-full bg-white px-4 py-3 text-sm font-bold text-on-accent transition hover:bg-white/90 active:translate-y-px disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </section>
  );
}

function RoleModule({ module, view }: { module: SurfaceModule; view: DecisionView }) {
  if (module === "BudgetWaterfall") return <FinanceContext view={view} />;
  if (module === "ScenarioTable") return <CeoContext />;
  if (module === "MetricStrip") return <MetricStrip view={view} />;
  if (module === "EvidenceList") return <Evidence view={view} />;
  return null;
}

function AdaptationProof({
  remembered,
  comparison,
  busy,
  remember,
  compare,
}: {
  remembered: boolean;
  comparison: SurfaceComparisonResponse | null;
  busy: boolean;
  remember: () => void;
  compare: () => void;
}) {
  return (
    <section className="glass p-5 sm:p-6" aria-labelledby="adaptation-title">
      <p className="text-sm font-semibold text-ink-2">After the launch</p>
      <h2 id="adaptation-title" className="mt-2 text-h3">Remember how Marco likes decisions explained</h2>
      <p className="mt-4 text-sm leading-relaxed text-ink-2">
        For larger launch decisions, show the smallest reversible pilot and its opportunity cost before the full upside.
      </p>
      {!remembered ? (
        <button
          type="button"
          disabled={busy}
          onClick={remember}
          className="mt-5 rounded-full border border-hairline-strong px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10 active:translate-y-px disabled:opacity-60"
        >
          Remember Marco’s preference
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={compare}
          className="mt-5 rounded-full border border-hairline-strong px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10 active:translate-y-px disabled:opacity-60"
        >
          Show the difference next time
        </button>
      )}

      {comparison && (
        <div className="mt-5 grid gap-3" aria-live="polite">
          <div className="rounded-lg border border-hairline bg-white/5 p-4">
            <p className="text-xs font-bold text-ink-3">WITHOUT MARCO’S PREFERENCE</p>
            <p className="mt-2 text-sm font-semibold">{comparison.control.surface.lead}</p>
          </div>
          <div className="rounded-lg border border-white/30 bg-white/10 p-4">
            <p className="text-xs font-bold text-ink-3">WITH MARCO’S PREFERENCE</p>
            <p className="mt-2 text-sm font-semibold">{comparison.treatment.surface.lead}</p>
          </div>
          <p className="text-xs leading-relaxed text-ink-3">
            The shared facts and approval rules stay exactly the same.
          </p>
        </div>
      )}
    </section>
  );
}

export function DecisionConsole({ localDemo }: { localDemo: boolean }) {
  const [loginRole, setLoginRole] = useState<Role>("finance");
  const [codes, setCodes] = useState<Record<Role, string>>({ finance: "", ceo: "" });
  const [view, setView] = useState<DecisionView | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [surfaceGenerator, setSurfaceGenerator] = useState<GeneratedSurfaceResponse["generator"] | null>(null);
  const [surfaceBusy, setSurfaceBusy] = useState(false);
  const [comparison, setComparison] = useState<SurfaceComparisonResponse | null>(null);
  const [agentRun, setAgentRun] = useState<RevenueAgentResponse | null>(null);
  const [deliberationTurns, setDeliberationTurns] = useState<DeliberationTurnView[]>([]);
  const [deliberationInput, setDeliberationInput] = useState("");
  const [deliberationBusy, setDeliberationBusy] = useState(false);

  async function loadSurface(role: Role) {
    setSurfaceBusy(true);
    try {
      const generated = await readJson<GeneratedSurfaceResponse>(await fetch("/api/surface"));
      setView((current) =>
        current?.viewerRole === role ? { ...current, surface: generated.surface } : current,
      );
      setSurfaceGenerator(generated.generator);
    } catch {
      setNotice("The validated deterministic surface is active; Gemini composition is unavailable.");
      setSurfaceGenerator(null);
    } finally {
      setSurfaceBusy(false);
    }
  }

  async function loadDeliberation() {
    try {
      const thread = await readJson<{ turns: DeliberationTurnView[] }>(
        await fetch("/api/deliberation"),
      );
      setDeliberationTurns(thread.turns);
    } catch {
      setDeliberationTurns([]);
    }
  }

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function restoreSession() {
      try {
        const restoredSession = await readJson<{ role: Role | null }>(
          await fetch("/api/session", { signal: controller.signal }),
        );
        if (!restoredSession.role) return;
        const restored = await readJson<DecisionView>(await fetch("/api/decision", { signal: controller.signal }));
        if (active) {
          setView(restored);
          void loadSurface(restored.viewerRole);
          void loadDeliberation();
        }
      } catch (reason) {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
      } finally {
        if (active) setLoading(false);
      }
    }
    void restoreSession();
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  async function signIn(role = loginRole) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await readJson<{ role: Role }>(
        await fetch("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role, accessCode: codes[role] }),
        }),
      );
      const next = await readJson<DecisionView>(await fetch("/api/decision"));
      setView(next);
      setLoginRole(role);
      setComparison(null);
      void loadSurface(role);
      void loadDeliberation();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign-in failed.");
    } finally {
      setBusy(false);
      setLoading(false);
    }
  }

  async function run(command: Command, success: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const next = await readJson<DecisionView>(
        await fetch("/api/decision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(command),
        }),
      );
      setView(next);
      setNotice(
        command.type === "approve" && next.status === "CONFIRMED"
          ? `${roleNames[next.viewerRole]} approved the matching version. Lease, mutation, and read-back completed automatically.`
          : success,
      );
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "The operation failed closed.";
      setError(message === "Lease replay denied before execution." ? "Blocked: this campaign was already launched once." : message);
    } finally {
      setBusy(false);
    }
  }

  async function startRevenueAgent() {
    setBusy(true);
    setError(null);
    try {
      const result = await readJson<RevenueAgentResponse>(
        await fetch("/api/agent", { method: "POST" }),
      );
      setAgentRun(result);
      setNotice(
        result.decision.state === "PENDING"
          ? "Revenue Agent proposed the action. Deterministic policy summoned Finance and CEO."
          : `Revenue Agent finished with ${result.decision.state}.`,
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The Revenue Agent could not run.");
    } finally {
      setBusy(false);
    }
  }

  async function sendDeliberation(message = deliberationInput) {
    const value = message.trim();
    if (!value) return;
    setDeliberationBusy(true);
    setError(null);
    try {
      const result = await readJson<{ turns: DeliberationTurnView[] }>(
        await fetch("/api/deliberation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: value }),
        }),
      );
      setDeliberationTurns(result.turns);
      setDeliberationInput("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The deliberation agent could not answer.");
    } finally {
      setDeliberationBusy(false);
    }
  }

  async function surfaceCommand<T>(type: "remember_feedback" | "compare_memory"): Promise<T> {
    return readJson<T>(
      await fetch("/api/surface", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      }),
    );
  }

  async function rememberFeedback() {
    setBusy(true);
    setError(null);
    try {
      await surfaceCommand<{ remembered: true }>("remember_feedback");
      setSurfaceGenerator((current) => current && { ...current, memoryApplied: true });
      setNotice("CEO feedback confirmed and stored only in CEO memory.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The feedback could not be stored.");
    } finally {
      setBusy(false);
    }
  }

  async function compareMemory() {
    setBusy(true);
    setError(null);
    try {
      setComparison(await surfaceCommand<SurfaceComparisonResponse>("compare_memory"));
      setNotice("The later decision ran with identical shared evidence and policy.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The comparison could not run.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingState />;
  if (!view) {
    return (
      <Login
        localDemo={localDemo}
        role={loginRole}
        setRole={setLoginRole}
        accessCode={codes[loginRole]}
        setAccessCode={(value) => setCodes((current) => ({ ...current, [loginRole]: value }))}
        busy={busy}
        error={error}
        signIn={() => signIn()}
      />
    );
  }

  const otherRole: Role = view.viewerRole === "finance" ? "ceo" : "finance";
  const canAddCondition = view.viewerRole === "ceo" && view.action.version === 1;
  const myApproval = view.approvals.find((item) => item.role === view.viewerRole);
  const canApprove =
    view.status !== "CONFIRMED" &&
    view.status !== "LEASED" &&
    view.status !== "CONSUMED" &&
    !canAddCondition &&
    myApproval?.status !== "APPROVED";
  const nextStep = canAddCondition
    ? {
        title: "Marco adds one safety rule.",
        body: "Require the product to stay ready before the campaign launches.",
      }
    : canApprove
      ? {
          title: `${roleNames[view.viewerRole]} approves this plan.`,
          body: "The approval applies only to the exact version shown here.",
        }
      : view.status === "FULLY_APPROVED"
        ? {
            title: "Both people approved. Allow one launch.",
            body: "This creates a short-lived permission that works once.",
          }
        : view.status === "LEASED"
          ? {
              title: "The campaign is ready. Launch it.",
              body: "TwoKeys will use the permission and immediately spend it.",
            }
          : view.status === "CONFIRMED"
            ? {
                title: "Done. Now try the same launch again.",
                body: "The second attempt proves that used permission cannot be replayed.",
              }
            : view.status === "CONSUMED"
              ? {
                  title: "The launch was sent. Check the result.",
                  body: "TwoKeys reads Google Ads again without launching a second time.",
                }
              : {
                  title: `Now switch to ${roleNames[otherRole]}.`,
                  body: "The campaign stays paused until the other person finishes their step.",
                };

  const switchRole = () => {
    if (localDemo || codes[otherRole]) void signIn(otherRole);
    else {
      setView(null);
      setLoginRole(otherRole);
    }
  };

  let missionTitle = `Turn the ${roleNames[view.viewerRole]} key`;
  let missionDetail = `Approve action v${view.action.version}. Your key is bound to this exact action, evidence, and policy.`;
  if (canAddCondition) {
    missionTitle = "Add the CEO guardrail";
    missionDetail = "Make launch readiness a hard condition. This creates v2 and visibly expires any approval on v1.";
  } else if (view.status === "FULLY_APPROVED" || view.status === "LEASED") {
    missionTitle = "Both keys match — finish protected execution";
    missionDetail = "TwoKeys can now issue a single-use lease, mutate the test campaign, and verify the read-back.";
  } else if (view.status === "CONSUMED") {
    missionTitle = "Mutation sent — verify the read-back";
    missionDetail = "Reconcile the external state without attempting a second mutation.";
  } else if (view.status === "CONFIRMED") {
    missionTitle = "Unlocked. Campaign confirmed.";
    missionDetail = "Both keys matched v2. The single-use lease was consumed and Google Ads returned ENABLED.";
  } else if (myApproval?.status === "APPROVED") {
    missionTitle = `Your key is locked. Hand off to ${roleNames[otherRole]}.`;
    missionDetail = `Switch roles to add the matching key on action v${view.action.version}.`;
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
      <div className="lg:col-span-2">
        <DemoProgress view={view} />
      </div>

      <section
        key={`${view.action.version}-${view.status}-${view.viewerRole}`}
        className={`composing relative overflow-hidden rounded-[1.25rem] border p-6 shadow-[0_24px_90px_rgb(2_12_40/0.32)] sm:p-8 lg:col-span-2 ${
          view.status === "CONFIRMED"
            ? "border-emerald-100/60 bg-[radial-gradient(circle_at_85%_10%,rgb(110_231_183/0.32),transparent_32%),linear-gradient(135deg,rgb(255_255_255/0.2),rgb(6_40_96/0.86))]"
            : "border-white/45 bg-[radial-gradient(circle_at_85%_10%,rgb(169_200_255/0.3),transparent_34%),linear-gradient(135deg,rgb(255_255_255/0.18),rgb(6_26_77/0.88))]"
        }`}
        aria-labelledby="next-mission"
      >
        {busy && <span aria-hidden="true" className="scan absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-white/20 to-transparent" />}
        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs font-black tracking-[0.14em] text-ink-2">
              <span className={`h-2.5 w-2.5 rounded-full ${view.status === "CONFIRMED" ? "bg-emerald-300 shadow-[0_0_16px_rgb(110_231_183)]" : "pulse-dot bg-white"}`} />
              {view.status === "CONFIRMED" ? "MISSION COMPLETE" : "DO THIS NEXT"}
            </div>
            <h2 id="next-mission" className="mt-3 max-w-3xl text-h2 text-balance">{missionTitle}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-2 sm:text-base">{missionDetail}</p>
          </div>
          <div className="flex flex-wrap gap-2 lg:max-w-xs lg:justify-end">
            {canAddCondition && (
              <button type="button" disabled={busy} onClick={() => run({ type: "condition", executeBefore: `${view.action.businessDecision.endDate}T23:59:59Z` }, "Guardrail added. Action v2 created; the Finance v1 key expired.")} className="rounded-full bg-white px-6 py-3.5 font-black text-on-accent shadow-[0_10px_30px_rgb(2_12_40/0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_38px_rgb(2_12_40/0.34)] active:translate-y-px disabled:cursor-wait disabled:opacity-60">
                Add guardrail →
              </button>
            )}
            {canApprove && (
              <button type="button" disabled={busy} onClick={() => run({ type: "approve" }, `${roleNames[view.viewerRole]} key locked to action v${view.action.version}.`)} className="rounded-full bg-white px-6 py-3.5 font-black text-on-accent shadow-[0_10px_30px_rgb(2_12_40/0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_38px_rgb(2_12_40/0.34)] active:translate-y-px disabled:cursor-wait disabled:opacity-60">
                Turn {roleNames[view.viewerRole]} key →
              </button>
            )}
            {myApproval?.status === "APPROVED" && view.status !== "CONFIRMED" && view.status !== "FULLY_APPROVED" && view.status !== "LEASED" && view.status !== "CONSUMED" && (
              <button type="button" disabled={busy} onClick={switchRole} className="rounded-full bg-white px-6 py-3.5 font-black text-on-accent shadow-[0_10px_30px_rgb(2_12_40/0.25)] transition hover:-translate-y-0.5 active:translate-y-px disabled:opacity-60">
                Switch to {roleNames[otherRole]} →
              </button>
            )}
            {(view.status === "FULLY_APPROVED" || view.status === "LEASED") && (
              <button type="button" disabled={busy} onClick={() => run({ type: "settle" }, "Protected execution resumed and confirmed.")} className="rounded-full bg-white px-6 py-3.5 font-black text-on-accent transition hover:-translate-y-0.5 active:translate-y-px disabled:opacity-60">
                Finish execution →
              </button>
            )}
            {view.status === "CONSUMED" && (
              <button type="button" disabled={busy} onClick={() => run({ type: "reconcile" }, "External state reconciled without another mutation.")} className="rounded-full bg-white px-6 py-3.5 font-black text-on-accent transition hover:-translate-y-0.5 active:translate-y-px disabled:opacity-60">
                Verify read-back →
              </button>
            )}
            {view.status === "CONFIRMED" && (
              <button type="button" disabled={busy} onClick={() => run({ type: "execute" }, "Unexpected replay success.")} className="rounded-full border border-white/45 bg-white/10 px-5 py-3 font-bold transition hover:bg-white/16 active:translate-y-px disabled:opacity-60">
                Test blocked replay
              </button>
            )}
          </div>
        </div>
        {(error || notice) && (
          <p role={error ? "alert" : "status"} className={`relative mt-5 rounded-lg border px-4 py-3 text-sm ${error ? "border-white/45 bg-white/14" : "border-white/25 bg-[#061a4d]/35"}`}>
            {error || notice}
          </p>
        )}
      </section>

      <div className="min-w-0 space-y-5">
        <div className="flex flex-col gap-4 px-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-ink-2">You are {roleNames[view.viewerRole]}</p>
            <p className="mt-1 max-w-[58ch] text-sm text-ink-3">
              {view.viewerRole === "finance" ? "Ana checks affordability and risk." : "Marco checks timing and alternatives."}
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={switchRole}
            className="self-start rounded-full border border-hairline-strong px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10 active:translate-y-px disabled:opacity-60 sm:self-auto"
          >
            Open {roleNames[otherRole]}
          </button>
        </div>

        <ActionCapsule view={view} />
        <Approvals view={view} />
        <LeaseAndReceipt view={view} />
        <RevenueAgentPanel run={agentRun} busy={busy} start={() => void startRevenueAgent()} />
      </div>

      <aside className="min-w-0 space-y-5">
        <section className="glass-strong p-5 sm:p-6" aria-labelledby="role-lead">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink-2">What to do next</p>
            <p className="text-xs text-ink-3">
              {surfaceBusy
                ? "Preparing this view..."
                : surfaceGenerator?.source === "gemini" ? "Prepared by Gemini" : "Demo view ready"}
            </p>
          </div>
          <h2 id="role-lead" className="mt-3 text-h3 text-balance">{nextStep.title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-2">{nextStep.body}</p>
        </section>

        <DeliberationPanel
          role={view.viewerRole}
          turns={deliberationTurns}
          value={deliberationInput}
          busy={deliberationBusy}
          setValue={setDeliberationInput}
          send={(message) => void sendDeliberation(message)}
        />

        {view.surface.modules
          .filter((module) => module !== "ActionCapsule" && module !== "ConditionForm")
          .map((module) => <RoleModule key={module} module={module} view={view} />)}
        {view.viewerRole === "ceo" && view.status === "CONFIRMED" && (
          <AdaptationProof
            remembered={surfaceGenerator?.memoryApplied ?? false}
            comparison={comparison}
            busy={busy}
            remember={() => void rememberFeedback()}
            compare={() => void compareMemory()}
          />
        )}
      </aside>
    </div>
  );
}
