"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { APP_NAME, COMPANY_SHORT } from "@/lib/constants";
import { useStore } from "@/lib/store";
import type { Role } from "@/lib/types";

const NAV = [
  { href: "/app", label: "Overview" },
  { href: "/app/signatures", label: "Signatures" },
  { href: "/app/users", label: "FindMi directory" },
  { href: "/app/campaigns", label: "Banners" },
  { href: "/app/deploy", label: "Deploy to M365" },
  { href: "/app/settings", label: "M365 setup" },
];

const ROLES: { value: Role; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "it", label: "IT" },
  { value: "marketing", label: "Marketing" },
  { value: "viewer", label: "View only" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { settings, setRole, hydrated } = useStore();

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">{COMPANY_SHORT.slice(0, 1)}</span>
          <span>
            {APP_NAME}
            <small>Internal · {settings.companyName}</small>
          </span>
        </div>
        <nav>
          {NAV.map((item) => {
            const active =
              item.href === "/app"
                ? pathname === "/app"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "nav-link active" : "nav-link"}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <label htmlFor="role-switch">Your access</label>
          <select
            id="role-switch"
            value={settings.role}
            onChange={(e) => setRole(e.target.value as Role)}
            disabled={!hydrated}
          >
            {ROLES.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
          <p className="muted">
            {settings.findMiConnected
              ? `FindMi · ${settings.m365Connected ? "M365 ready" : "stores loaded"}`
              : settings.m365Connected
                ? "Tenant connected"
                : "Sample data"}
          </p>
          <button
            type="button"
            className="btn btn-ghost"
            style={{
              marginTop: "0.75rem",
              width: "100%",
              color: "#edf4f3",
              borderColor: "rgba(255,255,255,0.25)",
            }}
            onClick={() => void signOut()}
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="main-panel">{children}</main>
    </div>
  );
}
