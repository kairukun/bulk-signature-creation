"use client";

import { useMemo, useState } from "react";
import {
  renderSignatureHtml,
  resolveTemplateForUser,
} from "@/lib/render-signature";
import { useStore } from "@/lib/store";

export default function DeployPage() {
  const {
    users,
    templates,
    campaigns,
    settings,
    updateSettings,
    markDeployed,
    canDeploy,
    hydrated,
  } = useStore();
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const selectedUser = users.find((u) => u.id === selectedUserId) ?? users[0];
  const template = selectedUser
    ? resolveTemplateForUser(selectedUser, templates)
    : undefined;
  const campaign = template
    ? campaigns.find((c) => c.id === template.campaignId)
    : undefined;

  const html = useMemo(() => {
    if (!selectedUser || !template) return "";
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    return renderSignatureHtml({
      user: selectedUser,
      template,
      campaign,
      origin,
    });
  }, [selectedUser, template, campaign]);

  if (!hydrated) return <p className="muted">Loading…</p>;

  async function deployAll() {
    if (!canDeploy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: settings.deployMode,
          userCount: users.length,
          templateCount: templates.length,
        }),
      });
      const data = await res.json();
      markDeployed();
      setMessage(data.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Deploy</h1>
          <p>
            Push rendered HTML signatures to Microsoft 365. Demo mode simulates
            Exchange Online deployment.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={deployAll}
          disabled={!canDeploy || busy}
        >
          {busy ? "Deploying…" : "Deploy all signatures"}
        </button>
      </div>

      {!canDeploy ? (
        <p className="badge">Only Admin / IT roles can deploy.</p>
      ) : null}
      {message ? <p className="toast">{message}</p> : null}

      <div className="split">
        <section className="panel-card">
          <h3>Deployment mode</h3>
          <div className="field" style={{ marginTop: "0.75rem" }}>
            <label htmlFor="mode">Target</label>
            <select
              id="mode"
              value={settings.deployMode}
              disabled={!canDeploy}
              onChange={(e) =>
                updateSettings({
                  deployMode: e.target.value as typeof settings.deployMode,
                })
              }
            >
              <option value="demo">Demo simulation</option>
              <option value="exchange-rule">
                Exchange Online transport / disclaimer rule
              </option>
              <option value="outlook-roaming">
                Outlook roaming signatures (Graph)
              </option>
            </select>
          </div>
          <p className="muted">
            Last deploy:{" "}
            {settings.lastDeployAt
              ? new Date(settings.lastDeployAt).toLocaleString()
              : "Not yet"}
          </p>
          <div style={{ marginTop: "1rem" }}>
            <h3>What gets deployed</h3>
            <ul style={{ color: "var(--muted)", lineHeight: 1.6 }}>
              <li>{users.length} mailbox signatures resolved from templates</li>
              <li>Active campaign banners with tracked links</li>
              <li>Department / group assignment rules</li>
            </ul>
          </div>
          <div style={{ marginTop: "1rem" }}>
            <h3>Production checklist</h3>
            <ol style={{ color: "var(--muted)", lineHeight: 1.6, paddingLeft: "1.1rem" }}>
              <li>Register an Entra ID app with MailboxSettings / Exchange permissions</li>
              <li>Grant admin consent for your tenant</li>
              <li>Set AZURE_AD_* env vars on the host</li>
              <li>Switch deploy mode away from Demo</li>
            </ol>
          </div>
        </section>

        <section className="panel-card">
          <h3>Preview rendered HTML</h3>
          <div className="field" style={{ marginTop: "0.75rem" }}>
            <label htmlFor="user">User</label>
            <select
              id="user"
              value={selectedUser?.id ?? ""}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.displayName}
                </option>
              ))}
            </select>
          </div>
          <p className="muted" style={{ marginBottom: "0.75rem" }}>
            Template: {template?.name ?? "None"}
          </p>
          <textarea
            readOnly
            rows={16}
            value={html}
            style={{ width: "100%", fontFamily: "ui-monospace, monospace", fontSize: "0.78rem" }}
          />
          <button
            type="button"
            className="btn btn-secondary"
            style={{ marginTop: "0.75rem" }}
            onClick={async () => {
              await navigator.clipboard.writeText(html);
              setMessage("HTML copied to clipboard.");
            }}
          >
            Copy HTML
          </button>
        </section>
      </div>
    </div>
  );
}
