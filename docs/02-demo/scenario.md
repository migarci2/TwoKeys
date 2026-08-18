# Demo scenario

## Purpose

This scenario proves one claim: an agent's ability to call an API is not enough
to authorize a high-impact company decision.

The company, people, evidence, and business metrics are synthetic. The Google Ads
API call is real, but it targets a test account that cannot bill, serve ads, or
produce serving metrics.

## Frozen fixture

| Field | Value |
|---|---|
| Fixture ID | `launch-eu-001` |
| Opportunity | EU product-launch campaign |
| Business budget cap | EUR 30,000 |
| Campaign period | 14 days |
| Campaign resource | One preconfigured test-account campaign |
| Initial campaign state | `PAUSED` |
| Desired campaign state | `ENABLED` |
| Product readiness | `GREEN`, from a frozen Product record |
| Required keys | Finance and CEO |
| Policy threshold | New launch campaign of at least EUR 25,000 |

The exact Google Ads budget representation and fields must be frozen after the
API spike. The business decision binds the approved cap and a digest of the
campaign configuration; the executor performs only the verified status mutation.

## Shared evidence

Both roles receive the same decision-critical facts:

- campaign identity and current state;
- budget cap, currency, and dates;
- target-scope digest;
- conversion goal;
- landing-page or asset digest;
- Product readiness and source;
- scenario assumptions and deterministic calculations;
- downside and counterevidence;
- policy version and required keyholders;
- action version, action hash, and evidence hash.

Role-specific memory may change the order and explanation of those facts. It may
not hide a material fact from either keyholder.

## Episode 1: authority and invalidation

### 1. Opportunity detected

The Revenue Agent reads the frozen evidence bundle and proposes action v1:

```text
Activate campaign launch-eu-001
Business budget cap: EUR 30,000
Period: 14 days
Target campaign state: ENABLED
Required keys: Finance + CEO
```

The UI shows that Google Ads API access exists while organizational authority is
missing. Execution remains blocked.

### 2. Two views of one decision

Finance sees budget impact, assumptions, downside, and guardrails first. The CEO
sees strategic fit, urgency, opportunity cost, and alternatives first.

Both screens show an identical deterministic Action Capsule with the same action
and evidence hashes.

### 3. Finance approves v1

Finance approves the exact v1 hashes. The system stores a version-bound approval
record. No lease is issued because the CEO has not approved.

### 4. CEO adds a material condition

The CEO adds:

> Activate only while Product readiness is `GREEN` and before the declared
> launch activation deadline. Otherwise require new approval.

This changes the executable conditions. The Decision Kernel creates v2 with a
new action hash and marks the Finance approval on v1 as `STALE`.

The original idea of “pause if CAC exceeds EUR 70 for 48 hours” is cut from the
main demo. It would require live serving metrics, a precise CAC definition,
conversion-lag handling, a recurring monitor, and a second mutation. Test
accounts provide none of those metrics.

### 5. Both approve v2

Finance inspects the deterministic v1 to v2 diff and approves v2. The CEO
approves v2. Only now may the server issue an ActionLease.

### 6. External consequence

The executor:

1. re-reads the canonical action, evidence, approvals, policy, and lease;
2. reads the current Google Ads campaign configuration;
3. verifies the campaign snapshot and execution conditions;
4. atomically consumes the lease;
5. changes the campaign from `PAUSED` to `ENABLED`;
6. reads the campaign back;
7. stores a receipt with the resource name, request identifier when available,
   timestamps, hashes, and observed state.

The screen must say:

```text
REAL GOOGLE ADS API MUTATION
TEST ACCOUNT: NO LIVE ADS OR SPEND
```

### 7. Fail-closed proof

The demo attempts to reuse the consumed lease. The gate denies the replay before
another executor call occurs.

## Episode 2: adaptation, not a static profile

During episode 1, the CEO gives explicit interaction feedback:

> For launch decisions above EUR 20,000, show me the smallest reversible pilot
> and its opportunity cost before the full upside.

TwoKeys asks whether to remember it. The CEO confirms. The feedback is stored as
CEO-owned episodic memory, not as shared evidence or authorization policy.

A later EUR 25,000 opportunity runs twice over the same input:

| Surface | Memory off | CEO memory on |
|---|---|---|
| CEO | Strategy summary first | Reversible pilot and opportunity cost first |
| Finance | Budget view first | Unchanged |
| Shared evidence | Same hashes | Same hashes |
| Required keys | Finance + CEO | Finance + CEO |
| Policy | Unchanged | Unchanged |

The defensible claim is that TwoKeys persisted explicit feedback and applied it
to a later interaction. It did not train a model or learn an executive in a
general sense.

## What the scenario does not prove

- that a production campaign spent money;
- that live CAC, conversions, impressions, or cost were observed;
- that the system works for arbitrary company policies;
- that all information leakage is impossible;
- that the system replaces Google Ads native approvals, IAM, or PAM;
- that the proposed implementation is complete before the benchmark runs.

## Related

- [Four-minute script](four-minute-script.md)
- [Data contracts](../03-system/contracts.md)
- [Benchmark](../04-validation/benchmark.md)
- [Google Ads test accounts](https://developers.google.com/google-ads/api/docs/best-practices/test-accounts)
