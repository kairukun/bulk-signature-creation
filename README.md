# DPM Email Signatures

Internal Microsoft 365 email signature tool for **Dossani Paradise Management** only.

This is not a multi-tenant or commercial product. It exists so DPM IT/ops can:

1. Maintain the corporate signature (logo, disclaimer, layout)
2. Pull staff details from Microsoft 365 / FindMi-style fields
3. Deploy consistent signatures to the company tenant

## Local run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (redirects to `/app`).

## Connect the DPM tenant

1. Register one Entra ID app in the DPM tenant
2. Grant admin consent for directory read + mailbox/signature (or Exchange transport rules)
3. Set:

```env
AZURE_AD_TENANT_ID=
AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=
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
