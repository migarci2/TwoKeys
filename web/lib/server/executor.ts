import {
  AuthorityError,
  canonicalDigest,
  type ActionVersionRecord,
  type CampaignStatus,
} from "./authority.ts";
import { publicDemoMode } from "./demo-mode.ts";

export interface CampaignSnapshot {
  resourceName: string;
  status: CampaignStatus;
  configurationSnapshotHash: string;
}

export interface CampaignMutation {
  requestId: string | null;
}

export interface CampaignGateway {
  read(action: ActionVersionRecord): Promise<CampaignSnapshot>;
  enable(action: ActionVersionRecord): Promise<CampaignMutation>;
}

interface GoogleAdsConfig {
  apiVersion: string;
  customerId: string;
  campaignId: string;
  loginCustomerId?: string;
  developerToken: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

interface GoogleAdsCampaign {
  resourceName: string;
  status: string;
  advertisingChannelType?: string;
  campaignBudget?: string;
  startDate?: string;
  endDate?: string;
  networkSettings?: {
    targetGoogleSearch?: boolean;
    targetSearchNetwork?: boolean;
    targetContentNetwork?: boolean;
    targetPartnerSearchNetwork?: boolean;
  };
}

interface GoogleAdsCampaignBudget {
  resourceName?: string;
  amountMicros?: string;
  totalAmountMicros?: string;
  deliveryMethod?: string;
  explicitlyShared?: boolean;
}

interface GoogleAdsRow {
  campaign?: GoogleAdsCampaign;
  campaignBudget?: GoogleAdsCampaignBudget;
  customer?: { testAccount?: boolean };
}

type Fetch = typeof fetch;

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for the Google Ads executor.`);
  return value;
}

function adsId(value: string, name: string): string {
  const normalized = value.replaceAll("-", "");
  if (!/^\d+$/.test(normalized)) throw new Error(`${name} must contain only digits.`);
  return normalized;
}

function googleAdsConfigFromEnv(): GoogleAdsConfig {
  const apiVersion = process.env.GOOGLE_ADS_API_VERSION?.trim() || "v25";
  if (!/^v\d+$/.test(apiVersion)) throw new Error("GOOGLE_ADS_API_VERSION is invalid.");
  const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.trim();
  return {
    apiVersion,
    customerId: adsId(required("GOOGLE_ADS_CUSTOMER_ID"), "GOOGLE_ADS_CUSTOMER_ID"),
    campaignId: adsId(required("GOOGLE_ADS_CAMPAIGN_ID"), "GOOGLE_ADS_CAMPAIGN_ID"),
    loginCustomerId: loginCustomerId
      ? adsId(loginCustomerId, "GOOGLE_ADS_LOGIN_CUSTOMER_ID")
      : undefined,
    developerToken: required("GOOGLE_ADS_DEVELOPER_TOKEN"),
    clientId: required("GOOGLE_ADS_CLIENT_ID"),
    clientSecret: required("GOOGLE_ADS_CLIENT_SECRET"),
    refreshToken: required("GOOGLE_ADS_REFRESH_TOKEN"),
  };
}

export function googleAdsGatewayFromEnv(): GoogleAdsCampaignGateway {
  return new GoogleAdsCampaignGateway(googleAdsConfigFromEnv());
}

export function googleAdsSnapshotHash(
  campaign: GoogleAdsCampaign,
  campaignBudget: GoogleAdsCampaignBudget = {},
): string {
  return canonicalDigest({
    resourceName: campaign.resourceName,
    advertisingChannelType: campaign.advertisingChannelType ?? null,
    campaignBudgetResource: campaign.campaignBudget ?? null,
    startDate: campaign.startDate ?? null,
    endDate: campaign.endDate ?? null,
    networkSettings: campaign.networkSettings ?? null,
    campaignBudget: {
      resourceName: campaignBudget.resourceName ?? null,
      amountMicros: campaignBudget.amountMicros ?? null,
      totalAmountMicros: campaignBudget.totalAmountMicros ?? null,
      deliveryMethod: campaignBudget.deliveryMethod ?? null,
      explicitlyShared: campaignBudget.explicitlyShared ?? null,
    },
  });
}

export class GoogleAdsCampaignGateway implements CampaignGateway {
  private accessToken: { value: string; expiresAt: number } | null = null;
  private readonly config: GoogleAdsConfig;
  private readonly fetcher: Fetch;

  constructor(config: GoogleAdsConfig, fetcher: Fetch = fetch) {
    this.config = config;
    this.fetcher = fetcher;
  }

  private async token(): Promise<string> {
    if (this.accessToken && this.accessToken.expiresAt > Date.now() + 60_000) {
      return this.accessToken.value;
    }
    const response = await this.fetcher("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: this.config.refreshToken,
        grant_type: "refresh_token",
      }),
      signal: AbortSignal.timeout(12_000),
    });
    const body = (await response.json()) as { access_token?: unknown; expires_in?: unknown };
    if (!response.ok || typeof body.access_token !== "string") {
      throw new Error(`Google Ads OAuth failed with HTTP ${response.status}.`);
    }
    const expiresIn = typeof body.expires_in === "number" ? body.expires_in : 3_600;
    this.accessToken = {
      value: body.access_token,
      expiresAt: Date.now() + expiresIn * 1_000,
    };
    return body.access_token;
  }

  private async headers(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${await this.token()}`,
      "Content-Type": "application/json",
      "developer-token": this.config.developerToken,
    };
    if (this.config.loginCustomerId) {
      headers["login-customer-id"] = this.config.loginCustomerId;
    }
    return headers;
  }

  private async campaign(): Promise<Required<Pick<GoogleAdsRow, "campaign">> & GoogleAdsRow> {
    const response = await this.fetcher(
      `https://googleads.googleapis.com/${this.config.apiVersion}/customers/${this.config.customerId}/googleAds:search`,
      {
        method: "POST",
        headers: await this.headers(),
        body: JSON.stringify({
          query: [
            "SELECT campaign.resource_name, campaign.status,",
            "campaign.advertising_channel_type, campaign.campaign_budget,",
            "campaign.start_date, campaign.end_date, campaign.network_settings.target_google_search,",
            "campaign.network_settings.target_search_network, campaign.network_settings.target_content_network,",
            "campaign.network_settings.target_partner_search_network, customer.test_account,",
            "campaign_budget.resource_name, campaign_budget.amount_micros, campaign_budget.total_amount_micros,",
            "campaign_budget.delivery_method, campaign_budget.explicitly_shared",
            `FROM campaign WHERE campaign.id = ${this.config.campaignId} LIMIT 1`,
          ].join(" "),
          pageSize: 1,
        }),
        signal: AbortSignal.timeout(12_000),
      },
    );
    const body = (await response.json()) as {
      results?: GoogleAdsRow[];
    };
    const row = body.results?.[0];
    if (!response.ok || !row?.campaign) {
      throw new Error(
        `Google Ads campaign read failed with HTTP ${response.status}` +
          (response.headers.get("request-id")
            ? ` (request ${response.headers.get("request-id")}).`
            : "."),
      );
    }
    if (row.customer?.testAccount !== true) {
      throw new Error("Refusing to operate on a Google Ads account that is not a test account.");
    }
    return row as Required<Pick<GoogleAdsRow, "campaign">> & GoogleAdsRow;
  }

  async read(): Promise<CampaignSnapshot> {
    const { campaign, campaignBudget } = await this.campaign();
    if (campaign.status !== "PAUSED" && campaign.status !== "ENABLED") {
      throw new AuthorityError(
        "SNAPSHOT_DRIFT",
        `Expected a PAUSED or ENABLED campaign, observed ${campaign.status}.`,
      );
    }
    return {
      resourceName: "customers/test-account/campaigns/preconfigured",
      status: campaign.status,
      configurationSnapshotHash: googleAdsSnapshotHash(campaign, campaignBudget),
    };
  }

  private async setStatus(status: CampaignStatus): Promise<CampaignMutation> {
    const resourceName = `customers/${this.config.customerId}/campaigns/${this.config.campaignId}`;
    const response = await this.fetcher(
      `https://googleads.googleapis.com/${this.config.apiVersion}/customers/${this.config.customerId}/campaigns:mutate`,
      {
        method: "POST",
        headers: await this.headers(),
        body: JSON.stringify({
          operations: [
            {
              update: { resourceName, status },
              updateMask: "status",
            },
          ],
          partialFailure: false,
          validateOnly: false,
          responseContentType: "RESOURCE_NAME_ONLY",
        }),
        signal: AbortSignal.timeout(12_000),
      },
    );
    const body = (await response.json()) as { results?: Array<{ resourceName?: string }> };
    if (!response.ok || body.results?.[0]?.resourceName !== resourceName) {
      throw new Error(
        `Google Ads campaign mutation failed with HTTP ${response.status}` +
          (response.headers.get("request-id")
            ? ` (request ${response.headers.get("request-id")}).`
            : "."),
      );
    }
    return { requestId: response.headers.get("request-id") };
  }

  async enable(): Promise<CampaignMutation> {
    return this.setStatus("ENABLED");
  }

  async pauseForDemoReset(): Promise<CampaignMutation> {
    return this.setStatus("PAUSED");
  }
}

class SimulatedCampaignGateway implements CampaignGateway {
  private status: CampaignStatus = "PAUSED";

  async read(action: ActionVersionRecord): Promise<CampaignSnapshot> {
    return {
      resourceName: "customers/test/campaigns/preconfigured",
      status: this.status,
      configurationSnapshotHash: action.campaign.configurationSnapshotHash,
    };
  }

  async enable(): Promise<CampaignMutation> {
    if (this.status !== "PAUSED") {
      throw new AuthorityError("SNAPSHOT_DRIFT", "Campaign is no longer PAUSED.");
    }
    this.status = "ENABLED";
    return { requestId: `simulated-${Date.now()}` };
  }
}

declare global {
  var __twoKeysSimulatedGateway: CampaignGateway | undefined;
  var __twoKeysGoogleAdsGateway: CampaignGateway | undefined;
}

export function getCampaignGateway(): CampaignGateway {
  const mode =
    process.env.EXECUTOR_MODE || (process.env.NODE_ENV === "production" ? "google_ads" : "simulated");
  if (mode === "simulated") {
    if (process.env.NODE_ENV === "production" && !publicDemoMode()) {
      throw new Error("EXECUTOR_MODE=simulated is forbidden in production.");
    }
    globalThis.__twoKeysSimulatedGateway ??= new SimulatedCampaignGateway();
    return globalThis.__twoKeysSimulatedGateway;
  }
  if (mode === "google_ads") {
    globalThis.__twoKeysGoogleAdsGateway ??= googleAdsGatewayFromEnv();
    return globalThis.__twoKeysGoogleAdsGateway;
  }
  throw new Error("EXECUTOR_MODE must be 'simulated' or 'google_ads'.");
}
