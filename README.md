# MKT Budget Management

Existing MKT Budget React/Vite application, including five dashboard themes, customers, contract cycles, budgets, transactions, reports, user management, and Google Apps Script integration.

Source version: **2026.11.01.12**. Includes Google Sheets user accounts, backend login, and bcrypt password storage. Login asks only for username and password, using a shared deployment backend on new devices and browsers with blank settings. Browser-specific backend overrides cannot change the production data source. Local development retains the separate demo mode. Admin chooses the theme in Settings and publishes it with the shared configuration. Navigation starts collapsed behind a hamburger button on every screen size and closes after a selection, outside click, or Escape. Store names and their table heading stay on one line in a wider column; the table scrolls horizontally on smaller screens. Editing a browser-only account with a new password migrates it to USERS; existing Sheet accounts are matched by their original username when browser and Sheet IDs differ. Other pending browser accounts are retained. Business-data loading requires installing this release’s updated Code.gs.

## Run locally

Use Node.js 22.12+ or Node.js 24 and npm.

```sh
npm ci
npm run dev
```

Open the Vite URL shown in the terminal (default port 3000). Use npm/package-lock.json for reproducible installs.

## Checks and production build

```sh
npm run lint
node tests/gas-sync.test.cjs
node --import tsx tests/remote-accounts.test.ts
node --import tsx tests/customer-delete.test.ts
node --import tsx tests/deployment-backend.test.ts
node --import tsx tests/sheet-business-read.test.ts
node --import tsx tests/admin-policy.test.ts
TZ=Asia/Bangkok node --import tsx tests/annual-budgets.test.ts
TZ=America/Los_Angeles node --import tsx tests/annual-budgets.test.ts
TZ=Asia/Bangkok node --import tsx tests/excel-calendar-date.test.ts
TZ=America/Los_Angeles node --import tsx tests/excel-calendar-date.test.ts
node --import tsx tests/gas-service.test.ts
node --import tsx tests/app-updates.test.ts
npm run build
npm run preview
```

The build creates `dist/` and copies it to `docs/`. Preview serves the last production build; rerun the build after source edits. Generated output and node_modules are excluded from Git.

## Admin-only master data and configuration

See [gas/ADMIN-POLICY.md](gas/ADMIN-POLICY.md) and deploy the updated Code.gs. Only Admin can import Excel/CSV, open Settings, change common configuration, reset demo data, or publish a complete snapshot. Browser data-service checks and backend session/role checks protect these operations independently of UI visibility. Successful Excel imports publish automatically, with retry after failed publication; invalid input is rejected before data changes and master replacement retains spending and financial history. Saving Settings publishes the common currency, pricing, warning rules, language and theme. Users load that Admin-owned configuration and their assigned team data after login or on returning to the app. Direct user setting/import calls are rejected.

## Primary customer data

The owner-provided MKT TEAM B.xlsx is the primary customer master in the private backend spreadsheet. The original rows are recorded in its MKT_MASTER tab. Customer names, teams, quantities, products and contract calendar dates are aligned to that file. Existing transactions and already-deleted stores are retained; non-master legacy customers are archived. Four backup tabs preserve the previous business tables. Workbook records and the workbook itself are not bundled into this public repository. The production backend URL is updated automatically on fresh devices and devices using the retired deployment; production browsers use the same pinned deployment endpoint; explicit overrides are available only in local development. Excel date imports use a UTC calendar epoch so Bangkok and other browser timezones do not shift dates by one day.

## Login on another device

Open the published FOC Support URL and sign in with an account already saved in the Sheet USERS table. The production build automatically selects the shared Apps Script backend from `src/config/backend.ts`; Login asks only for username and password. Production uses the deployment-owned endpoint on every device; changing it requires updating src/config/backend.ts and deploying the app. Private passwords and session tokens are not included in the deployment configuration. Browser-only accounts must be migrated from their original browser first. After login and on reopening the app with a valid session, the app reads customers, conditions, contracts, budgets and transactions from Sheets. Admin receives all teams; other users receive only their server-assigned B1–B7 team. Untouched demo data is replaced by Sheet data; new production browsers start empty rather than showing sample customers. Local edits are protected from automatic replacement. Install the updated Code.gs as described in [gas/READ-FROM-SHEETS.md](gas/READ-FROM-SHEETS.md).

## Google Sheets sync

For user accounts and passwords, follow [`gas/USER-ACCOUNTS.md`](gas/USER-ACCOUNTS.md). Configure `SPREADSHEET_ID` and your private `INITIAL_ADMIN_PASSWORD` in Apps Script Script Properties, run `initializeDatabase()`, and deploy a new backend version. Sign in to the Sheets backend, then use **Sync Users → Sheet** once to migrate existing browser accounts. Subsequent user edits write directly to USERS. Passwords are stored as bcrypt hashes, and are never returned by the API.

Install **only** [`gas/Code.gs`](gas/Code.gs) in Apps Script. It includes database initialization and the optional legacy import function. Do not additionally paste the separate legacy DatabaseSetup.gs / CustomerImport.gs files into the same Apps Script project.

Follow [`gas/SYNC-SETUP.md`](gas/SYNC-SETUP.md) for deployment and Settings setup. Upload remains a manual Admin action, using IDs to update or insert records. Authenticated Sheet reads now populate the browser cache after login or with “Load from Sheet”. Missing rows are not deleted. The app keeps its working data in browser localStorage. A successful connection test alone does not confirm a Sheet write.

## Store deletion

The customer-list trash button lets Admins remove any store and team users remove only stores assigned to their own B1–B7 team. The storage mutation checks the same permission independently of button visibility. Confirmation identifies the store; deletion sets Status to DELETED, hides the store from active lists and dashboard totals, and keeps contract, budget and transaction history for audit. New transactions, contract cycles, and budget changes are blocked for deleted stores. Customer codes remain reserved.

Edits remain in this browser until uploaded. An Admin must use the existing manual Sync to Google Sheets to send the DELETED status to CUSTOMERS; this does not physically remove Sheet rows or automatically send a team user’s local change to Sheets. Other devices receive the deletion on their next Sheet read. Deletion permissions here apply to the app’s local data service; backend publication requires Admin; legacy transaction routes check the authenticated team.

## Data loading and local edits

Read the deployment guide in [gas/READ-FROM-SHEETS.md](gas/READ-FROM-SHEETS.md). Reads require a server session; the backend ignores caller-supplied team/role and filters linked tables by the authenticated account. The old unauthenticated getCustomers GET is disabled. No passwords, session secrets, backend URL overrides, or unrelated audit logs are returned. Allowlisted common Admin settings are returned to all authenticated users. Financial values, including zero quantities and negative balances, are retained rather than regenerated.

Before automatic replacement the app compares its cache with the last loaded/uploaded baseline. Unsynced edits are kept, including edits made while a read is in flight. Explicit replacement prompts the user and downloads a JSON backup first. Malformed responses, unsupported backend versions, stale account responses and failed reads do not replace the cache. This is manual upload plus authenticated snapshot reads, not live per-edit writes, merging, or full multi-user conflict resolution. Excel imports, Settings saves, and explicit budget recalculation publish automatically; ordinary local business edits retain the existing Admin Sync workflow.

## Validation limits

TypeScript, the production build, backend mock tests and frontend service tests passed. Live browser behavior and a write to a deployed Apps Script/real Sheet still require verification after installation. The GitHub Actions workflow checks, builds, deploys, and verifies the published HTML and compiled assets on pushes to main. Set the repository's Pages source to GitHub Actions.

## Public source export

This export contains no live spreadsheet identifier or account credentials. Configure private values in Apps Script. Local demonstration accounts use `CHANGE_ME_...` placeholders. Server-side session and role checks protect user-account endpoints; legacy business-data endpoints now require sessions and enforce Admin/team permissions. The separate Sites-hosted source is unchanged by this GitHub release.

## Contract-anniversary annual budgets

Budgets reset on each contract anniversary in the Lao calendar day (UTC+7), with separate retained annual balances and no carry-forward. Current dashboards select the current year; contract details show all years. Backdated receipts and cancellations affect their original year. See [annual budget rules and installation](gas/ANNUAL-BUDGETS.md). Install this release’s Code.gs and deploy a new version of the existing Web App before syncing annual rows. Reads derive the correct year without writing cells; Admin Sync persists annual rows. Legacy spending without dated transactions stays in the first year for review.

Production uses the owner-supplied November 1 replacement deployment in `src/config/backend.ts` on fresh and existing devices. Both prior deployment URLs are recognized for cache migration. A changed deployment requires signing in again; pending local business edits are preserved.
