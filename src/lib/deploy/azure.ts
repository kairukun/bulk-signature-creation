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
