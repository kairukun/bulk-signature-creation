"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { SignaturePreview } from "@/components/SignaturePreview";
import { COMPANY_NAME, COMPANY_WEBSITE_DISPLAY, DEFAULT_LOGO_PATH, DOSSANI_DISCLAIMER, BRAND_NAVY, BRAND_RED, BRAND_WORDMARK_RED } from "@/lib/constants";
import {
  DEFAULT_LOGO_WIDTH,
  DEFAULT_SIGNATURE_FONT,
  DEFAULT_SIGNATURE_FONT_SIZE,
  SIGNATURE_FONTS,
  resolveFontSize,
  resolveLogoWidth,
} from "@/lib/fonts";
import { useStore } from "@/lib/store";
import type { Department, SignatureLayout, SignatureTemplate } from "@/lib/types";
import { DEPARTMENTS } from "@/lib/departments";

const LAYOUTS: SignatureLayout[] = [
  "corporate",
  "classic",
  "modern",
  "compact",
  "stacked",
];

const MAX_LOGO_BYTES = 900_000;

function blankTemplate(): SignatureTemplate {
  return {
    id: `t-${crypto.randomUUID().slice(0, 8)}`,
    name: "Corporate signature",
    description: `Standard ${COMPANY_NAME} email signature`,
    layout: "corporate",
    primaryColor: BRAND_NAVY,
    accentColor: BRAND_RED,
    fontFamily: DEFAULT_SIGNATURE_FONT,
    fontSize: DEFAULT_SIGNATURE_FONT_SIZE,
    showPhoto: false,
    showLogo: true,
    showSocial: false,
    showThankYou: true,
    logoUrl: DEFAULT_LOGO_PATH,
    logoAlt: COMPANY_NAME,
    logoWidth: DEFAULT_LOGO_WIDTH,
    companyNameLine1: "",
    companyNameLine2: "",
    companyNameLine2Color: BRAND_WORDMARK_RED,
    ctaLabel: "",
    ctaUrl: "",
    websiteDisplay: COMPANY_WEBSITE_DISPLAY,
    disclaimer: DOSSANI_DISCLAIMER,
    assignedDepartments: ["All"],
    assignedGroups: [],
    assignedUserIds: [],
    updatedAt: new Date().toISOString(),
  };
}

function withDefaults(template: SignatureTemplate): SignatureTemplate {
  return {
    ...blankTemplate(),
    ...template,
    showThankYou: template.showThankYou ?? template.layout === "corporate",
    logoWidth: resolveLogoWidth(template.logoWidth),
    fontFamily: template.fontFamily || DEFAULT_SIGNATURE_FONT,
    fontSize: resolveFontSize(template.fontSize),
    companyNameLine1:
      typeof template.companyNameLine1 === "string"
        ? template.companyNameLine1
        : "",
    companyNameLine2:
      typeof template.companyNameLine2 === "string"
        ? template.companyNameLine2
        : "",
    companyNameLine2Color: template.companyNameLine2Color || template.accentColor,
    websiteDisplay: template.websiteDisplay || "",
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
  const [logoError, setLogoError] = useState("");

  const template = useMemo(() => {
    if (draft) return draft;
    if (isNew) return blankTemplate();
    return existing ? withDefaults(existing) : blankTemplate();
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

  function onLogoFile(file: File | null) {
    setLogoError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLogoError("Please choose an image file (PNG, JPG, SVG, or WebP).");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError("Logo must be under ~900KB for Outlook-friendly HTML.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      patch({ logoUrl: result, showLogo: true });
    };
    reader.onerror = () => setLogoError("Could not read that file.");
    reader.readAsDataURL(file);
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
          <p>
            Upload the company logo and adjust the corporate layout used for
            Dossani Paradise Management staff.
          </p>
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
                  onClick={() =>
                    patch({
                      layout,
                      showThankYou:
                        layout === "corporate" ? true : template.showThankYou,
                    })
                  }
                >
                  {layout}
                </button>
              ))}
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="fontFamily">Signature font</label>
              <select
                id="fontFamily"
                value={template.fontFamily}
                disabled={!canManageSignatures}
                onChange={(e) => patch({ fontFamily: e.target.value })}
                style={{ fontFamily: template.fontFamily }}
              >
                {SIGNATURE_FONTS.map((font) => (
                  <option key={font.id} value={font.value} style={{ fontFamily: font.value }}>
                    {font.label}
                  </option>
                ))}
                {!SIGNATURE_FONTS.some((f) => f.value === template.fontFamily) ? (
                  <option value={template.fontFamily}>Custom</option>
                ) : null}
              </select>
            </div>
            <div className="field">
              <label htmlFor="fontSize">Font size (px)</label>
              <input
                id="fontSize"
                type="number"
                min={10}
                max={20}
                value={template.fontSize}
                disabled={!canManageSignatures}
                onChange={(e) =>
                  patch({
                    fontSize: resolveFontSize(
                      Number(e.target.value) || DEFAULT_SIGNATURE_FONT_SIZE,
                    ),
                  })
                }
              />
            </div>
          </div>
          <p className="muted" style={{ marginTop: "-0.35rem", marginBottom: "0.85rem" }}>
            Preview:{" "}
            <span
              style={{
                fontFamily: template.fontFamily,
                fontSize: `${template.fontSize}px`,
              }}
            >
              Thank You, · Dossani Paradise · Store Manager
            </span>
          </p>

          <div className="panel-card" style={{ boxShadow: "none", marginBottom: "1rem" }}>
            <h3 style={{ marginTop: 0 }}>Company logo</h3>
            <p className="muted" style={{ margin: "0.35rem 0 0.75rem" }}>
              Upload an image or paste a URL. The logo appears beside the company
              name in the corporate layout.
            </p>
            {template.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={template.logoUrl}
                alt={template.logoAlt || "Logo preview"}
                style={{
                  width: template.logoWidth || DEFAULT_LOGO_WIDTH,
                  height: "auto",
                  maxWidth: "100%",
                  display: "block",
                  marginBottom: "0.75rem",
                  background: "#fff",
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  padding: 4,
                }}
              />
            ) : null}
            <div className="field">
              <label htmlFor="logoFile">Upload logo</label>
              <input
                id="logoFile"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                disabled={!canManageSignatures}
                onChange={(e) => onLogoFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="field">
              <label htmlFor="logoUrl">Logo URL or data</label>
              <input
                id="logoUrl"
                value={template.logoUrl.startsWith("data:") ? "(uploaded image)" : template.logoUrl}
                disabled={!canManageSignatures || template.logoUrl.startsWith("data:")}
                onChange={(e) => patch({ logoUrl: e.target.value, showLogo: true })}
                placeholder="/dossani-logo.svg or https://..."
              />
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="logoWidth">Logo width (px)</label>
                <input
                  id="logoWidth"
                  type="number"
                  min={24}
                  max={220}
                  value={template.logoWidth}
                  disabled={!canManageSignatures}
                  onChange={(e) =>
                    patch({
                      logoWidth: resolveLogoWidth(
                        Number(e.target.value) || DEFAULT_LOGO_WIDTH,
                      ),
                    })
                  }
                />
              </div>
              <div className="field" style={{ alignContent: "end" }}>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={!canManageSignatures}
                    onClick={() =>
                      patch({ logoUrl: DEFAULT_LOGO_PATH, showLogo: true })
                    }
                  >
                    Use default logo
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={!canManageSignatures}
                    onClick={() => patch({ logoUrl: "", showLogo: false })}
                  >
                    Remove logo
                  </button>
                </div>
              </div>
            </div>
            {logoError ? (
              <p className="badge" style={{ marginTop: "0.5rem" }}>
                {logoError}
              </p>
            ) : null}
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="line1">Company name line 1</label>
              <input
                id="line1"
                value={template.companyNameLine1}
                disabled={!canManageSignatures}
                onChange={(e) => patch({ companyNameLine1: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="line2">Company name line 2</label>
              <input
                id="line2"
                value={template.companyNameLine2}
                disabled={!canManageSignatures}
                onChange={(e) => patch({ companyNameLine2: e.target.value })}
              />
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
              <label htmlFor="line2color">Line 2 color</label>
              <input
                id="line2color"
                type="color"
                value={template.companyNameLine2Color}
                disabled={!canManageSignatures}
                onChange={(e) =>
                  patch({ companyNameLine2Color: e.target.value })
                }
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="websiteDisplay">Website display text</label>
            <input
              id="websiteDisplay"
              value={template.websiteDisplay}
              disabled={!canManageSignatures}
              onChange={(e) => patch({ websiteDisplay: e.target.value })}
            />
          </div>

          <div className="field">
            <label htmlFor="disclaimer">Disclaimer</label>
            <textarea
              id="disclaimer"
              rows={4}
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
              Show logo
            </label>
            <label>
              <input
                type="checkbox"
                checked={template.showThankYou}
                disabled={!canManageSignatures}
                onChange={(e) => patch({ showThankYou: e.target.checked })}
              />{" "}
              Show “Thank You,”
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
