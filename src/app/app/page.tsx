"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";

export default function DashboardPage() {
  const { users, templates, campaigns, settings, stores, hydrated } = useStore();
  const activeBanners = campaigns.filter((c) => c.active).length;
  const storeCount = stores.length || users.filter((u) => u.source === "findmi").length;
  const assigned = users.filter((u) => u.signatureId).length;

  if (!hydrated) {
    return <p className="muted">Loading…</p>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Email signatures</h1>
          <p>
            Internal tool for {settings.companyName}. Keep one corporate signature
            in sync across Microsoft 365 — Outlook, OWA, and mobile.
          </p>
        </div>
        <Link href="/app/deploy" className="btn btn-primary">
          Deploy to Microsoft 365
        </Link>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <strong>{storeCount || users.length}</strong>
          <span className="muted">
            {storeCount ? "FindMi stores" : "Directory people"}
          </span>
        </div>
        <div className="stat-card">
          <strong>{templates.length}</strong>
          <span className="muted">Signature templates</span>
        </div>
        <div className="stat-card">
          <strong>{assigned}</strong>
          <span className="muted">Assigned signatures</span>
        </div>
        <div className="stat-card">
          <strong>{activeBanners}</strong>
          <span className="muted">Active banners</span>
        </div>
      </div>

      <div className="card-grid">
        <article className="panel-card">
          <h3>1. Signature template</h3>
          <p style={{ marginTop: "0.5rem" }}>
            Edit the corporate layout, logo, and disclaimer used for staff mail.
          </p>
          <Link
            href="/app/signatures"
            className="btn btn-secondary"
            style={{ marginTop: "1rem" }}
          >
            Open signatures
          </Link>
        </article>
        <article className="panel-card">
          <h3>2. FindMi directory</h3>
          <p style={{ marginTop: "0.5rem" }}>
            Sync and edit stores, VPs, directors, district managers, and repair
            techs from FindMi for signature fields.
          </p>
          <Link
            href="/app/users"
            className="btn btn-secondary"
            style={{ marginTop: "1rem" }}
          >
            Open FindMi directory
          </Link>
        </article>
        <article className="panel-card">
          <h3>3. Deploy</h3>
          <p style={{ marginTop: "0.5rem" }}>
            Status:{" "}
            <span className={`badge ${settings.m365Connected ? "ok" : ""}`}>
              {settings.m365Connected ? "Ready for tenant" : "Sample mode"}
            </span>
          </p>
          <p style={{ marginTop: "0.5rem" }} className="muted">
            Last deploy:{" "}
            {settings.lastDeployAt
              ? new Date(settings.lastDeployAt).toLocaleString()
              : "Not yet"}
          </p>
          <Link
            href="/app/settings"
            className="btn btn-ghost"
            style={{ marginTop: "1rem" }}
          >
            M365 setup
          </Link>
        </article>
      </div>
    </div>
  );
}
