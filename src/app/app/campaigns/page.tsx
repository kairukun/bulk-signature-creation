"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import type { Campaign, Department } from "@/lib/types";
import { DEPARTMENTS } from "@/lib/departments";

function emptyCampaign(): Campaign {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: `c-${crypto.randomUUID().slice(0, 8)}`,
    name: "New campaign",
    bannerText: "Announce something important →",
    bannerUrl: "https://example.com/campaign",
    backgroundColor: "#0F3D3E",
    textColor: "#FFFFFF",
    startDate: today,
    endDate: today,
    active: true,
    clicks: 0,
    views: 0,
    targetDepartments: ["All"],
  };
}

export default function CampaignsPage() {
  const {
    campaigns,
    upsertCampaign,
    deleteCampaign,
    canManageCampaigns,
    hydrated,
    recordCampaignClick,
  } = useStore();
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [message, setMessage] = useState("");

  if (!hydrated) return <p className="muted">Loading…</p>;

  function save() {
    if (!editing || !canManageCampaigns) return;
    upsertCampaign(editing);
    setMessage("Campaign saved.");
    setEditing(null);
  }

  async function simulateClick(campaign: Campaign) {
    recordCampaignClick(campaign.id);
    const res = await fetch(
      `/api/track/${campaign.id}?to=${encodeURIComponent(campaign.bannerUrl)}&demo=1`,
    );
    const data = await res.json();
    setMessage(`Tracked click for ${campaign.name}. Redirect target: ${data.to}`);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Banners</h1>
          <p>
            Optional notices under the signature (leasing promos, webinars). For
            internal DPM use — not a marketing SaaS.
          </p>
        </div>
        {canManageCampaigns ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setEditing(emptyCampaign())}
          >
            New banner
          </button>
        ) : (
          <span className="badge">Marketing/IT/Admin can edit</span>
        )}
      </div>

      {message ? <p className="toast">{message}</p> : null}

      <div className="card-grid" style={{ marginBottom: "1rem" }}>
        {campaigns.map((campaign) => {
          const ctr =
            campaign.views > 0
              ? ((campaign.clicks / campaign.views) * 100).toFixed(1)
              : "0.0";
          return (
            <article key={campaign.id} className="panel-card">
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                <h3>{campaign.name}</h3>
                <span className={`badge ${campaign.active ? "ok" : ""}`}>
                  {campaign.active ? "Active" : "Paused"}
                </span>
              </div>
              <p style={{ marginTop: "0.5rem" }}>{campaign.bannerText}</p>
              <p className="muted" style={{ marginTop: "0.6rem" }}>
                {campaign.startDate} → {campaign.endDate}
              </p>
              <p className="muted" style={{ marginTop: "0.35rem" }}>
                {campaign.views.toLocaleString()} views ·{" "}
                {campaign.clicks.toLocaleString()} clicks · {ctr}% CTR
              </p>
              <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditing(campaign)}
                  disabled={!canManageCampaigns}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => simulateClick(campaign)}
                >
                  Simulate click
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={!canManageCampaigns}
                  onClick={() => deleteCampaign(campaign.id)}
                >
                  Delete
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {editing ? (
        <section className="panel-card">
          <h3>{editing.id.startsWith("c-") ? "Create campaign" : "Edit campaign"}</h3>
          <div className="field-row" style={{ marginTop: "1rem" }}>
            <div className="field">
              <label htmlFor="cname">Name</label>
              <input
                id="cname"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="curl">Destination URL</label>
              <input
                id="curl"
                value={editing.bannerUrl}
                onChange={(e) =>
                  setEditing({ ...editing, bannerUrl: e.target.value })
                }
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="ctext">Banner text</label>
            <input
              id="ctext"
              value={editing.bannerText}
              onChange={(e) =>
                setEditing({ ...editing, bannerText: e.target.value })
              }
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="start">Start</label>
              <input
                id="start"
                type="date"
                value={editing.startDate}
                onChange={(e) =>
                  setEditing({ ...editing, startDate: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label htmlFor="end">End</label>
              <input
                id="end"
                type="date"
                value={editing.endDate}
                onChange={(e) =>
                  setEditing({ ...editing, endDate: e.target.value })
                }
              />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="bg">Background</label>
              <input
                id="bg"
                type="color"
                value={editing.backgroundColor}
                onChange={(e) =>
                  setEditing({ ...editing, backgroundColor: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label htmlFor="fg">Text</label>
              <input
                id="fg"
                type="color"
                value={editing.textColor}
                onChange={(e) =>
                  setEditing({ ...editing, textColor: e.target.value })
                }
              />
            </div>
          </div>
          <div className="field">
            <label>Target departments</label>
            <div className="chip-row">
              {DEPARTMENTS.map((dept) => {
                const active = editing.targetDepartments.includes(dept);
                return (
                  <button
                    key={dept}
                    type="button"
                    className={`chip ${active ? "active" : ""}`}
                    onClick={() => {
                      const next = active
                        ? editing.targetDepartments.filter((d) => d !== dept)
                        : [...editing.targetDepartments, dept];
                      setEditing({
                        ...editing,
                        targetDepartments: next.length ? next : ["All"],
                      });
                    }}
                  >
                    {dept}
                  </button>
                );
              })}
            </div>
          </div>
          <label>
            <input
              type="checkbox"
              checked={editing.active}
              onChange={(e) =>
                setEditing({ ...editing, active: e.target.checked })
              }
            />{" "}
            Active
          </label>
          <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
            <button type="button" className="btn btn-primary" onClick={save}>
              Save campaign
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setEditing(null)}
            >
              Cancel
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
