# DPM Email Signatures

Internal Microsoft 365 email signature tool for **Dossani Paradise Management** only.

This is not a multi-tenant or commercial product. It exists so DPM staff can:

1. Build a corporate Outlook signature from FindMi (or by typing details) at `/signature`
2. Copy/paste that signature into Outlook with a step-by-step guide
3. Let IT optionally still manage templates and M365 transport-rule deploy at `/app`

## Employee signature page (public)

Anyone can open **[/signature](/signature)** (the site home redirects there). No login.

- Search the live FindMi directory and pick your entry
- Or type name, title, email, phone, and address
- Copy the formatted signature, then follow the Outlook Windows / web / Mac steps on the page

## IT access

The admin tool at `/app` requires sign-in. Set on the host (Vercel):

```env
AUTH_EMAIL=kyle@dossaniparadise.com,ITSupport@dossaniparadise.com
AUTH_PASSWORD=
AUTH_SECRET=
```

`AUTH_EMAIL` accepts a comma-separated allowlist; all listed users share `AUTH_PASSWORD`.

Unauthenticated visitors can use `/signature`. The admin app (`/app`) redirects to `/login`. Email click-tracking (`/api/track/*`) stays public.

## Shared workspace

Signatures, FindMi directory edits, campaigns, and settings are stored in **Vercel Blob** so every signed-in user sees the same data (not per-browser only).

```env
BLOB_READ_WRITE_TOKEN=
```

Create a **private** Blob store on the Vercel project (Storage → Blob). Linking the store sets `BLOB_READ_WRITE_TOKEN` automatically. Without it, the app falls back to local browser storage.

- First browser with real data seeds the shared document when the server copy is empty
- Role switcher (`Admin` / `IT` / …) stays per-browser
- Status shows in the sidebar: **Shared** / syncing / error

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

Open **FindMi directory** → **Sync from FindMi**. You can edit any synced record; those edits are kept on the next sync and shared across signed-in users via Blob. Use **Reset from FindMi** on a record to discard local changes.

Optional override:

```env
FINDMI_API_URL=https://alignment-api-khaki.vercel.app/api/dpm-alignment
```

## App areas

| Route | Purpose |
|-------|---------|
| `/signature` | Employee signature builder (public) |
| `/app` | Overview |
| `/app/signatures` | Corporate template + logo |
| `/app/users` | People / assignments |
| `/app/campaigns` | Optional banners |
| `/app/deploy` | Deploy to Microsoft 365 |
| `/app/settings` | Tenant setup |

## Stack

Next.js · TypeScript · Tailwind CSS
