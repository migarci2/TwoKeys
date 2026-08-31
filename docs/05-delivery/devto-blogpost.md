---
title: "TwoKeys: AI Agents Can Act, but Should They Decide?"
published: false
description: "How I built a version-bound, multi-person approval boundary for consequential AI agent actions."
tags: ai, security, googlecloud, agents
---

*I created this article for the purpose of entering the All Things Agentic Hackathon.*

An AI agent already has the API key.

It can read the campaign, change its status, and call Google Ads. Technically, it has everything it needs to activate a €30,000 launch campaign.

But did the company actually agree to do that?

That is the gap I built **TwoKeys** to explore.

> Technical capability is not sufficient organizational consent.

TwoKeys lets agents keep their tools and autonomy, but places a decision boundary in front of consequential actions. The agent may propose an action. It may explain the evidence. It may even prepare the exact API request. But the action does not run until every responsible person approves the same final version.

The short version is:

```text
Agents act. People decide.
```

## The demo in four steps

I deliberately built one concrete story instead of a generic “AI governance platform.”

A Revenue Agent proposes a 14-day, €30,000 EU campaign in a Google Ads test account.

1. **Ana in Finance approves the campaign.** She checks affordability, downside, and the remaining budget.
2. **Marco, the CEO, adds a safety rule.** The campaign should launch only while product readiness remains green and before a deadline.
3. **Ana’s first approval expires.** Marco changed the plan, so Ana’s earlier “yes” no longer applies. Both people approve the final version.
4. **TwoKeys allows one launch.** The permission is consumed after use, and a second attempt is blocked before another external mutation can happen.

The business data, company, and people in the demo are synthetic. The local demo uses a simulated campaign. The production adapter is limited to a Google Ads test account, which has no billing and serves no ads.

That distinction matters. This is a proof of an authorization mechanism, not proof that an AI agent spent €30,000 or ran a live advertising campaign.

## Approval was not the hard part

Adding two approval buttons is easy.

The dangerous case is more subtle: two people can approve two different realities.

Imagine this sequence:

```text
Ana approves:  €30,000 campaign
Marco changes: €30,000 campaign + safety condition
```

If Ana’s approval silently carries over, the system can claim that both people agreed even though Ana never saw the final plan.

TwoKeys treats every material change as a new immutable version. Each approval is bound to:

```text
action hash
evidence hash
policy version
action version
expiry
```

The central invariant is intentionally boring:

```text
No executor call unless every required role approved
the same action, evidence, policy, and current version.
```

When Marco adds the condition, the action hash changes. Ana’s approval becomes stale automatically. This is not a warning in the interface; it is a state transition enforced by deterministic code.

That was the core product insight for me: **approval is only meaningful when it is bound to what was actually approved.**

## The agent cannot choose who approves it

The proposing agent does not select its reviewers.

TwoKeys resolves the required roles from the material properties of the action using deterministic policy. A small routine action may need no human approval. A campaign above the configured threshold resolves to Finance and CEO.

This matters because an agent should not be able to route around an inconvenient decision-maker by changing a prompt or tool argument.

The agent integration stays small:

```text
propose_action(action, evidence) -> authorized | pending
await_decision(decision_id)      -> permission | denial | pending
```

The repository exposes that seam over HTTP, MCP, and a Google ADK adapter. An existing agent can keep its current tools and call TwoKeys only when it is ready to commit the organization to an action.

## Same decision, different responsibilities

Ana and Marco should not receive two generic dashboards.

They are answering different questions:

- **Finance:** Can we afford this? What remains afterward? What is the downside?
- **CEO:** Is this the right move now? Is there a smaller reversible option? What do we give up by waiting?

Both views still resolve from one server-owned fact model. The campaign, budget, evidence, policy, and action fingerprint are identical. Only the order and explanation change.

Gemini composes these role-specific surfaces by selecting and ordering components from an allowlisted A2UI catalog. It cannot invent HTML, JavaScript, calculations, or executable actions. The trusted renderer owns every material value.

The boundary is simple:

```text
Gemini explains and arranges.
Deterministic code authorizes and executes.
```

This separation also applies to memory. If Marco explicitly asks to see the smallest reversible pilot first on future launch decisions, TwoKeys can remember that preference for Marco’s later view. It does not change Ana’s interface, shared evidence, or company policy.

Personalization improves how a decision is presented. It must never quietly change what the organization is authorizing.

## One-use permission instead of reusable consent

After both people approve the final version, TwoKeys creates a short-lived, revocable, single-use execution permit. Internally, the project calls it an `ActionLease`.

The executor then:

1. reloads the current action, evidence, policy, and approvals;
2. verifies that every approval is still valid;
3. checks the external campaign snapshot;
4. atomically consumes the permit;
5. performs one mutation;
6. reads the external state back;
7. records a receipt.

Consuming the permit before the external call is important. Provider calls can fail ambiguously: the client may time out after the provider accepted the request. A blind retry could execute the action twice.

TwoKeys does not make that retry. Once the permit is consumed, recovery requires reading the external state and reconciling what happened.

The result is a small but useful guarantee:

```text
one approved version -> one execution attempt
```

## Keeping models away from authority

The system uses models where interpretation is useful, not where determinism is required.

Gemini can:

- organize evidence for a specific role;
- explain trade-offs;
- choose from trusted UI components;
- adapt presentation from explicit role-owned feedback.

Gemini cannot:

- decide which roles are required;
- calculate budgets or thresholds;
- create canonical hashes;
- validate approvals;
- issue or consume execution permission;
- construct the final Google Ads mutation.

I also added a separate Gemma evaluation lane for detecting prompt-injection and personal-data signals in frozen evidence fixtures. Its output is schema-validated and measured, but the authority kernel never reads its verdict.

That prevents a common failure in agent projects: adding a “safety model” whose unverified opinion silently becomes the security boundary.

## A boring deployment shape on purpose

TwoKeys has several logical responsibilities, but it does not need a fleet of microservices.

The intended Google Cloud shape is:

- one Cloud Run application;
- Firestore for transactional decision state;
- Secret Manager for server credentials;
- one dedicated runtime service account;
- one preconfigured Google Ads test-account campaign.

The same application serves the decision UI, approval API, authority kernel, agent seam, and executor. Firestore transactions serialize competing approval and lease operations.

The local application, deterministic kernel, adapters, and automated checks are implemented. A live Cloud Run deployment and retained proof of the real Google Ads test-account mutation are still pending, so I do not present them as completed results.

## What I learned

### 1. Version binding matters more than approval UI

The visible button is the least interesting part. The real control is making sure an old “yes” cannot survive a new plan.

### 2. Generated UI is safer when the model arranges trusted pieces

A blank canvas gives the model too much control. An allowlisted catalog with server-owned data references still allows useful adaptation without letting facts drift.

### 3. Personalization and policy must remain separate

Remembering how Marco prefers to inspect a decision is helpful. Letting that preference modify shared facts or approval rules would undermine the entire system.

### 4. External retries are authority decisions too

A timeout does not grant permission to try again. Consume first, call once, read back, and reconcile.

### 5. A narrow, falsifiable demo is stronger than a large promise

TwoKeys does not claim to secure every enterprise agent. It demonstrates one consequential action, one material change, one stale approval, one permission, and one blocked replay.

That is enough to make the boundary visible.

## Run the local demo

TwoKeys currently requires Node.js 24.

```bash
git clone https://github.com/migarci2/TwoKeys.git
cd TwoKeys/web
npm ci
LOCAL_DEMO_AUTH=true npm run dev
```

Then open:

```text
http://localhost:3000/demo
```

Development uses a deterministic surface fallback when no Gemini API key is configured, so the approval flow can be tested without provider credentials.

Run the automated checks with:

```bash
npm test
npm run lint
npm run build
```

## What comes next

The next milestone is not more surface area. It is stronger evidence for the slice that already exists:

1. deploy the complete flow to a billing-enabled Google Cloud project;
2. run the guarded mutation against the Google Ads test account;
3. retain the provider request ID and read-back receipt;
4. publish the declared evaluation results, including failures;
5. record a continuous demo showing the stale approval and blocked replay.

Only after that would I widen the action vocabulary or add more executors.

Agents are becoming capable enough to commit companies to real actions. The answer cannot be to stop them before every harmless task, and it cannot be to treat one API key as permanent consent for everything they may invent later.

The organization needs a final key for the decisions that bind it.

> **Agents act. People decide.**
