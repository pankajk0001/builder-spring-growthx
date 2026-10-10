# Connect the owner's Google login

The dashboard uses only Google identity and email. Google and private app credentials stay outside committed source. Secretaries continue using WhatsApp without a web login.

## Google setup

1. Open https://console.cloud.google.com/ and create or select a project for the helper.
2. Open Google Auth Platform. Set an app name and support contact. Choose External for a personal Google account, and keep the app in Testing initially. Add the owner's Google email as a test user.
3. Request only `openid` and `email` access. No Gmail, Drive or contacts permissions.
4. Under Clients, create an OAuth client with application type Web application.
5. Add authorized JavaScript origin `https://neat-hound-892.convex.site`.
6. Add the exact authorized redirect URI `https://neat-hound-892.convex.site/api/api/auth/callback/google`. The double `/api` is intentional: this project's own HTTP router is mounted at `/api`, and the login library's callback route begins `/api/auth`.
7. Save the client ID and client secret into the ignored `.env.admin.local` JSON file on the laptop. Never paste the secret into chat. Its fields are `ownerEmail`, `googleClientId`, `googleClientSecret`.
8. Run `node scripts/configure-admin-auth.mjs`. It installs the private production settings and signing keys without printing secrets. It does not deploy code. Run it only for initial setup: rotating signing keys ends existing login sessions.

The owner email is checked both when Google creates a session and on every admin data request. Another Google account cannot access club data even if Google itself accepts its login.

## Read-only helper connection

The existing WhatsApp service remains the source of truth. A separate read-only timer runs `scripts/sync-admin-snapshot.mjs` once per minute. It reads saved registry data without changing it, removes raw chats/queues/credentials, and sends only the overview fields to the protected Convex ingestion endpoint.

Private server configuration is `~/.hermes/the-helper/admin-sync.json` (mode 600), containing `url` and `secret`. The upload URL is `https://neat-hound-892.convex.site/api/admin/snapshot`. Configure the same random secret of at least 32 characters as production `ADMIN_SYNC_SECRET`; never put it in browser assets. The upload endpoint can update only the read-only overview, not WhatsApp state. Do not publish a Convex admin/deploy key on the helper server.

The UI labels updates over three minutes old as delayed. Existing message IDs do not provide trustworthy last-activity dates, so seven-day activity remains unavailable until milestone 21 adds tracking. The panel displays role tables, not publicly accessible board image URLs.

## Verification before completion

- Verify anonymous overview calls and invalid upload credentials are rejected on the live deployment.
- Owner signs in manually with Google; inspect actual Secretary list, every board role, settings and saved delivery records.
- Sign out; sign in with another Google account and confirm denial. Google login itself is never browser-automated.
- Check mobile/desktop search, selection, board tabs, loading, empty and error states in the actual panel.
- Verify saved WhatsApp state and group receipts remain unchanged by the read-only connection.

No admin account changes are included in milestone 20. No pause/reset/restore/transfer buttons are exposed until their later milestones are verified.

## Publishing login discovery

`npm run deploy` runs `scripts/publish-auth-discovery.mjs` afterwards. This replaces only the public root `/.well-known/openid-configuration` asset with JSON content type. The hosting uploader treats extensionless files as binary; without this correction, production sign-in fails with `AuthProviderDiscoveryFailed`. No routing or signing keys are changed by this step.
