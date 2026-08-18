# How to present TwoKeys in four minutes

This script shows the failure, state transition, external consequence, and
adaptation without presenting a platform that was not built.

## Before recording

- Use the frozen `launch-eu-001` fixture.
- Reset the campaign to `PAUSED` in the Google Ads test account.
- Reset all approvals, lease, and receipt state.
- Confirm Finance and CEO sessions cannot access each other's private memory.
- Confirm the v1 to v2 diff and replay denial pass.
- Display `TEST ACCOUNT: NO LIVE ADS OR SPEND` before the first API mutation.
- Keep the recording continuous and at normal speed.

## Exact opening: 0:00–0:20

> “This agent already has API access to activate a thirty-thousand-euro Google
> Ads campaign. But technical permission is not company authorization. TwoKeys
> blocks execution until Finance and the CEO approve the exact same version.
> Change the action, and the first approval disappears.”

The screen shows:

```text
GOOGLE ADS API ACCESS       ALLOWED
ORGANIZATIONAL AUTHORITY    MISSING
EXECUTION                   BLOCKED

TEST ACCOUNT: NO LIVE ADS OR SPEND
```

Do not show a logo animation, architecture slide, or model list before this
transition.

## Eight beats

| Time | Beat | Visible proof |
|---:|---|---|
| `0:00–0:20` | Capability is not company authorization | API access allowed; execution blocked |
| `0:20–0:45` | Opportunity detected | Frozen synthetic evidence and source IDs produce campaign v1 |
| `0:45–1:20` | One truth, two surfaces | Finance and CEO screens differ; Action Capsule and hashes match |
| `1:20–1:55` | Consent does not survive mutation | Finance approves v1; CEO condition creates v2; Finance becomes `STALE` |
| `1:55–2:20` | Two keys on one version | Finance reviews the diff; both approve v2; ActionLease appears |
| `2:20–2:50` | Real external consequence | Test campaign changes `PAUSED` to `ENABLED`; read-back receipt appears |
| `2:50–3:20` | Fail closed | Replay is denied; expiry and revocation results appear in the benchmark strip |
| `3:20–4:00` | Adaptation and architecture | CEO memory off/on comparison; Finance unchanged; seven-component diagram and results |

## Screen contract

Keep four persistent visual anchors:

1. **Action Capsule:** campaign, budget cap, period, version, required keys, and
   hashes.
2. **Authority state:** `BLOCKED`, `PARTIAL`, `STALE`, `AUTHORIZED`, `CONSUMED`,
   or `DENIED`.
3. **Truth labels:** `SYNTHETIC BUSINESS DATA` and `GOOGLE ADS TEST ACCOUNT`.
4. **Evidence status:** exact source IDs and timestamps behind the visible facts.

Avoid switching among generic dashboards. Every scene should make one state
transition visible.

## Narration rules

Say:

- “same decision, different responsibilities”;
- “a material change creates a new version”;
- “the model explains and adapts; deterministic policy authorizes”;
- “real API mutation in a Google Ads test account”;
- “zero observed canary leaks in the published benchmark,” only if measured.

Do not say:

- “a EUR 30,000 payment”;
- “live campaign spend”;
- “IAM only identifies the agent”;
- “constitutional layer for all enterprise agents”;
- “cryptographic consent”;
- “zero information leakage” without the benchmark qualifier;
- “300 tokens per second.”

## Closing line

> **“One action. Two views. Two keys.”**

## Verification

The take is acceptable only if a viewer can answer all five questions without
additional explanation:

1. What action was proposed?
2. Why could the agent not execute it immediately?
3. What change invalidated Finance's first approval?
4. What real external state changed?
5. What changed in episode 2, and for whom?

If one answer is unclear, cut a component or sentence. Do not add another slide.

## Troubleshooting

### The Ads mutation is not reliable

Stop UI work and fix the API spike. Do not replace the external consequence with
a fake success state.

### The role views look like two dashboards

Keep the Action Capsule identical, reduce each surface to three modules, and show
the CEO-memory off/on comparison.

### The demo exceeds four minutes

Cut architecture narration, decorative charts, and agent-monitoring setup. Keep
the stale approval, real mutation, replay denial, and episode 2.

### The audience thinks this is LeaseLine

Return to the decision: two organizational owners approve one business action.
Describe the lease only after consent as a single-use execution permit.

## Related

- [Demo scenario](scenario.md)
- [Claims and evidence](../04-validation/claims.md)
- [48-hour plan](../05-delivery/plan-48h.md)
