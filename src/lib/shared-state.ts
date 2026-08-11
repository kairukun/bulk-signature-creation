import { get, put } from "@vercel/blob";
import type { AppState } from "./types";

/** Fixed pathname for the single shared workspace document. */
export const SHARED_STATE_PATHNAME = "dpm-app-state.json";

export type SharedAppStateDocument = {
  revision: number;
  updatedAt: string;
  updatedBy?: string;
  state: AppState;
};

export function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Light shape check so we do not persist garbage into Blob. */
export function isAppStateLike(value: unknown): value is AppState {
  if (!isRecord(value)) return false;
  return (
    Array.isArray(value.users) &&
    Array.isArray(value.stores) &&
    isRecord(value.findMiOverrides) &&
    Array.isArray(value.templates) &&
    Array.isArray(value.campaigns) &&
    isRecord(value.settings)
  );
}

export function isSharedDocument(
  value: unknown,
): value is SharedAppStateDocument {
  if (!isRecord(value)) return false;
  return (
    typeof value.revision === "number" &&
    typeof value.updatedAt === "string" &&
    isAppStateLike(value.state)
  );
}

async function streamToText(
  stream: ReadableStream<Uint8Array>,
): Promise<string> {
  return new Response(stream).text();
}

/**
 * Read the shared workspace document.
 * Returns null when the blob does not exist yet.
 */
export async function getSharedState(): Promise<SharedAppStateDocument | null> {
  if (!blobConfigured()) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured");
  }

  const result = await get(SHARED_STATE_PATHNAME, {
    access: "private",
    useCache: false,
  });

  if (!result || result.statusCode !== 200 || !result.stream) {
    return null;
  }

  const raw = await streamToText(result.stream);
  const parsed = JSON.parse(raw) as unknown;
  if (!isSharedDocument(parsed)) {
    throw new Error("Shared state blob is invalid");
  }
  return parsed;
}

export async function putSharedState(
  state: AppState,
  options?: {
    previousRevision?: number;
    updatedBy?: string;
  },
): Promise<SharedAppStateDocument> {
  if (!blobConfigured()) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured");
  }

  const previous = await getSharedState();
  const nextRevision =
    typeof options?.previousRevision === "number"
      ? options.previousRevision + 1
      : (previous?.revision ?? 0) + 1;

  const document: SharedAppStateDocument = {
    revision: nextRevision,
    updatedAt: new Date().toISOString(),
    updatedBy: options?.updatedBy,
    state,
  };

  await put(SHARED_STATE_PATHNAME, JSON.stringify(document), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    // Minimum CDN TTL; we always read with useCache: false for freshness.
    cacheControlMaxAge: 60,
  });

  return document;
}
