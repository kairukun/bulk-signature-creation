"use client";

import { useStore } from "@/lib/store";
import type { SignatureTemplate } from "@/lib/types";

export default function UsersPage() {
  const {
    users,
    templates,
    settings,
    updateUser,
    syncDirectory,
    canDeploy,
    hydrated,
  } = useStore();

  if (!hydrated) return <p className="muted">Loading…</p>;

  function assign(userId: string, signatureId: string) {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    updateUser({ ...user, signatureId: signatureId || undefined });
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>People</h1>
          <p>
            Staff pulled from Microsoft 365 (or sample data until the tenant is
            connected). Addresses can come from FindMi / directory fields.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={syncDirectory}
          disabled={!canDeploy}
        >
          Sync directory
        </button>
      </div>

      <div className="panel-card" style={{ marginBottom: "1rem" }}>
        <p>
          Mode:{" "}
          <span className={`badge ${settings.m365Connected ? "ok" : ""}`}>
            {settings.m365Connected ? "Microsoft 365 tenant" : "Sample people list"}
          </span>
        </p>
        <p className="muted" style={{ marginTop: "0.4rem" }}>
          Last sync:{" "}
          {settings.lastSyncAt
            ? new Date(settings.lastSyncAt).toLocaleString()
            : "Never"}
        </p>
      </div>

      <div className="panel-card" style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Title / Dept</th>
              <th>Groups</th>
              <th>Signature</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <strong>{user.displayName}</strong>
                  <div className="muted">{user.email}</div>
                  <div className="muted">{user.phone}</div>
                </td>
                <td>
                  {user.jobTitle}
                  <div className="muted">{user.department}</div>
                  <div className="muted">
                    {user.streetAddress || user.location}
                    {user.cityStateZip ? ` · ${user.cityStateZip}` : ""}
                  </div>
                </td>
                <td>{user.groups.join(", ")}</td>
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
