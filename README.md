# MKT Budget Management

Existing MKT Budget React/Vite application, including five dashboard themes, customers, contract cycles, budgets, transactions, reports, user management, and Google Apps Script integration.

Source version: **2026.10.31.4**. Imported from the project maintained in this conversation, Sites source commit `4e3cb6a6a3dda87357a60f37fbe3bace25ee8f5f`.

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
node --import tsx tests/gas-service.test.ts
node --import tsx tests/app-updates.test.ts
npm run build
npm run preview
```

The build creates `dist/` and copies it to `docs/`. Preview serves the last production build; rerun the build after source edits. Generated output and node_modules are excluded from Git.

## Google Sheets sync

Install **only** [`gas/Code.gs`](gas/Code.gs) in Apps Script. It includes database initialization and the optional legacy import function. Do not additionally paste the separate legacy DatabaseSetup.gs / CustomerImport.gs files into the same Apps Script project.

Follow [`gas/SYNC-SETUP.md`](gas/SYNC-SETUP.md) for deployment and Settings setup. Sync is manual and one-way from the app to Sheets, using IDs to update or insert records. Missing rows are not deleted. The app keeps its working data in browser localStorage. A successful connection test alone does not confirm a Sheet write.

## Validation limits

TypeScript, the production build, backend mock tests and frontend service tests passed. Save feedback and update notices were checked with DOM simulation. Live browser behavior and a write to a deployed Apps Script/real Sheet still require verification. No automatic GitHub Pages deployment is enabled in this source export.

## Public source export

The live spreadsheet identifier was replaced with `YOUR_SPREADSHEET_ID`. Default passwords were replaced with explicit `CHANGE_ME_...` placeholders and sample emails use example.invalid. Set your own values before using the app. Unused source-reference screenshots and automatic deployment workflows were excluded. These export changes do not change the currently hosted Site. The client-side demonstration login is not server-side authentication.
