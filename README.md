# MKT Budget Management

Existing MKT Budget React/Vite application, including five dashboard themes, customers, contract cycles, budgets, transactions, reports, user management, and Google Apps Script integration.

Source version: **2026.11.01.5**. Includes Google Sheets user accounts, backend login, and bcrypt password storage. Login asks only for username and password, using the backend URL already saved in Settings. Theme selection is in Settings and saves immediately per user in this browser. Navigation starts collapsed behind a hamburger button on every screen size and closes after a selection, outside click, or Escape. Editing a browser-only account with a new password migrates it to USERS; existing Sheet accounts are matched by their original username when browser and Sheet IDs differ. Other pending browser accounts are retained. This frontend fix works with the existing 2026.10.31.6 Code.gs backend.

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
node --import tsx tests/gas-service.test.ts
node --import tsx tests/app-updates.test.ts
npm run build
npm run preview
```

The build creates `dist/` and copies it to `docs/`. Preview serves the last production build; rerun the build after source edits. Generated output and node_modules are excluded from Git.

## Google Sheets sync

For user accounts and passwords, follow [`gas/USER-ACCOUNTS.md`](gas/USER-ACCOUNTS.md). Configure `SPREADSHEET_ID` and your private `INITIAL_ADMIN_PASSWORD` in Apps Script Script Properties, run `initializeDatabase()`, and deploy a new backend version. Sign in to the Sheets backend, then use **Sync Users → Sheet** once to migrate existing browser accounts. Subsequent user edits write directly to USERS. Passwords are stored as bcrypt hashes, and are never returned by the API.

Install **only** [`gas/Code.gs`](gas/Code.gs) in Apps Script. It includes database initialization and the optional legacy import function. Do not additionally paste the separate legacy DatabaseSetup.gs / CustomerImport.gs files into the same Apps Script project.

Follow [`gas/SYNC-SETUP.md`](gas/SYNC-SETUP.md) for deployment and Settings setup. Sync is manual and one-way from the app to Sheets, using IDs to update or insert records. Missing rows are not deleted. The app keeps its working data in browser localStorage. A successful connection test alone does not confirm a Sheet write.

## Store deletion

The customer-list trash button lets Admins remove any store and team users remove only stores assigned to their own B1–B7 team. The storage mutation checks the same permission independently of button visibility. Confirmation identifies the store; deletion sets Status to DELETED, hides the store from active lists and dashboard totals, and keeps contract, budget and transaction history for audit. New transactions, contract cycles, and budget changes are blocked for deleted stores. Customer codes remain reserved.

Business data remains browser-local. An Admin must use the existing manual Sync to Google Sheets to send the DELETED status to CUSTOMERS; this does not physically remove Sheet rows or automatically send a team user’s local change to Sheets. The existing Code.gs handles the status with no reinstall. Deletion permissions here apply to the app’s local data service; legacy business endpoints retain their previous authorization behavior.

## Validation limits

TypeScript, the production build, backend mock tests and frontend service tests passed. Live browser behavior and a write to a deployed Apps Script/real Sheet still require verification after installation. The GitHub Actions workflow checks, builds, deploys, and verifies the published HTML and compiled assets on pushes to main. Set the repository's Pages source to GitHub Actions.

## Public source export

This export contains no live spreadsheet identifier or account credentials. Configure private values in Apps Script. Local demonstration accounts use `CHANGE_ME_...` placeholders. Server-side session and role checks protect user-account endpoints; legacy business-data endpoints retain their previous behavior. The separate Sites-hosted source is unchanged by this GitHub release.
