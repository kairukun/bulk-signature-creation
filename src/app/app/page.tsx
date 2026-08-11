"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";

export default function DashboardPage() {
  const { users, templates, campaigns, settings, hydrated } = useStore();
  const activeCampaigns = campaigns.filter((c) => c.active).length;
  const totalClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0);
  const assigned = users.filter((u) => u.signatureId).length;

  if (!hydrated) {
    return <p className="muted">Loading workspace…</p>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>
            Manage signatures for {settings.companyName}. Demo data is ready —
            connect Microsoft 365 when you want live directory sync.
          </p>
        </div>
        <Link href="/app/signatures/new" className="btn btn-primary">
          New signature
        </Link>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <strong>{users.length}</strong>
          <span className="muted">Directory users</span>
        </div>
        <div className="stat-card">
          <strong>{templates.length}</strong>
          <span className="muted">Templates</span>
        </div>
        <div className="stat-card">
          <strong>{activeCampaigns}</strong>
          <span className="muted">Active campaigns</span>
        </div>
        <div className="stat-card">
          <strong>{totalClicks.toLocaleString()}</strong>
          <span className="muted">Banner clicks</span>
        </div>
      </div>

      <div className="card-grid">
        <article className="panel-card">
          <h3>Coverage</h3>
          <p style={{ marginTop: "0.5rem" }}>
            {assigned}/{users.length} users have an assigned signature template.
          </p>
          <Link href="/app/users" className="btn btn-secondary" style={{ marginTop: "1rem" }}>
            Review directory
          </Link>
        </article>
        <article className="panel-card">
          <h3>Microsoft 365</h3>
          <p style={{ marginTop: "0.5rem" }}>
            Status:{" "}
            <span className={`badge ${settings.m365Connected ? "ok" : ""}`}>
              {settings.m365Connected ? "Connected" : "Demo mode"}
            </span>
          </p>
          <p style={{ marginTop: "0.5rem" }}>
            Last sync:{" "}
            {settings.lastSyncAt
              ? new Date(settings.lastSyncAt).toLocaleString()
              : "Never"}
          </p>
          <Link href="/app/settings" className="btn btn-secondary" style={{ marginTop: "1rem" }}>
            Connection settings
          </Link>
        </article>
        <article className="panel-card">
          <h3>Next actions</h3>
          <p style={{ marginTop: "0.5rem" }}>
            Design a template, attach a campaign banner, assign by department,
            then deploy.
          </p>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", flexWrap: "wrap" }}>
            <Link href="/app/campaigns" className="btn btn-accent">
              Campaigns
            </Link>
            <Link href="/app/deploy" className="btn btn-ghost">
              Deploy
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}
