# How to build the hackathon slice in 48 hours

This plan proves the hardest dependency first and defers every feature that does
not strengthen the visible authority transition.

## Outcome

At hour 48, a single deployed flow should:

1. propose one synthetic Revenue action;
2. show Finance and CEO two role-aware surfaces over one shared truth;
3. invalidate Finance's v1 approval after a CEO condition creates v2;
4. collect both approvals on v2;
5. issue and consume one ActionLease;
6. change one Google Ads test campaign from `PAUSED` to `ENABLED`;
7. deny replay;
8. show one later CEO-only adaptation;
9. run the predeclared benchmark.

## Critical path

```text
canonical action
  -> authority kernel
  -> real Ads mutation
  -> role surfaces
  -> adaptation
  -> benchmark
  -> recording
```

Do not start with dashboard polish. The Ads mutation and authority kernel are the
fatal gates.

## Hours 0–4: freeze the decision

Deliver:

- synthetic company fixture and source records;
- Finance plus CEO policy;
- canonical action and evidence schemas;
- material-field list;
- six-component A2UI catalog;
- explicit synthetic/test-account labels;
- A1–A9 fixture definitions.

Gate:

- the complete canonical action fits in one Action Capsule;
- every visible number has a planned fact ID and deterministic formula;
- no one is still debating the vertical, track, or number of keyholders.

## Hours 4–12: build the authority kernel

Implement without Gemini:

- canonicalization and hashes;
- immutable action versions;
- deterministic material diff;
- Finance and CEO approval records;
- stale approval on v1 to v2 change;
- lease issue, expiry, revocation, consume, and replay denial;
- Firestore transaction boundaries;
- A1–A9 automated checks.

Gate:

- all nine authority fixtures pass;
- unauthorized cases produce zero executor calls.

If this gate fails, stop surface work.

## Hours 12–18: prove Google Ads

Use a test-account campaign that is already complete and `PAUSED`.

Implement one server-side path:

1. authenticate without exposing credentials;
2. read the campaign and normalize its approved snapshot;
3. compare it with the canonical action;
4. change `PAUSED` to `ENABLED`;
5. read the campaign back;
6. store a receipt;
7. reset to `PAUSED` only through an explicit development operation.

Gate:

- a backend outside Gemini performs and confirms the mutation;
- the receipt links the lease and action hash to the observed state.

This is the fatal external-action gate. If it cannot pass, do not build an
elaborate UI around a fake consequence.

## Hours 18–30: build two trusted surfaces

Implement:

- one Finance call with shared evidence plus Finance feedback memory;
- one CEO call with shared evidence plus CEO feedback memory;
- pinned `gemini-3.7-flash` configuration;
- pinned A2UI schema;
- allowlist validation;
- deterministic Action Capsule;
- Finance and CEO layouts with at most three modules each;
- condition form and exact v1 to v2 diff;
- progressive rendering after validation.

Gate:

- Gemini produces no numbers, chart vectors, policy, hashes, or executable
  payloads;
- the two Action Capsules and material facts match exactly.

## Hours 30–36: prove episode 2

Implement the explicit CEO feedback flow:

```text
For launch decisions above EUR 20,000,
show the smallest reversible pilot and opportunity cost first.
```

Run the later EUR 25,000 fixture with CEO memory off and on.

Gate:

- the treatment changes the CEO ordering;
- the control does not;
- Finance, shared evidence, policy, and required keys are unchanged.

## Hours 36–42: run validation

Run U1–U3 three times each and M1 once per condition.

Publish:

- raw outputs;
- model, prompt, schema, catalog, and fixture versions;
- canary scans;
- numeric and chart-fidelity checks;
- authority transitions and executor-call counts;
- failures as well as passes.

Gate:

- no critical authority, fidelity, or isolation failure remains;
- public claims match measured results.

## Hours 42–48: record and package

Finish:

- one four-minute continuous take;
- architecture diagram;
- reproducible setup;
- GCP deployment evidence;
- benchmark table;
- README status update;
- public synthetic-data and test-account labels;
- submission copy that uses only allowed claims.

Run the five-question verification in the
[four-minute script](../02-demo/four-minute-script.md#verification).

## Parallel ownership

| Runtime lane | Product and evidence lane |
|---|---|
| Decision Kernel and Firestore state | Frozen company fixture and source ledger |
| Approval and ActionLease transactions | Finance and CEO surface design |
| Google Ads executor and receipt | A2UI catalog and accessibility |
| Authority and replay tests | UI fidelity, canaries, and adaptation eval |
| Cloud Run and secrets | Script, diagram, README, and submission |

Both people must rehearse the full flow and know how to recover the deployment.

## Stop-building list

Do not add during these 48 hours:

- CAC monitoring;
- Analytics, CRM, Stripe, or product integrations;
- multiple campaigns or campaign types;
- live spending;
- ad generation;
- more agents;
- a registry, Fleet, or generic gateway;
- arbitrary generated UI;
- a vector database;
- a policy language;
- a mobile client;
- a general chat experience;
- performance claims based on theoretical tokens per second.

## Scope recovery when behind

Cut in this order:

1. decorative charts;
2. nonessential surface components;
3. scheduled monitoring, keeping a manual trigger;
4. architecture narration in the video;
5. everything except one status mutation.

Never cut:

- stale-approval invalidation;
- Finance plus CEO on one version;
- deterministic execution gate;
- real test-account mutation and receipt;
- replay denial;
- episode 2 memory control;
- honest labels and benchmark output.

## Related

- [Scope lock](../01-product/scope.md)
- [Architecture](../03-system/architecture.md)
- [Benchmark](../04-validation/benchmark.md)
- [Four-minute script](../02-demo/four-minute-script.md)
