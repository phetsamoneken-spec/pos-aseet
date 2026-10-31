# Secure user authentication migration — POS Asset / MKT Budget

## Current state (NOT production-safe)
The current frontend uses browser localStorage for users, passwords, current user and budgets. `src/services/storage.ts` automatically signs in the first admin user on first load, and `src/views/UsersView.tsx` displays/copies plaintext credentials and creates predictable reset passwords. `gas/Code.gs` currently exposes budget/customer operations without an authenticated server-side identity boundary. Do not treat existing team filtering as security.

## Target design
- Keep the **Google Sheet private**. No direct Sheet access for B1–B7.
- Use a separate private Users sheet (userId, username, role, team, status, passwordHash, salt, algorithm, iterations, createdAt, updatedAt), Sessions sheet (hash of random opaque token, userId, expiry, revokedAt), and Audit sheet.
- The password hash must be a deliberately slow password KDF (Argon2id preferred; PBKDF2-HMAC-SHA256 with current OWASP-recommended parameters when using a FIPS-compatible KDF). Each account requires an independently generated CSPRNG salt. Never use plain SHA-256, UUIDs, or Math.random() as substitutes for cryptographic random bytes.
- **Apps Script limitation:** native Apps Script lacks an appropriate built-in password KDF and CSPRNG API. Do not introduce an unreviewed homemade password KDF or weak token generator. For production, delegate password verification and token issuance to a supported identity provider or a small private authentication service that provides CSPRNG and Argon2id/PBKDF2, while GAS remains the Sheets data service.
- An identity-provider-verified server session is required for all data operations. Do not trust userId, role, team, or spreadsheetId supplied by the browser.
- Admin may manage users and view all teams; B1–B7 may access only their assigned team. Check the role and team on **every** read/write on the server, not only in React.
- Protect account creation, role changes, password resets, account disable, session revocation, and bulk sync behind verified admin authorization.
- Store no credentials, tokens, actual hashes, or live spreadsheet IDs in this public repository.

## Migration steps
1. Back up current Sheets and export current browser data for an authorized administrator. Do not import existing plaintext passwords.
2. Configure the private authentication provider/service and its secret management; provision the initial admin out-of-band.
3. Add a server-only session verifier and role/team-scoped Sheets endpoints.
4. Replace localStorage-based login with authenticated API calls. Remove automatic admin login and credential display/copy/reset defaults.
5. Replace the localStorage budget data boundary with server-filtered queries and server-validated writes.
6. Test unauthorized requests, cross-team access, role escalation, expired/revoked sessions, login throttling, concurrent edits, and the entire budget workflow.
7. Only after passing tests, obtain explicit approval before merging or deploying.

## Release gate
This branch is a work-in-progress. No code on it should be deployed as secure authentication until all steps above are complete and tested.
