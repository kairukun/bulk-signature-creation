"use client";

import { useEffect, useMemo, useState } from "react";
import {
  renderSignatureHtml,
  resolveTemplateForUser,
} from "@/lib/render-signature";
import { useStore } from "@/lib/store";
import type { AppSettings, DirectoryUser } from "@/lib/types";

type DeployMode = AppSettings["deployMode"];
type PublishAudience = "all" | "selected";

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
  "Selected-email publish scopes the transport rule to those senders only (From addresses).",
];

function usersWithEmail(users: DirectoryUser[]) {
  return users.filter((u) => Boolean(u.email?.trim()));
}

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
  const emailUsers = useMemo(() => usersWithEmail(deployUsers), [deployUsers]);

  const [selectedUserId, setSelectedUserId] = useState(
    deployUsers[0]?.id ?? "",
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [hasAzure, setHasAzure] = useState<boolean | null>(null);
  const [audience, setAudience] = useState<PublishAudience>("all");
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [emailQuery, setEmailQuery] = useState("");

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

  const filteredEmailUsers = useMemo(() => {
    const q = emailQuery.trim().toLowerCase();
    if (!q) return emailUsers;
    return emailUsers.filter((u) =>
      [u.displayName, u.email, u.storeName, u.jobTitle, u.department]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [emailUsers, emailQuery]);

  const activeUsers = useMemo(() => {
    if (audience === "all") return deployUsers;
    const selected = new Set(selectedEmails.map((e) => e.toLowerCase()));
    return deployUsers.filter((u) =>
      selected.has((u.email || "").trim().toLowerCase()),
    );
  }, [audience, deployUsers, selectedEmails]);

  const audiencePayload = {
    audience,
    emails: audience === "selected" ? selectedEmails : [],
    userCount:
      audience === "selected" ? selectedEmails.length : deployUsers.length,
  };

  function toggleEmail(email: string) {
    const normalized = email.trim().toLowerCase();
    setSelectedEmails((prev) =>
      prev.includes(normalized)
        ? prev.filter((e) => e !== normalized)
        : [...prev, normalized],
    );
  }

  function selectAllVisible() {
    const emails = filteredEmailUsers
      .map((u) => (u.email || "").trim().toLowerCase())
      .filter(Boolean);
    setSelectedEmails((prev) => [...new Set([...prev, ...emails])]);
  }

  function clearSelected() {
    setSelectedEmails([]);
  }

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
    if (audience === "selected" && selectedEmails.length === 0) {
      setError("Select at least one email to publish, or choose All.");
      return;
    }
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
          ...audiencePayload,
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
    if (audience === "selected" && selectedEmails.length === 0) {
      setError("Select at least one email, or choose All.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/deploy/pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          users: activeUsers,
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
    if (audience === "selected" && selectedEmails.length === 0) {
      setError("Select at least one email, or choose All.");
      return;
    }
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
          ...audiencePayload,
          recipientCount: audiencePayload.userCount,
          companyName: settings.companyName,
          template: corporate,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || data.message || "Script generation failed");
        return;
      }
      downloadText(
        data.filename || "DPM-Corporate-Signature.ps1",
        data.powershell,
        "text/plain",
      );
      markDeployed();
      setMessage(
        data.message ||
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

      <section className="panel-card" style={{ marginBottom: "1rem" }}>
        <h3>Publish audience</h3>
        <p className="muted" style={{ marginTop: "0.45rem" }}>
          Choose whether the transport rule covers everyone, or only selected
          sender mailboxes.
        </p>
        <div className="chip-row" style={{ marginTop: "0.85rem" }}>
          <button
            type="button"
            className={`chip ${audience === "all" ? "active" : ""}`}
            disabled={!canDeploy}
            onClick={() => setAudience("all")}
          >
            All emails ({emailUsers.length})
          </button>
          <button
            type="button"
            className={`chip ${audience === "selected" ? "active" : ""}`}
            disabled={!canDeploy}
            onClick={() => setAudience("selected")}
          >
            Selected emails ({selectedEmails.length})
          </button>
        </div>

        {audience === "selected" ? (
          <>
            <div
              className="field"
              style={{ marginTop: "0.9rem", marginBottom: 0 }}
            >
              <label htmlFor="publish-email-search">Search directory</label>
              <input
                id="publish-email-search"
                value={emailQuery}
                disabled={!canDeploy}
                onChange={(e) => setEmailQuery(e.target.value)}
                placeholder="Name, email, store, department…"
              />
            </div>
            <div
              style={{
                marginTop: "0.65rem",
                display: "flex",
                gap: "0.5rem",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                disabled={!canDeploy || !filteredEmailUsers.length}
                onClick={selectAllVisible}
              >
                Select visible
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={!canDeploy || !selectedEmails.length}
                onClick={clearSelected}
              >
                Clear selection
              </button>
            </div>
            <div
              style={{
                marginTop: "0.75rem",
                maxHeight: "240px",
                overflow: "auto",
                border: "1px solid var(--line)",
                borderRadius: "12px",
                padding: "0.55rem 0.75rem",
              }}
            >
              {filteredEmailUsers.map((user) => {
                const email = (user.email || "").trim().toLowerCase();
                const checked = selectedEmails.includes(email);
                return (
                  <label
                    key={user.id}
                    style={{
                      display: "flex",
                      gap: "0.55rem",
                      alignItems: "flex-start",
                      padding: "0.35rem 0",
                      borderBottom: "1px solid var(--line)",
                      cursor: canDeploy ? "pointer" : "default",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!canDeploy}
                      onChange={() => toggleEmail(email)}
                      style={{ marginTop: "0.2rem" }}
                    />
                    <span>
                      <strong>{user.storeName || user.displayName}</strong>
                      <span className="muted" style={{ display: "block" }}>
                        {user.email}
                        {user.department ? ` · ${user.department}` : ""}
                      </span>
                    </span>
                  </label>
                );
              })}
              {!filteredEmailUsers.length ? (
                <p className="muted" style={{ margin: "0.35rem 0" }}>
                  No emails match this search. Sync FindMi or clear the filter.
                </p>
              ) : null}
            </div>
          </>
        ) : (
          <p className="muted" style={{ marginTop: "0.75rem" }}>
            Rule will apply to all in-organization senders (org-wide outbound
            signature).
          </p>
        )}
      </section>

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
            Publishing to:{" "}
            <strong>
              {audience === "all"
                ? `All (${emailUsers.length} emails)`
                : `${selectedEmails.length} selected`}
            </strong>
            {findMiUsers.length
              ? " · FindMi directory"
              : " · sync FindMi for production"}
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
