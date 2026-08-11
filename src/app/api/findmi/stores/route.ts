import { NextResponse } from "next/server";
import { FINDMI_API_URL, parseFindMiPayload } from "@/lib/findmi";

export async function GET() {
  try {
    const res = await fetch(FINDMI_API_URL, {
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        {
          error: `FindMi API returned ${res.status}`,
          source: FINDMI_API_URL,
        },
        { status: 502 },
      );
    }

    const data = await res.json();
    const parsed = parseFindMiPayload(data as Record<string, unknown>);
    const syncedAt = new Date().toISOString();

    return NextResponse.json({
      ok: true,
      source: "https://dossaniparadise.github.io/DPM-FindMi/",
      api: FINDMI_API_URL,
      syncedAt,
      count: parsed.users.length,
      counts: parsed.counts,
      stores: parsed.stores,
      people: parsed.people,
      users: parsed.users,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "FindMi sync failed",
        source: FINDMI_API_URL,
      },
      { status: 500 },
    );
  }
}
