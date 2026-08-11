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
import type {
  AppSettings,
  AppState,
  Campaign,
  DirectoryUser,
  Role,
  SignatureTemplate,
} from "./types";

const STORAGE_KEY = "bulk-signature-creation:v1";

interface StoreContextValue extends AppState {
  hydrated: boolean;
  setRole: (role: Role) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  upsertTemplate: (template: SignatureTemplate) => void;
  deleteTemplate: (id: string) => void;
  upsertCampaign: (campaign: Campaign) => void;
  deleteCampaign: (id: string) => void;
  updateUser: (user: DirectoryUser) => void;
  syncDirectory: () => void;
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
    return { ...createInitialState(), ...JSON.parse(raw) } as AppState;
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
    setState((s) => ({
      ...s,
      users: s.users.map((u) => (u.id === user.id ? user : u)),
    }));
  }, []);

  const syncDirectory = useCallback(() => {
    setState((s) => ({
      ...s,
      settings: {
        ...s.settings,
        lastSyncAt: new Date().toISOString(),
        m365Connected: s.settings.m365Connected || true,
      },
    }));
  }, []);

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
  const canManageCampaigns = role === "admin" || role === "marketing" || role === "it";
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
      syncDirectory,
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
      syncDirectory,
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
