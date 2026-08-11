import { NextRequest, NextResponse } from "next/server";
import { COMPANY_NAME } from "@/lib/constants";
import { buildTransportRulePowerShell } from "@/lib/deploy/powershell";
import { resolvePublishEmails } from "@/lib/deploy/rule-scope";
import {
  TRANSPORT_RULE_NAME,
  buildTokenDisclaimerHtml,
  transportRuleSummary,
} from "@/lib/deploy/transport-rule";
import type { SignatureTemplate } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const companyName = String(body.companyName || COMPANY_NAME);
  const template = (body.template || null) as SignatureTemplate | null;
  const audience = resolvePublishEmails({
    audience: body.audience,
    emails: body.emails,
    fallbackCount: Number(body.recipientCount ?? body.userCount ?? 0),
  });

  if (audience.audience === "selected" && audience.emails.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "Select at least one email, or choose All.",
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

  return NextResponse.json({
    ok: true,
    ruleName: TRANSPORT_RULE_NAME,
    filename: `${TRANSPORT_RULE_NAME}.ps1`,
    disclaimerHtml,
    powershell,
    audience: audience.audience,
    emails: audience.emails,
    summary: transportRuleSummary(audience.recipientCount),
    message: `Script ready for ${audience.label}.`,
  });
}
