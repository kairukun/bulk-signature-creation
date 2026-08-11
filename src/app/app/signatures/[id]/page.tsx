"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { SignaturePreview } from "@/components/SignaturePreview";
import { useStore } from "@/lib/store";
import type { Department, SignatureTemplate } from "@/lib/types";

const DEPARTMENTS: Department[] = [
  "All",
  "Executive",
  "Sales",
  "Marketing",
  "Engineering",
  "Support",
  "Finance",
  "HR",
];

const LAYOUTS: SignatureTemplate["layout"][] = [
  "classic",
  "modern",
  "compact",
  "stacked",
];

function blankTemplate(): SignatureTemplate {
  return {
    id: `t-${crypto.randomUUID().slice(0, 8)}`,
    name: "New signature",
    description: "Custom company signature",
    layout: "classic",
    primaryColor: "#0F3D3E",
    accentColor: "#E07A3D",
    fontFamily: "Segoe UI, Arial, sans-serif",
    showPhoto: false,
    showLogo: true,
    showSocial: true,
    logoUrl: "",
    logoAlt: "Company",
    ctaLabel: "Learn more",
    ctaUrl: "https://example.com",
    disclaimer: "",
    assignedDepartments: ["All"],
    assignedGroups: [],
    assignedUserIds: [],
    updatedAt: new Date().toISOString(),
  };
}

export default function SignatureEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const {
    templates,
    users,
    campaigns,
    upsertTemplate,
    deleteTemplate,
    canManageSignatures,
    hydrated,
  } = useStore();

  const isNew = params.id === "new";
  const existing = templates.find((t) => t.id === params.id);

  const [draft, setDraft] = useState<SignatureTemplate | null>(null);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [previewUserId, setPreviewUserId] = useState(users[0]?.id ?? "");
  const [saved, setSaved] = useState(false);

  const template = useMemo(() => {
    if (draft) return draft;
    if (isNew) return blankTemplate();
    return existing ?? blankTemplate();
  }, [draft, existing, isNew]);

  const previewUser =
    users.find((u) => u.id === previewUserId) ?? users[0] ?? null;
  const campaign = campaigns.find((c) => c.id === template.campaignId) ?? null;

  if (!hydrated) return <p className="muted">Loading…</p>;
  if (!isNew && !existing) {
    return (
      <div>
        <h1>Template not found</h1>
        <Link href="/app/signatures">Back</Link>
      </div>
    );
  }

  function patch(partial: Partial<SignatureTemplate>) {
    setDraft({ ...template, ...partial, updatedAt: new Date().toISOString() });
    setSaved(false);
  }

  function toggleDepartment(dept: Department) {
    const has = template.assignedDepartments.includes(dept);
    const next = has
      ? template.assignedDepartments.filter((d) => d !== dept)
      : [...template.assignedDepartments, dept];
    patch({ assignedDepartments: next.length ? next : ["All"] });
  }

  function save() {
    if (!canManageSignatures) return;
    upsertTemplate(template);
    setSaved(true);
    if (isNew) router.replace(`/app/signatures/${template.id}`);
  }

  function remove() {
    if (!canManageSignatures || isNew) return;
    deleteTemplate(template.id);
    router.push("/app/signatures");
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{isNew ? "New signature" : template.name}</h1>
          <p>Design, preview across users/devices, and assign targeting rules.</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Link href="/app/signatures" className="btn btn-ghost">
            Back
          </Link>
          {!isNew && canManageSignatures ? (
            <button type="button" className="btn btn-ghost" onClick={remove}>
              Delete
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-primary"
            onClick={save}
            disabled={!canManageSignatures}
          >
            Save template
          </button>
        </div>
      </div>

      {!canManageSignatures ? (
        <p className="badge" style={{ marginBottom: "1rem" }}>
          Your role can view templates but not edit them.
        </p>
      ) : null}
      {saved ? <p className="toast">Template saved locally in this browser.</p> : null}

      <div className="split">
        <section className="panel-card">
          <div className="field">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              value={template.name}
              disabled={!canManageSignatures}
              onChange={(e) => patch({ name: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              rows={2}
              value={template.description}
              disabled={!canManageSignatures}
              onChange={(e) => patch({ description: e.target.value })}
            />
          </div>

          <div className="field">
            <label>Layout</label>
            <div className="chip-row">
              {LAYOUTS.map((layout) => (
                <button
                  key={layout}
                  type="button"
                  className={`chip ${template.layout === layout ? "active" : ""}`}
                  disabled={!canManageSignatures}
                  onClick={() => patch({ layout })}
                >
                  {layout}
                </button>
              ))}
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="primary">Primary color</label>
              <input
                id="primary"
                type="color"
                value={template.primaryColor}
                disabled={!canManageSignatures}
                onChange={(e) => patch({ primaryColor: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="accent">Accent color</label>
              <input
                id="accent"
                type="color"
                value={template.accentColor}
                disabled={!canManageSignatures}
                onChange={(e) => patch({ accentColor: e.target.value })}
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="ctaLabel">CTA label</label>
              <input
                id="ctaLabel"
                value={template.ctaLabel}
                disabled={!canManageSignatures}
                onChange={(e) => patch({ ctaLabel: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="ctaUrl">CTA URL</label>
              <input
                id="ctaUrl"
                value={template.ctaUrl}
                disabled={!canManageSignatures}
                onChange={(e) => patch({ ctaUrl: e.target.value })}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="logoAlt">Logo / brand text</label>
            <input
              id="logoAlt"
              value={template.logoAlt}
              disabled={!canManageSignatures}
              onChange={(e) => patch({ logoAlt: e.target.value })}
            />
          </div>

          <div className="field">
            <label htmlFor="disclaimer">Disclaimer</label>
            <textarea
              id="disclaimer"
              rows={3}
              value={template.disclaimer}
              disabled={!canManageSignatures}
              onChange={(e) => patch({ disclaimer: e.target.value })}
            />
          </div>

          <div className="field-row">
            <label>
              <input
                type="checkbox"
                checked={template.showLogo}
                disabled={!canManageSignatures}
                onChange={(e) => patch({ showLogo: e.target.checked })}
              />{" "}
              Show logo text
            </label>
            <label>
              <input
                type="checkbox"
                checked={template.showPhoto}
                disabled={!canManageSignatures}
                onChange={(e) => patch({ showPhoto: e.target.checked })}
              />{" "}
              Show photo / initials
            </label>
            <label>
              <input
                type="checkbox"
                checked={template.showSocial}
                disabled={!canManageSignatures}
                onChange={(e) => patch({ showSocial: e.target.checked })}
              />{" "}
              Show social links
            </label>
          </div>

          <div className="field">
            <label>Assign departments</label>
            <div className="chip-row">
              {DEPARTMENTS.map((dept) => (
                <button
                  key={dept}
                  type="button"
                  className={`chip ${template.assignedDepartments.includes(dept) ? "active" : ""}`}
                  disabled={!canManageSignatures}
                  onClick={() => toggleDepartment(dept)}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label htmlFor="campaign">Attached campaign</label>
            <select
              id="campaign"
              value={template.campaignId ?? ""}
              disabled={!canManageSignatures}
              onChange={(e) =>
                patch({ campaignId: e.target.value || undefined })
              }
            >
              <option value="">None</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section>
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              marginBottom: "0.75rem",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <select
              value={previewUser?.id ?? ""}
              onChange={(e) => setPreviewUserId(e.target.value)}
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.displayName}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={`chip ${device === "desktop" ? "active" : ""}`}
              onClick={() => setDevice("desktop")}
            >
              Desktop
            </button>
            <button
              type="button"
              className={`chip ${device === "mobile" ? "active" : ""}`}
              onClick={() => setDevice("mobile")}
            >
              Mobile
            </button>
          </div>
          {previewUser ? (
            <SignaturePreview
              user={previewUser}
              template={template}
              campaign={campaign}
              device={device}
            />
          ) : null}
        </section>
      </div>
    </div>
  );
}
