# DPM Microsoft 365 signature runbook

How Dossani Paradise Management IT applies corporate email signatures from this app using **Exchange Online transport rules** (A1).

This is an internal runbook for the DPM tenant only — not a multi-company product guide.

---

## What this deploy path does

1. The app builds corporate signature HTML that uses Exchange disclaimer tokens (`%%DisplayName%%`, `%%Title%%`, `%%PhoneNumber%%`, `%%Email%%`, `%%Street%%`, `%%City%%`, `%%State%%`, `%%Zip%%`).
2. Deploy exports a PowerShell script that creates or updates mail-flow rule **`DPM-Corporate-Signature`**.
3. That rule appends the signature on **outbound** mail (inside organization → outside organization).
4. A hidden marker (`DPM-SIGNATURE-RULE-MARKER`) is included so replies that already contain the signature are skipped (reduces stacking).
5. Optionally, if `AZURE_AD_*` is configured with Exchange app permissions, **Publish rule** can create/update the same rule remotely. Otherwise use script download only.

---

## Honest limitations (read before go-live)

| Limitation | Implication |
|------------|-------------|
| Server-side append | Signature appears after send. It does **not** show while composing in Outlook. |
| No Graph roaming API | Microsoft Graph cannot set Outlook roaming signatures org-wide. Do not plan on that. |
| Token personalization | One transport rule body; name/title/phone come from Entra/Exchange macros, not FindMi HTML per person. |
| FindMi HTML pack | Per-person FindMi-accurate HTML is for audit / manual use / future stamp service — not what the single rule injects. |
| Sent Items | Senders may not see the appended footer the same way recipients do. |
| Propagation delay | New or updated mail-flow rules can take **~30+ minutes** to apply consistently. |
| SPF / connectors | If DPM uses outbound relays or third-party stampers later, review SPF and connector order so signatures are not stripped or duplicated. |

---

## Path A — Apply the generated PowerShell script (recommended default)

Use this when `AZURE_AD_*` is not set, or when you want an explicit admin-reviewed change.

### Prerequisites

- Exchange Admin or Global Admin (or a role that can manage **mail flow rules**)
- PowerShell 7+ recommended (Windows PowerShell 5.1 also works)
- Network access to Exchange Online

### Steps

1. In the app, open **FindMi directory** → **Sync from FindMi** and spot-check people/stores.
2. Open **Signatures** and confirm the corporate template (logo, colors, disclaimer).
3. Open **Deploy to Microsoft 365**.
4. Click **Download PowerShell script** (and optionally **Download HTML pack** for audit).
5. On an admin workstation:

```powershell
Install-Module ExchangeOnlineManagement -Scope CurrentUser
Connect-ExchangeOnline   # sign in as DPM Exchange admin
```

6. Run the downloaded script (example filename `DPM-Corporate-Signature.ps1`):

```powershell
# Review the script first, then:
.\DPM-Corporate-Signature.ps1
```

7. Confirm the rule exists:

```powershell
Get-TransportRule -Identity "DPM-Corporate-Signature" |
  Select-Object Name, State, Mode, FromScope, SentToScope, Priority |
  Format-List
```

8. **Verify**: send a test message from a DPM mailbox to an **external** address. Confirm the footer (name, title, phone, disclaimer). Wait up to ~30 minutes if it does not appear immediately.
9. Reply to that thread once and confirm a second full signature is **not** stacked (marker exception).

### Rollback

```powershell
Disable-TransportRule -Identity "DPM-Corporate-Signature"
# or permanently:
# Remove-TransportRule -Identity "DPM-Corporate-Signature" -Confirm:$false
```

---

## Path B — Optional automated publish (`AZURE_AD_*`)

When credentials are present, **Publish rule** calls the Exchange Online Admin API (`InvokeCommand`) with app-only auth to create/update `DPM-Corporate-Signature`. If publish fails, the app falls back to downloading the same PowerShell script.

### 1. Register an Entra ID application (DPM tenant)

1. Entra admin center → **App registrations** → **New registration**
2. Name e.g. `DPM Email Signatures`
3. Single tenant (DPM directory only)
4. Create a **client secret**; store it only in the host environment (Vercel / server), never in git

### 2. API permission (Exchange Online)

1. App → **API permissions** → **Add a permission** → **APIs my organization uses**
2. Select **Office 365 Exchange Online**
3. **Application permissions** → add:
   - Prefer **`Exchange.ManageAsAppV2`** if available
   - Or **`Exchange.ManageAsApp`** (classic)
4. Click **Grant admin consent** for the DPM tenant

> Graph permissions alone are **not** enough to manage org transport rules.

### 3. Exchange RBAC on the service principal

App-only Exchange calls also need an Exchange role on the app’s service principal.

Typical approach (Exchange Online PowerShell as Global Admin / Exchange Admin):

```powershell
Connect-ExchangeOnline

# Service principal object id from Entra → Enterprise applications → your app
$spObjectId = "<entra-enterprise-app-object-id>"

New-ServicePrincipal -AppId "<AZURE_AD_CLIENT_ID>" -ObjectId $spObjectId -DisplayName "DPM Email Signatures"

# Assign a role that can manage transport rules, e.g. Exchange Administrator
# (Exact cmdlet/role group naming can vary; Organization Management / Transport Rules also work.)
Add-RoleGroupMember -Identity "Organization Management" -Member $spObjectId
```

If publish returns **403**, RBAC or consent is incomplete — use Path A until fixed.

### 4. Host environment variables

Set on the server that runs this app (e.g. Vercel project for DPM):

```env
AZURE_AD_TENANT_ID=<tenant-guid>
AZURE_AD_CLIENT_ID=<app-registration-client-id>
AZURE_AD_CLIENT_SECRET=<client-secret>
AZURE_AD_ORG_DOMAIN=<optional contoso.onmicrosoft.com>
NEXT_PUBLIC_APP_URL=<https://your-app-host>
```

`AZURE_AD_ORG_DOMAIN` improves Admin API routing for app-only calls; if omitted, the tenant GUID is used as the routing host.

### 5. Publish from the app

1. Deploy page should show: **AZURE_AD_* configured — publish can update Exchange Online live**
2. Click **Publish rule to Exchange** (or select Publish mode → Run)
3. On success: verify with an external test send (same as Path A)
4. On failure: download/run the script (Path A) and check Entra consent + Exchange RBAC

### Quick status check

```http
GET /api/deploy
```

Returns `hasAzure` / `publishMode` (`live` vs `script-only`) without exposing secrets.

---

## Entra attributes for token personalization

Keep these populated on user objects so `%%…%%` macros resolve well:

| Macro | Typical Entra / Exchange source |
|-------|----------------------------------|
| `%%DisplayName%%` | Display name |
| `%%Title%%` | Job title |
| `%%PhoneNumber%%` | Business / telephone |
| `%%Email%%` | Mail / UPN |
| `%%Street%%` | Street address |
| `%%City%%` | City |
| `%%State%%` | State/province |
| `%%Zip%%` | Postal code |

FindMi sync in this app is the directory source of truth for **people data in the product UI**; the live transport rule still resolves tokens from **Entra/Exchange attributes on the sender** at send time. Align Entra with FindMi when they diverge.

---

## SPF, connectors, and third-party mail

- If all mail leaves Microsoft 365 directly, the transport rule is usually enough.
- If DPM uses an outbound connector (security gateway, marketing relay, or a future stamp service like Exclaimer/CodeTwo):
  - Confirm the disclaimer rule still runs in the intended order
  - Avoid two systems appending the same footer
  - Keep SPF/DKIM/DMARC valid for the sending domain after any relay change
- Do not disable Microsoft protections solely to make signatures work.

---

## Roaming signatures vs this runbook

| Approach | Status for DPM |
|----------|----------------|
| Exchange transport rule (this app) | **Supported path** |
| Outlook roaming signatures via Graph | **Not available** — no supported org-wide Graph API |
| Manual Outlook client signatures | Possible for individuals; not the org standard |
| Third-party stamp service | Future option if FindMi-perfect HTML per sender is required on every message |

---

## Operational checklist

- [ ] FindMi synced and reviewed
- [ ] Corporate template + disclaimer approved
- [ ] PowerShell script reviewed (or live publish succeeded)
- [ ] `Get-TransportRule` shows `DPM-Corporate-Signature` Enabled / Enforce
- [ ] External test message shows correct footer
- [ ] Reply test does not double-append
- [ ] Rollback command documented for on-call

---

## Related app routes

| Route | Use |
|-------|-----|
| `/app/users` | FindMi directory sync and edits |
| `/app/signatures` | Corporate template |
| `/app/deploy` | Script / HTML pack / publish |
| `/app/settings` | Env var reminder for the host |

APIs: `POST /api/deploy/script`, `POST /api/deploy/pack`, `POST /api/deploy` (`mode`: `demo` \| `export-script` \| `publish-rule`), `GET /api/deploy` (credential status).
