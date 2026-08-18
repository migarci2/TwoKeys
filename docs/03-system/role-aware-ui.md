# Role-aware decision surfaces

## Naming

- **Generative UI** is the broad category.
- **Role-adaptive decision surfaces** describe the product behavior.
- **A2UI, Agent to UI**, is the protocol used to carry declarative UI from the
  agent to the trusted client.

The precise phrase for the build is:

> **A2UI-based role-adaptive decision surfaces.**

A2UI is an implementation protocol, not the central innovation. The product
innovation remains two isolated contexts and two version-bound consents over one
shared decision.

## Why use A2UI

A2UI lets an agent describe a UI declaratively while the client renders only
preapproved native components. It avoids model-generated HTML or JavaScript and
supports progressive rendering.

As verified on 2026-08-13, A2UI v0.9.1 is the current production release and
v1.0 is a candidate. Pin the implementation to one version and record it in every
benchmark run.

## Six-component catalog

| Component | Purpose | Data ownership |
|---|---|---|
| `ActionCapsule` | Exact action, version, keys, and hashes | Fully deterministic and mandatory |
| `MetricStrip` | Small set of sourced role-relevant metrics | Deterministic values; model may choose allowed facts |
| `BudgetWaterfall` | Finance-first budget impact | Deterministic series, order, units, axes, and colors |
| `ScenarioTable` | Comparable upside, downside, and reversible alternative | Deterministic rows and formulas |
| `EvidenceList` | Sources, timestamps, assumptions, and counterevidence | Deterministic citations; model may summarize |
| `ConditionForm` | Closed material conditions a keyholder can propose | Trusted form and server validation |

Do not add arbitrary charts, free-form risk matrices, HTML, CSS, JavaScript, or
model-defined component code.

## One truth, two views

The Action Capsule is identical on Finance and CEO screens:

```text
Campaign v2
EUR 30,000 business budget cap | 14 days | EU launch
Required keys: Finance + CEO
Evidence: e7f... | Action: a41...
Changed since v1: execution precondition
```

Every material fact is shared. The role changes the sequence, explanation depth,
and available questions, not the underlying truth.

### Finance emphasis

- remaining budget and deterministic impact;
- assumptions and downside;
- affordability and allowed conditions;
- source timestamps and missing data.

### CEO emphasis

- strategic fit and urgency;
- opportunity cost;
- smallest reversible alternative;
- upside, downside, and key uncertainty.

## Deterministic and generative boundary

| Deterministic | Gemini may generate |
|---|---|
| Evidence bundle and hashes | Selection among allowlisted components |
| Every number, unit, and formula | Component order for the authenticated role |
| Action Capsule and material diff | Source-bound summaries |
| Budget and scenario vectors | Questions about real uncertainty |
| Chart points, axes, scales, series order, and colors | Labels within constrained fields |
| Required roles and policy | Explanation depth from confirmed feedback |
| Approval, lease, and execution state | No authority-bearing value |
| Google Ads payload and credentials | Nothing executable |

The model returns data references, never chart values:

```json
{
  "component": "BudgetWaterfall",
  "dataRef": "/facts/marketing/budgetWaterfall",
  "title": "Budget impact"
}
```

The actual wire message must validate against the pinned A2UI schema. This
example illustrates the internal rule, not a substitute for the protocol spec.

## Anti-persuasion rules

- fixed semantic colors and typography;
- fixed axis policy per component;
- visible unit and period on every quantitative view;
- accessible raw table under each chart;
- every value linked to a `fact_id`, source, and timestamp;
- mandatory downside, uncertainty, and counterevidence slots;
- rejection of unknown data references;
- rejection of any surface missing a material fact;
- deterministic ordering within chart series;
- stored A2UI JSON, fact model, catalog version, prompt version, and model ID.

The renderer, not Gemini, owns visual emphasis that could change perceived risk.

## Memory isolation

Use separate server-side model calls:

```text
Finance call = shared evidence + Finance feedback memory
CEO call     = shared evidence + CEO feedback memory
```

Never send both memories to one call and hide sections in the browser.

Controls:

1. separate Firestore documents and server authorization;
2. exact logging of document IDs supplied to each call;
3. role-exclusive canaries in every benchmark run;
4. scanner over assembled input, model output, A2UI message, render payload, and
   application logs;
5. no private memory in client state for the other role;
6. no material decision fact stored only in private memory.

The public claim is limited to the tested observation. Do not promise universal
zero leakage.

## Adaptation contract

A role profile such as “Finance prefers budgets” is configuration, not learning.
Adaptation requires:

1. explicit feedback during episode 1;
2. confirmation that it should be remembered;
3. storage as role-owned episodic memory;
4. a later episode over a new decision;
5. a memory-off control;
6. a memory-on treatment;
7. a changed surface only for the feedback owner;
8. unchanged evidence, policy, and Finance behavior.

See the exact [episode 2 scenario](../02-demo/scenario.md#episode-2-adaptation-not-a-static-profile).

## Latency strategy

Do not build the pitch around a claimed 300 tokens per second. The official
Gemini model page does not publish a fixed throughput guarantee.

For a fluid surface:

- keep the A2UI message small;
- run Finance and CEO generation concurrently;
- cache the immutable shared evidence bundle;
- reference data instead of repeating it;
- progressively render validated components;
- measure time to first valid component and end-to-end readiness.

## Accessibility baseline

- every chart has a table and text summary;
- keyboard access covers all approval and condition controls;
- status does not depend on color alone;
- hashes have a human-readable version and diff;
- focus moves to stale approval or validation errors;
- generated labels pass the same length and semantic constraints as static copy.

## Related

- [A2UI documentation](https://a2ui.org/)
- [Gemini 3.7 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-3.7-flash)
- [Normative contracts](contracts.md)
- [Benchmark](../04-validation/benchmark.md)
