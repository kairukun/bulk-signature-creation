# DPM Email Signatures

Internal Microsoft 365 email signature tool for **Dossani Paradise Management** only.

This is not a multi-tenant or commercial product. It exists so DPM IT/ops can:

1. Maintain the corporate signature (logo, disclaimer, layout)
2. Pull staff details from Microsoft 365 / FindMi-style fields
3. Deploy consistent signatures to the company tenant

## Access

The site requires sign-in. Set on the host (Vercel):

```env
AUTH_EMAIL=kyle@dossaniparadise.com,ITSupport@dossaniparadise.com
AUTH_PASSWORD=
AUTH_SECRET=
```

`AUTH_EMAIL` accepts a comma-separated allowlist; all listed users share `AUTH_PASSWORD`.

Unauthenticated visitors are redirected to `/login`. Email click-tracking (`/api/track/*`) stays public.

## Local run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (redirects to `/app`).

## Deploy to Microsoft 365 (A1)

Signatures are applied with an **Exchange Online transport rule** (append on outbound send). Microsoft Graph cannot manage Outlook roaming signatures org-wide.

**Day-to-day:** Sync FindMi → review the corporate template → **Deploy** → download the PowerShell script → run it in Exchange Online PowerShell as a DPM admin → send an external test message.

**Optional:** With `AZURE_AD_*` configured (Exchange app permission + RBAC), **Publish rule** can create/update the rule remotely; otherwise the app stays script-download only.

Full steps, permissions, verification, rollback, SPF/connector notes, and roaming caveats:

→ **[docs/DPM-M365-SIGNATURE-RUNBOOK.md](docs/DPM-M365-SIGNATURE-RUNBOOK.md)**

## Connect the DPM tenant

1. Register one Entra ID app in the DPM tenant
2. For **live publish**: grant `Exchange.ManageAsApp` / `Exchange.ManageAsAppV2`, admin consent, and an Exchange RBAC role on the service principal (see runbook). Script-only deploy does not require this.
3. Set:

```env
AZURE_AD_TENANT_ID=
AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=
AZURE_AD_ORG_DOMAIN=
NEXT_PUBLIC_APP_URL=
```

## FindMi directory sync

Pulls from [DPM FindMi](https://dossaniparadise.github.io/DPM-FindMi/):

- Stores (name, address, phone, email)
- VP of Operations
- Directors of Operations
- District Managers (area coaches)
- Repair Technicians

Open **FindMi directory** → **Sync from FindMi**. You can edit any synced record locally; those edits are kept on the next sync. Use **Reset from FindMi** on a record to discard local changes.

Optional override:

```env
FINDMI_API_URL=https://alignment-api-khaki.vercel.app/api/dpm-alignment
```

## App areas

| Route | Purpose |
|-------|---------|
| `/app` | Overview |
| `/app/signatures` | Corporate template + logo |
| `/app/users` | People / assignments |
| `/app/campaigns` | Optional banners |
| `/app/deploy` | Deploy to Microsoft 365 |
| `/app/settings` | Tenant setup |

## Stack

Next.js · TypeScript · Tailwind CSS
