import assert from "node:assert/strict";
import test from "node:test";

import { GoogleAdsCampaignGateway, googleAdsSnapshotHash } from "./executor.ts";

test("Google Ads gateway reads, mutates once, and reads back without leaking credentials", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  let status = "PAUSED";
  const campaignBudget = {
    resourceName: "customers/123/campaignBudgets/789",
    amountMicros: "2200000000",
    deliveryMethod: "STANDARD",
    explicitlyShared: false,
  };
  const campaign = () => ({
    resourceName: "customers/123/campaigns/456",
    status,
    advertisingChannelType: "SEARCH",
    campaignBudget: "customers/123/campaignBudgets/789",
    startDate: "2026-08-17",
    endDate: "2026-08-30",
    networkSettings: { targetGoogleSearch: true },
  });
  const fakeFetch = async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    if (url.includes("oauth2.googleapis.com")) {
      return Response.json({ access_token: "access-token", expires_in: 3600 });
    }
    if (url.endsWith("campaigns:mutate")) {
      status = "ENABLED";
      return Response.json(
        { results: [{ resourceName: "customers/123/campaigns/456" }] },
        { headers: { "request-id": "ads-request-1" } },
      );
    }
    return Response.json({
      results: [{ campaign: campaign(), campaignBudget, customer: { testAccount: true } }],
    });
  };
  const gateway = new GoogleAdsCampaignGateway(
    {
      apiVersion: "v25",
      customerId: "123",
      campaignId: "456",
      developerToken: "developer-secret",
      clientId: "client-id",
      clientSecret: "client-secret",
      refreshToken: "refresh-secret",
    },
    fakeFetch as typeof fetch,
  );

  const before = await gateway.read();
  const mutation = await gateway.enable();
  const after = await gateway.read();

  assert.equal(before.status, "PAUSED");
  assert.equal(after.status, "ENABLED");
  assert.equal(before.configurationSnapshotHash, after.configurationSnapshotHash);
  assert.equal(before.resourceName, "customers/test-account/campaigns/preconfigured");
  assert.equal(mutation.requestId, "ads-request-1");
  assert.equal(calls.filter((call) => call.url.endsWith("campaigns:mutate")).length, 1);
  assert.equal(calls.filter((call) => call.url.includes("oauth2.googleapis.com")).length, 1);
  const mutationBody = JSON.parse(String(calls.find((call) => call.url.endsWith("campaigns:mutate"))!.init!.body));
  assert.deepEqual(mutationBody.operations, [
    {
      update: { resourceName: "customers/123/campaigns/456", status: "ENABLED" },
      updateMask: "status",
    },
  ]);
  assert.match(googleAdsSnapshotHash(campaign(), campaignBudget), /^sha256:[a-f0-9]{64}$/);
  assert.notEqual(
    googleAdsSnapshotHash(campaign(), campaignBudget),
    googleAdsSnapshotHash(campaign(), { ...campaignBudget, amountMicros: "2300000000" }),
  );
  assert.equal(JSON.stringify({ before, after, mutation }).includes("secret"), false);
});

test("Google Ads gateway rejects a non-test account before returning a snapshot", async () => {
  const fakeFetch = async (input: string | URL | Request) =>
    String(input).includes("oauth2.googleapis.com")
      ? Response.json({ access_token: "token", expires_in: 3600 })
      : Response.json({
          results: [
            {
              campaign: { resourceName: "customers/123/campaigns/456", status: "PAUSED" },
              customer: { testAccount: false },
            },
          ],
        });
  const gateway = new GoogleAdsCampaignGateway(
    {
      apiVersion: "v25",
      customerId: "123",
      campaignId: "456",
      developerToken: "developer-token",
      clientId: "client-id",
      clientSecret: "client-secret",
      refreshToken: "refresh-token",
    },
    fakeFetch as typeof fetch,
  );
  await assert.rejects(gateway.read(), /not a test account/);
});
