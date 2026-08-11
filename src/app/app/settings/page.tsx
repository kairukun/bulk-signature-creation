"use client";

import { useState } from "react";
import { COMPANY_NAME } from "@/lib/constants";
import { useStore } from "@/lib/store";

export default function SettingsPage() {
  const { settings, updateSettings, resetDemo, canDeploy, hydrated } = useStore();
  const [saved, setSaved] = useState(false);

  if (!hydrated) return <p className="muted">Loading…</p>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Microsoft 365 setup</h1>
          <p>
            Connect this internal tool to the {COMPANY_NAME} Entra ID / Exchange
            Online tenant. Not a multi-company product — one tenant only.
          </p>
        </div>
      </div>

      {saved ? <p className="toast">Saved in this browser.</p> : null}

      <div className="split">
        <section className="panel-card">
          <h3>Organization</h3>
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
          <label>
            <input
              type="checkbox"
              checked={settings.m365Connected}
              disabled={!canDeploy}
              onChange={(e) =>
                updateSettings({ m365Connected: e.target.checked })
              }
            />{" "}
            Tenant connection configured (toggle until live Graph auth is wired)
          </label>
          <div style={{ marginTop: "1rem" }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canDeploy}
              onClick={() => setSaved(true)}
            >
              Save
            </button>
          </div>
        </section>

        <section className="panel-card">
          <h3>FindMi data source</h3>
          <p className="muted" style={{ marginTop: "0.5rem" }}>
            Store signatures pull name, address, phone, and email from{" "}
            <a
              href="https://dossaniparadise.github.io/DPM-FindMi/"
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: "underline" }}
            >
              DPM FindMi
            </a>
            .
          </p>
          <p className="muted" style={{ marginTop: "0.5rem" }}>
            API:{" "}
            <code style={{ fontSize: "0.78rem" }}>
              alignment-api-khaki.vercel.app/api/dpm-alignment
            </code>
          </p>
          <p style={{ marginTop: "0.75rem" }}>
            Status:{" "}
            <span className={`badge ${settings.findMiConnected ? "ok" : ""}`}>
              {settings.findMiConnected ? "Synced" : "Not synced"}
            </span>
          </p>
          <p className="muted" style={{ marginTop: "0.35rem" }}>
            Last sync:{" "}
            {settings.lastFindMiSyncAt
              ? new Date(settings.lastFindMiSyncAt).toLocaleString()
              : "Never"}
          </p>
        </section>

        <section className="panel-card">
          <h3>Host environment</h3>
          <p className="muted" style={{ marginTop: "0.5rem" }}>
            Set these on the server that runs this app (e.g. Vercel project for
            DPM only):
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
          >{`AZURE_AD_TENANT_ID=<dpm-tenant-id>
AZURE_AD_CLIENT_ID=<app-registration-id>
AZURE_AD_CLIENT_SECRET=<secret>
AZURE_AD_ORG_DOMAIN=<optional contoso.onmicrosoft.com>
NEXT_PUBLIC_APP_URL=<this-app-url>`}</pre>
          <p className="muted" style={{ marginTop: "0.75rem" }}>
            For live transport-rule publish: grant the app{" "}
            <code>Exchange.ManageAsApp</code> (Office 365 Exchange Online), admin
            consent, and an Exchange RBAC role on the service principal (e.g.
            Exchange Administrator). Without these, Deploy stays script-download
            only. Full steps:{" "}
            <a
              href="https://github.com/kairukun/bulk-signature-creation/blob/main/docs/DPM-M365-SIGNATURE-RUNBOOK.md"
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: "underline" }}
            >
              DPM M365 signature runbook
            </a>
            .
          </p>
          <p className="muted" style={{ marginTop: "0.75rem" }}>
            Use the sidebar access menu to preview IT vs Marketing permissions
            for DPM staff.
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
    </div>
  );
}
