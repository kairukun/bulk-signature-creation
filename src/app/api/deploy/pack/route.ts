import { NextRequest, NextResponse } from "next/server";
import { COMPANY_NAME } from "@/lib/constants";
import { buildSignatureHtmlPack } from "@/lib/deploy/pack";
import type { Campaign, DirectoryUser, SignatureTemplate } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const users = (body.users || []) as DirectoryUser[];
  const templates = (body.templates || []) as SignatureTemplate[];
  const campaigns = (body.campaigns || []) as Campaign[];
  const companyName = String(body.companyName || COMPANY_NAME);
  const origin = request.nextUrl.origin;

  if (!Array.isArray(users) || !Array.isArray(templates)) {
    return NextResponse.json(
      { error: "users and templates arrays are required" },
      { status: 400 },
    );
  }

  const pack = buildSignatureHtmlPack({
    users,
    templates,
    campaigns,
    companyName,
    origin,
  });

  return NextResponse.json({
    ok: true,
    pack,
  });
}
