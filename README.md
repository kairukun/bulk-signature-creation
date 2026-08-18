# Dossani Signature Creator

Internal Outlook signature tool for **Dossani Paradise Management**.

Staff open the public page, pick themselves from FindMi (or type their details), copy the corporate signature, and paste it into Outlook. IT can still sign in at `/app` to edit the template and optionally push a Microsoft 365 transport rule.

---

## Make it live (for whoever is hosting this)

This is a Next.js app. The fastest way to put it on the internet is **Vercel**.

### 1. Get the code

**From the zip**

1. Unzip `Dossani-Signature-Creator.zip`.
2. Open a terminal in the unzipped `dossani-signature-creator` folder.

**From GitHub**

```bash
git clone https://github.com/kairukun/bulk-signature-creation.git
cd bulk-signature-creation
```

### 2. Install Node.js

Install the current **LTS** from [https://nodejs.org](https://nodejs.org) (version 20 or newer). Confirm:

```bash
node -v
npm -v
```

### 3. Install packages

```bash
npm install
```

### 4. Create a Vercel account and project

1. Sign up or log in at [https://vercel.com](https://vercel.com).
2. Install the CLI (one time):

```bash
npm install -g vercel
```

3. From the project folder, log in and deploy:

```bash
npx vercel login
npx vercel
```

Answer the prompts (link to your Vercel team, keep the project name, accept defaults). That creates a **preview** URL.

4. Promote it to production:

```bash
npx vercel --prod
```

You can also click **Add New → Project** on vercel.com, import this GitHub repo, and deploy from the dashboard instead of the CLI.

### 5. Set environment variables

In Vercel: **Project → Settings → Environment Variables**. Add these for **Production** (and Preview if you want staging to work). Then redeploy.

| Name | Required | What to put |
| --- | --- | --- |
| `AUTH_EMAIL` | Yes | Comma-separated emails allowed to sign in to `/app`. Example: `you@dossaniparadise.com,ITSupport@dossaniparadise.com` |
| `AUTH_PASSWORD` | Yes | Shared password for those emails. Pick a new strong password. Do not reuse the old one from another host. |
| `AUTH_SECRET` | Yes | Random string used to sign login cookies. Generate one with the command below. |
| `BLOB_READ_WRITE_TOKEN` | Yes for shared templates | Created automatically when you add a Vercel Blob store (next step). |
| `NEXT_PUBLIC_APP_URL` | Yes | The live site URL, no trailing slash. Example: `https://your-project.vercel.app` |
| `FINDMI_API_URL` | Optional | Defaults to the DPM FindMi alignment API. Only set this if the directory URL changes. |
| `AZURE_AD_TENANT_ID` | Optional | Only if IT will publish Exchange transport rules from the app. |
| `AZURE_AD_CLIENT_ID` | Optional | Same as above. |
| `AZURE_AD_CLIENT_SECRET` | Optional | Same as above. |
| `AZURE_AD_ORG_DOMAIN` | Optional | Example: `dossaniparadise.onmicrosoft.com` |

Generate `AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Never commit a `.env.local` file. The zip and GitHub repo do not include passwords.

### 6. Add Vercel Blob (shared signature template)

The corporate logo and template (`t-dossani`) are stored in Blob so every login sees the same signature.

1. In the Vercel project: **Storage → Create Database → Blob**.
2. Choose **Private**.
3. Link it to this project. Vercel sets `BLOB_READ_WRITE_TOKEN` for you.
4. Redeploy after linking (**Deployments → … → Redeploy**).

Until Blob is linked, the public page still works from the built-in fallback template, but admin edits will not persist across machines.

### 7. Confirm it is up

- Public creator (no login): `https://YOUR-DOMAIN.vercel.app/` or `/signature`
- IT login: `https://YOUR-DOMAIN.vercel.app/login` then `/app`

After sign-in, open **Signatures**, confirm **Dossani Paradise Corporate** (logo, Times New Roman, navy text). That is the template employees copy.

### 8. Custom domain (optional)

In Vercel: **Project → Settings → Domains**. Add something like `signatures.dossaniparadise.com`, then put the DNS records Vercel shows at your domain registrar. Update `NEXT_PUBLIC_APP_URL` to the custom domain and redeploy.

### Local test before going live

Copy `.env.example` to `.env.local`, fill in at least `AUTH_EMAIL`, `AUTH_PASSWORD`, and `AUTH_SECRET`, then:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The home page redirects to the public signature creator.

---

## What staff see

Anyone can open **[/signature](/signature)** (the site home redirects there). No login.

- Search the live FindMi directory and pick your entry
- Or type name, title, email, phone, and address
- Copy the formatted signature, then follow the Outlook Windows / web / Mac / iPhone / Android steps on the page

## IT access

The admin tool at `/app` requires sign-in (`AUTH_EMAIL` + `AUTH_PASSWORD` above).

Unauthenticated visitors can use `/signature`. Email click-tracking (`/api/track/*`) stays public.

## Shared workspace

Signatures, FindMi directory edits, campaigns, and settings live in **Vercel Blob** so every signed-in user sees the same data (not per-browser only). Without Blob, the app falls back to local browser storage.

- First browser with real data seeds the shared document when the server copy is empty
- Role switcher (`Admin` / `IT` / …) stays per-browser
- Status shows in the sidebar: **Shared** / syncing / error

## Deploy signatures into Microsoft 365 (A1)

This is separate from putting the **website** live. The website only creates HTML for people to paste, unless IT publishes an Exchange rule.

Signatures can also be applied with an **Exchange Online transport rule** (append on outbound send). Microsoft Graph cannot manage Outlook roaming signatures org-wide.

**Day-to-day:** Sync FindMi → review the corporate template → **Deploy** → download the PowerShell script → run it in Exchange Online PowerShell as a DPM admin → send an external test message.

**Optional:** With `AZURE_AD_*` configured (Exchange app permission + RBAC), **Publish rule** can create/update the rule remotely; otherwise the app stays script-download only.

Full steps, permissions, verification, rollback, SPF/connector notes, and roaming caveats:

→ **[docs/DPM-M365-SIGNATURE-RUNBOOK.md](docs/DPM-M365-SIGNATURE-RUNBOOK.md)**

## Connect the DPM tenant (optional, for rule publish)

1. Register one Entra ID app in the DPM tenant
2. For **live publish**: grant `Exchange.ManageAsApp` / `Exchange.ManageAsAppV2`, admin consent, and an Exchange RBAC role on the service principal (see runbook). Script-only deploy does not require this.
3. Set the `AZURE_AD_*` variables listed in the go-live table.

## FindMi directory sync

Pulls from [DPM FindMi](https://dossaniparadise.github.io/DPM-FindMi/):

- Stores (name, address, phone, email)
- VP of Operations
- Directors of Operations
- District Managers (area coaches)
- Repair Technicians

Open **FindMi directory** → **Sync from FindMi**. You can edit any synced record; those edits are kept on the next sync and shared across signed-in users via Blob. Use **Reset from FindMi** on a record to discard local changes.

## App areas

| Route | Purpose |
| --- | --- |
| `/signature` | Employee signature builder (public) |
| `/app` | Overview |
| `/app/signatures` | Corporate template + logo |
| `/app/users` | People / assignments |
| `/app/campaigns` | Optional banners |
| `/app/deploy` | Deploy to Microsoft 365 |
| `/app/settings` | Tenant setup |

## Stack

Next.js · TypeScript · Tailwind CSS
