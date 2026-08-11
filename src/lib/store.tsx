"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createInitialState } from "./demo-data";
import {
  applyDirectoryOverrides,
  diffFindMiDirectory,
  pruneDirectoryOverrides,
} from "./findmi";
import type {
  AppSettings,
  AppState,
  Campaign,
  DirectoryUser,
  FindMiStoreRecord,
  Role,
  SignatureTemplate,
} from "./types";

const STORAGE_KEY = "dpm-email-signatures:v5";

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
];

interface StoreContextValue extends AppState {
  hydrated: boolean;
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

function loadState(): AppState {
  if (typeof window === "undefined") return createInitialState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
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
      users: (parsed.users ?? []).filter((u) => u.source !== "sample"),
      stores: parsed.stores ?? [],
      findMiOverrides: parsed.findMiOverrides ?? {},
      settings: {
        ...base.settings,
        ...parsed.settings,
        findMiConnected: parsed.settings?.findMiConnected ?? false,
        azureClientId: parsed.settings?.azureClientId ?? "",
        azureOrgDomain: parsed.settings?.azureOrgDomain ?? "",
        exchangeAppConsented: parsed.settings?.exchangeAppConsented ?? false,
        exchangeRbacAssigned: parsed.settings?.exchangeRbacAssigned ?? false,
        deployMode,
      },
    };
  } catch {
    return createInitialState();
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(createInitialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const setRole = useCallback((role: Role) => {
    setState((s) => ({ ...s, settings: { ...s.settings, role } }));
  }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
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
    const fresh = createInitialState();
    setState(fresh);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  }, []);

  const role = state.settings.role;
  const canManageSignatures = role === "admin" || role === "it";
  const canManageCampaigns =
    role === "admin" || role === "marketing" || role === "it";
  const canDeploy = role === "admin" || role === "it";

  const value = useMemo<StoreContextValue>(
    () => ({
      ...state,
      hydrated,
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
