# Devpost submission description

Track: **The Collaborative Partner**

This file is the text pasted into the Devpost description field. It is governed
by [claims.md](../04-validation/claims.md): every `[EVIDENCE PENDING]` marker
must be resolved or the sentence deleted before submitting. Grep for the marker
as the last step before the deadline.

---

## Summary

An autonomous revenue agent with a Google Ads API key can activate a EUR 30,000
campaign this afternoon. Nothing in its credentials distinguishes an action it is
allowed to perform from an action the company agreed to take.

**Technical permission is not company authorization.**

TwoKeys is the decision boundary for that gap. It binds one semantically complete
business action to the organizational roles that own it, presents that single
decision through each role's responsibilities, and executes only after every
required role approves the same immutable version.

The name describes the two kinds of key, not a number of people. The agent holds
capability. The organization holds authority. The authority key may have one
holder or several, and every holder must turn it on the same version.

Capability is one key. Authority is the other.

It ships as a plugin for agent harnesses. Your agents keep their tools and their
autonomy and integrate through one call: `propose_action(action, evidence)`
returns a single-use execution permit or a denial. Behind that call TwoKeys runs
its own agent, whose only job is to help the resolved keyholders decide. It holds
no company credentials, cannot execute, and has no proposal of its own to defend,
so it is the only participant with no stake in the answer. In this build both
agents are ours, because a demo needs a proposing agent to exist, and the Revenue
Agent consumes the same seam an external one would.

## What it does

A revenue agent detects an opportunity in frozen company evidence and proposes a
canonical action: activate campaign `launch-eu-001`, EUR 30,000, 14 days.

Two keyholders receive that same decision through different surfaces. Finance
sees affordability, budget impact, downside and guardrails. The CEO sees
strategic priority, urgency and opportunity cost. Both surfaces resolve against
one server-owned fact model and display matching action and evidence hashes, so
the roles see different framing of provably identical facts.

Finance approves. The CEO then attaches a material condition, which creates
action version 2, and Finance's approval on version 1 becomes `STALE`
automatically. Neither role can accidentally inherit consent across a change in
what was actually agreed. Both approve version 2, a single-use ActionLease is
issued, and a deterministic executor flips the campaign from `PAUSED` to
`ENABLED` in a Google Ads test account, then reads the resource back and stores a
receipt. Replaying the lease is denied.

Because the two role contexts are isolated by design, the agent is the only
participant that has seen both. When the keyholders' conditions conflict, it
intersects their constraint sets and proposes a version satisfying both, or
reports that no such action exists and stops, naming the exact trade-off that
requires a human conversation. It negotiates the shape of the action. It never
negotiates the authority to take it.
[EVIDENCE PENDING: reconciliation implemented and demonstrated]

## The invariant

```text
No executor call unless every required role approved the same action hash,
evidence hash, policy version, and unexpired lease.
```

Gemini interprets evidence, explains trade-offs, selects from an allowlist of
approved UI components and adapts their order. Deterministic code owns every
calculation, the policy, the hashes, approval validity, lease consumption and the
final Google Ads mutation. The model never constructs the executor request and
never grants authority.

## Features

- Canonical, content-addressed business actions with immutable versioning.
- Role-aware decision surfaces generated per role from isolated private memory
  plus shared evidence, validated against a six-component allowlist.
- Version-bound approvals: a material change invalidates all prior consent.
- ActionLease with expiry, revocation, nonce and single use.
- Deterministic executor with pre-mutation state verification, read-back receipt
  and replay denial.
- Cross-role memory isolation, so one keyholder's private feedback never reaches
  the other's surface.
- Per-role adaptation across episodes: explicit CEO feedback changes only the
  later CEO surface. [EVIDENCE PENDING: episode 2 memory-off/on result]
- Advisory evidence screening with Gemma 4 against a frozen benign/hostile pair;
  the authority kernel never consumes the model's verdict.
  [EVIDENCE PENDING: retain the passing `npm run gemma:screen` output]

## Technologies

- **Gemini 3.7 Flash** for evidence interpretation and declarative surface
  generation.
- **Gemma 4 26B A4B IT MaaS** for the separate prompt-injection and personal-data
  evidence-screen benchmark.
- **A2UI** declarative rendering, constrained to an allowlisted component set.
- **Google Cloud** for hosting and the transactional decision kernel.
- **Firestore** transactions for approval state and atomic lease issue/consume.
- **Google Ads API** for the single external mutation.
- **Next.js** for the role surfaces and public site.

[EVIDENCE PENDING: confirm the deployed Google Cloud services and agent framework
match this list exactly before submitting]

## Data sources

- A **frozen synthetic company dataset**: revenue evidence, launch readiness and
  campaign rationale, with stable source IDs. No real company data is used.
- A **Google Ads test account**. It has no billing, serves no ads and produces no
  live spend or serving metrics. Every business metric shown in the demo is
  frozen synthetic evidence. The test-account label is visible on screen before
  the first API mutation.

## What we learned

**Approval workflows are not the hard part; version binding is.** The failure
worth preventing is not "nobody approved": it is one role approving a different
version from the other, and a material change silently inheriting earlier
consent. Once approvals are bound to a content hash, staleness stops being a
policy question and becomes arithmetic.

**Isolating role context creates an asymmetry worth using.** Separating the two
keyholders' private memories was originally a privacy decision. It made the agent
the only participant with a complete view, which turned it from a proposer into
something that can reconcile two constraint sets neither human can see at once.

**Dual consent is the minimum instance of N-of-N, not the ceiling.** The contract
carries `requiredRoles` as a set and the gate validates all of them. Two is the
demo cut, chosen because every material change invalidates all prior approvals,
so convergence latency, not the mechanism, is what bounds the role count in a
four-minute story.

**The external dependency was the schedule risk, not the code.** Google Ads API
access is a human review queue and cannot be compressed by engineering effort.

## What this is not

TwoKeys is not an IAM or PAM replacement, an agent fleet, a generic approval
platform or a generated-dashboard product. Identity systems authorize an agent to
call an API; TwoKeys binds this campaign, this budget, this evidence and this
version to the consent of the roles that own the decision. The ActionLease is an
internal execution permit, not a credential system. The company scenario is the
setting, not a new platform category.

## Prior work declaration

All code and documentation in the submitted repository were created during the
submission period. Standard frameworks, libraries and coding assistants were used
as permitted by the Official Rules.

[EVIDENCE PENDING: confirm this statement is still accurate at submission time
and list any incorporated preexisting work here]
