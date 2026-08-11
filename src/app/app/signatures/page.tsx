"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";

export default function SignaturesPage() {
  const { templates, users, campaigns, canManageSignatures, hydrated } = useStore();

  if (!hydrated) return <p className="muted">Loading…</p>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Signatures</h1>
          <p>Create templates and assign them across departments or groups.</p>
        </div>
        {canManageSignatures ? (
          <Link href="/app/signatures/new" className="btn btn-primary">
            Create template
          </Link>
        ) : (
          <span className="badge">View only for {`marketing/viewer`}</span>
        )}
      </div>

      <div className="card-grid">
        {templates.map((template) => {
          const assignedCount = users.filter((u) => u.signatureId === template.id).length;
          const campaign = campaigns.find((c) => c.id === template.campaignId);
          return (
            <article key={template.id} className="panel-card">
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}>
                <h3>{template.name}</h3>
                <span className="badge">{template.layout}</span>
              </div>
              <p style={{ marginTop: "0.45rem" }}>{template.description}</p>
              <p style={{ marginTop: "0.75rem" }} className="muted">
                {assignedCount} users · depts: {template.assignedDepartments.join(", ")}
              </p>
              {campaign ? (
                <p style={{ marginTop: "0.35rem" }} className="muted">
                  Campaign: {campaign.name}
                </p>
              ) : null}
              <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
                <Link href={`/app/signatures/${template.id}`} className="btn btn-secondary">
                  {canManageSignatures ? "Edit" : "View"}
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
