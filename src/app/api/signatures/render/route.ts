import { NextRequest, NextResponse } from "next/server";
import { DEMO_CAMPAIGNS, DEMO_TEMPLATES, DEMO_USERS } from "@/lib/demo-data";
import { renderSignatureHtml, resolveTemplateForUser } from "@/lib/render-signature";

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email") ?? DEMO_USERS[0].email;
  const user = DEMO_USERS.find((u) => u.email === email) ?? DEMO_USERS[0];
  const template = resolveTemplateForUser(user, DEMO_TEMPLATES);
  if (!template) {
    return NextResponse.json({ error: "No template" }, { status: 404 });
  }
  const campaign = DEMO_CAMPAIGNS.find((c) => c.id === template.campaignId);
  const origin = request.nextUrl.origin;
  const html = renderSignatureHtml({ user, template, campaign, origin });

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
