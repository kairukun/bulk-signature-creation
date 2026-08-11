# Bulk Signature Creation

Centralized Microsoft 365 email signature manager inspired by [BulkSignature](https://bulksignature.com).

## What's in v1

- Visual signature templates (classic / modern / compact / stacked)
- Live desktop & mobile previews across demo users
- Directory sync UI (demo Contoso users + Graph-ready settings)
- Department / group assignment
- Banner campaigns with scheduling + click tracking (`/api/track/[campaignId]`)
- Role simulation: Admin, IT, Marketing, Viewer
- Deploy flow for Demo / Exchange rule / Outlook roaming modes

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Microsoft 365 (production)

1. Register an app in Entra ID
2. Grant admin consent for Microsoft Graph / Exchange permissions needed for user read + mailbox signature write (or use Exchange Online transport rules)
3. Set environment variables:

```env
AZURE_AD_TENANT_ID=
AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=
NEXT_PUBLIC_APP_URL=https://your-deployment.vercel.app
```

The deployed demo runs fully in-browser with localStorage so you can test the product flow without tenant credentials.

## Useful routes

| Route | Purpose |
|-------|---------|
| `/` | Landing |
| `/app` | Dashboard |
| `/app/signatures` | Templates |
| `/app/users` | Directory |
| `/app/campaigns` | Banner campaigns |
| `/app/deploy` | Deploy + HTML export |
| `/api/signatures/render?email=` | Server-rendered HTML sample |
| `/api/track/[campaignId]?to=` | Click tracker redirect |

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS v4
