import { COMPANY_NAME, COMPANY_WEBSITE } from "./constants";
import type { DirectoryUser } from "./types";

/** Live FindMi / alignment API used by https://dossaniparadise.github.io/DPM-FindMi/ */
export const FINDMI_API_URL =
  process.env.FINDMI_API_URL ||
  process.env.NEXT_PUBLIC_FINDMI_API_URL ||
  "https://alignment-api-khaki.vercel.app/api/dpm-alignment";

export interface FindMiStore {
  id: string;
  storeName: string;
  storeNumber: string;
  address: string;
  streetAddress: string;
  cityStateZip: string;
  email: string;
  phone: string;
  storeManager: string;
  entity: string;
  division: string;
}

type RawRestaurant = {
  id?: string;
  storeName?: string;
  storeNumber?: string;
  address?: string;
  email?: string;
  phone?: string;
  storeManager?: string;
  entity?: string;
  division?: string;
};

/** Split "1001 East Highway 190, Copperas Cove, TX 76522" into street + city/state/zip. */
export function parseFindMiAddress(address: string): {
  streetAddress: string;
  cityStateZip: string;
} {
  const cleaned = address.trim();
  if (!cleaned) return { streetAddress: "", cityStateZip: "" };

  const parts = cleaned.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 3) {
    const cityStateZip = parts.slice(-2).join(", ");
    const streetAddress = parts.slice(0, -2).join(", ");
    return { streetAddress, cityStateZip };
  }
  if (parts.length === 2) {
    return { streetAddress: parts[0], cityStateZip: parts[1] };
  }
  return { streetAddress: cleaned, cityStateZip: "" };
}

export function normalizeFindMiStore(
  id: string,
  raw: RawRestaurant,
): FindMiStore {
  const address = String(raw.address || "").trim();
  const { streetAddress, cityStateZip } = parseFindMiAddress(address);
  return {
    id,
    storeName: String(raw.storeName || "").trim(),
    storeNumber: String(raw.storeNumber || "").trim(),
    address,
    streetAddress,
    cityStateZip,
    email: String(raw.email || "").trim(),
    phone: String(raw.phone || "").trim(),
    storeManager: String(raw.storeManager || "").trim(),
    entity: String(raw.entity || "").trim(),
    division: String(raw.division || "").trim(),
  };
}

export function normalizeFindMiRestaurants(
  restaurants: Record<string, RawRestaurant> | null | undefined,
): FindMiStore[] {
  if (!restaurants) return [];
  return Object.entries(restaurants)
    .map(([id, raw]) => normalizeFindMiStore(raw.id || id, raw))
    .filter((s) => s.storeName || s.email || s.storeNumber)
    .sort((a, b) =>
      (a.storeName || a.storeNumber).localeCompare(
        b.storeName || b.storeNumber,
        undefined,
        { sensitivity: "base" },
      ),
    );
}

/** Map a FindMi store into a signature recipient (store mailbox). */
export function findMiStoreToDirectoryUser(
  store: FindMiStore,
  signatureId = "t-dossani",
): DirectoryUser {
  const displayName =
    store.storeManager || store.storeName || store.storeNumber || "Store";
  const jobTitle = store.storeManager
    ? "Store Manager"
    : store.storeNumber
      ? `Store ${store.storeNumber}`
      : "Store";

  return {
    id: `store:${store.id}`,
    displayName,
    email: store.email,
    jobTitle,
    department: "Sales",
    phone: store.phone,
    company: store.entity || COMPANY_NAME,
    website: COMPANY_WEBSITE,
    streetAddress: store.streetAddress || store.address,
    cityStateZip: store.cityStateZip,
    location: store.cityStateZip || store.address,
    signatureId,
    groups: [
      "FindMi Store",
      store.division ? `Division:${store.division}` : "",
      store.storeNumber,
    ].filter(Boolean),
    storeId: store.id,
    storeName: store.storeName,
    storeNumber: store.storeNumber,
    source: "findmi",
  };
}
