export type AzureCredentials = {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  /** Optional default domain used for X-AnchorMailbox (e.g. contoso.onmicrosoft.com). */
  orgDomain?: string;
};

export function getAzureCredentials(): AzureCredentials | null {
  const tenantId = process.env.AZURE_AD_TENANT_ID?.trim();
  const clientId = process.env.AZURE_AD_CLIENT_ID?.trim();
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET?.trim();
  if (!tenantId || !clientId || !clientSecret) return null;

  const orgDomain = process.env.AZURE_AD_ORG_DOMAIN?.trim() || undefined;
  return { tenantId, clientId, clientSecret, orgDomain };
}

export function hasAzureCredentials(): boolean {
  return getAzureCredentials() !== null;
}

/** Non-secret flags for Settings / Deploy UI — never returns secret values. */
export function getAzureCredentialStatus() {
  const hasTenantId = Boolean(process.env.AZURE_AD_TENANT_ID?.trim());
  const hasClientId = Boolean(process.env.AZURE_AD_CLIENT_ID?.trim());
  const hasClientSecret = Boolean(process.env.AZURE_AD_CLIENT_SECRET?.trim());
  const hasOrgDomain = Boolean(process.env.AZURE_AD_ORG_DOMAIN?.trim());
  const hasAppUrl = Boolean(process.env.NEXT_PUBLIC_APP_URL?.trim());
  const hasAzure = hasTenantId && hasClientId && hasClientSecret;

  return {
    hasAzure,
    hasTenantId,
    hasClientId,
    hasClientSecret,
    hasOrgDomain,
    hasAppUrl,
    publishMode: hasAzure ? ("live" as const) : ("script-only" as const),
    missing: [
      !hasTenantId ? "AZURE_AD_TENANT_ID" : null,
      !hasClientId ? "AZURE_AD_CLIENT_ID" : null,
      !hasClientSecret ? "AZURE_AD_CLIENT_SECRET" : null,
    ].filter(Boolean) as string[],
  };
}
