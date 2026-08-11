import { NextRequest, NextResponse } from "next/server";
import {
  DEMO_CAMPAIGNS,
  DEMO_TEMPLATES,
  PREVIEW_USER,
} from "@/lib/demo-data";
import {
  renderSignatureHtml,
  resolveTemplateForUser,
} from "@/lib/render-signature";

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");
  const user = {
    ...PREVIEW_USER,
    email: email || PREVIEW_USER.email,
  };
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
