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

const roleNames: Record<Role, string> = { finance: "Finance", ceo: "CEO" };

const statusText: Record<DecisionView["status"], string> = {
  PENDING_KEYS: "Waiting for both keys",
  PARTIALLY_APPROVED: "One key held",
  STALE: "Previous approval is stale",
  FULLY_APPROVED: "Both keys match",
  LEASED: "Execution lease ready",
  CONSUMED: "Lease consumed",
  CONFIRMED: "Campaign confirmed enabled",
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
      <p className="text-sm font-semibold text-ink-2">Choose a keyholder</p>
      <h1 className="mt-3 text-h2 text-balance">Open the same decision through one role.</h1>
      <p className="mt-4 max-w-[52ch] text-ink-2">
        Finance and CEO share the action facts. Each gets the context needed for a different responsibility.
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
          Local demo authentication is enabled. No access code is required.
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
        {busy ? "Opening decision..." : `Continue as ${roleNames[role]}`}
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
          <p className="text-sm font-semibold text-ink-2">Canonical action v{action.version}</p>
          <h2 id="action-title" className="mt-2 text-h2 text-balance">
            Activate the EU launch campaign
          </h2>
        </div>
        <span className="rounded-full border border-hairline-strong bg-white/8 px-3 py-1.5 text-sm font-semibold">
          {statusText[view.status]}
        </span>
      </div>

      <div className="mt-7 grid gap-6 border-t border-hairline pt-6 sm:grid-cols-[1fr_auto]">
        <div>
          <p className="text-4xl font-bold tracking-[-0.04em] tabular-nums sm:text-5xl">€30,000</p>
          <p className="mt-2 text-ink-2">14-day business cap, Google Ads test account</p>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:text-right">
          <div>
            <p className="text-ink-3">Current</p>
            <p className="mt-1 font-semibold">{action.campaign.currentStatus}</p>
          </div>
          <div>
            <p className="text-ink-3">Requested</p>
            <p className="mt-1 font-semibold">{action.campaign.desiredStatus}</p>
          </div>
          <div>
            <p className="text-ink-3">Starts</p>
            <p className="mt-1 font-semibold">{action.businessDecision.startDate}</p>
          </div>
          <div>
            <p className="text-ink-3">Ends</p>
            <p className="mt-1 font-semibold">{action.businessDecision.endDate}</p>
          </div>
        </div>
      </div>

      {action.executionConditions.length > 0 && (
        <div className="mt-6 rounded-lg border border-white/25 bg-white/8 p-4">
          <p className="text-sm font-semibold">Material condition added</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">
            Product readiness must remain GREEN and execution must happen before {formatDate(
              action.executionConditions.find((item) => item.type === "execute_before")!.timestamp,
            )}.
          </p>
        </div>
      )}

      <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-ink-3">Action hash</dt>
          <dd className="mt-1 font-mono text-xs" title={action.actionHash}>{shortHash(action.actionHash)}</dd>
        </div>
        <div>
          <dt className="text-ink-3">Evidence hash</dt>
          <dd className="mt-1 font-mono text-xs" title={action.evidenceBundleHash}>{shortHash(action.evidenceBundleHash)}</dd>
        </div>
        <div>
          <dt className="text-ink-3">Policy</dt>
          <dd className="mt-1 font-mono text-xs">{action.policyVersion}</dd>
        </div>
      </dl>
    </section>
  );
}

function Approvals({ view }: { view: DecisionView }) {
  return (
    <section className="glass p-5 sm:p-6" aria-labelledby="approvals-title">
      <div className="flex items-center justify-between gap-4">
        <h2 id="approvals-title" className="text-h3">Two independent keys</h2>
        <span className="text-sm tabular-nums text-ink-2">
          {view.approvals.filter((item) => item.status === "APPROVED").length}/2 valid
        </span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {view.approvals.map((approval) => (
          <div key={approval.role} className="rounded-lg border border-hairline bg-white/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">{roleNames[approval.role]}</p>
              <span className="text-xs font-bold">{approval.status}</span>
            </div>
            <p className="mt-2 text-sm text-ink-2">
              {approval.status === "APPROVED"
                ? `Bound to action v${approval.actionVersion}`
                : approval.status === "STALE"
                  ? `Approval on v${approval.actionVersion} cannot authorize v${view.action.version}`
                  : `Waiting on action v${view.action.version}`}
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
      <h2 id="finance-context" className="text-h3">Budget and downside</h2>
      <dl className="mt-5 grid grid-cols-2 gap-5">
        <div>
          <dt className="text-sm text-ink-3">Available before</dt>
          <dd className="mt-1 text-2xl font-bold tabular-nums">{eur(available)}</dd>
        </div>
        <div>
          <dt className="text-sm text-ink-3">Remaining after</dt>
          <dd className="mt-1 text-2xl font-bold tabular-nums">{eur(available - cap)}</dd>
        </div>
      </dl>
      <div className="mt-6 border-t border-hairline pt-5">
        <p className="text-sm font-semibold">Counterevidence</p>
        {view.evidence.counterevidence.map((item) => (
          <p key={item.factId} className="mt-3 text-sm leading-relaxed text-ink-2">
            {item.statement} <span className="text-ink-3">Source: {item.sourceId}</span>
          </p>
        ))}
      </div>
    </section>
  );
}

function CeoContext() {
  return (
    <section className="glass p-5 sm:p-6" aria-labelledby="ceo-context">
      <h2 id="ceo-context" className="text-h3">Strategy and opportunity cost</h2>
      <div className="mt-5 space-y-3">
        {SCENARIOS.map((scenario) => (
          <div key={scenario.name} className="rounded-lg border border-hairline bg-white/5 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-semibold">{scenario.name}</p>
              <p className="text-sm font-semibold tabular-nums">{eur(scenario.upsideEur)} upside</p>
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
      <h2 id="metric-strip-title" className="text-h3">Decision bounds</h2>
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
    <section className="glass p-5 sm:p-6" aria-labelledby="evidence-title">
      <h2 id="evidence-title" className="text-h3">Shared source ledger</h2>
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
    </section>
  );
}

function LeaseAndReceipt({ view }: { view: DecisionView }) {
  if (!view.lease && !view.receipt) return null;
  return (
    <section className="glass p-5 sm:p-6" aria-labelledby="lease-title">
      <h2 id="lease-title" className="text-h3">Execution proof</h2>
      {view.lease && (
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
          <div><dt className="text-ink-3">Lease</dt><dd className="mt-1 break-all font-mono text-xs">{view.lease.leaseId}</dd></div>
          <div><dt className="text-ink-3">Expires</dt><dd className="mt-1 font-semibold">{formatDate(view.lease.expiresAt)}</dd></div>
          <div><dt className="text-ink-3">Single use</dt><dd className="mt-1 font-semibold">Yes</dd></div>
          <div><dt className="text-ink-3">Consumed</dt><dd className="mt-1 font-semibold">{view.lease.consumedAt ? formatDate(view.lease.consumedAt) : "Not yet"}</dd></div>
        </dl>
      )}
      {view.receipt && (
        <div className="mt-6 rounded-lg border border-white/30 bg-white/10 p-4">
          <p className="font-semibold">Read-back confirmed {view.receipt.observedStatus}</p>
          <p className="mt-2 text-sm text-ink-2">{view.receipt.operation}</p>
          <p className="mt-2 break-all font-mono text-xs text-ink-3">Receipt {view.receipt.receiptId}</p>
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
      <p className="text-sm font-semibold text-ink-2">Later interaction</p>
      <h2 id="adaptation-title" className="mt-2 text-h3">Explicit CEO memory</h2>
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
          Remember this preference
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={compare}
          className="mt-5 rounded-full border border-hairline-strong px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10 active:translate-y-px disabled:opacity-60"
        >
          Compare memory off and on
        </button>
      )}

      {comparison && (
        <div className="mt-5 grid gap-3" aria-live="polite">
          <div className="rounded-lg border border-hairline bg-white/5 p-4">
            <p className="text-xs font-bold text-ink-3">MEMORY OFF</p>
            <p className="mt-2 text-sm font-semibold">{comparison.control.surface.lead}</p>
          </div>
          <div className="rounded-lg border border-white/30 bg-white/10 p-4">
            <p className="text-xs font-bold text-ink-3">CEO MEMORY ON</p>
            <p className="mt-2 text-sm font-semibold">{comparison.treatment.surface.lead}</p>
          </div>
          <p className="text-xs leading-relaxed text-ink-3">
            Shared evidence {comparison.unchanged.evidenceHash ? "unchanged" : "changed"}. Policy {comparison.unchanged.policyVersion ? "unchanged" : "changed"}.
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
      setError(reason instanceof Error ? reason.message : "The operation failed closed.");
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

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
      <div className="min-w-0 space-y-5">
        <div className="flex flex-col gap-4 px-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-ink-2">Signed in as {roleNames[view.viewerRole]}</p>
            <p className="mt-1 max-w-[58ch] text-sm text-ink-3">{view.surface.owns}</p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => localDemo || codes[otherRole] ? signIn(otherRole) : (setView(null), setLoginRole(otherRole))}
            className="self-start rounded-full border border-hairline-strong px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10 active:translate-y-px disabled:opacity-60 sm:self-auto"
          >
            Switch to {roleNames[otherRole]}
          </button>
        </div>

        <ActionCapsule view={view} />
        <Approvals view={view} />
        <LeaseAndReceipt view={view} />
      </div>

      <aside className="min-w-0 space-y-5">
        <section className="glass-strong p-5 sm:p-6" aria-labelledby="role-lead">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink-2">{roleNames[view.viewerRole]} view</p>
            <p className="text-xs text-ink-3">
              {surfaceBusy
                ? "Composing surface..."
                : surfaceGenerator?.source === "gemini"
                  ? `${surfaceGenerator.modelId} · validated ${surfaceGenerator.a2uiVersion}`
                  : "Validated local surface"}
            </p>
          </div>
          <h2 id="role-lead" className="mt-3 text-h3 text-balance">{view.surface.lead}</h2>

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
                onClick={() => run({ type: "condition", executeBefore: "2026-08-17T08:00:00Z" }, "Action v2 created. Finance v1 is now stale.")}
                className="rounded-full bg-white px-5 py-3 font-bold text-on-accent transition hover:bg-white/90 active:translate-y-px disabled:cursor-wait disabled:opacity-60"
              >
                Add launch guard
              </button>
            )}
            {canApprove && (
              <button
                type="button"
                disabled={busy}
                onClick={() => run({ type: "approve" }, `${roleNames[view.viewerRole]} approved action v${view.action.version}.`)}
                className="rounded-full bg-white px-5 py-3 font-bold text-on-accent transition hover:bg-white/90 active:translate-y-px disabled:cursor-wait disabled:opacity-60"
              >
                Approve v{view.action.version}
              </button>
            )}
            {view.status === "FULLY_APPROVED" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => run({ type: "issue_lease" }, "Single-use ActionLease issued.")}
                className="rounded-full bg-white px-5 py-3 font-bold text-on-accent transition hover:bg-white/90 active:translate-y-px disabled:cursor-wait disabled:opacity-60"
              >
                Issue ActionLease
              </button>
            )}
            {view.status === "LEASED" && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run({ type: "execute" }, "Campaign mutation confirmed by read-back.")}
                  className="rounded-full bg-white px-5 py-3 font-bold text-on-accent transition hover:bg-white/90 active:translate-y-px disabled:cursor-wait disabled:opacity-60"
                >
                  Execute once
                </button>
                <button
                  type="button"
                  disabled={busy || !view.lease}
                  onClick={() => view.lease && run({ type: "revoke_lease", leaseId: view.lease.leaseId }, "Lease revoked. Execution is blocked.")}
                  className="rounded-full border border-hairline-strong px-5 py-3 font-semibold transition hover:bg-white/10 active:translate-y-px disabled:opacity-60"
                >
                  Revoke lease
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
                Attempt replay
              </button>
            )}
            {view.status === "CONSUMED" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => run({ type: "reconcile" }, "External state reconciled without another mutation.")}
                className="rounded-full border border-hairline-strong px-5 py-3 font-semibold transition hover:bg-white/10 active:translate-y-px disabled:cursor-wait disabled:opacity-60"
              >
                Reconcile read-back
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
