"use client";

import { useMemo, useState } from "react";
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
    title: "Publish rule (when credentials set)",
    body: "Uses Entra app credentials if configured. Otherwise download the script and run it manually.",
  },
];

const LIMITATIONS = [
  "Signatures are appended on send (server-side). They do not appear while composing in Outlook.",
  "Microsoft Graph cannot manage Outlook roaming signatures — that option is not supported.",
  "A single transport rule uses one disclaimer body (Entra tokens for name/title/phone). Fully unique FindMi HTML per mailbox is in the HTML pack for audit/manual use.",
  "Sent Items may not show the appended signature the recipient receives.",
  "Add an exception for the disclaimer marker so replies do not stack duplicate signatures.",
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
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          userCount: deployUsers.length,
          templateCount: templates.length,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Deploy failed");
        return;
      }
      markDeployed();
      setMessage(data.message);
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

  function downloadHtmlPack() {
    const pack = deployUsers.map((user) => {
      const tpl = resolveTemplateForUser(user, templates);
      const camp = tpl
        ? campaigns.find((c) => c.id === tpl.campaignId)
        : undefined;
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      return {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        findMiRole: user.findMiRole,
        storeName: user.storeName,
        html: tpl
          ? renderSignatureHtml({
              user,
              template: tpl,
              campaign: camp,
              origin,
            })
          : "",
      };
    });

    downloadText(
      "dpm-signature-html-pack.json",
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          company: settings.companyName,
          count: pack.length,
          note: "FindMi-accurate per-person HTML for audit or manual use. The Exchange transport rule uses token-based corporate HTML.",
          recipients: pack,
        },
        null,
        2,
      ),
      "application/json",
    );
    setMessage(
      `Downloaded HTML pack for ${pack.length} recipients. Full PowerShell script generation ships in the next A1 step.`,
    );
    markDeployed();
  }

  function downloadScriptStub() {
    const script = `# DPM Corporate Signature — Exchange Online transport rule helper
# Generated by DPM Email Signatures (A1)
# Company: ${settings.companyName}
# Recipients prepared: ${deployUsers.length}
#
# HOW TO RUN
# 1. Open PowerShell as a DPM admin with Exchange Online rights
# 2. Install-Module ExchangeOnlineManagement -Scope CurrentUser   (once)
# 3. Connect-ExchangeOnline
# 4. Paste/run this script
#
# LIMITATIONS
# - Signature is appended after send (not visible while composing)
# - One rule body with Entra disclaimer tokens; per-person FindMi HTML is in the JSON pack
# - Microsoft Graph cannot set Outlook roaming signatures

$RuleName = "DPM-Corporate-Signature"
$Marker = "DPM-SIGNATURE-RULE-MARKER"

# Placeholder: full token-based HTML is generated in the next A1 export step.
$DisclaimerHtml = @"
<div style="font-family: Georgia, 'Times New Roman', serif; color: #1F4E79;">
  <div><strong>%%DisplayName%%</strong></div>
  <div><em>%%Title%%</em></div>
  <div>%%PhoneNumber%%</div>
  <div>Email: <a href="mailto:%%Email%%">%%Email%%</a></div>
  <div style="font-size: 9px; color: #333; margin-top: 12px;">
    The information contained in this electronic message and any attachments may be confidential.
    <span style="display:none">$Marker</span>
  </div>
</div>
"@

$existing = Get-TransportRule -Identity $RuleName -ErrorAction SilentlyContinue
if ($existing) {
  Set-TransportRule -Identity $RuleName \`
    -ApplyHtmlDisclaimerText $DisclaimerHtml \`
    -ApplyHtmlDisclaimerLocation Append \`
    -ApplyHtmlDisclaimerFallbackAction Wrap
  Write-Host "Updated rule: $RuleName"
} else {
  New-TransportRule -Name $RuleName \`
    -FromScope InOrganization \`
    -SentToScope NotInOrganization \`
    -ApplyHtmlDisclaimerText $DisclaimerHtml \`
    -ApplyHtmlDisclaimerLocation Append \`
    -ApplyHtmlDisclaimerFallbackAction Wrap \`
    -ExceptIfBodyContainsWords $Marker \`
    -Mode Enforce
  Write-Host "Created rule: $RuleName"
}

Write-Host "Done. Send a test message to an external address to verify."
`;
    downloadText(
      "DPM-Corporate-Signature.ps1",
      script,
      "text/plain",
    );
    setMessage(
      "Downloaded starter PowerShell script. Review before running in Exchange Online PowerShell.",
    );
    markDeployed();
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
            full stamp service.
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
            <li>Download the PowerShell transport-rule script</li>
            <li>Download the per-person HTML pack (FindMi-accurate audit copy)</li>
            <li>
              Run the script in Exchange Online PowerShell as a DPM admin
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
              : " (sample / local directory — sync FindMi for production)"}
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
              disabled={!canDeploy}
              onClick={downloadScriptStub}
            >
              Download PowerShell script
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={!canDeploy}
              onClick={downloadHtmlPack}
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
              Try publish rule
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
