"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { SignatureTemplate } from "@/lib/types";

export default function UsersPage() {
  const {
    users,
    stores,
    templates,
    settings,
    updateUser,
    syncFindMiStores,
    canDeploy,
    hydrated,
  } = useStore();

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const storeUsers = useMemo(
    () => users.filter((u) => u.source === "findmi"),
    [users],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = storeUsers.length ? storeUsers : users;
    if (!q) return list;
    return list.filter((u) =>
      [
        u.displayName,
        u.email,
        u.phone,
        u.storeName,
        u.storeNumber,
        u.streetAddress,
        u.cityStateZip,
        u.jobTitle,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [storeUsers, users, query]);

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
      setMessage(
        `Synced ${result.count} stores from FindMi (name, address, phone, email).`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "FindMi sync failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>FindMi stores</h1>
          <p>
            Pull store name, address, phone, and email from{" "}
            <a
              href="https://dossaniparadise.github.io/DPM-FindMi/"
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: "underline" }}
            >
              DPM FindMi
            </a>{" "}
            for store mailbox signatures.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={sync}
          disabled={!canDeploy || busy}
        >
          {busy ? "Syncing…" : "Sync from FindMi"}
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
              ? `${stores.length} stores loaded`
              : "Not synced yet"}
          </span>
        </p>
        <p className="muted" style={{ marginTop: "0.4rem" }}>
          Last FindMi sync:{" "}
          {settings.lastFindMiSyncAt
            ? new Date(settings.lastFindMiSyncAt).toLocaleString()
            : "Never"}
        </p>
        <div className="field" style={{ marginTop: "0.85rem", marginBottom: 0 }}>
          <label htmlFor="store-search">Search stores</label>
          <input
            id="store-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, #, email, phone, city…"
          />
        </div>
      </div>

      <div className="panel-card" style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Store</th>
              <th>Address (FindMi)</th>
              <th>Phone / Email</th>
              <th>Signature</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => (
              <tr key={user.id}>
                <td>
                  <strong>{user.storeName || user.displayName}</strong>
                  <div className="muted">
                    {user.storeNumber ? `${user.storeNumber} · ` : ""}
                    {user.displayName}
                  </div>
                  <div className="muted">{user.jobTitle}</div>
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
              </tr>
            ))}
            {!filtered.length ? (
              <tr>
                <td colSpan={4} className="muted">
                  No stores yet. Click <strong>Sync from FindMi</strong> to load
                  restaurant records for signatures.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
