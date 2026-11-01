# MKT Budget Management

Existing MKT Budget React/Vite application, including five dashboard themes, customers, contract cycles, budgets, transactions, reports, user management, and Google Apps Script integration.

Source version: **2026.11.01.20**. Excel/Sheet publications retry explicit Apps Script lock timeouts after 2, 4 and 8 seconds. The exact upload and server revision are retained in compressed browser storage through Reload and failures; background hydration pauses until acknowledgement or an explicit cancellation that retains a local backup. Activity log IDs are unique, and legacy duplicates are repaired without dropping events. Uses the latest owner-provided Apps Script deployment and migrates previous endpoint settings and pending operation receipts. App customer deletions archive records before physically removing their rows from the five working Sheet tables. Requires this release’s Code.gs; older backends show an installation message and retain the pending deletion. While signed in and online, visible tabs refresh shared business data every 15 seconds and on focus or reconnection. Physical row deletions in CUSTOMERS and BUDGET_TRANSACTIONS appear on the web without Reload; linked historical rows remain in the Sheet. Automatic reads do not publish cached data or fill activity history, and pause during Excel publication. Pins the latest owner-provided Apps Script deployment on all devices and preserves pending operation receipts during endpoint migration. Includes Google Sheets user accounts, backend login, and bcrypt password storage. Login asks only for username and password, using a shared deployment backend on new devices and browsers with blank settings. Browser-specific backend overrides cannot change the production data source. Local development retains the separate demo mode. Admin chooses the theme in Settings and publishes it with the shared configuration. Navigation starts collapsed behind a hamburger button on every screen size and closes after a selection, outside click, or Escape. Store names and their table heading stay on one line in a wider column; the table scrolls horizontally on smaller screens. Editing a browser-only account with a new password migrates it to USERS; existing Sheet accounts are matched by their original username when browser and Sheet IDs differ. Other pending browser accounts are retained. Business-data loading requires installing this release’s updated Code.gs.

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
node --import tsx tests/business-writes.test.ts
node --import tsx tests/legacy-recovery.test.ts
node --import tsx tests/deployment-write-migration.test.ts
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

The customer-list trash button lets Admins remove any store and team users remove only stores assigned to their own B1–B7 team. The storage mutation checks the same permission independently of button visibility. Confirmation identifies the store and the shared Sheet deletion. The server archives customer, condition, contract, budget and spending rows in DATABASE_BACKUPS before removing them from CUSTOMERS, CUSTOMER_CONDITIONS, CONTRACTS, BUDGETS and BUDGET_TRANSACTIONS. CHANGE_HISTORY records before/after details. Local demo mode continues to use a DELETED status. New transactions, contract cycles, and budget changes are blocked for deleted stores. Customer codes remain reserved.

The delete form sends an authenticated incremental operation and waits for the Sheet acknowledgement. The backend checks the current USERS assignment, saves a per-operation backup, and physically removes the store’s linked working rows. DELETED_CUSTOMERS reserves the deleted code and links to its backup; stale imports cannot restore it. A pending legacy soft-delete receipt upgrades safely without deleting newer stores. Other devices receive the deletion on their next Sheet read. Both Admin and assigned Team users can publish permitted deletions without a separate full Sync.

## Data loading and local edits

Read the deployment guide in [gas/READ-FROM-SHEETS.md](gas/READ-FROM-SHEETS.md). Reads require a server session; the backend ignores caller-supplied team/role and filters linked tables by the authenticated account. The old unauthenticated getCustomers GET is disabled. No passwords, session secrets, backend URL overrides, or unrelated audit logs are returned. Allowlisted common Admin settings are returned to all authenticated users. Financial values, including zero quantities and negative balances, are retained rather than regenerated.

Before automatic replacement the app compares its cache with the last loaded/uploaded baseline. Unsynced edits are kept, including edits made while a read is in flight. Explicit replacement prompts the user and downloads a JSON backup first. Malformed responses, unsupported backend versions, stale account responses and failed reads do not replace the cache. Normal forms publish incremental operations and receive the latest authoritative snapshot for the signed-in scope. Lost responses retain a durable operation ID for retry. Excel remains an Admin full-publication workflow and now rejects stale server revisions. Older local-only cache data is archived to BROWSER_RECOVERY before the authoritative Sheet snapshot replaces the active cache; it no longer blocks normal saves. The old data remains downloadable.

## Validation limits

TypeScript, the production build, backend mock tests and frontend service tests passed. Live browser behavior and a write to a deployed Apps Script/real Sheet still require verification after installation. The GitHub Actions workflow checks, builds, deploys, and verifies the published HTML and compiled assets on pushes to main. Set the repository's Pages source to GitHub Actions.

## Public source export

This export contains no live spreadsheet identifier or account credentials. Configure private values in Apps Script. Local demonstration accounts use `CHANGE_ME_...` placeholders. Server-side session and role checks protect user-account endpoints; legacy business-data endpoints now require sessions and enforce Admin/team permissions. The separate Sites-hosted source is unchanged by this GitHub release.

## Contract-anniversary annual budgets

Budgets reset on each contract anniversary in the Lao calendar day (UTC+7), with separate retained annual balances and no carry-forward. Current dashboards select the current year; contract details show all years. Backdated receipts and cancellations affect their original year. See [annual budget rules and installation](gas/ANNUAL-BUDGETS.md). Install this release’s Code.gs and deploy a new version of the existing Web App before syncing annual rows. Reads derive the correct year; authenticated business writes or Admin Sync persist annual rows. Reads also complete previously authorized, unfinished journal plans when recovery is needed. Legacy spending without dated transactions stays in the first year for review.

Production uses the owner-supplied November 1 replacement deployment in `src/config/backend.ts` on fresh and existing devices. Both prior deployment URLs are recognized for cache migration. A changed deployment requires signing in again; pending local business edits are preserved.

## Automatic Sheet writes

Normal store, expense, cancellation, contract and budget forms now submit authenticated incremental writes and wait for Sheet acknowledgement. Admin can manage all teams; Team users can add/delete their own stores and record/cancel their own team expenses. Store deletions remove working rows after a recoverable backup; deletion history and reserved codes remain outside active tables. Lost responses and partial writes can be retried without duplicates. Full Excel publication rejects stale Sheet revisions. See [installation, recovery and existing-cache behavior](gas/AUTO-SAVE.md). Install this release’s Code.gs and deploy a new version of the existing Web App; normal edits then need no separate Admin Sync.

The latest replacement deployment is pinned for every device. Existing sessions require a new login. Pending automatic saves from a retired endpoint retain their operation IDs and migrate only after an authenticated read confirms the same spreadsheet and account; the original receipt is retained until acknowledgement.

## Primary Sheet migration and continuity

See [DATABASE-CONTINUITY.md](gas/DATABASE-CONTINUITY.md). The private owner-controlled routing entry activates the new primary database after this Code.gs is deployed, refreshes source data under the script lock, verifies it, and retires writes to the old database. User accounts and bcrypt hashes are preserved; sessions require a fresh login. Daily full database snapshots, manual Admin backups, and per-record before/after history include user records and timestamps, while excluding session credentials. The Customers pencil button edits permitted store fields directly in Sheet. Legacy browser data is archived safely instead of blocking add/edit/delete.
