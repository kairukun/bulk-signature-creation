import { NextResponse } from "next/server";
import {
  FINDMI_API_URL,
  normalizeFindMiRestaurants,
} from "@/lib/findmi";

export async function GET() {
  try {
    const res = await fetch(FINDMI_API_URL, {
      headers: { Accept: "application/json" },
      // Always get a fresh-enough copy for signature sync
      next: { revalidate: 60 },
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
    const stores = normalizeFindMiRestaurants(data.restaurants);

    return NextResponse.json({
      ok: true,
      source: "https://dossaniparadise.github.io/DPM-FindMi/",
      api: FINDMI_API_URL,
      count: stores.length,
      stores,
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
