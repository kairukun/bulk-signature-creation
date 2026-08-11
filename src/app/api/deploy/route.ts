import { NextRequest, NextResponse } from "next/server";
import { COMPANY_NAME } from "@/lib/constants";
import {
  getAzureCredentialStatus,
  hasAzureCredentials,
} from "@/lib/deploy/azure";
import { publishTransportRule } from "@/lib/deploy/exchange-publish";
import { buildTransportRulePowerShell } from "@/lib/deploy/powershell";
import { resolvePublishEmails } from "@/lib/deploy/rule-scope";
import {
  TRANSPORT_RULE_NAME,
  buildTokenDisclaimerHtml,
  transportRuleSummary,
} from "@/lib/deploy/transport-rule";
import type { SignatureTemplate } from "@/lib/types";

export async function GET() {
  const status = getAzureCredentialStatus();
  return NextResponse.json({
    ...status,
    ruleName: TRANSPORT_RULE_NAME,
    message: status.hasAzure
      ? "AZURE_AD_* credentials detected. Publish rule can create/update the Exchange Online transport rule remotely."
      : status.missing.length
        ? `Missing host env: ${status.missing.join(", ")}. Publish falls back to PowerShell script download.`
        : "No AZURE_AD_* credentials. Publish falls back to PowerShell script download.",
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const mode = body.mode ?? "demo";
  const templateCount = Number(body.templateCount ?? 0);
  const companyName = String(body.companyName || COMPANY_NAME);
  const template = (body.template || null) as SignatureTemplate | null;
  const hasAzure = hasAzureCredentials();

  const audience = resolvePublishEmails({
    audience: body.audience,
    emails: body.emails,
    fallbackCount: Number(body.userCount ?? 0),
  });

  if (audience.audience === "selected" && audience.emails.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        mode,
        error: "no_emails_selected",
        message: "Select at least one email to publish, or choose All.",
        hasAzure,
      },
      { status: 400 },
    );
  }

  const disclaimerHtml = buildTokenDisclaimerHtml(template);
  const powershell = buildTransportRulePowerShell({
    disclaimerHtml,
    recipientCount: audience.recipientCount,
    companyName,
    fromEmails: audience.audience === "selected" ? audience.emails : undefined,
  });
  const filename = `${TRANSPORT_RULE_NAME}.ps1`;

  if (mode === "demo") {
    return NextResponse.json({
      ok: true,
      mode,
      ruleName: TRANSPORT_RULE_NAME,
      audience: audience.audience,
      emails: audience.emails,
      message: `Sample run for ${companyName}: validated ${audience.label} across ${templateCount} template(s). No Exchange changes were made.`,
      summary: transportRuleSummary(audience.recipientCount),
      hasAzure,
      publishMode: hasAzure ? "live" : "script-only",
    });
  }

  if (mode === "export-script") {
    return NextResponse.json({
      ok: true,
      mode,
      ruleName: TRANSPORT_RULE_NAME,
      filename,
      powershell,
      disclaimerHtml,
      audience: audience.audience,
      emails: audience.emails,
      message: `Export ready for ${audience.label}. Download the PowerShell script and HTML pack, then run the script in Exchange Online PowerShell.`,
      summary: transportRuleSummary(audience.recipientCount),
      hasAzure,
      publishMode: hasAzure ? "live" : "script-only",
    });
  }

  if (mode === "publish-rule") {
    if (!hasAzure) {
      return NextResponse.json(
        {
          ok: false,
          mode,
          error: "missing_credentials",
          ruleName: TRANSPORT_RULE_NAME,
          filename,
          powershell,
          disclaimerHtml,
          audience: audience.audience,
          emails: audience.emails,
          message:
            "Publish requires AZURE_AD_TENANT_ID, AZURE_AD_CLIENT_ID, and AZURE_AD_CLIENT_SECRET. Downloaded the PowerShell script instead — run it as a DPM Exchange admin.",
          hasAzure: false,
          publishMode: "script-only",
          downloadScript: true,
        },
        { status: 412 },
      );
    }

    const published = await publishTransportRule({
      disclaimerHtml,
      recipientCount: audience.recipientCount,
      audienceLabel: audience.label,
      fromEmails:
        audience.audience === "selected" ? audience.emails : undefined,
    });

    if (!published.ok) {
      return NextResponse.json(
        {
          ok: false,
          mode,
          error: published.error || "publish_failed",
          ruleName: TRANSPORT_RULE_NAME,
          filename,
          powershell,
          disclaimerHtml,
          audience: audience.audience,
          emails: audience.emails,
          message: `${published.message} Falling back to script download — run it in Exchange Online PowerShell.`,
          details: published.details,
          hasAzure: true,
          publishMode: "live",
          downloadScript: true,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      mode,
      action: published.action,
      ruleName: TRANSPORT_RULE_NAME,
      filename,
      powershell,
      disclaimerHtml,
      audience: audience.audience,
      emails: audience.emails,
      message: published.message,
      summary: transportRuleSummary(audience.recipientCount),
      hasAzure: true,
      publishMode: "live",
      downloadScript: false,
    });
  }

  return NextResponse.json(
    {
      ok: false,
      message: `Unknown deploy mode: ${mode}. Use demo, export-script, or publish-rule.`,
    },
    { status: 400 },
  );
}
