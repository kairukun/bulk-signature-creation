import { NextRequest, NextResponse } from "next/server";

const clickCounts = new Map<string, number>();

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ campaignId: string }> },
) {
  const { campaignId } = await context.params;
  const to = request.nextUrl.searchParams.get("to");
  const demo = request.nextUrl.searchParams.get("demo");

  clickCounts.set(campaignId, (clickCounts.get(campaignId) ?? 0) + 1);

  if (!to) {
    return NextResponse.json(
      { error: "Missing destination URL (?to=)" },
      { status: 400 },
    );
  }

  let destination: URL;
  try {
    destination = new URL(to);
  } catch {
    return NextResponse.json({ error: "Invalid destination URL" }, { status: 400 });
  }

  if (demo === "1") {
    return NextResponse.json({
      ok: true,
      campaignId,
      to: destination.toString(),
      serverClicks: clickCounts.get(campaignId) ?? 0,
    });
  }

  return NextResponse.redirect(destination.toString(), 302);
}
