# Deliberation: bidirectional interaction before the decision

Each keyholder can question the proposed action before signing. The agent can
question them back when a condition is ambiguous. It retrieves supporting context
on demand and remembers how each role thinks across episodes.

The agent here is the deliberation agent, never the one that proposed the action.
It holds no company credentials, cannot execute, and has no proposal to defend.
See [what ships](../01-product/vision.md).

This exists for two reasons. It is the interaction the product was missing: no
one approves EUR 30,000 without asking anything first. It is also what makes the
system a collaborative partner rather than a form with a hash on it.

## The collision this document resolves

Deliberation gives each role private, retrieval-backed answers. The product also
claims that every keyholder decides on provably identical facts, enforced by a
shared evidence hash. Those two properties collide unless the boundary is
explicit.

With a single keyholder there is nothing to diverge from, but the boundary still
holds: what a person read while deciding is not what they signed, and the audit
record has to keep those apart.

> **Conversation is not evidence. Evidence binds the decision; conversation does
> not.**

| Layer | Shared | Hashed | Binds approval |
|---|---|---|---|
| Canonical action | Yes | Yes | Yes |
| Evidence set | Yes | Yes | Yes |
| Deliberation transcript | No | No | No |
| Role memory | No | No | No |

A keyholder may explore freely in conversation. Nothing they read there changes
what they are signing.

## The promotion rule

When a retrieved fact becomes decision-relevant, it cannot stay private. The role
promotes it into the shared evidence set.

Promotion has consequences, and they are the existing ones:

1. the evidence set changes, so the evidence hash changes;
2. every prior approval becomes stale;
3. the other role sees the promoted fact on their next surface render.

This reuses the staleness machinery rather than adding a mechanism. It also
closes the obvious attack: a keyholder cannot quietly discover something material
and approve on it while the other role decides against a thinner picture. Acting
on a new fact forces every holder back through consent.

Promotion is an explicit user action, never an inference by the model.

## Retrieval tooling

Three tools over the frozen dataset. No open-ended retrieval.

| Tool | Returns | Computed by |
|---|---|---|
| `search_evidence` | Passages with stable source IDs | Index lookup |
| `get_metric` | One named metric from the canonical fact model | Server |
| `project_scenario` | Outcome of a hypothetical action variant | Deterministic projection |

`project_scenario` answers "what if we halve the budget". The model states the
result, it never calculates it. Every number a keyholder sees in conversation
comes from server code, under the same rule that governs the rest of the system.

Every answer cites source IDs. An answer with no citable source is refused rather
than generated.

## Memory

Per role, never shared, written after each episode:

- which dimensions this role asks about first;
- the units and framings they think in;
- explicit standing preferences they have stated;
- conditions they have previously attached.

Raw transcripts are not the memory. The distilled preference set is, because that
is what a later surface can act on cheaply and what makes adaptation observable.

Episode 2 then demonstrates something stronger than recall of an explicit note:
the CEO surface leads with opportunity cost because that is what this CEO always
asks about first, while the Finance surface is unchanged.

## Isolation

The transcript is now the largest cross-role leak surface, larger than memory.
Every retrieval call, every model answer and every memory write is scoped to the
authenticated role. The canary test in the benchmark must cover conversation
turns, not only rendered surfaces.

## What the model may not do

Unchanged from the rest of the system, restated because conversation invites
drift:

- it may not compute any number shown to a keyholder;
- it may not create or modify an action version;
- it may not promote evidence;
- it may not record an approval;
- it may not read the other role's memory, transcript or private context;
- it may not construct the executor request.

A condition raised in conversation becomes real only when the keyholder submits
it and it parses into a closed condition type.

## Demo beats this adds

- The CEO asks what happens at EUR 20,000 and gets a sourced projection.
- The agent asks a clarifying question back, because the condition was ambiguous.
- A promoted fact invalidates a standing approval in front of the viewer.
- Episode 2 opens with a reordered CEO surface and an unchanged Finance surface.

## Related

- [Architecture](architecture.md)
- [Role-aware UI](role-aware-ui.md)
- [Contracts](contracts.md)
- [Benchmark](../04-validation/benchmark.md)
