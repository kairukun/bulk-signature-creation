"use client";

import { Cinzel, Source_Sans_3 } from "next/font/google";
import { useEffect, useMemo, useState } from "react";
import { copySignatureHtml } from "@/lib/copy-signature";
import { COMPANY_CITY_STATE_ZIP, COMPANY_NAME, COMPANY_STREET, COMPANY_WEBSITE } from "@/lib/constants";
import { DEMO_TEMPLATES } from "@/lib/demo-data";
import { FINDMI_ROLE_LABELS } from "@/lib/findmi";
import { formatPhoneNumber } from "@/lib/phone";
import { renderSignatureHtml } from "@/lib/render-signature";
import type { DirectoryUser, FindMiRole, SignatureTemplate } from "@/lib/types";
import "./studio.css";

const display = Cinzel({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-studio-display",
});

const body = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-studio-body",
});

type DirectoryEntry = {
  id: string;
  displayName: string;
  email: string;
  jobTitle: string;
  department: DirectoryUser["department"];
  phone: string;
  company: string;
  website: string;
  streetAddress: string;
  cityStateZip: string;
  location: string;
  storeName: string;
  storeNumber: string;
  findMiRole: FindMiRole;
};

type Draft = {
  displayName: string;
  jobTitle: string;
  email: string;
  phone: string;
  streetAddress: string;
  cityStateZip: string;
  storeName: string;
  website: string;
};

const EMPTY: Draft = {
  displayName: "",
  jobTitle: "",
  email: "",
  phone: "",
  streetAddress: COMPANY_STREET,
  cityStateZip: COMPANY_CITY_STATE_ZIP,
  storeName: "",
  website: "www.DossaniParadise.com",
};

function entryToDraft(entry: DirectoryEntry): Draft {
  return {
    displayName: entry.displayName,
    jobTitle: entry.jobTitle,
    email: entry.email,
    phone: entry.phone,
    streetAddress: entry.streetAddress || COMPANY_STREET,
    cityStateZip: entry.cityStateZip || entry.location || COMPANY_CITY_STATE_ZIP,
    storeName: entry.storeName,
    website: entry.website || "www.DossaniParadise.com",
  };
}

function draftToUser(draft: Draft): DirectoryUser {
  return {
    id: "employee",
    displayName: draft.displayName.trim() || "Your Name",
    email: draft.email.trim() || "you@dossaniparadise.com",
    jobTitle: draft.jobTitle.trim() || "Title",
    department: "Operations",
    phone: formatPhoneNumber(draft.phone),
    company: COMPANY_NAME,
    website: draft.website.trim() || COMPANY_WEBSITE,
    streetAddress: draft.streetAddress.trim(),
    cityStateZip: draft.cityStateZip.trim(),
    location: draft.cityStateZip.trim(),
    storeName: draft.storeName.trim() || undefined,
    groups: [],
    signatureId: "t-dossani",
    source: "findmi",
  };
}

function haystack(entry: DirectoryEntry): string {
  return [
    entry.displayName,
    entry.email,
    entry.jobTitle,
    entry.storeName,
    entry.storeNumber,
    entry.department,
  ]
    .join(" ")
    .toLowerCase();
}

export function SignatureStudio() {
  const [template, setTemplate] = useState<SignatureTemplate>(DEMO_TEMPLATES[0]);
  const [mode, setMode] = useState<"findmi" | "manual">("findmi");
  const [query, setQuery] = useState("");
  const [directory, setDirectory] = useState<DirectoryEntry[]>([]);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<DirectoryEntry | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [openResults, setOpenResults] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError("");
      try {
        const stamp = Date.now();
        const [dirRes, templateRes] = await Promise.all([
          fetch(`/api/findmi/directory?ts=${stamp}`, { cache: "no-store" }),
          fetch(`/api/signature/template?ts=${stamp}`, { cache: "no-store" }),
        ]);
        const data = await dirRes.json();
        if (!dirRes.ok || !data.ok) {
          throw new Error(data.error || "Could not load FindMi directory");
        }
        if (!cancelled) setDirectory(data.users as DirectoryEntry[]);

        const templateData = await templateRes.json().catch(() => null);
        if (
          !cancelled &&
          templateRes.ok &&
          templateData?.ok &&
          templateData.template
        ) {
          setTemplate(templateData.template as SignatureTemplate);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "FindMi directory failed",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return directory.filter((entry) => haystack(entry).includes(q)).slice(0, 12);
  }, [directory, query]);

  const user = useMemo(() => draftToUser(draft), [draft]);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const html = useMemo(
    () => renderSignatureHtml({ user, template, origin }),
    [user, template, origin],
  );

  const ready =
    Boolean(draft.displayName.trim()) &&
    Boolean(draft.email.trim()) &&
    Boolean(draft.jobTitle.trim());

  function patch(partial: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...partial }));
    setCopied(false);
  }

  function choose(entry: DirectoryEntry) {
    setPicked(entry);
    setDraft(entryToDraft(entry));
    setQuery(entry.displayName);
    setOpenResults(false);
    setCopied(false);
  }

  function switchMode(next: "findmi" | "manual") {
    setMode(next);
    setCopied(false);
    if (next === "manual" && !picked) {
      setDraft((current) => ({
        ...current,
        website: current.website || "www.DossaniParadise.com",
      }));
    }
  }

  async function copy() {
    setCopyError("");
    try {
      await copySignatureHtml(html);
      setCopied(true);
    } catch {
      setCopyError("Copy failed. Select the preview and copy it manually.");
    }
  }

  return (
    <div className={`dpm-studio ${display.variable} ${body.variable}`}>
      <div className="dpm-studio-inner">
        <header className="dpm-studio-nav">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="dpm-lockup"
            src="/dpm-lockup.png"
            alt="Dossani Paradise Management"
          />
          <a className="dpm-nav-link" href="/login">
            Staff / IT login
          </a>
        </header>

        <section className="dpm-hero">
          <h1>Dossani Signature Creator</h1>
        </section>

        <div className="dpm-board">
          <section className="dpm-panel">
            <h2>01 · Your details</h2>
            <div className="dpm-modes">
              <button
                type="button"
                className={`dpm-mode ${mode === "findmi" ? "active" : ""}`}
                onClick={() => switchMode("findmi")}
              >
                <strong>FindMi</strong>
                <span>Search the live DPM directory</span>
              </button>
              <button
                type="button"
                className={`dpm-mode ${mode === "manual" ? "active" : ""}`}
                onClick={() => switchMode("manual")}
              >
                <strong>Type it in</strong>
                <span>Enter your information by hand</span>
              </button>
            </div>

            {mode === "findmi" ? (
              <>
                <p className={`dpm-status ${loadError ? "error" : ""}`}>
                  {loading
                    ? "Loading FindMi…"
                    : loadError
                      ? loadError
                      : `${directory.length} people and stores ready. Type at least two letters.`}
                </p>
                <div className="dpm-search">
                  <input
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setOpenResults(true);
                    }}
                    onFocus={() => setOpenResults(true)}
                    placeholder="Search name, email, store, or title"
                    autoComplete="off"
                    aria-label="Search FindMi directory"
                  />
                  {openResults && matches.length > 0 ? (
                    <div className="dpm-results" role="listbox">
                      {matches.map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          className="dpm-result"
                          onClick={() => choose(entry)}
                        >
                          <b>{entry.displayName}</b>
                          <em>
                            {entry.jobTitle}
                            {entry.storeName ? ` · ${entry.storeName}` : ""}
                            {entry.email ? ` · ${entry.email}` : ""}
                          </em>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                {picked ? (
                  <div className="dpm-picked">
                    <div>
                      <strong>{picked.displayName}</strong>
                      <div>
                        <small>
                          {FINDMI_ROLE_LABELS[picked.findMiRole]} ·{" "}
                          {picked.jobTitle}
                        </small>
                      </div>
                    </div>
                    <small>Edit below if anything is off</small>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="dpm-status">
                Fill in the fields you want on the signature. Phone numbers are
                dashed automatically.
              </p>
            )}

            <div className="dpm-field">
              <label htmlFor="displayName">Name</label>
              <input
                id="displayName"
                value={draft.displayName}
                onChange={(e) => patch({ displayName: e.target.value })}
              />
            </div>
            <div className="dpm-field">
              <label htmlFor="jobTitle">Title</label>
              <input
                id="jobTitle"
                value={draft.jobTitle}
                onChange={(e) => patch({ jobTitle: e.target.value })}
              />
            </div>
            <div className="dpm-grid-2">
              <div className="dpm-field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  value={draft.email}
                  onChange={(e) => patch({ email: e.target.value })}
                />
              </div>
              <div className="dpm-field">
                <label htmlFor="phone">Phone</label>
                <input
                  id="phone"
                  value={draft.phone}
                  onChange={(e) => patch({ phone: e.target.value })}
                  onBlur={(e) =>
                    patch({ phone: formatPhoneNumber(e.target.value) })
                  }
                />
              </div>
            </div>
            <div className="dpm-field">
              <label htmlFor="storeName">Store or team (optional)</label>
              <input
                id="storeName"
                value={draft.storeName}
                onChange={(e) => patch({ storeName: e.target.value })}
              />
            </div>
            <div className="dpm-field">
              <label htmlFor="streetAddress">Street</label>
              <input
                id="streetAddress"
                value={draft.streetAddress}
                onChange={(e) => patch({ streetAddress: e.target.value })}
              />
            </div>
            <div className="dpm-field">
              <label htmlFor="cityStateZip">City, state, ZIP</label>
              <input
                id="cityStateZip"
                value={draft.cityStateZip}
                onChange={(e) => patch({ cityStateZip: e.target.value })}
              />
            </div>
          </section>

          <section className="dpm-panel">
            <h2>02 · Copy into Outlook</h2>
            <div className="dpm-letter">
              <p className="dpm-letter-meta">Live preview</p>
              <div dangerouslySetInnerHTML={{ __html: html }} />
            </div>
            <div className="dpm-actions">
              <button
                type="button"
                className="dpm-btn dpm-btn-primary"
                onClick={() => void copy()}
                disabled={!ready}
              >
                Copy signature
              </button>
              <button
                type="button"
                className="dpm-btn dpm-btn-ghost"
                onClick={() => {
                  setDraft(EMPTY);
                  setPicked(null);
                  setQuery("");
                  setCopied(false);
                }}
              >
                Clear
              </button>
            </div>
            {copied ? (
              <p className="dpm-toast">Copied. Paste it in the Outlook steps below.</p>
            ) : null}
            {copyError ? <p className="dpm-status error">{copyError}</p> : null}
            {!ready ? (
              <p className="dpm-status">Name, title, and email are required to copy.</p>
            ) : null}

            <div className="dpm-steps">
              <h2>03 · Install in Outlook</h2>
              <details className="dpm-step" open>
                <summary>Outlook for Windows</summary>
                <ol>
                  <li>Click <strong>Copy signature</strong> above.</li>
                  <li>Open the Outlook desktop app.</li>
                  <li>
                    Go to <strong>File → Options → Mail → Signatures…</strong>
                  </li>
                  <li>
                    Click <strong>New</strong>, name it{" "}
                    <em>DPM Corporate</em>, then click in the signature editor.
                  </li>
                  <li>
                    Paste with <strong>Ctrl+V</strong>. The logo and formatting
                    should appear.
                  </li>
                  <li>
                    Set it as the default for new messages and replies/forwards,
                    then click <strong>OK</strong>.
                  </li>
                  <li>Compose a new email and confirm the signature at the bottom.</li>
                </ol>
              </details>
              <details className="dpm-step">
                <summary>Outlook on the web</summary>
                <ol>
                  <li>Click <strong>Copy signature</strong> above.</li>
                  <li>
                    In Outlook on the web, open <strong>Settings</strong> (gear),
                    then <strong>Mail → Compose and reply</strong>.
                  </li>
                  <li>
                    Paste into the email signature box with{" "}
                    <strong>Ctrl+V</strong> (or Cmd+V on Mac).
                  </li>
                  <li>
                    Turn on the signature for new messages and replies, then{" "}
                    <strong>Save</strong>.
                  </li>
                </ol>
              </details>
              <details className="dpm-step">
                <summary>Outlook for Mac</summary>
                <ol>
                  <li>Click <strong>Copy signature</strong> above.</li>
                  <li>
                    Open Outlook for Mac, then{" "}
                    <strong>Outlook → Settings → Signatures</strong> (or{" "}
                    <strong>Tools → Signatures</strong> on older builds).
                  </li>
                  <li>
                    Create a signature named <em>DPM Corporate</em> and paste
                    with <strong>Cmd+V</strong>.
                  </li>
                  <li>
                    Assign it as the default for the DPM mailbox, then send a
                    test message to yourself.
                  </li>
                </ol>
              </details>
              <details className="dpm-step">
                <summary>iPhone or iPad</summary>
                <ol>
                  <li>Tap <strong>Copy signature</strong> above.</li>
                  <li>
                    Open <strong>Safari</strong> and go to{" "}
                    <a href="https://outlook.office.com" target="_blank" rel="noreferrer">
                      outlook.office.com
                    </a>
                    , then sign in.
                  </li>
                  <li>
                    Tap your profile picture, then{" "}
                    <strong>View all Outlook settings</strong>.
                  </li>
                  <li>
                    Go to <strong>Mail → Compose and reply</strong>.
                  </li>
                  <li>
                    Tap in the signature box, tap and hold, then tap{" "}
                    <strong>Paste</strong>. The logo and formatting should appear.
                  </li>
                  <li>
                    Turn the signature on for new messages and replies, then tap{" "}
                    <strong>Save</strong>.
                  </li>
                  <li>
                    The Outlook iPhone app’s own Signature screen is plain text
                    only and will not keep the logo. Use Outlook on the web
                    (this path) or a computer for the formatted signature.
                  </li>
                </ol>
              </details>
              <details className="dpm-step">
                <summary>Android</summary>
                <ol>
                  <li>Tap <strong>Copy signature</strong> above.</li>
                  <li>
                    Open <strong>Chrome</strong> and go to{" "}
                    <a href="https://outlook.office.com" target="_blank" rel="noreferrer">
                      outlook.office.com
                    </a>
                    , then sign in.
                  </li>
                  <li>
                    Tap your profile picture, then{" "}
                    <strong>View all Outlook settings</strong>.
                  </li>
                  <li>
                    Go to <strong>Mail → Compose and reply</strong>.
                  </li>
                  <li>
                    Tap and hold in the signature box, then tap{" "}
                    <strong>Paste</strong>. The logo and formatting should appear.
                  </li>
                  <li>
                    Turn the signature on for new messages and replies, then tap{" "}
                    <strong>Save</strong>.
                  </li>
                  <li>
                    The Outlook Android app’s own Signature screen is plain text
                    only and will not keep the logo. Use Outlook on the web
                    (this path) or a computer for the formatted signature.
                  </li>
                </ol>
              </details>
            </div>
          </section>
        </div>
        <p className="dpm-foot">{COMPANY_NAME}</p>
      </div>
    </div>
  );
}
