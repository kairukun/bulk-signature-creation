import { COMPANY_NAME, COMPANY_WEBSITE } from "./constants";
import type { Department, DirectoryUser, FindMiRole } from "./types";

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

export interface FindMiPerson {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: FindMiRole;
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

type RawPerson = {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
};

export const FINDMI_ROLE_LABELS: Record<FindMiRole, string> = {
  store: "Store",
  vp: "VP of Operations",
  director: "Director of Operations",
  district_manager: "District Manager",
  repair_technician: "Repair Technician",
};

const ROLE_META: Record<
  Exclude<FindMiRole, "store">,
  { jobTitle: string; department: Department; group: string }
> = {
  vp: {
    jobTitle: "VP of Operations",
    department: "Executive",
    group: "FindMi VP",
  },
  director: {
    jobTitle: "Director of Operations",
    department: "Executive",
    group: "FindMi Director",
  },
  district_manager: {
    jobTitle: "District Manager",
    department: "Sales",
    group: "FindMi District Manager",
  },
  repair_technician: {
    jobTitle: "Repair Technician",
    department: "Support",
    group: "FindMi Repair Tech",
  },
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

function normalizePeople(
  records: Record<string, RawPerson> | null | undefined,
  role: Exclude<FindMiRole, "store">,
): FindMiPerson[] {
  if (!records) return [];
  return Object.entries(records)
    .map(([id, raw]) => ({
      id: String(raw.id || id),
      name: String(raw.name || "").trim(),
      email: String(raw.email || "").trim(),
      phone: String(raw.phone || "").trim(),
      role,
    }))
    .filter((p) => p.name || p.email)
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
}

export function parseFindMiPayload(data: {
  restaurants?: Record<string, RawRestaurant>;
  vps?: Record<string, RawPerson>;
  directors?: Record<string, RawPerson>;
  areaCoaches?: Record<string, RawPerson>;
  repairTechnicians?: Record<string, RawPerson>;
}): {
  stores: FindMiStore[];
  people: FindMiPerson[];
  users: DirectoryUser[];
  counts: Record<FindMiRole, number>;
} {
  const stores = normalizeFindMiRestaurants(data.restaurants);
  const people = [
    ...normalizePeople(data.vps, "vp"),
    ...normalizePeople(data.directors, "director"),
    ...normalizePeople(data.areaCoaches, "district_manager"),
    ...normalizePeople(data.repairTechnicians, "repair_technician"),
  ];

  const storeUsers = stores.map((s) => findMiStoreToDirectoryUser(s));
  const peopleUsers = people.map((p) => findMiPersonToDirectoryUser(p));
  const users = [...peopleUsers, ...storeUsers];

  return {
    stores,
    people,
    users,
    counts: {
      store: stores.length,
      vp: people.filter((p) => p.role === "vp").length,
      director: people.filter((p) => p.role === "director").length,
      district_manager: people.filter((p) => p.role === "district_manager")
        .length,
      repair_technician: people.filter((p) => p.role === "repair_technician")
        .length,
    },
  };
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
    findMiRole: "store",
    findMiId: store.id,
    source: "findmi",
  };
}

export function findMiPersonToDirectoryUser(
  person: FindMiPerson,
  signatureId = "t-dossani",
): DirectoryUser {
  const meta = ROLE_META[person.role as Exclude<FindMiRole, "store">];
  return {
    id: `${person.role}:${person.id}`,
    displayName: person.name || person.email || "Team member",
    email: person.email,
    jobTitle: meta.jobTitle,
    department: meta.department,
    phone: person.phone,
    company: COMPANY_NAME,
    website: COMPANY_WEBSITE,
    streetAddress: "",
    cityStateZip: "",
    location: "",
    signatureId,
    groups: [meta.group],
    findMiRole: person.role,
    findMiId: person.id,
    source: "findmi",
  };
}

export function applyDirectoryOverrides(
  users: DirectoryUser[],
  overrides: Record<string, Partial<DirectoryUser>>,
): DirectoryUser[] {
  return users.map((user) => {
    const patch = overrides[user.id];
    if (!patch) return { ...user, editedLocally: false };
    const { signatureId: _sig, ...findMiPatch } = patch;
    const hasFindMiEdits = Object.keys(findMiPatch).length > 0;
    return {
      ...user,
      ...findMiPatch,
      id: user.id,
      source: "findmi" as const,
      findMiRole: user.findMiRole,
      findMiId: user.findMiId,
      storeId: user.storeId,
      // Prefer existing app assignment on the refreshed user object.
      signatureId: user.signatureId || patch.signatureId,
      editedLocally: hasFindMiEdits,
    };
  });
}

const OVERRIDE_COMPARE_FIELDS: (keyof DirectoryUser)[] = [
  "displayName",
  "jobTitle",
  "email",
  "phone",
  "streetAddress",
  "cityStateZip",
  "location",
  "storeName",
  "storeNumber",
  "company",
];

/**
 * Keep only local edits that still differ from fresh FindMi values.
 * Drop stale override keys so later FindMi changes can flow through.
 */
export function pruneDirectoryOverrides(
  users: DirectoryUser[],
  overrides: Record<string, Partial<DirectoryUser>>,
): Record<string, Partial<DirectoryUser>> {
  const byId = new Map(users.map((u) => [u.id, u] as const));
  const next: Record<string, Partial<DirectoryUser>> = {};

  for (const [userId, patch] of Object.entries(overrides)) {
    const fresh = byId.get(userId);
    if (!fresh) continue; // person/store left FindMi — drop overrides

    const kept: Partial<DirectoryUser> = {};
    for (const key of OVERRIDE_COMPARE_FIELDS) {
      if (!(key in patch)) continue;
      const localValue = patch[key];
      if (localValue !== fresh[key]) {
        (kept as Record<string, unknown>)[key] = localValue;
      }
    }

    if (Object.keys(kept).length) {
      next[userId] = kept;
    }
  }

  return next;
}

export function diffFindMiDirectory(
  previous: DirectoryUser[],
  next: DirectoryUser[],
): { added: number; removed: number; updated: number; unchanged: number } {
  const prevMap = new Map(
    previous.filter((u) => u.source === "findmi").map((u) => [u.id, u]),
  );
  const nextIds = new Set(next.map((u) => u.id));

  let added = 0;
  let updated = 0;
  let unchanged = 0;

  for (const user of next) {
    const before = prevMap.get(user.id);
    if (!before) {
      added += 1;
      continue;
    }
    const changed = OVERRIDE_COMPARE_FIELDS.some(
      (key) => before[key] !== user[key],
    );
    if (changed) updated += 1;
    else unchanged += 1;
  }

  let removed = 0;
  for (const id of prevMap.keys()) {
    if (!nextIds.has(id)) removed += 1;
  }

  return { added, removed, updated, unchanged };
}
