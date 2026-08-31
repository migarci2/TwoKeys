# TwoKeys web application

Next.js application containing the public site, role-aware decision console,
ADK Revenue Agent, private deliberation agent, deterministic authority kernel,
Firestore stores and the Google Ads executor.

## Run locally

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Open <http://localhost:3000/demo>. With the example local settings, choose
Finance or CEO and enter any non-empty access code. The local fallback is
explicitly labelled and the Ads mutation is simulated. Set `GEMINI_API_KEY` to
exercise the real Gemini/ADK paths.

## Verify

```bash
npm test
npm run lint
npm run build -- --webpack
```

Production deliberately refuses the memory store, missing Gemini key and weak
session configuration. The public demo profile permits the simulated executor
only when `TWOKEYS_PUBLIC_DEMO=true`, so anonymous judges cannot trigger a live
Ads mutation. Deployment and required Secret Manager names live in
[`../infra/deploy.sh`](../infra/deploy.sh).
