# MKT Budget Management — Dashboard Theme Update

## What's changed
- Glassmorphism + 3D-inspired UI, enabled by default on login.
- Five live visual presets: Glassmorphism, Modern Executive, Futuristic AI Neon, Minimal Finance and Luxury Enterprise.
- Floating Appearance button at the bottom-right of authenticated screens.
- Theme persistence per username on the current browser (`localStorage`).
- Dashboard KPI cards and graph panels restyled; reduced-motion accessibility supported.
- No modifications to storage.ts, GAS backend, budget calculations, Excel parsing, authentication or permissions.

## Install / run / deploy
1. Run `npm ci` in a Node environment supporting the Vite version specified by package-lock.json.
2. Run `npm run lint` and `npm run build`.
3. Only deploy the freshly generated `docs/` output after a successful build. Do not deploy the stale original `docs/` contents.
4. Verify the appearance switcher as Admin and B1–B7 users, check all pages, and check the actual spreadsheet integration before production release.

## Important
This ZIP contains edited source code, NOT a verified production build. Package installation timed out in the editing environment and build/lint could not be completed here. Backend authorization and data integrity have not been audited; appearance changes do not add access control. For Google Sheets data, continue to secure server-side authorization separately.
