import { NextRequest, NextResponse } from "next/server";
import { COMPANY_NAME } from "@/lib/constants";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const mode = body.mode ?? "demo";
  const userCount = body.userCount ?? 0;
  const templateCount = body.templateCount ?? 0;
  const hasAzure =
    Boolean(process.env.AZURE_AD_TENANT_ID) &&
    Boolean(process.env.AZURE_AD_CLIENT_ID) &&
    Boolean(process.env.AZURE_AD_CLIENT_SECRET);

  if (mode === "demo") {
    return NextResponse.json({
      ok: true,
      mode,
      message: `Sample run for ${COMPANY_NAME}: validated ${userCount} recipients across ${templateCount} template(s). No Exchange changes were made.`,
    });
  }

  if (mode === "export-script") {
    return NextResponse.json({
      ok: true,
      mode,
      ruleName: "DPM-Corporate-Signature",
      message: `Export ready for ${userCount} recipients. Download the PowerShell script and HTML pack from the Deploy page, then run the script in Exchange Online PowerShell.`,
      hasAzure,
    });
  }

  if (mode === "publish-rule") {
    if (!hasAzure) {
      return NextResponse.json(
        {
          ok: false,
          mode,
          error: "missing_credentials",
          message:
            "Publish requires AZURE_AD_TENANT_ID, AZURE_AD_CLIENT_ID, and AZURE_AD_CLIENT_SECRET. Until those are set, use Export script and run it as a DPM Exchange admin.",
        },
        { status: 412 },
      );
    }

    return NextResponse.json({
      ok: true,
      mode,
      ruleName: "DPM-Corporate-Signature",
      message: `Credentials detected. Live New-TransportRule publish is prepared for phase 2 — for now download and run the PowerShell script as Exchange admin. Prepared for ${userCount} recipients.`,
      hasAzure: true,
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
