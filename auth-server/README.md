# Private authentication service — NOT READY TO DEPLOY

This experimental Node.js service stores users and hashed sessions in private Google Sheets using a Google service account. Passwords use Node's scrypt with per-user CSPRNG salts; session bearer tokens use Node crypto randomBytes.

## Configuration
- `SPREADSHEET_ID`: ID of a private Sheet, never in frontend or public Git.
- `GOOGLE_APPLICATION_CREDENTIALS`: path to private service account JSON, or workload identity. Never commit credentials.
- `APP_ORIGIN`: exact HTTPS frontend origin.
- `PORT`: optional (8080).
- Share the private Sheet only with the service account. The server's service account must have write access.
- `npm install && npm test && npm start` from this directory.

## Critical limitations / blockers
1. This is **not integrated** with the existing React UI or GAS budget endpoints. The existing localStorage admin auto-login and plaintext passwords remain in the current UI.
2. No bootstrap admin mechanism is provided. Provision initial admin through a separately audited, one-time private setup process.
3. Google Sheets has no transactional unique constraint. Concurrent user creation can produce duplicate usernames; serialize writes with a production-grade lock or move authentication storage to a transactional database.
4. Login throttle is in-memory, not distributed, and not adequate across replicas/restarts. Implement distributed IP/account throttling and account lockout before deployment.
5. Sessions are bearer tokens returned in JSON. Frontend must keep tokens in memory only and prevent XSS. Prefer an audited same-site secure HttpOnly cookie/BFF design with CSRF defenses for production.
6. No session refresh, password reset, account disable/update, audit log, or server-side budget migration yet. Server team budget endpoint deliberately returns HTTP 501, not customer data.
7. Do not expose the current GAS bulk-sync or customer endpoints to untrusted callers. Gate all GAS data operations behind verified server-side authorization or remove public access.
8. Run integration and security tests against a disposable private Sheet, not production data.
9. Do not deploy or merge before all blockers are resolved and explicit user approval is obtained.

The code is a foundation for review, not a claim of secure production readiness.
