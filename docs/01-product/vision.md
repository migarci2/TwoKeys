# Product vision

## Thesis

Company agents are becoming persistent, capable, and connected to real tools.
That increases execution autonomy, but it does not give an agent the mandate to
make every decision it can technically perform.

> **Autonomous execution does not imply organizational authority.**

TwoKeys handles the gap between API access and company consent. It binds a
semantically complete business action to the roles that own the decision, helps
each holder reach that decision through conversation grounded in retrieved
evidence, preserves their separate context, and fails closed until every required
approval covers the same version.

## How many keys

The name describes the two kinds of key, not the number of people.

> The agent holds capability. The organization holds authority. An action needs
> both.

The authority key is held by one or more roles, and the count is a property of
the decision rather than of the system:

| Holders | Shape | Example |
|---:|---|---|
| 1 | A person authorizes or refuses an agent action | An operator approving a refund above threshold |
| 2 | Two responsibilities must agree | Finance and the CEO on a EUR 30,000 campaign |
| n | Every named role must agree | Finance, Legal and the CEO on a public commitment |

`requiredRoles` is a set in the [contracts](../03-system/contracts.md) and the
gate validates all of it. Nothing in the invariant refers to the number two.

What does not scale freely is convergence. Every material change invalidates all
prior approvals, so each added holder lengthens the path from proposal to
execution. That is why the demo uses two, and why the count is a decision the
policy author makes rather than a constant the system imposes.

At a single holder the mechanism does not degrade into a confirmation dialog.
The action is still canonical and hashed, a material change still invalidates the
prior approval, execution still consumes a single-use lease, and the decision is
still reached through deliberation rather than a yes/no prompt.

## Who holds the key

The holders are resolved from the action, not from the agent.

> **An agent cannot choose who authorizes it.**

A running agent produces a candidate action. Deterministic policy reads that
action's material properties, its amount, category, reversibility and blast
radius, and resolves the set of roles that own a decision of that shape. The
agent has no input into that resolution and no standing in it.

Three consequences follow, and they are the point rather than side effects.

**The keyholder need not have spawned the agent.** An always-on agent may act
weeks after anyone configured it, and the person who owns the resulting decision
may have no relationship to its creation. Ownership follows responsibility, not
invocation.

**An agent cannot route around a keyholder.** In a conventional approval
workflow the requester picks or inherits the approver, so selecting a permissive
one is an available move. Here the requester is a program and the resolution is a
deterministic function of the action, so a different approver requires a
different action, which is a different hash and a different decision.

**The surface must work cold.** A resolved keyholder may not have been expecting
this and may not know the agent exists. The surface therefore has to establish
what is being asked, why this person, and why now, before it asks for anything.
Deliberation carries that load: the first thing a keyholder can do is ask.

Reassignment, delegation and escalation when a resolved holder is unavailable are
real problems and are [out of scope](scope.md) for this build.

## The harness becomes fluid

A conventional agent harness is fixed at build time. It declares the tools, the
permissions and the approval steps once, before anyone knows what the agent will
actually propose. That forces a bad trade: tighten it and the agent stops being
useful, loosen it and it becomes unsafe. Since the harness cannot know next
month's action, it gets calibrated for the worst case, which is where autonomy
goes to die.

TwoKeys resolves the harness per action instead of per agent.

> **Authority is not configured in advance. It is computed from what the agent is
> about to do.**

| | Fixed harness | Fluid harness |
|---|---|---|
| Defined | At build time, per agent | At decision time, per action |
| Input | The agent's identity | The action's material properties |
| Cost of caution | Paid on every action | Paid only where it is warranted |
| Failure mode | Too tight to be useful, or too loose to be safe | Wrong resolution rule, which is inspectable and versioned |

This is what makes unsupervised operation defensible. An agent can run
continuously with real credentials because the constraint is not a standing tax
on everything it does. Most actions resolve to no keyholders and simply execute.
The expensive path, deliberation and multi-party consent, engages only for the
actions whose shape demands it.

The same resolution governs how much interface a decision gets. A routine action
needs no surface at all. A material one earns a role-specific surface, retrieval
tooling and a conversation. Interface, like authority, is a function of stakes.

### What this build actually demonstrates

The hackathon build contains one policy with one resolution rule. That is an
instance of the pattern, not a general implementation of it, and the pitch must
say so.

Defensible: *the roles that must consent are computed from the action rather than
configured against the agent, and the same mechanism admits zero, one or several
holders.*

Not defensible without further evidence: any claim that TwoKeys implements a
general fluid harness, a policy engine, or a horizontal control plane.

## What ships

TwoKeys is a plugin for agent harnesses, plus the agent that talks to the people
the plugin resolves.

### The seam

Your agents keep their tools, their credentials and their autonomy. The
integration is one call and one wait:

```text
propose_action(action, evidence) -> decision_id, state
await_decision(decision_id)        -> lease | denial | pending
```

The proposal returns immediately with a state, never with a verdict. A decision
that requires people takes as long as those people take, so the seam is
asynchronous by construction. An agent that proposes at 03:00 may receive its
lease at 09:40, or never.

The immediate state is itself the fluid harness made visible. `AUTHORIZED` comes
back in the same call when the action resolves to no keyholders. `PENDING` means
the action's shape summoned humans. The calling agent does not need to know which
outcome to expect, how many people will be involved, or who they are.

Everything behind the seam is TwoKeys: resolution of the required roles,
deliberation, version-bound approval, and the single-use permit. Nothing in front
of it changes.

### Two agents, and why they are not one

| | Proposing agent | Deliberation agent |
|---|---|---|
| Belongs to | The customer | TwoKeys |
| Purpose | Detect an opportunity and propose an action | Help a person decide |
| Credentials | Company APIs | None |
| Can execute | Through the lease, after approval | Never |
| Can create or modify an action | Yes, as a proposal | Never |
| Faces | The company's systems | The keyholder |

The separation is a conflict-of-interest boundary, not packaging. An agent that
proposed an action has a stake in it. Asked what happens at a lower budget, it
would be arguing for its own proposal. The deliberation agent has no proposal to
defend: it is grounded in the canonical action and the evidence set, it cannot
compute the numbers it reports, and it cannot promote evidence or record consent.
It is the only component whose entire purpose points at the human.

In the hackathon build both agents are ours, because the demo needs a proposing
agent to exist. The Revenue Agent stands in for the customer's agent and consumes
the same seam any external agent would.

## Decision

The selected direction is:

> **B: TwoKeys Revenue + role-aware decision surfaces + internal ActionLease.**

| Alternative | Decision | Reason |
|---|---|---|
| A: original school scenario | Reject | Easier to finish, but lower stakes and higher risk of looking like OCR plus Calendar |
| B: Revenue, role surfaces, internal ActionLease | **Build** | Best expression of organizational authority while preserving the TwoKeys mechanism |
| C: Revenue without role-aware UI | Reject | Safer scope, but too easy to read as a normal approval workflow |
| D: LeaseLine Fleet | Reject | Changes the category and adds registry, identity, gateway, and observability scope |
| E: build none | Reject | The recut B has a clear causal demo and bounded technical gates |

The UI stays because it makes separate responsibilities, isolated memories, and
later adaptation visible. It remains constrained presentation, not the product.
The ActionLease stays because it enforces the approved state. It remains an
internal permit, not a Fleet narrative.

## The failure TwoKeys catches

Without TwoKeys, a Revenue Agent can combine the latest messages, produce a
convincing summary, and treat partial or stale agreement as permission to act.
Three failures become easy:

1. one role approves a different version from the other;
2. a material change silently inherits an earlier approval;
3. the agent has API access and mistakes that capability for business consent.

TwoKeys makes those failures visible and enforceable outside the model.

## The product loop

```text
agent proposes action
        |
        v
shared evidence + canonical action v1
        |
        +--> Finance surface --> approval on hash v1
        |
        +--> CEO surface -----> material condition
                                  |
                                  v
                         canonical action v2
                                  |
                     Finance approval becomes stale
                                  |
                    Finance + CEO approve hash v2
                                  |
                                  v
                        single-use ActionLease
                                  |
                                  v
                     deterministic external action
```

The model helps people understand and refine the decision. It never grants
authority or constructs the final executor request.

## Why the Revenue scenario

The school-permission scenario made dual consent easy to understand but had low
economic stakes and could look like OCR plus Calendar. The Revenue scenario
makes the missing-authority problem visible in twenty seconds:

- the agent already has Google Ads API access;
- the proposed campaign has a material budget;
- Finance owns affordability and guardrails;
- the CEO owns strategic priority and opportunity cost;
- both roles must consent to one exact action.

The company is a controlled demo setting. TwoKeys is still the product.

## Why this is Collaborative Partner

The track is **The Collaborative Partner**, not Fortified Enterprise Fleet.
TwoKeys qualifies through interaction over time:

- it retrieves separate context for two people;
- it presents the same decision through each role's responsibilities;
- it accepts a correction or condition;
- it invalidates stale consent;
- it remembers explicit feedback from one role;
- a later episode adapts only that role's interaction.

A watcher and an API mutation provide operational utility. They do not change the
track into Taskmaster or Fleet.

## What differentiates the concept

No individual mechanism is novel on its own. Approval workflows, hashes,
time-limited permits, role dashboards, and generated interfaces already exist.
The defensible combination is narrower:

> Preserve two private interaction contexts, present one shared decision through
> two responsibilities, bind both approvals to the same mutable version, and
> prevent execution when either consent is missing or stale.

The UI makes that combination legible. The ActionLease enforces its final state.
Neither is the standalone pitch.

## Relationship to IAM and PAM

TwoKeys complements identity and access management. It does not replace it.
Google Cloud Privileged Access Manager already supports temporary privilege,
justification, revocation, and multi-party approval. TwoKeys operates at a
different layer: it defines the exact business decision and the organizational
roles whose consent is required for its content.

Use this comparison:

> Identity and access systems can authorize an agent to call an API. TwoKeys
> binds this campaign, this budget, this evidence, and this version to Finance
> and CEO approval before that call is permitted.

Do not claim that IAM only identifies an agent or that TwoKeys is a replacement
for IAM.

## Relationship to LeaseLine

The ActionLease absorbs the useful part of LeaseLine:

- action-bound authority;
- expiry;
- revocation;
- a nonce;
- single use;
- an execution receipt.

It remains an internal record issued only after TwoKeys reaches valid dual
consent. The project becomes LeaseLine or a Fleet if it expands into generic
credentials, registries, gateways, tool marketplaces, or governance for many
agents. Those are [explicit cuts](scope.md).

## Product sentence

> **A Revenue Agent can execute a campaign, but it cannot authorize the company.
> TwoKeys gives Finance and the CEO the context they need, invalidates consent
> when the action changes, and executes only when both keys match one version.**

## Related

- [Scope lock](scope.md)
- [Demo scenario](../02-demo/scenario.md)
- [Claims and evidence](../04-validation/claims.md)
- [Google Cloud PAM overview](https://cloud.google.com/iam/docs/pam-overview)
