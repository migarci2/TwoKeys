import { googleAdsGatewayFromEnv } from "../lib/server/executor.ts";

if (process.env.ALLOW_GOOGLE_ADS_RESET !== "true") {
  throw new Error("Set ALLOW_GOOGLE_ADS_RESET=true for the explicit test-account reset.");
}

const gateway = googleAdsGatewayFromEnv();
const before = await gateway.read();
if (before.status !== "PAUSED") await gateway.pauseForDemoReset();
const after = await gateway.read();
if (after.status !== "PAUSED") throw new Error("Google Ads read-back did not confirm PAUSED.");
process.stdout.write(`${JSON.stringify({ before: before.status, after: after.status }, null, 2)}\n`);
