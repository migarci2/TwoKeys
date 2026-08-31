"use client";

import { useEffect, useState } from "react";

import { SCENARIOS, eur } from "@/lib/fixture";
import type { Role } from "@/lib/server/authority";
import type { DecisionView } from "@/lib/server/dto";
import type {
  GeneratedSurfaceResponse,
  SurfaceComparisonResponse,
  SurfaceModule,
} from "@/lib/types";

type Command =
  | { type: "approve" }
  | { type: "condition"; executeBefore: string }
  | { type: "issue_lease" }
  | { type: "execute" }
  | { type: "reconcile" }
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
    <div className="mx-auto max-w-xl glass-strong p-6 sm:p-9">
      <p className="text-sm font-semibold text-ink-2">Start the example</p>
      <h1 className="mt-3 text-h2 text-balance">First, open Ana’s screen.</h1>
      <p className="mt-4 max-w-[52ch] text-ink-2">
        Approve as Ana, switch to Marco, and follow the next-step prompt. The whole demo takes four simple steps.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-2" aria-label="Keyholder role">
        {(["finance", "ceo"] as const).map((candidate) => (
          <button
            key={candidate}
            type="button"
            onClick={() => setRole(candidate)}
            aria-pressed={role === candidate}
            className={`rounded-full border px-4 py-3 font-semibold transition active:translate-y-px ${
              role === candidate
                ? "border-white bg-white text-on-accent"
                : "border-hairline-strong bg-white/5 text-ink hover:bg-white/10"
            }`}
          >
            {roleNames[candidate]}
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
  return (
    <section className="glass p-5 sm:p-6" aria-labelledby="approvals-title">
      <div className="flex items-center justify-between gap-4">
        <h2 id="approvals-title" className="text-h3">Step 2 · Both people approve</h2>
        <span className="text-sm tabular-nums text-ink-2">
          {view.approvals.filter((item) => item.status === "APPROVED").length}/2 approved
        </span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {view.approvals.map((approval) => (
          <div key={approval.role} className="rounded-lg border border-hairline bg-white/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">{roleNames[approval.role]}</p>
              <span className="text-xs font-bold">
                {approval.status === "APPROVED" ? "Approved" : approval.status === "STALE" ? "Approve again" : "Waiting"}
              </span>
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
      setNotice(success);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "The operation failed closed.";
      setError(message === "Lease replay denied before execution." ? "Blocked: this campaign was already launched once." : message);
    } finally {
      setBusy(false);
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

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
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
            onClick={() => localDemo || codes[otherRole] ? signIn(otherRole) : (setView(null), setLoginRole(otherRole))}
            className="self-start rounded-full border border-hairline-strong px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10 active:translate-y-px disabled:opacity-60 sm:self-auto"
          >
            Open {roleNames[otherRole]}
          </button>
        </div>

        <ActionCapsule view={view} />
        <Approvals view={view} />
        <LeaseAndReceipt view={view} />
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

          {(error || notice) && (
            <p
              role={error ? "alert" : "status"}
              className={`mt-5 rounded-lg border px-4 py-3 text-sm ${error ? "border-white/40 bg-white/12" : "border-hairline bg-white/6"}`}
            >
              {error || notice}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            {canAddCondition && (
              <button
                type="button"
                disabled={busy}
                onClick={() => run({ type: "condition", executeBefore: new Date(Date.now() + 86_400_000).toISOString() }, "Safety rule added. Ana’s earlier approval no longer counts.")}
                className="rounded-full bg-white px-5 py-3 font-bold text-on-accent transition hover:bg-white/90 active:translate-y-px disabled:cursor-wait disabled:opacity-60"
              >
                Add safety rule
              </button>
            )}
            {canApprove && (
              <button
                type="button"
                disabled={busy}
                onClick={() => run({ type: "approve" }, `${roleNames[view.viewerRole]} approved this plan.`)}
                className="rounded-full bg-white px-5 py-3 font-bold text-on-accent transition hover:bg-white/90 active:translate-y-px disabled:cursor-wait disabled:opacity-60"
              >
                Approve this plan
              </button>
            )}
            {view.status === "FULLY_APPROVED" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => run({ type: "issue_lease" }, "One-use launch permission created.")}
                className="rounded-full bg-white px-5 py-3 font-bold text-on-accent transition hover:bg-white/90 active:translate-y-px disabled:cursor-wait disabled:opacity-60"
              >
                Allow one launch
              </button>
            )}
            {view.status === "LEASED" && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run({ type: "execute" }, "Google Ads confirmed that the campaign is on.")}
                  className="rounded-full bg-white px-5 py-3 font-bold text-on-accent transition hover:bg-white/90 active:translate-y-px disabled:cursor-wait disabled:opacity-60"
                >
                  Launch campaign
                </button>
                <button
                  type="button"
                  disabled={busy || !view.lease}
                  onClick={() => view.lease && run({ type: "revoke_lease", leaseId: view.lease.leaseId }, "Lease revoked. Execution is blocked.")}
                  className="rounded-full border border-hairline-strong px-5 py-3 font-semibold transition hover:bg-white/10 active:translate-y-px disabled:opacity-60"
                >
                  Cancel permission
                </button>
              </>
            )}
            {view.status === "CONFIRMED" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => run({ type: "execute" }, "Unexpected replay success.")}
                className="rounded-full border border-hairline-strong px-5 py-3 font-semibold transition hover:bg-white/10 active:translate-y-px disabled:cursor-wait disabled:opacity-60"
              >
                Try to launch again
              </button>
            )}
            {view.status === "CONSUMED" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => run({ type: "reconcile" }, "Google Ads was checked without launching again.")}
                className="rounded-full border border-hairline-strong px-5 py-3 font-semibold transition hover:bg-white/10 active:translate-y-px disabled:cursor-wait disabled:opacity-60"
              >
                Check Google Ads result
              </button>
            )}
          </div>
        </section>

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
