export type Role = "admin" | "it" | "marketing" | "viewer";

export type Department =
  | "All"
  | "Executive"
  | "Administrative"
  | "Marketing"
  | "Development"
  | "Finance"
  | "Accounting"
  | "HR"
  | "IT"
  | "Operations"
  | "Above Store Leader"
  | "Area Coach"
  | "Repair and Maintenance";

export type FindMiRole =
  | "store"
  | "admin"
  | "vp"
  | "director"
  | "district_manager"
  | "repair_technician"
  | "entity"
  | "other";

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
  /** Street address (e.g. from FindMi / directory) */
  streetAddress?: string;
  /** City, state, zip line */
  cityStateZip?: string;
  location: string;
  photoUrl?: string;
  linkedIn?: string;
  twitter?: string;
  signatureId?: string;
  groups: string[];
  /** FindMi restaurant id when this recipient is a store mailbox */
  storeId?: string;
  storeName?: string;
  storeNumber?: string;
  findMiRole?: FindMiRole;
  findMiId?: string;
  editedLocally?: boolean;
  source?: "sample" | "findmi" | "m365";
}

export interface FindMiStoreRecord {
  id: string;
  storeName: string;
  storeNumber: string;
  address: string;
  streetAddress: string;
  cityStateZip: string;
  email: string;
  phone: string;
  storeManager: string;
  entity: string;
  division: string;
}

export type SignatureLayout =
  | "corporate"
  | "classic"
  | "modern"
  | "compact"
  | "stacked";

export interface SignatureTemplate {
  id: string;
  name: string;
  description: string;
  layout: SignatureLayout;
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  showPhoto: boolean;
  showLogo: boolean;
  showSocial: boolean;
  showThankYou: boolean;
  /** Image URL or data URL for the company logo */
  logoUrl: string;
  logoAlt: string;
  /** Display width in pixels for the logo image */
  logoWidth: number;
  companyNameLine1: string;
  companyNameLine2: string;
  companyNameLine2Color: string;
  ctaLabel: string;
  ctaUrl: string;
  websiteDisplay: string;
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
  findMiConnected: boolean;
  tenantId: string;
  /** Non-secret app registration id (reference / checklist). Secrets stay on the host. */
  azureClientId: string;
  /** Optional *.onmicrosoft.com (or custom) domain for Exchange Admin API routing notes. */
  azureOrgDomain: string;
  /** IT checklist: Exchange.ManageAsApp consented in Entra. */
  exchangeAppConsented: boolean;
  /** IT checklist: Exchange RBAC assigned to the app service principal. */
  exchangeRbacAssigned: boolean;
  deployMode: "demo" | "export-script" | "publish-rule";
  lastSyncAt?: string;
  lastFindMiSyncAt?: string;
  lastDeployAt?: string;
}

export interface AppState {
  users: DirectoryUser[];
  stores: FindMiStoreRecord[];
  /** Local edits on top of FindMi sync, keyed by directory user id */
  findMiOverrides: Record<string, Partial<DirectoryUser>>;
  templates: SignatureTemplate[];
  campaigns: Campaign[];
  settings: AppSettings;
}
