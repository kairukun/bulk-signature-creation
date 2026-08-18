import { NextResponse } from "next/server";
import { FINDMI_API_URL, parseFindMiPayload } from "@/lib/findmi";
import type { DirectoryUser } from "@/lib/types";

function publicUser(user: DirectoryUser) {
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    jobTitle: user.jobTitle,
    department: user.department,
    phone: user.phone,
    company: user.company,
    website: user.website,
    streetAddress: user.streetAddress || "",
    cityStateZip: user.cityStateZip || "",
    location: user.location,
    storeName: user.storeName || "",
    storeNumber: user.storeNumber || "",
    findMiRole: user.findMiRole || "other",
  };
}

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
        { ok: false, error: `FindMi API returned ${res.status}` },
        { status: 502 },
      );
    }

    const data = await res.json();
    const parsed = parseFindMiPayload(data as Record<string, unknown>);
    const users = parsed.users
      .map(publicUser)
      .sort((a, b) =>
        a.displayName.localeCompare(b.displayName, undefined, {
          sensitivity: "base",
        }),
      );

    return NextResponse.json({
      ok: true,
      syncedAt: new Date().toISOString(),
      count: users.length,
      users,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "FindMi directory failed",
      },
      { status: 500 },
    );
  }
}
