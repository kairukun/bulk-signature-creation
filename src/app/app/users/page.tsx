"use client";

import { useMemo, useState } from "react";
import { FINDMI_ROLE_LABELS } from "@/lib/findmi";
import { useStore } from "@/lib/store";
import type { DirectoryUser, FindMiRole, SignatureTemplate } from "@/lib/types";

type TabFilter = "all" | FindMiRole;

const TABS: { id: TabFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "store", label: "Stores" },
  { id: "admin", label: "Admins" },
  { id: "vp", label: "Leadership" },
  { id: "director", label: "Directors" },
  { id: "district_manager", label: "District Managers" },
  { id: "repair_technician", label: "Repair Techs" },
  { id: "entity", label: "Entities" },
  { id: "other", label: "Other" },
];

export default function UsersPage() {
  const {
    users,
    stores,
    templates,
    settings,
    findMiOverrides,
    updateUser,
    clearFindMiOverrides,
    syncFindMiStores,
    canDeploy,
    hydrated,
  } = useStore();

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<TabFilter>("all");
  const [editing, setEditing] = useState<DirectoryUser | null>(null);

  const findMiUsers = useMemo(
    () => users.filter((u) => u.source === "findmi"),
    [users],
  );

  const counts = useMemo(() => {
    const base: Record<FindMiRole, number> = {
      store: 0,
      admin: 0,
      vp: 0,
      director: 0,
      district_manager: 0,
      repair_technician: 0,
      entity: 0,
      other: 0,
    };
    for (const user of findMiUsers) {
      if (user.findMiRole) base[user.findMiRole] += 1;
    }
    return base;
  }, [findMiUsers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return findMiUsers.filter((u) => {
      if (tab !== "all" && u.findMiRole !== tab) return false;
      if (!q) return true;
      return [
        u.displayName,
        u.email,
        u.phone,
        u.storeName,
        u.storeNumber,
        u.streetAddress,
        u.cityStateZip,
        u.jobTitle,
        u.findMiRole ? FINDMI_ROLE_LABELS[u.findMiRole] : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [findMiUsers, query, tab]);

  if (!hydrated) return <p className="muted">Loading…</p>;

  function assign(userId: string, signatureId: string) {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    updateUser({ ...user, signatureId: signatureId || undefined });
  }

  async function sync() {
    if (!canDeploy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await syncFindMiStores();
      const c = result.counts;
      setMessage(
        `Refreshed FindMi — ${result.count} records (stores ${c.store || 0}, admins ${c.admin || 0}, leadership ${c.vp || 0}, directors ${c.director || 0}, district managers ${c.district_manager || 0}, techs ${c.repair_technician || 0}, entities ${c.entity || 0}, other ${c.other || 0}). Updated ${result.updated}, added ${result.added}, removed ${result.removed}. Local edits kept: ${result.localEditsKept}.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "FindMi sync failed");
    } finally {
      setBusy(false);
    }
  }

  function saveEdit() {
    if (!editing || !canDeploy) return;
    updateUser({
      ...editing,
      location: editing.cityStateZip || editing.streetAddress || editing.location,
    });
    setEditing(null);
    setMessage("Saved local edits. They stay applied on the next FindMi sync.");
  }

  async function resetEdits(userId: string) {
    clearFindMiOverrides(userId);
    setEditing(null);
    setBusy(true);
    try {
      await syncFindMiStores();
      setMessage("Cleared local edits and refreshed that record from FindMi.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not refresh from FindMi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>FindMi directory</h1>
          <p>
            Sync every FindMi store and person (admins, leadership, directors,
            district managers, repair techs, entities, and any other people
            maps) from{" "}
            <a
              href="https://dossaniparadise.github.io/DPM-FindMi/"
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: "underline" }}
            >
              DPM FindMi
            </a>
            . Each sync pulls live titles, departments, phones, and role
            changes. Local edits stay applied only where they still differ.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={sync}
          disabled={!canDeploy || busy}
        >
          {busy ? "Refreshing…" : "Sync from FindMi"}
        </button>
      </div>

      {message ? <p className="toast">{message}</p> : null}
      {error ? (
        <p className="badge" style={{ marginBottom: "1rem" }}>
          {error}
        </p>
      ) : null}

      <div className="panel-card" style={{ marginBottom: "1rem" }}>
        <p>
          Status:{" "}
          <span className={`badge ${settings.findMiConnected ? "ok" : ""}`}>
            {settings.findMiConnected
              ? `${findMiUsers.length} people · ${stores.length} stores`
              : "Not synced yet"}
          </span>
          {Object.keys(findMiOverrides).length ? (
            <span className="badge" style={{ marginLeft: "0.4rem" }}>
              {Object.keys(findMiOverrides).length} locally edited
            </span>
          ) : null}
        </p>
        <p className="muted" style={{ marginTop: "0.4rem" }}>
          Last FindMi sync:{" "}
          {settings.lastFindMiSyncAt
            ? new Date(settings.lastFindMiSyncAt).toLocaleString()
            : "Never"}
        </p>

        <div className="chip-row" style={{ marginTop: "0.85rem" }}>
          {TABS.map((item) => {
            const count =
              item.id === "all" ? findMiUsers.length : counts[item.id];
            return (
              <button
                key={item.id}
                type="button"
                className={`chip ${tab === item.id ? "active" : ""}`}
                onClick={() => setTab(item.id)}
              >
                {item.label} ({count})
              </button>
            );
          })}
        </div>

        <div className="field" style={{ marginTop: "0.85rem", marginBottom: 0 }}>
          <label htmlFor="directory-search">Search</label>
          <input
            id="directory-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, role, email, phone, store, city…"
          />
        </div>
      </div>

      <div className="panel-card" style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Person / Store</th>
              <th>Role</th>
              <th>Address</th>
              <th>Phone / Email</th>
              <th>Signature</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => (
              <tr key={user.id}>
                <td>
                  <strong>
                    {user.findMiRole === "store"
                      ? user.storeName || user.displayName
                      : user.displayName}
                  </strong>
                  <div className="muted">
                    {user.findMiRole === "store"
                      ? `${user.storeNumber ? `${user.storeNumber} · ` : ""}${user.displayName}`
                      : user.jobTitle}
                  </div>
                  {user.editedLocally ? (
                    <div className="badge" style={{ marginTop: "0.35rem" }}>
                      Edited locally
                    </div>
                  ) : null}
                </td>
                <td>
                  {user.findMiRole
                    ? FINDMI_ROLE_LABELS[user.findMiRole]
                    : "—"}
                </td>
                <td>
                  <div>{user.streetAddress || user.location || "—"}</div>
                  <div className="muted">{user.cityStateZip}</div>
                </td>
                <td>
                  <div>{user.phone || "—"}</div>
                  <div className="muted">{user.email || "—"}</div>
                </td>
                <td>
                  <select
                    value={user.signatureId ?? ""}
                    disabled={!canDeploy}
                    onChange={(e) => assign(user.id, e.target.value)}
                  >
                    <option value="">Auto / department</option>
                    {templates.map((t: SignatureTemplate) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={!canDeploy}
                    onClick={() => setEditing({ ...user })}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {!filtered.length ? (
              <tr>
                <td colSpan={6} className="muted">
                  No FindMi records yet. Click <strong>Sync from FindMi</strong>{" "}
                  to load stores and leadership.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {editing ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 30, 28, 0.45)",
            display: "grid",
            placeItems: "center",
            zIndex: 40,
            padding: "1rem",
          }}
        >
          <section
            className="panel-card"
            style={{ width: "min(560px, 100%)", maxHeight: "90vh", overflow: "auto" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
              <div>
                <h3 style={{ margin: 0 }}>Edit FindMi record</h3>
                <p className="muted" style={{ marginTop: "0.35rem" }}>
                  {editing.findMiRole
                    ? FINDMI_ROLE_LABELS[editing.findMiRole]
                    : "Record"}{" "}
                  · changes are local to this signature tool
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setEditing(null)}
              >
                Close
              </button>
            </div>

            <div className="field-row" style={{ marginTop: "1rem" }}>
              <div className="field">
                <label htmlFor="edit-name">Name</label>
                <input
                  id="edit-name"
                  value={editing.displayName}
                  onChange={(e) =>
                    setEditing({ ...editing, displayName: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="edit-title">Title</label>
                <input
                  id="edit-title"
                  value={editing.jobTitle}
                  onChange={(e) =>
                    setEditing({ ...editing, jobTitle: e.target.value })
                  }
                />
              </div>
            </div>

            {editing.findMiRole === "store" ? (
              <div className="field-row">
                <div className="field">
                  <label htmlFor="edit-store-name">Store name</label>
                  <input
                    id="edit-store-name"
                    value={editing.storeName || ""}
                    onChange={(e) =>
                      setEditing({ ...editing, storeName: e.target.value })
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor="edit-store-number">Store number</label>
                  <input
                    id="edit-store-number"
                    value={editing.storeNumber || ""}
                    onChange={(e) =>
                      setEditing({ ...editing, storeNumber: e.target.value })
                    }
                  />
                </div>
              </div>
            ) : null}

            <div className="field">
              <label htmlFor="edit-street">Street address</label>
              <input
                id="edit-street"
                value={editing.streetAddress || ""}
                onChange={(e) =>
                  setEditing({ ...editing, streetAddress: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label htmlFor="edit-csz">City, state, zip</label>
              <input
                id="edit-csz"
                value={editing.cityStateZip || ""}
                onChange={(e) =>
                  setEditing({ ...editing, cityStateZip: e.target.value })
                }
              />
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="edit-phone">Phone</label>
                <input
                  id="edit-phone"
                  value={editing.phone}
                  onChange={(e) =>
                    setEditing({ ...editing, phone: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="edit-email">Email</label>
                <input
                  id="edit-email"
                  value={editing.email}
                  onChange={(e) =>
                    setEditing({ ...editing, email: e.target.value })
                  }
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
              <button type="button" className="btn btn-primary" onClick={saveEdit}>
                Save edits
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => resetEdits(editing.id)}
                disabled={busy}
              >
                Reset from FindMi
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
