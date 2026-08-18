# Scope lock

## The cut

> **One Revenue Agent, one preconfigured campaign, two human keyholders, one
> material version change, one real test-account mutation, and one later episode
> that proves role-specific adaptation.**

Everything in the hackathon build must support that sentence.

## Roles

The demo uses one synthetic company policy:

> A new launch campaign with a total business budget of at least EUR 25,000
> requires Finance and CEO approval on the same action version.

This is a fixture policy, not a claim about how every company operates.

| Actor | Responsibility | Keyholder |
|---|---|---:|
| Revenue Agent | Detects the opportunity and proposes the action | No |
| Marketing | Requests the campaign and supplies campaign rationale | No |
| Product | Supplies launch readiness and dependencies | No |
| Finance | Owns affordability, budget impact, downside, and guardrails | Yes |
| CEO | Owns strategic priority, urgency, and opportunity cost | Yes |

Marketing and Product are evidence contributors. If either must exercise a
discretionary veto, the authority key gains a third holder. The mechanism
supports that. The demo does not, because every added holder lengthens
convergence after each material change.

## In scope

- one scheduled or manually triggered Revenue Agent;
- one frozen, synthetic company dataset;
- one Google Ads test account;
- one fully configured campaign that starts in `PAUSED`;
- one canonical business action and one verified campaign snapshot;
- Finance and CEO authentication;
- shared evidence plus isolated role feedback memories;
- two independent Gemini calls that return declarative UI;
- six allowlisted UI components;
- one material v1 to v2 change;
- version-bound approvals;
- an ActionLease with expiry, revocation, nonce, and single use;
- one deterministic `PAUSED` to `ENABLED` mutation;
- one read-back receipt;
- one replay denial;
- one second episode with memory off/on comparison;
- the predeclared benchmark.

## Out of scope

- a Fleet, agent registry, marketplace, or generic control plane;
- replacement of IAM, PAM, or Google Ads native controls;
- multiple Revenue, Marketing, Finance, or Product agents;
- live ad serving, billing, payment, or production spend;
- a monitor for CAC, conversions, or spend;
- Google Analytics, CRM, Stripe, or product telemetry integrations;
- campaign generation across multiple campaign types;
- generated ad copy or creative;
- generic policy language;
- PKI, signatures, or claims of cryptographic identity;
- arbitrary HTML, JavaScript, CSS, or arbitrary UI components;
- vector databases;
- mobile clients;
- open-ended chat;
- self-evolving or self-training claims.

## Non-negotiable invariants

1. The LLM never authorizes or executes the campaign.
2. Finance and CEO approve the same `action_hash` and `evidence_bundle_hash`.
3. A material change creates a new action version and invalidates every prior
   approval.
4. Private feedback memory for one role never enters the other role's model call.
5. Every decision-critical fact is shared, even if its presentation differs.
6. Every number and chart point comes from deterministic data with a source.
7. The executor re-reads state and campaign configuration immediately before
   acting.
8. A consumed, expired, revoked, or mismatched lease fails closed.
9. The UI always labels synthetic business data and the Google Ads test account.
10. No benchmark target becomes a public result before it is executed.

## Material changes

At minimum, these fields are material and require a new version:

- campaign resource;
- desired status;
- business budget cap, currency, or period;
- start or end date;
- geography or target-scope digest;
- conversion goal;
- landing-page or asset digest;
- execution condition;
- evidence bundle;
- policy version;
- required keyholders.

Presentation order, chart choice, expanded explanations, and private interaction
preferences are not material. They cannot change authority.

## Definition of done

The hackathon slice is done only when all of the following are observed:

- the agent proposes one campaign from frozen evidence;
- Finance and CEO receive different surfaces with an identical Action Capsule;
- Finance approval on v1 becomes stale after a CEO condition creates v2;
- both roles approve v2;
- exactly one valid executor call changes the test campaign state;
- the result is read back and recorded as a receipt;
- replay, expiry, revocation, and hash mismatch are denied;
- the second episode adapts only the CEO surface;
- the benchmark has run and publishes failures as well as passes;
- the complete flow fits into a four-minute continuous recording.

## Five fatal risks

| Risk | How it kills the project | Required cut or control |
|---|---|---|
| Cognitive load | Judges must decode agents, company metrics, memories, charts, Ads, leases, and IAM in four minutes | Keep one agent, one campaign, two roles, one material change, and at most three modules per surface |
| Quantitative hallucination or persuasive charts | One invented number or manipulated axis invalidates the decision surface | Calculate every value server-side; fix axes, units, colors, and series; remove nonessential charts |
| Security or memory leakage | The central privacy and authority claim becomes theatre | Use separate calls and stores, server authorization, canaries, and an executor outside Gemini |
| Unconvincing synthetic company data | The system appears to fabricate both the opportunity and its proof | Freeze one public fixture, expose formulas and sources, and label all business data synthetic |
| Google Ads complexity or ordinary-workflow appearance | The API fails, or the demo looks like a dashboard with two approve buttons | Preconfigure one paused campaign, mutate only its state, and foreground stale consent plus episode 2 |

## Cut order if time slips

1. Remove decorative charts.
2. Remove all UI components except Action Capsule, one budget view, evidence,
   scenarios, and condition form.
3. Reduce the Revenue Agent to a trigger over a frozen fixture.
4. Reduce the external integration to one status mutation.
5. Keep the second episode, stale-approval transition, and deterministic gate.

Do not cut the mechanism to preserve visual polish.

## Related

- [Product vision](vision.md)
- [System architecture](../03-system/architecture.md)
- [48-hour plan](../05-delivery/plan-48h.md)
