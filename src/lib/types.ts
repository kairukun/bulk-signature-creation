export type Role = "admin" | "it" | "marketing" | "viewer";

export type Department =
  | "All"
  | "Executive"
  | "Sales"
  | "Marketing"
  | "Engineering"
  | "Support"
  | "Finance"
  | "HR";

export interface DirectoryUser {
  id: string;
  displayName: string;
  email: string;
  jobTitle: string;
  department: Department;
  phone: string;
  mobile?: string;
  company: string;
  website: string;
  location: string;
  photoUrl?: string;
  linkedIn?: string;
  twitter?: string;
  signatureId?: string;
  groups: string[];
}

export interface SignatureTemplate {
  id: string;
  name: string;
  description: string;
  layout: "classic" | "modern" | "compact" | "stacked";
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  showPhoto: boolean;
  showLogo: boolean;
  showSocial: boolean;
  logoUrl: string;
  logoAlt: string;
  ctaLabel: string;
  ctaUrl: string;
  disclaimer: string;
  assignedDepartments: Department[];
  assignedGroups: string[];
  assignedUserIds: string[];
  campaignId?: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  bannerText: string;
  bannerUrl: string;
  bannerImageUrl?: string;
  backgroundColor: string;
  textColor: string;
  startDate: string;
  endDate: string;
  active: boolean;
  clicks: number;
  views: number;
  targetDepartments: Department[];
}

export interface AppSettings {
  companyName: string;
  companyLogo: string;
  role: Role;
  m365Connected: boolean;
  tenantId: string;
  deployMode: "demo" | "exchange-rule" | "outlook-roaming";
  lastSyncAt?: string;
  lastDeployAt?: string;
}

export interface AppState {
  users: DirectoryUser[];
  templates: SignatureTemplate[];
  campaigns: Campaign[];
  settings: AppSettings;
}
