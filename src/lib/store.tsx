"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createInitialState } from "./demo-data";
import { isDepartment, mapFindMiDepartment } from "./departments";
import {
  applyDirectoryOverrides,
  diffFindMiDirectory,
  pruneDirectoryOverrides,
} from "./findmi";
import {
  DEFAULT_LOGO_WIDTH,
  DEFAULT_SIGNATURE_FONT_SIZE,
  resolveFontSize,
  resolveLogoWidth,
} from "./fonts";
import type {
  AppSettings,
  AppState,
  Campaign,
  Department,
  DirectoryUser,
  FindMiStoreRecord,
  Role,
  SignatureTemplate,
} from "./types";

const STORAGE_KEY = "dpm-email-signatures:v5";
const SAVE_DEBOUNCE_MS = 400;
const POLL_INTERVAL_MS = 30_000;

function normalizeUserDepartment(user: DirectoryUser): DirectoryUser {
  if (isDepartment(user.department) && user.department !== "All") {
    return user;
  }
  // Migrate legacy demo departments.
  const legacy = String(user.department || "");
  if (legacy === "Sales" || legacy === "Support") {
    return { ...user, department: "Operations" };
  }
  if (legacy === "Engineering") {
    return { ...user, department: "Development" };
  }
  return {
    ...user,
    department: mapFindMiDepartment(legacy, user.findMiRole || "other"),
  };
}

function normalizeDepartmentList(values: Department[] | undefined): Department[] {
  if (!values?.length) return ["All"];
  const next = values
    .map((d) => {
      if (isDepartment(d)) return d;
      if (d === ("Sales" as Department) || d === ("Support" as Department)) {
        return "Operations" as Department;
      }
      if (d === ("Engineering" as Department)) return "Development" as Department;
      return null;
    })
    .filter((d): d is Department => Boolean(d));
  return next.length ? next : ["All"];
}

/** Fields editable in the FindMi UI that can become local overrides. */
const EDITABLE_OVERRIDE_FIELDS: (keyof DirectoryUser)[] = [
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

type SharedSyncStatus = "idle" | "syncing" | "saved" | "error" | "local-only";

interface StoreContextValue extends AppState {
  hydrated: boolean;
  sharedRevision: number;
  sharedSyncStatus: SharedSyncStatus;
  sharedSyncError: string | null;
  sharedUpdatedAt: string | null;
  setRole: (role: Role) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  upsertTemplate: (template: SignatureTemplate) => void;
  deleteTemplate: (id: string) => void;
  upsertCampaign: (campaign: Campaign) => void;
  deleteCampaign: (id: string) => void;
  updateUser: (user: DirectoryUser) => void;
  clearFindMiOverrides: (userId: string) => void;
  syncDirectory: () => void;
  syncFindMiStores: () => Promise<{
    count: number;
    counts: Record<string, number>;
    added: number;
    removed: number;
    updated: number;
    localEditsKept: number;
    syncedAt: string;
  }>;
  applyFindMiSync: (payload: {
    stores: FindMiStoreRecord[];
    users: DirectoryUser[];
  }) => void;
  markDeployed: () => void;
  recordCampaignView: (id: string) => void;
  recordCampaignClick: (id: string) => void;
  resetDemo: () => void;
  canManageSignatures: boolean;
  canManageCampaigns: boolean;
  canDeploy: boolean;
}

const StoreContext = createContext<StoreContextValue | null>(null);

function normalizeState(parsed: Partial<AppState>): AppState {
  const base = createInitialState();
  const legacyMode = parsed.settings?.deployMode as string | undefined;
  const deployMode =
    legacyMode === "export-script" ||
    legacyMode === "publish-rule" ||
    legacyMode === "demo"
      ? legacyMode
      : legacyMode === "exchange-rule"
        ? "export-script"
        : "demo";

  return {
    ...base,
    ...parsed,
    users: (parsed.users ?? [])
      .filter((u) => u.source !== "sample")
      .map(normalizeUserDepartment),
    stores: parsed.stores ?? [],
    findMiOverrides: parsed.findMiOverrides ?? {},
    templates: (parsed.templates ?? base.templates).map((t) => ({
      ...t,
      assignedDepartments: normalizeDepartmentList(t.assignedDepartments),
      fontSize: resolveFontSize(
        (t as SignatureTemplate).fontSize ?? DEFAULT_SIGNATURE_FONT_SIZE,
      ),
      logoWidth: resolveLogoWidth(
        (t as SignatureTemplate).logoWidth ?? DEFAULT_LOGO_WIDTH,
      ),
    })),
    campaigns: (parsed.campaigns ?? base.campaigns).map((c) => ({
      ...c,
      targetDepartments: normalizeDepartmentList(c.targetDepartments),
    })),
    settings: {
      ...base.settings,
      ...parsed.settings,
      findMiConnected: parsed.settings?.findMiConnected ?? false,
      azureClientId: parsed.settings?.azureClientId ?? "",
      azureOrgDomain: parsed.settings?.azureOrgDomain ?? "",
      exchangeAppConsented: parsed.settings?.exchangeAppConsented ?? false,
      exchangeRbacAssigned: parsed.settings?.exchangeRbacAssigned ?? false,
      deployMode,
      role: parsed.settings?.role ?? base.settings.role,
    },
  };
}

function loadLocalState(): AppState {
  if (typeof window === "undefined") return createInitialState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    return normalizeState(JSON.parse(raw) as Partial<AppState>);
  } catch {
    return createInitialState();
  }
}

function withLocalRole(state: AppState, role: Role): AppState {
  if (state.settings.role === role) return state;
  return {
    ...state,
    settings: { ...state.settings, role },
  };
}

function hasSeedableLocalData(state: AppState): boolean {
  return (
    state.users.length > 0 ||
    state.stores.length > 0 ||
    Object.keys(state.findMiOverrides).length > 0 ||
    Boolean(state.settings.lastFindMiSyncAt) ||
    Boolean(state.settings.lastDeployAt)
  );
}

/** Shared fields only — excludes per-browser role. */
function sharedSnapshot(state: AppState): string {
  const { role: _role, ...sharedSettings } = state.settings;
  return JSON.stringify({
    users: state.users,
    stores: state.stores,
    findMiOverrides: state.findMiOverrides,
    templates: state.templates,
    campaigns: state.campaigns,
    settings: sharedSettings,
  });
}

type StateApiResponse = {
  ok?: boolean;
  empty?: boolean;
  revision?: number;
  updatedAt?: string | null;
  updatedBy?: string | null;
  state?: AppState | null;
  error?: string;
  message?: string;
};

async function fetchSharedState(): Promise<StateApiResponse> {
  const res = await fetch(`/api/state?ts=${Date.now()}`, {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" },
  });
  const data = (await res.json().catch(() => ({}))) as StateApiResponse;
  return { ...data, ok: data.ok ?? res.ok };
}

async function putSharedState(
  state: AppState,
  revision: number,
): Promise<StateApiResponse> {
  const res = await fetch("/api/state", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state, revision }),
  });
  const data = (await res.json().catch(() => ({}))) as StateApiResponse;
  return { ...data, ok: data.ok ?? res.ok };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(createInitialState);
  const [hydrated, setHydrated] = useState(false);
  const [sharedRevision, setSharedRevision] = useState(0);
  const [sharedSyncStatus, setSharedSyncStatus] =
    useState<SharedSyncStatus>("idle");
  const [sharedSyncError, setSharedSyncError] = useState<string | null>(null);
  const [sharedUpdatedAt, setSharedUpdatedAt] = useState<string | null>(null);

  const stateRef = useRef(state);
  const revisionRef = useRef(0);
  const localRoleRef = useRef<Role>("admin");
  const hydratedRef = useRef(false);
  const sharedEnabledRef = useRef(false);
  const dirtyRef = useRef(false);
  const applyingRemoteRef = useRef(false);
  const skipInitialPersistRef = useRef(true);
  const lastSharedSnapshotRef = useRef("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    revisionRef.current = sharedRevision;
  }, [sharedRevision]);

  const applyRemoteState = useCallback((remote: AppState, meta: {
    revision: number;
    updatedAt?: string | null;
  }) => {
    applyingRemoteRef.current = true;
    const next = withLocalRole(normalizeState(remote), localRoleRef.current);
    setState(next);
    stateRef.current = next;
    lastSharedSnapshotRef.current = sharedSnapshot(next);
    setSharedRevision(meta.revision);
    revisionRef.current = meta.revision;
    setSharedUpdatedAt(meta.updatedAt ?? null);
    dirtyRef.current = false;
    queueMicrotask(() => {
      applyingRemoteRef.current = false;
    });
  }, []);

  const persistShared = useCallback(async () => {
    if (!sharedEnabledRef.current || !hydratedRef.current) return;
    if (savingRef.current) return;

    savingRef.current = true;
    setSharedSyncStatus("syncing");
    setSharedSyncError(null);

    try {
      const payload = stateRef.current;
      const result = await putSharedState(payload, revisionRef.current);
      if (!result.ok) {
        const message =
          result.message ||
          result.error ||
          "Failed to save shared workspace";
        if (result.error === "blob_not_configured") {
          sharedEnabledRef.current = false;
          setSharedSyncStatus("local-only");
        } else {
          setSharedSyncStatus("error");
        }
        setSharedSyncError(message);
        return;
      }

      const nextRevision = Number(result.revision ?? revisionRef.current + 1);
      setSharedRevision(nextRevision);
      revisionRef.current = nextRevision;
      setSharedUpdatedAt(result.updatedAt ?? new Date().toISOString());
      dirtyRef.current = false;
      lastSharedSnapshotRef.current = sharedSnapshot(payload);
      setSharedSyncStatus("saved");
      setSharedSyncError(null);
    } catch (error) {
      setSharedSyncStatus("error");
      setSharedSyncError(
        error instanceof Error ? error.message : "Failed to save shared workspace",
      );
    } finally {
      savingRef.current = false;
      if (dirtyRef.current && sharedEnabledRef.current) {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          void persistShared();
        }, SAVE_DEBOUNCE_MS);
      }
    }
  }, []);

  const scheduleSharedSave = useCallback(() => {
    if (!sharedEnabledRef.current || !hydratedRef.current) return;
    if (applyingRemoteRef.current) return;
    dirtyRef.current = true;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void persistShared();
    }, SAVE_DEBOUNCE_MS);
  }, [persistShared]);

  const refreshFromShared = useCallback(async () => {
    if (!sharedEnabledRef.current || !hydratedRef.current) return;
    if (dirtyRef.current || savingRef.current) return;

    try {
      const data = await fetchSharedState();
      if (!data.ok) {
        if (data.error === "blob_not_configured") {
          sharedEnabledRef.current = false;
          setSharedSyncStatus("local-only");
          setSharedSyncError(
            data.message || "Shared storage is not configured.",
          );
        }
        return;
      }
      if (data.empty || !data.state) return;

      const remoteRevision = Number(data.revision ?? 0);
      if (remoteRevision <= revisionRef.current) return;

      applyRemoteState(data.state, {
        revision: remoteRevision,
        updatedAt: data.updatedAt,
      });
      setSharedSyncStatus("saved");
      setSharedSyncError(null);
    } catch {
      // Keep working offline from local cache; next poll retries.
    }
  }, [applyRemoteState]);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const local = loadLocalState();
      localRoleRef.current = local.settings.role;

      // Show local cache immediately while shared fetch runs.
      setState(local);
      stateRef.current = local;

      try {
        const data = await fetchSharedState();
        if (cancelled) return;

        if (!data.ok && data.error === "blob_not_configured") {
          sharedEnabledRef.current = false;
          setSharedSyncStatus("local-only");
          setSharedSyncError(
            data.message ||
              "Shared storage is not configured. Set BLOB_READ_WRITE_TOKEN.",
          );
          hydratedRef.current = true;
          setHydrated(true);
          return;
        }

        if (!data.ok) {
          sharedEnabledRef.current = false;
          setSharedSyncStatus("error");
          setSharedSyncError(
            data.message || data.error || "Failed to load shared workspace",
          );
          hydratedRef.current = true;
          setHydrated(true);
          return;
        }

        sharedEnabledRef.current = true;

        if (data.empty || !data.state) {
          if (hasSeedableLocalData(local)) {
            setSharedSyncStatus("syncing");
            const seeded = await putSharedState(local, 0);
            if (cancelled) return;
            if (seeded.ok) {
              setSharedRevision(Number(seeded.revision ?? 1));
              revisionRef.current = Number(seeded.revision ?? 1);
              lastSharedSnapshotRef.current = sharedSnapshot(local);
              setSharedUpdatedAt(
                seeded.updatedAt ?? new Date().toISOString(),
              );
              setSharedSyncStatus("saved");
              setSharedSyncError(null);
            } else {
              setSharedSyncStatus("error");
              setSharedSyncError(
                seeded.message ||
                  seeded.error ||
                  "Failed to seed shared workspace",
              );
            }
          } else {
            setSharedRevision(0);
            revisionRef.current = 0;
            lastSharedSnapshotRef.current = sharedSnapshot(local);
            setSharedSyncStatus("saved");
            setSharedSyncError(null);
          }
        } else {
          applyRemoteState(data.state, {
            revision: Number(data.revision ?? 0),
            updatedAt: data.updatedAt,
          });
          setSharedSyncStatus("saved");
          setSharedSyncError(null);
        }
      } catch (error) {
        if (cancelled) return;
        sharedEnabledRef.current = false;
        setSharedSyncStatus("error");
        setSharedSyncError(
          error instanceof Error
            ? error.message
            : "Failed to load shared workspace",
        );
      } finally {
        if (!cancelled) {
          hydratedRef.current = true;
          setHydrated(true);
        }
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [applyRemoteState]);

  // Cache mirror + schedule shared save (skip role-only / post-hydrate passes).
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localRoleRef.current = state.settings.role;
    if (applyingRemoteRef.current) return;
    if (skipInitialPersistRef.current) {
      skipInitialPersistRef.current = false;
      if (!lastSharedSnapshotRef.current) {
        lastSharedSnapshotRef.current = sharedSnapshot(state);
      }
      return;
    }
    const snapshot = sharedSnapshot(state);
    if (snapshot === lastSharedSnapshotRef.current) return;
    scheduleSharedSave();
  }, [state, hydrated, scheduleSharedSave]);

  // Focus + interval poll for cross-user updates.
  useEffect(() => {
    if (!hydrated) return;

    const onFocus = () => {
      void refreshFromShared();
    };
    window.addEventListener("focus", onFocus);
    const interval = window.setInterval(() => {
      void refreshFromShared();
    }, POLL_INTERVAL_MS);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(interval);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [hydrated, refreshFromShared]);

  const setRole = useCallback((role: Role) => {
    localRoleRef.current = role;
    setState((s) => ({ ...s, settings: { ...s.settings, role } }));
  }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    if (patch.role) localRoleRef.current = patch.role;
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  }, []);

  const upsertTemplate = useCallback((template: SignatureTemplate) => {
    setState((s) => {
      const exists = s.templates.some((t) => t.id === template.id);
      return {
        ...s,
        templates: exists
          ? s.templates.map((t) => (t.id === template.id ? template : t))
          : [...s.templates, template],
      };
    });
  }, []);

  const deleteTemplate = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      templates: s.templates.filter((t) => t.id !== id),
      users: s.users.map((u) =>
        u.signatureId === id ? { ...u, signatureId: undefined } : u,
      ),
    }));
  }, []);

  const upsertCampaign = useCallback((campaign: Campaign) => {
    setState((s) => {
      const exists = s.campaigns.some((c) => c.id === campaign.id);
      return {
        ...s,
        campaigns: exists
          ? s.campaigns.map((c) => (c.id === campaign.id ? campaign : c))
          : [...s.campaigns, campaign],
      };
    });
  }, []);

  const deleteCampaign = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      campaigns: s.campaigns.filter((c) => c.id !== id),
      templates: s.templates.map((t) =>
        t.campaignId === id ? { ...t, campaignId: undefined } : t,
      ),
    }));
  }, []);

  const updateUser = useCallback((user: DirectoryUser) => {
    setState((s) => {
      const previous = s.users.find((u) => u.id === user.id);
      const nextUsers = s.users.map((u) => (u.id === user.id ? user : u));

      if (!previous || previous.source !== "findmi") {
        return { ...s, users: nextUsers };
      }

      // Signature template assignment is app-side — keep it on the user, not as FindMi override.
      const signatureChanged = user.signatureId !== previous.signatureId;
      const patch: Partial<DirectoryUser> = {
        ...(s.findMiOverrides[user.id] || {}),
      };
      // Never persist signatureId inside FindMi override blobs.
      delete (patch as { signatureId?: string }).signatureId;

      let fieldChanged = false;
      for (const key of EDITABLE_OVERRIDE_FIELDS) {
        const value = user[key];
        if (value !== previous[key]) {
          (patch as Record<string, unknown>)[key] = value;
          fieldChanged = true;
        }
      }

      if (!fieldChanged && !signatureChanged) {
        return { ...s, users: nextUsers };
      }

      const hasOverrideFields = EDITABLE_OVERRIDE_FIELDS.some(
        (key) => key in patch,
      );

      return {
        ...s,
        users: nextUsers.map((u) =>
          u.id === user.id
            ? { ...u, editedLocally: hasOverrideFields || u.editedLocally }
            : u,
        ),
        findMiOverrides: hasOverrideFields
          ? {
              ...s.findMiOverrides,
              [user.id]: patch,
            }
          : s.findMiOverrides,
      };
    });
  }, []);

  const clearFindMiOverrides = useCallback((userId: string) => {
    setState((s) => {
      const { [userId]: _removed, ...rest } = s.findMiOverrides;
      return {
        ...s,
        findMiOverrides: rest,
        users: s.users.map((u) =>
          u.id === userId ? { ...u, editedLocally: false } : u,
        ),
      };
    });
  }, []);

  const applyFindMiSync = useCallback(
    (payload: { stores: FindMiStoreRecord[]; users: DirectoryUser[] }) => {
      let syncStats = {
        added: 0,
        removed: 0,
        updated: 0,
        localEditsKept: 0,
      };

      setState((s) => {
        const defaultSig =
          s.templates.find((t) => t.id === "t-dossani")?.id ||
          s.templates[0]?.id ||
          "t-dossani";

        const previousFindMi = s.users.filter((u) => u.source === "findmi");
        const previousById = new Map(
          previousFindMi.map((u) => [u.id, u] as const),
        );
        const previousByFindMiId = new Map(
          previousFindMi
            .filter((u) => u.findMiId)
            .map((u) => [u.findMiId!, u] as const),
        );
        const previousByEmail = new Map(
          previousFindMi
            .filter((u) => u.email)
            .map((u) => [u.email.toLowerCase(), u] as const),
        );

        // Fresh FindMi payload for every store/person (full refresh).
        const refreshed = payload.users.map((mapped) => {
          const prior =
            previousById.get(mapped.id) ||
            (mapped.findMiId
              ? previousByFindMiId.get(mapped.findMiId)
              : undefined) ||
            (mapped.email
              ? previousByEmail.get(mapped.email.toLowerCase())
              : undefined);
          return {
            ...mapped,
            signatureId:
              prior?.signatureId || mapped.signatureId || defaultSig,
          };
        });

        const diff = diffFindMiDirectory(previousFindMi, refreshed);
        const prunedOverrides = pruneDirectoryOverrides(
          refreshed,
          s.findMiOverrides,
        );
        const withOverrides = applyDirectoryOverrides(
          refreshed,
          prunedOverrides,
        );
        const nonFindMi = s.users.filter((u) => u.source !== "findmi");

        syncStats = {
          added: diff.added,
          removed: diff.removed,
          updated: diff.updated,
          localEditsKept: Object.keys(prunedOverrides).length,
        };

        return {
          ...s,
          stores: payload.stores,
          users: [...withOverrides, ...nonFindMi],
          findMiOverrides: prunedOverrides,
          settings: {
            ...s.settings,
            findMiConnected: true,
            lastFindMiSyncAt: new Date().toISOString(),
            lastSyncAt: new Date().toISOString(),
          },
        };
      });

      return syncStats;
    },
    [],
  );

  const syncFindMiStores = useCallback(async () => {
    const res = await fetch(`/api/findmi/stores?ts=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "FindMi sync failed");
    }
    const stats = applyFindMiSync({
      stores: data.stores as FindMiStoreRecord[],
      users: data.users as DirectoryUser[],
    });
    return {
      count: data.count as number,
      counts: (data.counts || {}) as Record<string, number>,
      added: stats.added,
      removed: stats.removed,
      updated: stats.updated,
      localEditsKept: stats.localEditsKept,
      syncedAt: String(data.syncedAt || new Date().toISOString()),
    };
  }, [applyFindMiSync]);

  const syncDirectory = useCallback(() => {
    void syncFindMiStores();
  }, [syncFindMiStores]);

  const markDeployed = useCallback(() => {
    setState((s) => ({
      ...s,
      settings: { ...s.settings, lastDeployAt: new Date().toISOString() },
    }));
  }, []);

  const recordCampaignView = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      campaigns: s.campaigns.map((c) =>
        c.id === id ? { ...c, views: c.views + 1 } : c,
      ),
    }));
  }, []);

  const recordCampaignClick = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      campaigns: s.campaigns.map((c) =>
        c.id === id ? { ...c, clicks: c.clicks + 1 } : c,
      ),
    }));
  }, []);

  const resetDemo = useCallback(() => {
    const fresh = withLocalRole(createInitialState(), localRoleRef.current);
    applyingRemoteRef.current = true;
    setState(fresh);
    stateRef.current = fresh;
    lastSharedSnapshotRef.current = "";
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    queueMicrotask(() => {
      applyingRemoteRef.current = false;
      dirtyRef.current = true;
      void persistShared();
    });
  }, [persistShared]);

  const role = state.settings.role;
  const canManageSignatures = role === "admin" || role === "it";
  const canManageCampaigns =
    role === "admin" || role === "marketing" || role === "it";
  const canDeploy = role === "admin" || role === "it";

  const value = useMemo<StoreContextValue>(
    () => ({
      ...state,
      hydrated,
      sharedRevision,
      sharedSyncStatus,
      sharedSyncError,
      sharedUpdatedAt,
      setRole,
      updateSettings,
      upsertTemplate,
      deleteTemplate,
      upsertCampaign,
      deleteCampaign,
      updateUser,
      clearFindMiOverrides,
      syncDirectory,
      syncFindMiStores,
      applyFindMiSync,
      markDeployed,
      recordCampaignView,
      recordCampaignClick,
      resetDemo,
      canManageSignatures,
      canManageCampaigns,
      canDeploy,
    }),
    [
      state,
      hydrated,
      sharedRevision,
      sharedSyncStatus,
      sharedSyncError,
      sharedUpdatedAt,
      setRole,
      updateSettings,
      upsertTemplate,
      deleteTemplate,
      upsertCampaign,
      deleteCampaign,
      updateUser,
      clearFindMiOverrides,
      syncDirectory,
      syncFindMiStores,
      applyFindMiSync,
      markDeployed,
      recordCampaignView,
      recordCampaignClick,
      resetDemo,
      canManageSignatures,
      canManageCampaigns,
      canDeploy,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
