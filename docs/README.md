# TwoKeys documentation

This directory is the canonical build direction for the hackathon version of
TwoKeys. It supersedes the earlier school-permission scenario.

## Document hierarchy

```text
docs/
├── 01-product/       Why this product exists and where it stops
├── 02-demo/          The single scenario the judges will see
├── 03-system/        Implemented architecture and normative contracts
├── 04-validation/    How claims become evidence
└── 05-delivery/      The shortest path to a working submission
```

## Read in order

1. [Vision](01-product/vision.md)
2. [Scope lock](01-product/scope.md)
3. [Scenario](02-demo/scenario.md)
4. [Architecture](03-system/architecture.md)
5. [Contracts](03-system/contracts.md)
6. [Role-aware UI](03-system/role-aware-ui.md)
7. [Harness integrations](03-system/integrations.md)
8. [Benchmark](04-validation/benchmark.md)
9. [GCP deployment](03-system/gcp-deployment.md)
10. [Claims and evidence](04-validation/claims.md)
11. [48-hour plan](05-delivery/plan-48h.md)

The [four-minute script](02-demo/four-minute-script.md) is a production artifact,
not a substitute for the product and system documents.

The [Project Story](05-delivery/project-story.md) is the long-form Devpost copy,
with hidden placeholders for the final demo GIFs.

## Status vocabulary

- **Decided:** direction or scope that should not change during the sprint.
- **Proposed:** normative design that still needs implementation.
- **Verified:** observed in code, tests, an external API, or a published source.
- **Target:** a predeclared result that is not evidence yet.
- **Cut:** explicitly excluded from the hackathon build.

## Source of truth by question

| Question | Owner document |
|---|---|
| What are we building? | [Vision](01-product/vision.md) |
| What must we refuse to build? | [Scope lock](01-product/scope.md) |
| What exactly happens in the demo? | [Scenario](02-demo/scenario.md) |
| How does data and authority flow? | [Architecture](03-system/architecture.md) |
| What records and invariants exist? | [Contracts](03-system/contracts.md) |
| What may Gemini generate? | [Role-aware UI](03-system/role-aware-ui.md) |
| How does an external harness install TwoKeys? | [Harness integrations](03-system/integrations.md) |
| What proves the claims? | [Benchmark](04-validation/benchmark.md) |
| What may we say publicly? | [Claims and evidence](04-validation/claims.md) |
| What happens during the first 48 hours? | [48-hour plan](05-delivery/plan-48h.md) |

## Canon rule

If two documents disagree, use the more specific owner document above. Update
cross-links instead of copying the same requirement into a third place.
