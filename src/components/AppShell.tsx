"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import type { Role } from "@/lib/types";

const NAV = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/signatures", label: "Signatures" },
  { href: "/app/users", label: "Directory" },
  { href: "/app/campaigns", label: "Campaigns" },
  { href: "/app/deploy", label: "Deploy" },
  { href: "/app/settings", label: "Settings" },
];

const ROLES: Role[] = ["admin", "it", "marketing", "viewer"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { settings, setRole, hydrated } = useStore();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-mark">B</span>
          <span>
            Bulk Signature
            <small>Creation</small>
          </span>
        </Link>
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
          <label htmlFor="role-switch">View as role</label>
          <select
            id="role-switch"
            value={settings.role}
            onChange={(e) => setRole(e.target.value as Role)}
            disabled={!hydrated}
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <p className="muted">
            {settings.m365Connected ? "M365 connected" : "Demo directory"}
          </p>
        </div>
      </aside>
      <main className="main-panel">{children}</main>
    </div>
  );
}
