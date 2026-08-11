import { NextRequest, NextResponse } from "next/server";
import { COMPANY_NAME } from "@/lib/constants";
import { buildTransportRulePowerShell } from "@/lib/deploy/powershell";
import {
  TRANSPORT_RULE_NAME,
  buildTokenDisclaimerHtml,
  transportRuleSummary,
} from "@/lib/deploy/transport-rule";
import type { SignatureTemplate } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const recipientCount = Number(body.recipientCount ?? body.userCount ?? 0);
  const companyName = String(body.companyName || COMPANY_NAME);
  const template = (body.template || null) as SignatureTemplate | null;

  const disclaimerHtml = buildTokenDisclaimerHtml(template);
  const powershell = buildTransportRulePowerShell({
    disclaimerHtml,
    recipientCount,
    companyName,
  });

  return NextResponse.json({
    ok: true,
    ruleName: TRANSPORT_RULE_NAME,
    filename: `${TRANSPORT_RULE_NAME}.ps1`,
    disclaimerHtml,
    powershell,
    summary: transportRuleSummary(recipientCount),
  });
}
