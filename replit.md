# Running this project on Replit

RegisTrack is a React + TypeScript app served by an Express API with PostgreSQL storage. Vite provides the development UI.

- Start the preview with `npm run dev` (the Express server listens on port 5000).
- Build with `npm run build`; run the production server with `npm start`. Publishing must use a server target, not static hosting.
- Database accounts use password hashes and server-side cookie sessions. The app uses `SUPABASE_DATABASE_URL` when set, otherwise Replit's `DATABASE_URL`; configure `REGISTRAR_BOOTSTRAP_PASSWORD` in workspace secrets when creating the first Registrar. `SESSION_SECRET` is not used by the current app. Never put credentials in code.
- A fresh database creates only the initial Registrar. Real students and officers are created through Registrar management screens. Do not seed demo people, requests, announcements, notifications, or histories.
- Legacy browser data is intentionally discarded, not imported. Keep existing visual designs and responsive mobile behavior.
- JSON backups contain operational records and configuration, not password hashes or active sessions. Restoring JSON does not replace authentication accounts.
- Check types with `npm run lint`, and security/notification units with `node --import tsx --test server/security.test.ts src/utils/studentNotifications.test.ts`.
- `npx tsx scripts/verify-system.ts` verifies the development API using the bootstrap secret. It requires a clean initial database, creates temporary accounts/requests, and removes them afterward. Never run against production.
- `npx tsx scripts/verify-browser.ts` checks Registrar student provisioning and student submission through the actual UI, including mobile fit and forbidden/stale save detection. It uses system Chromium and restores the initial development records.
- Install the locked dependencies with `npm ci` before starting an imported copy; otherwise startup fails with `tsx: not found`.
- The database must already contain the tables from `db/schema.sql`. For an empty managed development database, apply the reviewed schema through the database tools; do not run the local-only setup script or add schema creation to server startup. Preserve existing data.
- For Supabase, apply `db/schema.sql` to a new, empty Supabase database using its SQL editor before starting the app. Do not run it against a database with existing tables or data without reviewing a migration plan.
- No Gemini API key is required to load the current app preview.