"use client";

import { useEffect, useMemo, useState } from "react";
import {
  renderSignatureHtml,
  resolveTemplateForUser,
} from "@/lib/render-signature";
import { useStore } from "@/lib/store";
import type { AppSettings } from "@/lib/types";

type DeployMode = AppSettings["deployMode"];

const MODES: {
  id: DeployMode;
  title: string;
  body: string;
}[] = [
  {
    id: "demo",
    title: "Sample run",
    body: "Validates the package only. Does not change Exchange Online.",
  },
  {
    id: "export-script",
    title: "Export transport-rule script",
    body: "Download PowerShell + HTML pack for a DPM admin to apply in Exchange Online.",
  },
  {
    id: "publish-rule",
    title: "Publish rule",
    body: "When AZURE_AD_* is set, creates/updates the Exchange transport rule remotely. Otherwise downloads the script only.",
  },
];

const LIMITATIONS = [
  "Signatures are appended on send (server-side). They do not appear while composing in Outlook.",
  "Microsoft Graph cannot manage Outlook roaming signatures — that option is not supported.",
  "A single transport rule uses one disclaimer body (Entra tokens for name/title/phone). Fully unique FindMi HTML per mailbox is in the HTML pack for audit/manual use.",
  "Sent Items may not show the appended signature the recipient receives.",
  "Add an exception for the disclaimer marker so replies do not stack duplicate signatures.",
  "Live publish needs Exchange.ManageAsApp (+ admin consent) and an Exchange RBAC role on the app’s service principal.",
];

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

  const findMiUsers = useMemo(
    () => users.filter((u) => u.source === "findmi"),
    [users],
  );
  const deployUsers = findMiUsers.length ? findMiUsers : users;

  const [selectedUserId, setSelectedUserId] = useState(
    deployUsers[0]?.id ?? "",
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [hasAzure, setHasAzure] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/deploy");
        const data = await res.json();
        if (!cancelled) setHasAzure(Boolean(data.hasAzure));
      } catch {
        if (!cancelled) setHasAzure(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedUser =
    deployUsers.find((u) => u.id === selectedUserId) ?? deployUsers[0];
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

  async function runDeploy(mode: DeployMode = settings.deployMode) {
    if (!canDeploy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const corporate =
        templates.find((t) => t.id === "t-dossani") || templates[0] || null;
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          userCount: deployUsers.length,
          templateCount: templates.length,
          companyName: settings.companyName,
          template: corporate,
        }),
      });
      const data = await res.json();
      if (typeof data.hasAzure === "boolean") setHasAzure(data.hasAzure);

      if (!res.ok) {
        setError(data.message || "Deploy failed");
        if (data.downloadScript && data.powershell) {
          downloadText(
            data.filename || "DPM-Corporate-Signature.ps1",
            data.powershell,
            "text/plain",
          );
        }
        return;
      }
      markDeployed();
      setMessage(data.message);
      if (
        (mode === "export-script" || data.downloadScript) &&
        data.powershell
      ) {
        downloadText(
          data.filename || "DPM-Corporate-Signature.ps1",
          data.powershell,
          "text/plain",
        );
      }
    } finally {
      setBusy(false);
    }
  }

  function downloadText(filename: string, content: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadHtmlPack() {
    if (!canDeploy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/deploy/pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          users: deployUsers,
          templates,
          campaigns,
          companyName: settings.companyName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "HTML pack failed");
        return;
      }
      downloadText(
        "dpm-signature-html-pack.json",
        JSON.stringify(data.pack, null, 2),
        "application/json",
      );
      markDeployed();
      setMessage(
        `Downloaded HTML pack for ${data.pack.count} recipients (FindMi-accurate per person).`,
      );
    } finally {
      setBusy(false);
    }
  }

  async function downloadPowerShellScript() {
    if (!canDeploy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const corporate =
        templates.find((t) => t.id === "t-dossani") || templates[0] || null;
      const res = await fetch("/api/deploy/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientCount: deployUsers.length,
          companyName: settings.companyName,
          template: corporate,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Script generation failed");
        return;
      }
      downloadText(data.filename || "DPM-Corporate-Signature.ps1", data.powershell, "text/plain");
      markDeployed();
      setMessage(
        `Downloaded ${data.filename}. Review, then run in Exchange Online PowerShell as a DPM admin.`,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Deploy to Microsoft 365</h1>
          <p>
            A1 transport-rule helper for {settings.companyName}. Build an
            Exchange Online mail-flow rule that appends the corporate signature
            on outbound mail — the native approach most companies use before a
            full stamp service.{" "}
            <a
              href="https://github.com/kairukun/bulk-signature-creation/blob/main/docs/DPM-M365-SIGNATURE-RUNBOOK.md"
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: "underline" }}
            >
              IT runbook
            </a>
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => runDeploy()}
          disabled={!canDeploy || busy}
        >
          {busy ? "Working…" : "Run selected mode"}
        </button>
      </div>

      {!canDeploy ? (
        <p className="badge">Only Admin / IT roles can deploy.</p>
      ) : null}
      {hasAzure === true ? (
        <p className="badge ok" style={{ marginBottom: "1rem" }}>
          AZURE_AD_* configured — publish can update Exchange Online live
        </p>
      ) : hasAzure === false ? (
        <p className="badge" style={{ marginBottom: "1rem" }}>
          Script download only — set AZURE_AD_TENANT_ID / CLIENT_ID / CLIENT_SECRET
          for automated publish
        </p>
      ) : null}
      {message ? <p className="toast">{message}</p> : null}
      {error ? (
        <p className="badge" style={{ marginBottom: "1rem" }}>
          {error}
        </p>
      ) : null}

      <div className="card-grid" style={{ marginBottom: "1rem" }}>
        {MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className="panel-card"
            disabled={!canDeploy}
            onClick={() => updateSettings({ deployMode: mode.id })}
            style={{
              textAlign: "left",
              cursor: canDeploy ? "pointer" : "default",
              outline:
                settings.deployMode === mode.id
                  ? "2px solid var(--brand)"
                  : "1px solid var(--line)",
            }}
          >
            <h3 style={{ marginTop: 0 }}>{mode.title}</h3>
            <p style={{ marginTop: "0.45rem" }}>{mode.body}</p>
            {settings.deployMode === mode.id ? (
              <span className="badge ok" style={{ marginTop: "0.75rem" }}>
                Selected
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="split">
        <section className="panel-card">
          <h3>How this works</h3>
          <ol
            style={{
              color: "var(--muted)",
              lineHeight: 1.6,
              paddingLeft: "1.1rem",
              marginTop: "0.75rem",
            }}
          >
            <li>Sync FindMi directory and confirm signature templates</li>
            <li>
              Prefer <strong>Publish rule</strong> when AZURE_AD_* is configured;
              otherwise download the PowerShell script
            </li>
            <li>Download the per-person HTML pack (FindMi-accurate audit copy)</li>
            <li>
              If publishing failed or credentials are missing, run the script in
              Exchange Online PowerShell as a DPM admin
            </li>
            <li>Send a test email outside the tenant to verify</li>
          </ol>

          <h3 style={{ marginTop: "1.25rem" }}>Honest limitations</h3>
          <ul
            style={{
              color: "var(--muted)",
              lineHeight: 1.6,
              paddingLeft: "1.1rem",
              marginTop: "0.5rem",
            }}
          >
            {LIMITATIONS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <p className="muted" style={{ marginTop: "1rem" }}>
            Recipients ready: <strong>{deployUsers.length}</strong>
            {findMiUsers.length
              ? " (FindMi directory)"
              : " (no FindMi sync yet — sync FindMi for production)"}
          </p>
          <p className="muted" style={{ marginTop: "0.35rem" }}>
            Last deploy:{" "}
            {settings.lastDeployAt
              ? new Date(settings.lastDeployAt).toLocaleString()
              : "Not yet"}
          </p>

          <div
            style={{
              marginTop: "1rem",
              display: "flex",
              gap: "0.5rem",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canDeploy || busy}
              onClick={() => void downloadPowerShellScript()}
            >
              Download PowerShell script
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={!canDeploy || busy}
              onClick={() => void downloadHtmlPack()}
            >
              Download HTML pack
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={!canDeploy || busy}
              onClick={() => {
                updateSettings({ deployMode: "publish-rule" });
                void runDeploy("publish-rule");
              }}
            >
              {hasAzure ? "Publish rule to Exchange" : "Publish (script fallback)"}
            </button>
          </div>
        </section>

        <section className="panel-card">
          <h3>Preview rendered HTML</h3>
          <div className="field" style={{ marginTop: "0.75rem" }}>
            <label htmlFor="user">Recipient</label>
            <select
              id="user"
              value={selectedUser?.id ?? ""}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              {deployUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.storeName || u.displayName}
                  {u.email ? ` · ${u.email}` : ""}
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
            style={{
              width: "100%",
              fontFamily: "ui-monospace, monospace",
              fontSize: "0.78rem",
            }}
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
