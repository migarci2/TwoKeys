# System architecture

**Status:** implemented locally in the `web` application. Deployment to a
billing-enabled GCP project and the live Google Ads test-account proof remain
pending.

## Design goal

The architecture must prove one end-to-end invariant with the fewest moving
parts: no Google Ads executor call occurs until Finance and CEO have approved the
same current action and evidence.

Seven logical components are enough. They do not need to be seven services.

## System map

```text
                         frozen synthetic company data
                                      |
                                      v
                         [1] Revenue Watcher / ADK
                                      |
                         proposed facts + citations
                                      v
                            [2] Decision Kernel
                         /            |             \
                        v             v              v
                canonical action   policy        calculations
                        |             |              |
                        +-------------+--------------+
                                      |
                                      v
                           [3] Firestore State
                           /                    \
                          v                      v
              Finance context + memory   CEO context + memory
                          \                      /
                           v                    v
                     [4] Role Surface Generator
                         Gemini 3.7 Flash + A2UI
                                      |
                                      v
                    [5] Trusted Renderer + Approval API
                                      |
                         approvals / material condition
                                      |
                                      v
                         Decision Kernel + Firestore
                                      |
                           valid dual approval only
                                      v
                    [6] ActionLease Gate + Ads Executor
                                      |
                       Google Ads test account mutation
                                      |
                                      v
                       [7] Receipt + Evaluation Harness
```

## The seven components

| # | Component | Responsibility |
|---:|---|---|
| 1 | Revenue Watcher | A scheduled or manual ADK flow reads one frozen fixture and proposes facts with source IDs. It does not approve anything |
| 2 | Decision Kernel | Deterministic calculations, policy evaluation, canonicalization, material-field diff, action/evidence hashes, approval validity, and state transitions |
| 3 | Firestore State | Shared evidence, canonical versions, private role feedback, approvals, leases, and receipts in separate server-authorized records |
| 4 | Role Surface Generator | Two isolated Gemini calls select and order allowlisted A2UI components against server-owned data references |
| 5 | Trusted Renderer and Approval API | Web UI, schema validation, authentication, deterministic Action Capsule, condition form, and approval endpoints |
| 6 | ActionLease Gate and Ads Executor | Revalidates authority, consumes one lease atomically, reads the Ads resource, verifies its snapshot, performs one status mutation, and reads back state |
| 7 | Receipt and Evaluation Harness | Stores external result metadata and runs authority, fidelity, privacy, replay, adaptation, and Gemma evidence-screen fixtures |

## Deployment shape

Keep the deployment boring:

- one Cloud Run application for the backend, renderer, approval API, and executor;
- one Firestore database;
- Cloud Scheduler only if scheduled monitoring is implemented;
- Secret Manager for Google Ads credentials and other server secrets;
- one Google Ads test-account hierarchy;
- local or CI evaluation that calls the same public application boundaries.

The component diagram describes responsibilities, not microservices. Do not add
Pub/Sub, Kubernetes, a vector database, a registry, or a separate policy service
unless a measured requirement appears.

## Request flow

### Proposal

1. The watcher loads the frozen fixture.
2. Gemini may extract or summarize evidence into a closed schema with source IDs.
3. The Decision Kernel rejects unknown facts, computes all numeric fields, and
   creates the canonical action.
4. Firestore stores the immutable evidence bundle and action version.

### Decision surfaces

1. The server loads shared evidence plus only the authenticated role's private
   feedback memory.
2. Finance and CEO surfaces are generated in separate model calls.
3. The renderer validates each declarative surface against a six-component
   allowlist.
4. Data references resolve against the server-owned canonical fact model.

### Mutation and approval

1. A condition submitted by a keyholder is parsed into a closed condition type.
2. The Decision Kernel decides whether the change is material.
3. A material change creates a new immutable action version.
4. Every approval for the prior version becomes stale.
5. Each approval records role, action hash, evidence hash, policy version, expiry,
   and nonce.

### Execution

1. A Firestore transaction confirms both current approvals and issues a lease.
2. The executor re-reads every governing record.
3. The executor reads the campaign from Google Ads and verifies the approved
   configuration snapshot.
4. A transaction marks the lease consumed before the external mutation.
5. The executor changes `PAUSED` to `ENABLED`, reads the resource back, and stores
   a receipt.

If the external call fails after consumption, the lease remains consumed. A retry
requires explicit reconciliation of observed external state, not blind replay.

## Trust boundaries

### Untrusted

- fixture text and future external evidence;
- all model output;
- A2UI messages before schema validation;
- client-submitted conditions and approvals;
- cached campaign state.

### Trusted only after validation

- canonical facts produced by the Decision Kernel;
- authenticated role identity;
- current immutable action and evidence hashes;
- Firestore transaction result;
- a fresh Google Ads read-back.

### Never exposed to Gemini or the browser

- Google Ads OAuth refresh credentials;
- server signing or session secrets;
- the other role's private memory;
- the final API client and mutation payload;
- lease-consumption authority.

## Failure behavior

The system fails closed when:

- either approval is missing, expired, revoked, stale, or duplicated;
- action, evidence, or policy hashes do not match;
- the campaign snapshot differs from the approved snapshot;
- an execution condition is false or cannot be evaluated;
- a private-memory canary appears in the wrong role output;
- an A2UI component or data reference is unknown;
- a required fact is absent;
- the lease was already consumed;
- Google Ads read-back cannot confirm the requested state.

## Model choice

Use the stable model ID `gemini-3.7-flash` behind configuration, not scattered
through business logic. Gemini 3.7 Flash supports structured outputs and `low`,
`medium`, and `high` thinking levels. Start with `low` for surface composition and
measure `medium` for evidence interpretation only if it improves the frozen eval.

Do not design around an unverified fixed throughput number. End-to-end latency
also includes time to first token, reasoning, Firestore, validation, rendering,
Google Ads, and read-back.

Gemma 4 runs only in the evaluation lane as an advisory screen over frozen
evidence fixtures. It classifies prompt-injection and personal-data signals for
the benchmark, but its output never changes policy, approvals, leases, or
execution.

## Related

- [Normative contracts](contracts.md)
- [Role-aware UI](role-aware-ui.md)
- [Benchmark](../04-validation/benchmark.md)
- [Gemini 3.7 Flash model page](https://ai.google.dev/gemini-api/docs/models/gemini-3.7-flash)
