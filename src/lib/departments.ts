import type { Department, FindMiRole } from "./types";

/** DPM departments used across directory, signatures, and banners. */
export const DEPARTMENTS: Department[] = [
  "All",
  "Executive",
  "Administrative",
  "Marketing",
  "Development",
  "Finance",
  "Accounting",
  "HR",
  "IT",
  "Operations",
  "Above Store Leader",
  "Area Coach",
  "Repair and Maintenance",
];

/** Departments that can be assigned to people (excludes All). */
export const ASSIGNABLE_DEPARTMENTS: Department[] = DEPARTMENTS.filter(
  (d) => d !== "All",
);

const DEPARTMENT_SET = new Set<string>(ASSIGNABLE_DEPARTMENTS);

export function isDepartment(value: string): value is Department {
  return DEPARTMENT_SET.has(value) || value === "All";
}

/** Map FindMi role bucket → default DPM department. */
export function departmentForFindMiRole(role: FindMiRole): Department {
  switch (role) {
    case "admin":
      return "Administrative";
    case "vp":
      return "Executive";
    case "director":
      return "Above Store Leader";
    case "district_manager":
      return "Area Coach";
    case "repair_technician":
      return "Repair and Maintenance";
    case "entity":
      return "Finance";
    case "store":
      return "Operations";
    case "other":
    default:
      return "Operations";
  }
}

/**
 * Map a FindMi department / title string onto the DPM department list.
 * Falls back to role default when the string does not match.
 */
export function mapFindMiDepartment(
  raw?: string,
  role: FindMiRole = "other",
): Department {
  const d = String(raw || "")
    .trim()
    .toLowerCase();

  if (!d) return departmentForFindMiRole(role);

  if (d === "all") return "Operations";
  if (DEPARTMENT_SET.has(String(raw).trim())) {
    return String(raw).trim() as Department;
  }

  if (d.includes("executive") || d.includes("vp") || d.includes("vice president")) {
    return "Executive";
  }
  if (d.includes("administ")) return "Administrative";
  if (d.includes("market")) return "Marketing";
  if (d.includes("develop") || d.includes("engineer")) return "Development";
  if (d.includes("account")) return "Accounting";
  if (d.includes("finance")) return "Finance";
  if (d.includes("human") || d === "hr") return "HR";
  if (d === "it" || d.includes("information tech") || d.includes("overwatch")) {
    return "IT";
  }
  if (d.includes("above store") || d.includes("director")) {
    return "Above Store Leader";
  }
  if (d.includes("area coach") || d.includes("district")) {
    return "Area Coach";
  }
  if (d.includes("repair") || d.includes("maintenance") || d.includes("tech")) {
    return "Repair and Maintenance";
  }
  if (d.includes("operation") || d.includes("sales") || d.includes("support")) {
    return "Operations";
  }

  return departmentForFindMiRole(role);
}
