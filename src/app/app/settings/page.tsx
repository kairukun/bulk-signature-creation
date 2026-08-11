"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";

export default function SettingsPage() {
  const { settings, updateSettings, resetDemo, canDeploy, hydrated } = useStore();
  const [saved, setSaved] = useState(false);

  if (!hydrated) return <p className="muted">Loading…</p>;

  function save() {
    setSaved(true);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Company profile, Microsoft 365 connection, and workspace reset.</p>
        </div>
      </div>

      {saved ? <p className="toast">Settings updated in this browser.</p> : null}

      <div className="split">
        <section className="panel-card">
          <h3>Company</h3>
          <div className="field" style={{ marginTop: "0.75rem" }}>
            <label htmlFor="company">Company name</label>
            <input
              id="company"
              value={settings.companyName}
              disabled={!canDeploy}
              onChange={(e) => updateSettings({ companyName: e.target.value })}
            />
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
            Mark Microsoft 365 as connected (demo toggle)
          </label>
          <div style={{ marginTop: "1rem" }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canDeploy}
              onClick={save}
            >
              Save settings
            </button>
          </div>
        </section>

        <section className="panel-card">
          <h3>Environment variables</h3>
          <p className="muted" style={{ marginTop: "0.5rem" }}>
            For live Graph sync / Exchange deploy, configure these on Vercel or
            your host:
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
          >{`AZURE_AD_TENANT_ID=
AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=
NEXT_PUBLIC_APP_URL=`}</pre>
          <p className="muted" style={{ marginTop: "0.75rem" }}>
            Current role switcher is in the sidebar so you can test Admin, IT,
            Marketing, and Viewer permissions.
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
            Reset demo data
          </button>
        </section>
      </div>
    </div>
  );
}
