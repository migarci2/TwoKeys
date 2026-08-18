# Normative contracts

**Status:** implemented reference contract. External resource identifiers and
the frozen Google Ads snapshot remain deployment configuration.

## Canonical action

The canonical action represents the business decision, not an arbitrary model
summary and not a payment. The executor performs a separate deterministic mapping
to the verified Google Ads API request.

```json
{
  "schemaVersion": "twokeys.action.v1",
  "actionId": "launch-eu-001",
  "version": 2,
  "actionType": "google_ads.campaign.activate",
  "campaign": {
    "customerRef": "test-customer",
    "resourceRef": "preconfigured-campaign",
    "currentStatus": "PAUSED",
    "desiredStatus": "ENABLED",
    "configurationSnapshotHash": "sha256:<digest>"
  },
  "businessDecision": {
    "budgetCapMicros": "30000000000",
    "currencyCode": "EUR",
    "startDate": "<YYYY-MM-DD>",
    "endDate": "<YYYY-MM-DD>",
    "targetScopeDigest": "sha256:<digest>",
    "conversionGoal": "<closed-enum>",
    "landingPageDigest": "sha256:<digest>"
  },
  "executionConditions": [
    {
      "type": "product_readiness_equals",
      "sourceFactId": "product.readiness",
      "expected": "GREEN"
    },
    {
      "type": "execute_before",
      "timestamp": "<RFC3339>"
    }
  ],
  "evidenceBundleHash": "sha256:<digest>",
  "policyVersion": "finance-ceo-v1",
  "requiredRoles": ["finance", "ceo"],
  "createdAt": "<RFC3339>"
}
```

The implementation must not substitute a real account ID or credential into a
client-visible record. Server-side references resolve to secrets and resources.

## Evidence bundle

Every decision-critical value has a stable fact ID, value, unit, source, and
observation time.

```json
{
  "schemaVersion": "twokeys.evidence.v1",
  "bundleId": "launch-eu-001-evidence-v1",
  "facts": {
    "product.readiness": {
      "value": "GREEN",
      "sourceId": "product-launch-record-v7",
      "observedAt": "<RFC3339>"
    },
    "marketing.availableBudgetMicros": {
      "value": "<integer-as-string>",
      "unit": "EUR_MICROS",
      "sourceId": "finance-plan-v4",
      "observedAt": "<RFC3339>"
    }
  },
  "assumptions": [],
  "counterevidence": [],
  "hash": "sha256:<digest>"
}
```

Unknown or missing values remain explicit. The model may not fill them with a
plausible number.

## Material-field policy

The Decision Kernel owns a closed list of fields that affect authority. A change
to any material field creates a new version and action hash.

```text
campaign resource or desired status
budget cap, currency, or dates
target scope, conversion goal, or landing asset
execution conditions
evidence bundle
policy version or required roles
```

UI order, wording, expansion state, and private presentation preferences are
non-material. They cannot alter the action or preserve an approval after a
material change.

## Canonicalization and hashes

Before hashing:

1. validate against a closed schema;
2. normalize dates and timestamps;
3. represent money as integer micros plus currency;
4. sort object keys deterministically;
5. preserve array order where order is semantic;
6. encode absent values explicitly or reject them;
7. serialize without presentation fields.

```text
action_hash   = SHA-256(canonical action bytes)
evidence_hash = SHA-256(canonical evidence bundle bytes)
```

These hashes create version-bound records. They are not digital signatures and
must not be described as cryptographic consent.

## Approval record

```json
{
  "approvalId": "<opaque-id>",
  "role": "finance",
  "principalId": "<authenticated-server-id>",
  "actionId": "launch-eu-001",
  "actionVersion": 2,
  "actionHash": "sha256:<digest>",
  "evidenceBundleHash": "sha256:<digest>",
  "policyVersion": "finance-ceo-v1",
  "decision": "APPROVED",
  "issuedAt": "<RFC3339>",
  "expiresAt": "<RFC3339>",
  "nonce": "<single-use-random-value>",
  "revokedAt": null,
  "staleAt": null
}
```

An approval is valid only when every bound value matches the current action and
none of `expiresAt`, `revokedAt`, or `staleAt` makes it invalid.

## ActionLease

The ActionLease is a server-side execution permit issued after valid dual
approval. It is not a bearer credential for Google Ads.

```json
{
  "leaseId": "<opaque-id>",
  "actionId": "launch-eu-001",
  "actionHash": "sha256:<digest>",
  "evidenceBundleHash": "sha256:<digest>",
  "policyVersion": "finance-ceo-v1",
  "requiredRoles": ["finance", "ceo"],
  "approvalIds": ["<finance-id>", "<ceo-id>"],
  "issuedAt": "<RFC3339>",
  "expiresAt": "<RFC3339>",
  "nonce": "<single-use-random-value>",
  "revokedAt": null,
  "consumedAt": null
}
```

### Issue rule

A Firestore transaction may issue a lease only if:

- the action is current;
- both required roles have one valid approval;
- both approvals bind the current action, evidence, and policy hashes;
- no active lease already exists for the same action version.

### Consume rule

Immediately before the external request, a transaction revalidates the complete
state and sets `consumedAt`. A second consume attempt must fail.

## Execution receipt

```json
{
  "receiptId": "<opaque-id>",
  "leaseId": "<opaque-id>",
  "actionHash": "sha256:<digest>",
  "provider": "google_ads",
  "environment": "test_account",
  "operation": "campaign.status:PAUSED->ENABLED",
  "resourceName": "<server-redacted-or-safe-resource-name>",
  "requestId": "<provider-request-id-if-available>",
  "requestedAt": "<RFC3339>",
  "observedAt": "<RFC3339>",
  "observedStatus": "ENABLED",
  "result": "CONFIRMED"
}
```

A request response alone is insufficient. The executor reads the resource back
and records the observed state.

## Authority state machine

```text
DRAFT
  -> PENDING_KEYS
  -> PARTIALLY_APPROVED
  -> FULLY_APPROVED
  -> LEASED
  -> CONSUMED
  -> CONFIRMED

Any material change:
  * -> STALE -> new PENDING_KEYS version

Any invalid precondition:
  PENDING_KEYS | PARTIALLY_APPROVED | FULLY_APPROVED | LEASED -> DENIED
```

`EXPIRED`, `REVOKED`, `REPLAY_DENIED`, `SNAPSHOT_MISMATCH`, and
`EXTERNAL_UNCONFIRMED` are explicit terminal or reconciliation states, not generic
errors hidden from the demo.

## Role feedback memory

```json
{
  "ownerRole": "ceo",
  "scope": "launch_decisions_above_20000_eur",
  "preference": {
    "leadWith": "smallest_reversible_pilot",
    "include": ["opportunity_cost"],
    "deEmphasize": ["top_line_funnel"]
  },
  "sourceEpisode": "launch-eu-001",
  "confirmedByPrincipal": true,
  "createdAt": "<RFC3339>"
}
```

Role feedback changes presentation only. It cannot change shared evidence,
material fields, policy, required roles, or authorization state.

## Related

- [Architecture](architecture.md)
- [Role-aware UI](role-aware-ui.md)
- [Benchmark](../04-validation/benchmark.md)
