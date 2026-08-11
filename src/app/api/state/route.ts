import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import {
  blobConfigured,
  getSharedState,
  isAppStateLike,
  putSharedState,
} from "@/lib/shared-state";
import type { AppState } from "@/lib/types";

async function requireSession() {
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE)?.value);
}

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized. Sign in required." },
      { status: 401 },
    );
  }

  if (!blobConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        empty: true,
        error: "blob_not_configured",
        message:
          "Shared storage is not configured. Set BLOB_READ_WRITE_TOKEN on the host (Vercel Blob).",
      },
      { status: 503 },
    );
  }

  try {
    const document = await getSharedState();
    if (!document) {
      return NextResponse.json({
        ok: true,
        empty: true,
        revision: 0,
        updatedAt: null,
        state: null,
      });
    }

    return NextResponse.json({
      ok: true,
      empty: false,
      revision: document.revision,
      updatedAt: document.updatedAt,
      updatedBy: document.updatedBy ?? null,
      state: document.state,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to read shared state";
    return NextResponse.json(
      { ok: false, error: "read_failed", message },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized. Sign in required." },
      { status: 401 },
    );
  }

  if (!blobConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: "blob_not_configured",
        message:
          "Shared storage is not configured. Set BLOB_READ_WRITE_TOKEN on the host (Vercel Blob).",
      },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const stateCandidate = body?.state ?? body;
  if (!isAppStateLike(stateCandidate)) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_state",
        message:
          "Body must include a state object with users, stores, findMiOverrides, templates, campaigns, and settings.",
      },
      { status: 400 },
    );
  }

  const previousRevision =
    typeof body?.revision === "number" ? body.revision : undefined;

  try {
    const document = await putSharedState(stateCandidate as AppState, {
      previousRevision,
      updatedBy: session.email,
    });

    return NextResponse.json({
      ok: true,
      revision: document.revision,
      updatedAt: document.updatedAt,
      updatedBy: document.updatedBy ?? null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to write shared state";
    return NextResponse.json(
      { ok: false, error: "write_failed", message },
      { status: 500 },
    );
  }
}
