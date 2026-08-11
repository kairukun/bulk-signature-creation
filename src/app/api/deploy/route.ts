import { NextRequest, NextResponse } from "next/server";
import { COMPANY_NAME } from "@/lib/constants";
import { hasAzureCredentials } from "@/lib/deploy/azure";
import { publishTransportRule } from "@/lib/deploy/exchange-publish";
import { buildTransportRulePowerShell } from "@/lib/deploy/powershell";
import {
  TRANSPORT_RULE_NAME,
  buildTokenDisclaimerHtml,
  transportRuleSummary,
} from "@/lib/deploy/transport-rule";
import type { SignatureTemplate } from "@/lib/types";

export async function GET() {
  const hasAzure = hasAzureCredentials();
  return NextResponse.json({
    hasAzure,
    ruleName: TRANSPORT_RULE_NAME,
    publishMode: hasAzure ? "live" : "script-only",
    message: hasAzure
      ? "AZURE_AD_* credentials detected. Publish rule can create/update the Exchange Online transport rule remotely."
      : "No AZURE_AD_* credentials. Publish falls back to PowerShell script download.",
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const mode = body.mode ?? "demo";
  const userCount = Number(body.userCount ?? 0);
  const templateCount = Number(body.templateCount ?? 0);
  const companyName = String(body.companyName || COMPANY_NAME);
  const template = (body.template || null) as SignatureTemplate | null;
  const hasAzure = hasAzureCredentials();

  const disclaimerHtml = buildTokenDisclaimerHtml(template);
  const powershell = buildTransportRulePowerShell({
    disclaimerHtml,
    recipientCount: userCount,
    companyName,
  });
  const filename = `${TRANSPORT_RULE_NAME}.ps1`;

  if (mode === "demo") {
    return NextResponse.json({
      ok: true,
      mode,
      ruleName: TRANSPORT_RULE_NAME,
      message: `Sample run for ${companyName}: validated ${userCount} recipients across ${templateCount} template(s). No Exchange changes were made.`,
      summary: transportRuleSummary(userCount),
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
      message: `Export ready for ${userCount} recipients. Download the PowerShell script and HTML pack, then run the script in Exchange Online PowerShell.`,
      summary: transportRuleSummary(userCount),
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
      recipientCount: userCount,
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
      message: published.message,
      summary: transportRuleSummary(userCount),
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
