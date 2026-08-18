import { googleAdsGatewayFromEnv } from "../lib/server/executor.ts";

const snapshot = await googleAdsGatewayFromEnv().read();
process.stdout.write(
  `${JSON.stringify({ status: snapshot.status, configurationSnapshotHash: snapshot.configurationSnapshotHash }, null, 2)}\n`,
);
