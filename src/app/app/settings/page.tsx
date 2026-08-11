"use client";

import { useEffect, useState } from "react";
import { COMPANY_NAME } from "@/lib/constants";
import { useStore } from "@/lib/store";

type HostStatus = {
  hasAzure: boolean;
  hasTenantId: boolean;
  hasClientId: boolean;
  hasClientSecret: boolean;
  hasOrgDomain: boolean;
  hasAppUrl: boolean;
  publishMode: "live" | "script-only";
  missing: string[];
  message: string;
  ruleName?: string;
};

const RUNBOOK_URL =
  "https://github.com/kairukun/bulk-signature-creation/blob/main/docs/DPM-M365-SIGNATURE-RUNBOOK.md";

const VERCEL_ENV_URL =
  "https://vercel.com/dossani/bulk-signature-creation/settings/environment-variables";

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span className={`badge ${ok ? "ok" : ""}`} style={{ marginRight: "0.4rem" }}>
      {ok ? "Ready" : "Needed"}
    </span>
  );
}

export default function SettingsPage() {
  const { settings, updateSettings, resetDemo, canDeploy, hydrated } =
    useStore();
  const [saved, setSaved] = useState(false);
  const [host, setHost] = useState<HostStatus | null>(null);
  const [hostError, setHostError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  async function refreshHostStatus() {
    setRefreshing(true);
    setHostError("");
    try {
      const res = await fetch("/api/deploy", { cache: "no-store" });
      const data = (await res.json()) as HostStatus;
      if (!res.ok) {
        setHostError("Could not read host Azure status.");
        return;
      }
      setHost(data);
      if (data.hasAzure && !settings.m365Connected) {
        updateSettings({ m365Connected: true });
      }
    } catch {
      setHostError("Could not reach /api/deploy status.");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void refreshHostStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  if (!hydrated) return <p className="muted">Loading…</p>;

  const checklistReady =
    Boolean(settings.tenantId.trim()) &&
    Boolean(settings.azureClientId.trim()) &&
    settings.exchangeAppConsented &&
    settings.exchangeRbacAssigned &&
    Boolean(host?.hasAzure);

  function saveLocal() {
    updateSettings({
      m365Connected: Boolean(host?.hasAzure) || settings.m365Connected,
    });
    setSaved(true);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Microsoft 365 setup</h1>
          <p>
            Wire {COMPANY_NAME} Entra ID + Exchange Online so Deploy can publish
            the <code>DPM-Corporate-Signature</code> transport rule — or fall
            back to PowerShell script download.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={refreshing}
          onClick={() => void refreshHostStatus()}
        >
          {refreshing ? "Checking…" : "Refresh host status"}
        </button>
      </div>

      {saved ? <p className="toast">Saved in this browser.</p> : null}
      {hostError ? (
        <p className="badge" style={{ marginBottom: "1rem" }}>
          {hostError}
        </p>
      ) : null}

      <section className="panel-card" style={{ marginBottom: "1rem" }}>
        <h3>Live publish status (host / Vercel)</h3>
        <p className="muted" style={{ marginTop: "0.5rem" }}>
          Secrets never leave the server. This reads which{" "}
          <code>AZURE_AD_*</code> env vars are set on the running host.
        </p>
        {host ? (
          <>
            <p style={{ marginTop: "0.85rem" }}>
              Mode:{" "}
              <span className={`badge ${host.hasAzure ? "ok" : ""}`}>
                {host.hasAzure ? "Live publish ready" : "Script download only"}
              </span>
            </p>
            <p className="muted" style={{ marginTop: "0.45rem" }}>
              {host.message}
            </p>
            <ul
              style={{
                marginTop: "0.85rem",
                paddingLeft: "0",
                listStyle: "none",
                color: "var(--muted)",
                lineHeight: 1.7,
              }}
            >
              <li>
                <StatusDot ok={host.hasTenantId} />
                <code>AZURE_AD_TENANT_ID</code>
              </li>
              <li>
                <StatusDot ok={host.hasClientId} />
                <code>AZURE_AD_CLIENT_ID</code>
              </li>
              <li>
                <StatusDot ok={host.hasClientSecret} />
                <code>AZURE_AD_CLIENT_SECRET</code>
              </li>
              <li>
                <StatusDot ok={host.hasOrgDomain} />
                <code>AZURE_AD_ORG_DOMAIN</code> (optional)
              </li>
              <li>
                <StatusDot ok={host.hasAppUrl} />
                <code>NEXT_PUBLIC_APP_URL</code>
              </li>
            </ul>
            {host.missing.length ? (
              <p className="muted" style={{ marginTop: "0.75rem" }}>
                Still missing on host: {host.missing.join(", ")}. Add them in{" "}
                <a
                  href={VERCEL_ENV_URL}
                  target="_blank"
                  rel="noreferrer"
                  style={{ textDecoration: "underline" }}
                >
                  Vercel → Environment Variables
                </a>
                , then redeploy and refresh.
              </p>
            ) : (
              <p className="muted" style={{ marginTop: "0.75rem" }}>
                Host credentials look complete. You still need Entra app
                permission + Exchange RBAC (checklist below) for publish to
                succeed against the tenant.
              </p>
            )}
          </>
        ) : (
          <p className="muted" style={{ marginTop: "0.75rem" }}>
            Checking host…
          </p>
        )}
      </section>

      <div className="split">
        <section className="panel-card">
          <h3>1. Organization &amp; app registration</h3>
          <p className="muted" style={{ marginTop: "0.5rem" }}>
            Record non-secret IDs here for IT reference. Put the client secret
            only in Vercel — never in this browser.
          </p>
          <div className="field" style={{ marginTop: "0.75rem" }}>
            <label htmlFor="company">Company</label>
            <input id="company" value={COMPANY_NAME} disabled readOnly />
          </div>
          <div className="field">
            <label htmlFor="tenant">Entra tenant ID</label>
            <input
              id="tenant"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={settings.tenantId}
              disabled={!canDeploy}
              onChange={(e) => updateSettings({ tenantId: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="clientId">App registration client ID</label>
            <input
              id="clientId"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={settings.azureClientId}
              disabled={!canDeploy}
              onChange={(e) =>
                updateSettings({ azureClientId: e.target.value })
              }
            />
          </div>
          <div className="field">
            <label htmlFor="orgDomain">
              Org domain (optional routing hint)
            </label>
            <input
              id="orgDomain"
              placeholder="dossani….onmicrosoft.com"
              value={settings.azureOrgDomain}
              disabled={!canDeploy}
              onChange={(e) =>
                updateSettings({ azureOrgDomain: e.target.value })
              }
            />
          </div>
          <label style={{ display: "block", marginTop: "0.75rem" }}>
            <input
              type="checkbox"
              checked={settings.m365Connected}
              disabled={!canDeploy}
              onChange={(e) =>
                updateSettings({ m365Connected: e.target.checked })
              }
            />{" "}
            Mark tenant connection configured in this browser
          </label>
          <div style={{ marginTop: "1rem" }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canDeploy}
              onClick={saveLocal}
            >
              Save local notes
            </button>
          </div>
        </section>

        <section className="panel-card">
          <h3>2. Entra + Exchange permissions</h3>
          <p className="muted" style={{ marginTop: "0.5rem" }}>
            Required for <strong>Publish rule</strong>. Script-only deploy can
            skip this and run PowerShell as an Exchange admin instead.
          </p>
          <ol
            style={{
              color: "var(--muted)",
              lineHeight: 1.65,
              paddingLeft: "1.1rem",
              marginTop: "0.75rem",
            }}
          >
            <li>
              Entra → App registrations → create (or open){" "}
              <strong>DPM Email Signatures</strong>
            </li>
            <li>
              API permissions → Office 365 Exchange Online → Application →{" "}
              <code>Exchange.ManageAsApp</code> or{" "}
              <code>Exchange.ManageAsAppV2</code>
            </li>
            <li>Grant admin consent for the DPM tenant</li>
            <li>
              Assign Exchange RBAC to the app’s service principal (e.g.
              Organization Management / Exchange Administrator)
            </li>
            <li>
              Create a client secret; set it as{" "}
              <code>AZURE_AD_CLIENT_SECRET</code> on Vercel (Production)
            </li>
          </ol>
          <label style={{ display: "block", marginTop: "0.85rem" }}>
            <input
              type="checkbox"
              checked={settings.exchangeAppConsented}
              disabled={!canDeploy}
              onChange={(e) =>
                updateSettings({ exchangeAppConsented: e.target.checked })
              }
            />{" "}
            Exchange.ManageAsApp consented
          </label>
          <label style={{ display: "block", marginTop: "0.5rem" }}>
            <input
              type="checkbox"
              checked={settings.exchangeRbacAssigned}
              disabled={!canDeploy}
              onChange={(e) =>
                updateSettings({ exchangeRbacAssigned: e.target.checked })
              }
            />{" "}
            Exchange RBAC assigned to service principal
          </label>
          <p className="muted" style={{ marginTop: "0.85rem" }}>
            Full cmdlets and rollback:{" "}
            <a
              href={RUNBOOK_URL}
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: "underline" }}
            >
              DPM M365 signature runbook
            </a>
          </p>
        </section>
      </div>

      <div className="split" style={{ marginTop: "1rem" }}>
        <section className="panel-card">
          <h3>3. Host environment variables</h3>
          <p className="muted" style={{ marginTop: "0.5rem" }}>
            Set these on the Vercel project for DPM (Production + Preview if you
            test previews), then redeploy:
          </p>
          <pre
            style={{
              marginTop: "0.75rem",
              padding: "0.9rem",
              background: "#0f172a",
              color: "#e2e8f0",
              borderRadius: "12px",
              overflowX: "auto",
              fontSize: "0.8rem",
              lineHeight: 1.5,
            }}
          >{`AZURE_AD_TENANT_ID=${settings.tenantId || "<dpm-tenant-id>"}
AZURE_AD_CLIENT_ID=${settings.azureClientId || "<app-registration-id>"}
AZURE_AD_CLIENT_SECRET=<secret — Vercel only>
AZURE_AD_ORG_DOMAIN=${settings.azureOrgDomain || "<optional contoso.onmicrosoft.com>"}
NEXT_PUBLIC_APP_URL=https://bulk-signature-creation.vercel.app`}</pre>
          <p style={{ marginTop: "0.85rem" }}>
            <a
              href={VERCEL_ENV_URL}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary"
              style={{ display: "inline-block", textDecoration: "none" }}
            >
              Open Vercel env settings
            </a>
          </p>
          <p className="muted" style={{ marginTop: "0.75rem" }}>
            After saving env vars, trigger a production redeploy, then click{" "}
            <strong>Refresh host status</strong> above.
          </p>
        </section>

        <section className="panel-card">
          <h3>4. FindMi + go-live checklist</h3>
          <p className="muted" style={{ marginTop: "0.5rem" }}>
            Directory sync is separate from Azure publish, but both are needed
            for a real deploy package.
          </p>
          <p style={{ marginTop: "0.75rem" }}>
            FindMi:{" "}
            <span className={`badge ${settings.findMiConnected ? "ok" : ""}`}>
              {settings.findMiConnected ? "Synced" : "Not synced"}
            </span>
          </p>
          <p className="muted" style={{ marginTop: "0.35rem" }}>
            Last sync:{" "}
            {settings.lastFindMiSyncAt
              ? new Date(settings.lastFindMiSyncAt).toLocaleString()
              : "Never"}{" "}
            · Source:{" "}
            <a
              href="https://dossaniparadise.github.io/DPM-FindMi/"
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: "underline" }}
            >
              DPM FindMi
            </a>
          </p>
          <ul
            style={{
              marginTop: "0.85rem",
              paddingLeft: "1.1rem",
              color: "var(--muted)",
              lineHeight: 1.65,
            }}
          >
            <li>
              Tenant / client IDs noted:{" "}
              {settings.tenantId && settings.azureClientId ? "yes" : "no"}
            </li>
            <li>
              Host AZURE_AD_* complete: {host?.hasAzure ? "yes" : "no"}
            </li>
            <li>
              App consent + RBAC checked:{" "}
              {settings.exchangeAppConsented && settings.exchangeRbacAssigned
                ? "yes"
                : "no"}
            </li>
            <li>
              Ready to try live publish: {checklistReady ? "yes" : "not yet"}
            </li>
          </ul>
          <p className="muted" style={{ marginTop: "0.75rem" }}>
            Next: open <a href="/app/deploy">Deploy</a> → Publish rule (or
            download the script if host status is still script-only).
          </p>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ marginTop: "1rem" }}
            onClick={() => {
              resetDemo();
              setSaved(false);
            }}
          >
            Reset sample people &amp; templates
          </button>
        </section>
      </div>

      {!canDeploy ? (
        <p className="badge" style={{ marginTop: "1rem" }}>
          Only Admin / IT roles can edit M365 setup.
        </p>
      ) : null}
    </div>
  );
}
