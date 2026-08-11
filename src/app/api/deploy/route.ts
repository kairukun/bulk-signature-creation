import { NextRequest, NextResponse } from "next/server";
import { COMPANY_NAME } from "@/lib/constants";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const mode = body.mode ?? "demo";
  const userCount = body.userCount ?? 0;
  const templateCount = body.templateCount ?? 0;

  if (mode === "demo") {
    return NextResponse.json({
      ok: true,
      mode,
      message: `Sample deploy for ${COMPANY_NAME}: prepared ${userCount} people across ${templateCount} template(s). No mailboxes were changed.`,
    });
  }

  if (mode === "exchange-rule") {
    return NextResponse.json({
      ok: true,
      mode,
      message:
        "Exchange mode selected. With DPM tenant credentials, this would publish the signature via Exchange Online. Credentials are not live on this host yet.",
    });
  }

  return NextResponse.json({
    ok: true,
    mode,
    message:
      "Outlook roaming mode selected. With Graph permissions in the DPM tenant, signatures would be written per mailbox. Credentials are not live on this host yet.",
  });
}
