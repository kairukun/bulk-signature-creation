import { COMPANY_NAME, COMPANY_WEBSITE } from "./constants";
import {
  departmentForFindMiRole,
  mapFindMiDepartment,
} from "./departments";
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
  jobTitle: string;
  department: string;
  role: FindMiRole;
  sourceBucket: string;
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
  replyNumber?: string;
  jobTitle?: string;
  title?: string;
  position?: string;
  role?: string;
  department?: string;
  deptHead?: boolean;
  tier?: string;
  [key: string]: unknown;
};

/** Non-people collections in the alignment payload. */
const NON_PEOPLE_BUCKETS = new Set([
  "restaurants",
  "awtTickets",
  "filterChanges",
  "gasCoverChanges",
  "maintenanceTickets",
  "maintenanceVendors",
  "closedTicketCount",
]);

/** Known admin nested keys that are not people. */
const ADMIN_SKIP_KEYS = new Set(["appMeta", "techLocations", "techMeta"]);

export const FINDMI_ROLE_LABELS: Record<FindMiRole, string> = {
  store: "Store",
  admin: "Admin",
  vp: "VP / Leadership",
  director: "Director of Operations",
  district_manager: "District Manager",
  repair_technician: "Repair Technician",
  entity: "Entity",
  other: "Other",
};

const ROLE_FALLBACK: Record<
  Exclude<FindMiRole, "store">,
  { jobTitle: string; department: Department; group: string }
> = {
  admin: {
    jobTitle: "Administrator",
    department: "Administrative",
    group: "FindMi Admin",
  },
  vp: {
    jobTitle: "VP of Operations",
    department: "Executive",
    group: "FindMi Leadership",
  },
  director: {
    jobTitle: "Director of Operations",
    department: "Above Store Leader",
    group: "FindMi Director",
  },
  district_manager: {
    jobTitle: "District Manager",
    department: "Area Coach",
    group: "FindMi District Manager",
  },
  repair_technician: {
    jobTitle: "Repair Technician",
    department: "Repair and Maintenance",
    group: "FindMi Repair Tech",
  },
  entity: {
    jobTitle: "Entity",
    department: "Finance",
    group: "FindMi Entity",
  },
  other: {
    jobTitle: "Team member",
    department: "Operations",
    group: "FindMi Other",
  },
};

const BUCKET_TO_ROLE: Record<string, FindMiRole> = {
  admins: "admin",
  vps: "vp",
  directors: "director",
  areaCoaches: "district_manager",
  repairTechnicians: "repair_technician",
  entities: "entity",
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

export { mapFindMiDepartment, departmentForFindMiRole } from "./departments";

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
    .map(([id, raw]) => normalizeFindMiStore(String(raw.id || id), raw))
    .filter((s) => s.storeName || s.email || s.storeNumber)
    .sort((a, b) =>
      (a.storeName || a.storeNumber).localeCompare(
        b.storeName || b.storeNumber,
        undefined,
        { sensitivity: "base" },
      ),
    );
}

function isPersonRecord(raw: unknown): raw is RawPerson {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const record = raw as RawPerson;
  const name = String(record.name || "").trim();
  const email = String(record.email || "").trim();
  return Boolean(name || email);
}

function personJobTitle(raw: RawPerson, role: FindMiRole): string {
  const fromApi = String(
    raw.jobTitle || raw.title || raw.position || raw.role || "",
  ).trim();
  if (fromApi) return fromApi;
  if (raw.tier) {
    const tier = String(raw.tier).trim();
    if (tier) return `Admin (${tier})`;
  }
  return ROLE_FALLBACK[role === "store" ? "other" : role].jobTitle;
}

function normalizePersonEntry(
  key: string,
  raw: RawPerson,
  role: FindMiRole,
  sourceBucket: string,
): FindMiPerson | null {
  if (!isPersonRecord(raw)) return null;
  const id = String(raw.id || key).trim();
  if (!id || ADMIN_SKIP_KEYS.has(key)) return null;

  const name = String(raw.name || "").trim();
  const email = String(raw.email || "").trim();
  if (!name && !email) return null;

  return {
    id,
    name,
    email,
    phone: String(raw.phone || raw.replyNumber || "").trim(),
    jobTitle: personJobTitle(raw, role),
    department: String(raw.department || "").trim(),
    role,
    sourceBucket,
  };
}

function normalizePeopleBucket(
  records: Record<string, unknown> | null | undefined,
  role: FindMiRole,
  sourceBucket: string,
): FindMiPerson[] {
  if (!records) return [];
  return Object.entries(records)
    .map(([key, raw]) =>
      normalizePersonEntry(key, raw as RawPerson, role, sourceBucket),
    )
    .filter((p): p is FindMiPerson => Boolean(p))
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
}

function looksLikePeopleMap(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const entries = Object.entries(value as Record<string, unknown>);
  if (!entries.length) return false;
  let personLike = 0;
  for (const [key, raw] of entries) {
    if (ADMIN_SKIP_KEYS.has(key)) continue;
    if (isPersonRecord(raw)) personLike += 1;
  }
  return personLike > 0;
}

/**
 * Collect every person-like record from the FindMi alignment payload.
 * Known buckets first, then any other top-level maps that look like people.
 */
export function collectFindMiPeople(
  data: Record<string, unknown>,
): FindMiPerson[] {
  const byId = new Map<string, FindMiPerson>();

  const upsert = (person: FindMiPerson) => {
    // Prefer richer records (ones with jobTitle/department) when duplicated.
    const existing = byId.get(person.id);
    if (!existing) {
      byId.set(person.id, person);
      return;
    }
    const existingScore =
      (existing.jobTitle ? 1 : 0) + (existing.department ? 1 : 0);
    const nextScore =
      (person.jobTitle ? 1 : 0) + (person.department ? 1 : 0);
    if (nextScore >= existingScore) byId.set(person.id, person);
  };

  for (const [bucket, role] of Object.entries(BUCKET_TO_ROLE)) {
    const people = normalizePeopleBucket(
      data[bucket] as Record<string, unknown> | undefined,
      role,
      bucket,
    );
    for (const person of people) upsert(person);
  }

  for (const [bucket, value] of Object.entries(data)) {
    if (NON_PEOPLE_BUCKETS.has(bucket)) continue;
    if (bucket in BUCKET_TO_ROLE) continue;
    if (!looksLikePeopleMap(value)) continue;
    const people = normalizePeopleBucket(
      value as Record<string, unknown>,
      "other",
      bucket,
    );
    for (const person of people) upsert(person);
  }

  return [...byId.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

export function emptyFindMiCounts(): Record<FindMiRole, number> {
  return {
    store: 0,
    admin: 0,
    vp: 0,
    director: 0,
    district_manager: 0,
    repair_technician: 0,
    entity: 0,
    other: 0,
  };
}

export function parseFindMiPayload(data: Record<string, unknown>): {
  stores: FindMiStore[];
  people: FindMiPerson[];
  users: DirectoryUser[];
  counts: Record<FindMiRole, number>;
} {
  const stores = normalizeFindMiRestaurants(
    data.restaurants as Record<string, RawRestaurant> | undefined,
  );
  const people = collectFindMiPeople(data);

  const storeUsers = stores.map((s) => findMiStoreToDirectoryUser(s));
  const peopleUsers = people.map((p) => findMiPersonToDirectoryUser(p));
  const users = [...peopleUsers, ...storeUsers];

  const counts = emptyFindMiCounts();
  counts.store = stores.length;
  for (const person of people) {
    counts[person.role] += 1;
  }

  return { stores, people, users, counts };
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
    department: departmentForFindMiRole("store"),
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
  const fallback =
    ROLE_FALLBACK[person.role === "store" ? "other" : person.role];
  const jobTitle = person.jobTitle || fallback.jobTitle;
  const department = mapFindMiDepartment(
    person.department || person.jobTitle,
    person.role,
  );

  return {
    // Stable across role-bucket moves so title/role updates refresh in place.
    id: `findmi:${person.id}`,
    displayName: person.name || person.email || "Team member",
    email: person.email,
    jobTitle,
    department,
    phone: person.phone,
    company: COMPANY_NAME,
    website: COMPANY_WEBSITE,
    streetAddress: "",
    cityStateZip: "",
    location: "",
    signatureId,
    groups: [fallback.group, `FindMi:${person.sourceBucket}`],
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
  "department",
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
  const byFindMiId = new Map(
    users
      .filter((u) => u.findMiId)
      .map((u) => [u.findMiId!, u] as const),
  );
  const next: Record<string, Partial<DirectoryUser>> = {};

  for (const [userId, patch] of Object.entries(overrides)) {
    const fresh =
      byId.get(userId) ||
      (userId.includes(":")
        ? byFindMiId.get(userId.slice(userId.indexOf(":") + 1))
        : undefined) ||
      byFindMiId.get(userId);
    if (!fresh) continue;

    const kept: Partial<DirectoryUser> = {};
    for (const key of OVERRIDE_COMPARE_FIELDS) {
      if (!(key in patch)) continue;
      const localValue = patch[key];
      if (localValue !== fresh[key]) {
        (kept as Record<string, unknown>)[key] = localValue;
      }
    }

    if (Object.keys(kept).length) {
      next[fresh.id] = kept;
    }
  }

  return next;
}

export function diffFindMiDirectory(
  previous: DirectoryUser[],
  next: DirectoryUser[],
): { added: number; removed: number; updated: number; unchanged: number } {
  const prevByKey = new Map<string, DirectoryUser>();
  for (const user of previous.filter((u) => u.source === "findmi")) {
    prevByKey.set(user.id, user);
    if (user.findMiId) prevByKey.set(`id:${user.findMiId}`, user);
    if (user.email) prevByKey.set(`email:${user.email.toLowerCase()}`, user);
  }

  const nextKeys = new Set<string>();
  let added = 0;
  let updated = 0;
  let unchanged = 0;

  for (const user of next) {
    nextKeys.add(user.id);
    if (user.findMiId) nextKeys.add(`id:${user.findMiId}`);

    const before =
      prevByKey.get(user.id) ||
      (user.findMiId ? prevByKey.get(`id:${user.findMiId}`) : undefined) ||
      (user.email
        ? prevByKey.get(`email:${user.email.toLowerCase()}`)
        : undefined);

    if (!before) {
      added += 1;
      continue;
    }

    const changed =
      OVERRIDE_COMPARE_FIELDS.some((key) => before[key] !== user[key]) ||
      before.findMiRole !== user.findMiRole;
    if (changed) updated += 1;
    else unchanged += 1;
  }

  const prevIds = new Set(
    previous.filter((u) => u.source === "findmi").map((u) => u.findMiId || u.id),
  );
  const nextIds = new Set(next.map((u) => u.findMiId || u.id));
  let removed = 0;
  for (const id of prevIds) {
    if (!nextIds.has(id)) removed += 1;
  }

  return { added, removed, updated, unchanged };
}
