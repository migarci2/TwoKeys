# GCP deployment

## Runtime shape

```text
Browser
  -> Cloud Run: Next.js UI, API, Decision Kernel, Gemini adapter, Ads executor
       -> Firestore: decision aggregate, isolated role memory, surface-run evidence
       -> Gemini API: structured role-surface composition only
       -> Google Ads API: one test-account campaign status mutation
       -> Secret Manager: session, role access, Gemini, and Google Ads secrets
Artifact Registry <- Cloud Build <- web/Dockerfile
```

There is one Cloud Run service, one Firestore database, and no queue or extra
policy service. Cloud Run uses a dedicated service account with Firestore access
and per-secret Secret Manager access. The public UI is protected by signed,
role-scoped sessions; Google Ads credentials and real resource IDs stay server
side.

## Required setup

Use a new billing-enabled project. The currently selected `Gemini Project`
contains unrelated Memoo services and has billing disabled, so the deployment
script deliberately refuses to use it.

Create one version for each secret named in `infra/deploy.sh`. The Google Ads
values must point to an already complete, paused test-account campaign. Capture
the snapshot hash from that exact campaign with `npm run ads:snapshot` in
`web/`, then export it as
`GOOGLE_ADS_CONFIGURATION_SNAPSHOT_HASH`; the executor rejects any drift.
The snapshot includes the campaign identity, channel, dates, networks, and
campaign-budget fields; reads and resets refuse any account whose API record is
not marked as a test account.

```bash
export GCP_PROJECT_ID=your-billing-enabled-project
export GOOGLE_ADS_CONFIGURATION_SNAPSHOT_HASH=sha256:your-frozen-digest
./infra/deploy.sh
```

The script enables the required APIs, creates Artifact Registry, a protected
Firestore database and the runtime service account, builds the image, deploys
Cloud Run, pins `APP_ORIGIN`, and checks `/api/health`. It refuses to replace a
same-named Cloud Run service that it did not create, and Cloud Run refuses to
use the in-memory state backend.

## Local Firestore verification

Start the official emulator from the repository root, then run the integration
check in another terminal:

```bash
npx -y firebase-tools emulators:start --only firestore --project demo-twokeys --config firebase.json
cd web
npm run test:firestore
```

This exercises the real Firestore store and transaction client. It verifies
that concurrent lease issuance has one winner and that CEO memory is not
visible to Finance.

Before recording the demo, reset only the configured test campaign:

```bash
cd web
ALLOW_GOOGLE_ADS_RESET=true npm run ads:reset
```

## Deployment evidence

Do not mark the external-action gate complete until a real test-account run has:

- read `PAUSED` from Google Ads;
- matched the frozen configuration hash;
- consumed one ActionLease;
- issued exactly one `campaigns:mutate` request;
- read back `ENABLED`;
- stored a receipt with the provider request ID;
- rejected a replay before a second provider call.
