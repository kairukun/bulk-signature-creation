import { getAzureCredentials, type AzureCredentials } from "@/lib/deploy/azure";
import { buildTransportRuleParameters } from "@/lib/deploy/rule-scope";
import { TRANSPORT_RULE_NAME } from "@/lib/deploy/transport-rule";

const EXCHANGE_SCOPE = "https://outlook.office365.com/.default";
const EXCHANGE_BASE = "https://outlook.office365.com";
/** Arbitration mailbox GUID used for app-only Admin API routing. */
const SYSTEM_MAILBOX_GUID = "bb558c35-97f1-4cb9-8ff7-d53741dc928c";

export type PublishTransportRuleResult = {
  ok: boolean;
  action?: "created" | "updated";
  ruleName: string;
  message: string;
  details?: unknown;
  error?: string;
};

type TokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type InvokeErrorBody = {
  error?: {
    message?: string;
    code?: string;
    details?: Array<{ message?: string; code?: string }>;
  };
};

async function getExchangeAccessToken(
  credentials: AzureCredentials,
): Promise<string> {
  const body = new URLSearchParams({
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    grant_type: "client_credentials",
    scope: EXCHANGE_SCOPE,
  });

  const res = await fetch(
    `https://login.microsoftonline.com/${encodeURIComponent(credentials.tenantId)}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    },
  );

  const json = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok || !json.access_token) {
    throw new Error(
      json.error_description ||
        json.error ||
        `Failed to acquire Exchange token (HTTP ${res.status}). Check AZURE_AD_* and Exchange.ManageAsApp consent.`,
    );
  }
  return json.access_token;
}

function anchorMailbox(credentials: AzureCredentials): string {
  const host = credentials.orgDomain || credentials.tenantId;
  // Official Admin API app-only routing hint.
  return `APP:SystemMailbox{${SYSTEM_MAILBOX_GUID}}@${host}`;
}

function extractInvokeError(payload: unknown, status: number): string {
  const body = payload as InvokeErrorBody;
  const detail = body?.error?.details?.[0]?.message;
  const message = body?.error?.message;
  return (
    detail ||
    message ||
    `Exchange Admin API request failed (HTTP ${status}).`
  );
}

function isNotFoundError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("couldn't be found") ||
    lower.includes("could not be found") ||
    lower.includes("managementobjectnotfound") ||
    lower.includes("not found")
  );
}

async function invokeExchangeCommand<T = unknown>(options: {
  credentials: AzureCredentials;
  accessToken: string;
  cmdletName: string;
  parameters?: Record<string, unknown>;
}): Promise<{ ok: true; value: T } | { ok: false; status: number; error: string; raw: unknown }> {
  const url = `${EXCHANGE_BASE}/adminapi/beta/${encodeURIComponent(options.credentials.tenantId)}/InvokeCommand`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      "Content-Type": "application/json",
      "X-AnchorMailbox": anchorMailbox(options.credentials),
      "X-ResponseFormat": "json",
    },
    body: JSON.stringify({
      CmdletInput: {
        CmdletName: options.cmdletName,
        ...(options.parameters
          ? { Parameters: options.parameters }
          : {}),
      },
    }),
    cache: "no-store",
  });

  const raw = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: extractInvokeError(raw, res.status),
      raw,
    };
  }

  const value = (raw as { value?: T }).value ?? (raw as T);
  return { ok: true, value };
}

function ruleParameters(disclaimerHtml: string, fromEmails?: string[]) {
  return buildTransportRuleParameters({
    disclaimerHtml,
    fromEmails,
  });
}

/**
 * Create or update the DPM corporate signature transport rule via Exchange Online
 * Admin API (InvokeCommand) using app-only AZURE_AD_* credentials.
 *
 * Requires:
 * - App permission Exchange.ManageAsApp (or Exchange.ManageAsAppV2) on Office 365 Exchange Online
 * - Admin consent
 * - Exchange RBAC role on the service principal (e.g. Exchange Administrator / Transport Rules)
 */
export async function publishTransportRule(options: {
  disclaimerHtml: string;
  recipientCount: number;
  audienceLabel?: string;
  fromEmails?: string[];
}): Promise<PublishTransportRuleResult> {
  const credentials = getAzureCredentials();
  if (!credentials) {
    return {
      ok: false,
      ruleName: TRANSPORT_RULE_NAME,
      error: "missing_credentials",
      message:
        "Publish requires AZURE_AD_TENANT_ID, AZURE_AD_CLIENT_ID, and AZURE_AD_CLIENT_SECRET.",
    };
  }

  const fromEmails = options.fromEmails || [];
  const label =
    options.audienceLabel ||
    (fromEmails.length
      ? `${fromEmails.length} selected mailbox${fromEmails.length === 1 ? "" : "es"}`
      : `${options.recipientCount} directory recipients`);

  try {
    const accessToken = await getExchangeAccessToken(credentials);
    const params = ruleParameters(options.disclaimerHtml, fromEmails);

    const existing = await invokeExchangeCommand({
      credentials,
      accessToken,
      cmdletName: "Get-TransportRule",
      parameters: { Identity: TRANSPORT_RULE_NAME },
    });

    if (!existing.ok && !isNotFoundError(existing.error)) {
      return {
        ok: false,
        ruleName: TRANSPORT_RULE_NAME,
        error: "exchange_api_error",
        message: existing.error,
        details: existing.raw,
      };
    }

    if (existing.ok) {
      const updated = await invokeExchangeCommand({
        credentials,
        accessToken,
        cmdletName: "Set-TransportRule",
        parameters: {
          Identity: TRANSPORT_RULE_NAME,
          ...params,
        },
      });

      if (!updated.ok) {
        return {
          ok: false,
          ruleName: TRANSPORT_RULE_NAME,
          error: "set_failed",
          message: updated.error,
          details: updated.raw,
        };
      }

      return {
        ok: true,
        action: "updated",
        ruleName: TRANSPORT_RULE_NAME,
        message: `Updated Exchange Online transport rule "${TRANSPORT_RULE_NAME}" for ${label}.`,
        details: updated.value,
      };
    }

    // New-TransportRule rejects null From / FromScope — omit null clears.
    const createParams: Record<string, unknown> = { Name: TRANSPORT_RULE_NAME };
    for (const [key, value] of Object.entries(params)) {
      if (value !== null) createParams[key] = value;
    }

    const created = await invokeExchangeCommand({
      credentials,
      accessToken,
      cmdletName: "New-TransportRule",
      parameters: createParams,
    });

    if (!created.ok) {
      return {
        ok: false,
        ruleName: TRANSPORT_RULE_NAME,
        error: "create_failed",
        message: created.error,
        details: created.raw,
      };
    }

    return {
      ok: true,
      action: "created",
      ruleName: TRANSPORT_RULE_NAME,
      message: `Created Exchange Online transport rule "${TRANSPORT_RULE_NAME}" for ${label}.`,
      details: created.value,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unexpected publish failure.";
    return {
      ok: false,
      ruleName: TRANSPORT_RULE_NAME,
      error: "publish_exception",
      message,
    };
  }
}
