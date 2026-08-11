import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const mode = body.mode ?? "demo";
  const userCount = body.userCount ?? 0;
  const templateCount = body.templateCount ?? 0;

  if (mode === "demo") {
    return NextResponse.json({
      ok: true,
      mode,
      message: `Demo deploy complete: resolved ${userCount} users across ${templateCount} templates. No mailboxes were changed.`,
    });
  }

  if (mode === "exchange-rule") {
    return NextResponse.json({
      ok: true,
      mode,
      message:
        "Exchange mode selected. Configure AZURE_AD_* credentials and Exchange Online PowerShell/Graph to publish transport rules. This demo host did not mutate your tenant.",
    });
  }

  return NextResponse.json({
    ok: true,
    mode,
    message:
      "Outlook roaming mode selected. With Graph MailboxSettings permissions, signatures would be written per user. Credentials are not configured on this demo deployment.",
  });
}
