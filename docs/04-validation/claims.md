# Claims and evidence

This file controls what the pitch, README, video, and submission may say. A claim
moves from planned to defensible only after its evidence exists.

## Current truth

As of 2026-08-13:

| Claim area | Current evidence |
|---|---|
| Product direction and scope | Decided in project documentation |
| Gemini 3.7 Flash model identity and capabilities | Verified in official model documentation |
| A2UI declarative, allowlisted rendering model | Verified in official A2UI documentation |
| Google Ads test-account limits | Verified in official Google Ads documentation |
| Google Ads campaign creation in `PAUSED` state | Verified in official Google Ads documentation |
| Google Ads MPA limited to three user-access actions | Verified in official Google Ads documentation |
| TwoKeys implementation | No evidence yet in this repository |
| Real test-account campaign mutation by TwoKeys | Not yet demonstrated |
| Benchmark results | Not yet executed |
| Cross-role isolation | Proposed architecture, not yet measured |
| Episode 2 adaptation | Proposed experiment, not yet measured |

## Claims allowed after implementation

| Claim | Evidence required |
|---|---|
| “Technical permission is not company authorization.” | Product thesis; use as framing, not a universal technical theorem |
| “TwoKeys blocks execution until Finance and CEO approve the same canonical action version.” | A1–A6 pass and the gate runs outside Gemini |
| “A material change invalidates prior approvals.” | A5 produces v2 and marks the v1 approval stale |
| “Both roles see the same decision-critical evidence through different role-adaptive surfaces.” | U1–U2 show matching hashes and material facts |
| “The model explains and adapts; deterministic policy authorizes.” | Architecture inspection plus A1–A9 |
| “The ActionLease is time-bound, revocable, and single-use.” | A7–A9 plus expiry and revocation records |
| “TwoKeys executed a real Google Ads API mutation in a test account.” | Provider call and read-back receipt; test-account label always visible |
| “Explicit CEO feedback changed only the later CEO surface.” | M1 memory-off/on result |
| “No cross-role canary leaks were observed.” | U3 results with run count and scope stated |
| “Gemma flagged prompt injection and personal data in the frozen hostile evidence fixture.” | G1 output from `npm run gemma:screen`, including model ID and prompt version |

## Claims allowed now

These describe design intent, not completed behavior:

- “TwoKeys is designed to bind one business action to the set of organizational
  roles that own it, and the hackathon build exercises that set at two.”
- “The hackathon build targets one Revenue Agent and one Google Ads test
  campaign.”
- “The proposed architecture keeps authorization and execution outside the
  model.”
- “Keyholders are resolved from the action by deterministic policy, so an agent
  cannot select or influence who authorizes it.”
- “The evaluation will test stale approvals, replay, expiry, revocation, numeric
  fidelity, memory isolation, and later adaptation.”

## Claims to avoid

| Avoid | Why | Use instead |
|---|---|---|
| “IAM only tells us who the agent is and what it can touch.” | IAM and PAM already support conditions, temporary access, approvals, and multiple principals | “IAM governs technical access; TwoKeys binds an exact business decision to its organizational keyholders” |
| “Capabilities are not authority.” | A security capability does represent technical authority | “Technical capability is not sufficient organizational consent” |
| “TwoKeys is the constitutional layer for all enterprise agents.” | The build governs one action and does not implement a horizontal platform | “A policy-enforced, multi-principal, version-bound boundary for one business action” |
| “The agent runs 24/7.” | False unless scheduled monitoring is deployed and observed | “Scheduled monitoring with persistent state,” after verification |
| “Zero information leakage.” | A finite test cannot prove universal absence | “Zero cross-role canary leaks observed across the declared benchmark” |
| “It learns each executive.” | Persisted feedback is not model training | “It persists explicit feedback and adapts a later interaction” |
| “It spends or pays EUR 30,000.” | A test account has no billing and serves no ads | “It activates an approved EUR 30,000 campaign configuration in a test account” |
| “Unbiased generative dashboards.” | Bias absence is not demonstrable | “Source-bound, schema-validated decision surfaces” |
| “Cryptographic consent.” | Hash-bound records are not signatures | “Version-bound approval record” |
| “ActionLease proves identity.” | Identity proof requires a separate threat model | “Server-enforced execution permit” |
| “Gemini 3.7 Flash runs at 300 tokens per second.” | No fixed official throughput is published | Omit throughput; publish measured end-to-end latency |

## Google Ads wording

### Correct

> Finance and the CEO authorize activation of one campaign configuration under a
> business budget cap, period, evidence bundle, and execution conditions.

### Incorrect

> Finance and the CEO authorize a EUR 30,000 payment.

Google Ads activation is not a one-time payment. The demo changes an existing
campaign's status in a test account. It does not prove billing, live serving, or
performance.

Google Ads already has multi-party approvals in beta for inviting a user,
changing user access, and removing a user. Do not claim that Google Ads has no
multi-party approval. The narrower distinction is that its documented API actions
do not include budget or campaign-activation decisions.

## Metaphors

These phrases may appear once if followed by a precise definition:

- “Agents may be autonomous in execution, but not sovereign in authority.”
- “Capabilities are not consent.”
- “Constitutional boundary.”

Do not use them as architecture claims. The technical definition is:

> A policy-enforced, multi-principal, version-bound authorization boundary for
> one business action.

## Official references

Verified on 2026-08-13:

- [Gemini 3.7 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-3.7-flash):
  stable model ID, structured outputs, and supported thinking levels.
- [A2UI](https://a2ui.org/): declarative agent-to-UI protocol, trusted component
  catalogs, v0.9.1 current and v1.0 candidate.
- [Google Ads test accounts](https://developers.google.com/google-ads/api/docs/best-practices/test-accounts):
  no billing, no ad serving, no serving metrics, but campaign configuration can
  be created and changed.
- [Google Ads campaign creation](https://developers.google.com/google-ads/api/docs/campaigns/create-campaigns):
  official examples recommend creating campaigns in `PAUSED` and enabling them
  after configuration is complete.
- [Google Ads multi-party approvals](https://developers.google.com/google-ads/api/docs/oauth/multi-party-approvals):
  beta scope and supported user-access actions.
- [Google Cloud PAM](https://cloud.google.com/iam/docs/pam-overview): temporary
  privilege, approval, justification, revocation, and multi-party workflows.

## Final pitch

> **A Revenue Agent can execute a campaign, but it cannot authorize the company.
> TwoKeys presents the same decision to Finance and the CEO in the context each
> role needs, invalidates consent when the action changes, and issues a single-use
> execution permit only when both keys approve one version.**

## Related

- [Product vision](../01-product/vision.md)
- [Four-minute script](../02-demo/four-minute-script.md)
- [Benchmark](benchmark.md)
