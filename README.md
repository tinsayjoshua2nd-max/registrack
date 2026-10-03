# RegisTrack

Registrar helpdesk and document-request tracking, with a responsive React/TypeScript
interface, an Express API, PostgreSQL storage, and server-side account sessions.

## Requirements

- Node.js 24 and npm (matching the Replit runtime).
- PostgreSQL 16 for local development.
- A configured database containing the RegisTrack schema.

Install the locked dependency versions with `npm ci`. The npm lockfile uses public
registry tarball URLs; no Replit-internal registry is required outside Replit.
On Replit, the configured package firewall still controls dependency installation.

## Run on Replit

Use the provisioned PostgreSQL connection (`DATABASE_URL`). Set
`REGISTRAR_BOOTSTRAP_PASSWORD` in Secrets if the database does not already have a
Registrar account, then start the existing workflow or run `npm run dev`.
The server listens on `0.0.0.0:5000` by default.

Do not run local database setup against a managed development or production
database. Do not reset, seed, or overwrite existing data to get the app running.
If tables are missing, review the development schema and use Replit's supported
schema synchronization during Publish for managed production.

## New local database setup

`db/schema.sql` describes the application tables. `npm run db:setup` is an
explicit, local-only initializer, **not a migration tool** and **not a startup
hook**. It:

- Requires a separate `LOCAL_DATABASE_URL`; it never falls back to `DATABASE_URL`.
- Accepts only `127.0.0.1` or `[::1]`, without connection-URL query parameters.
- Requires a dedicated `registrack_local_<name>` or `registrack_temp_<name>` database.
- Creates tables/indexes transactionally only when the database has no user objects.
- Skips non-empty databases without changing their schema or records.
- Does not insert accounts, sessions, demo users, requests, or other seed records.

1. Create a **new, empty** PostgreSQL database, such as `registrack_local_dev`,
   owned by your local PostgreSQL user. Do not reuse a database containing real data.
2. Copy `.env.example` to `.env` and replace the placeholder credentials.
   Set `DATABASE_URL` and `LOCAL_DATABASE_URL` to that new database, and choose a
   strong `REGISTRAR_BOOTSTRAP_PASSWORD`.
3. Install dependencies: `npm ci`.
4. Initialize the empty database:
   `node --env-file=.env --import tsx scripts/setup-db.ts`.
   If variables are already exported, use `npm run db:setup`.
5. Start development:
   `node --env-file=.env --import tsx server/index.ts`.
   If variables are already exported, use `npm run dev`.

The server does not automatically load `.env` or `.env.local`. Node's explicit
`--env-file` option is used above; Replit injects its configured environment.

At startup, the existing server checks the database and creates the first
Registrar only if no `superadmin` account exists. It does not create tables.
Once a Registrar exists, that bootstrap step leaves existing accounts untouched.
Create real students and officers through the Registrar management screens.
An incompatible or partially initialized database must be reviewed separately;
the local setup command deliberately does not repair it.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Required runtime PostgreSQL connection; keep private. |
| `REGISTRAR_BOOTSTRAP_PASSWORD` | Required only to create the first Registrar. |
| `LOCAL_DATABASE_URL` | Explicit target for optional local-only setup. Not used by the app server. |
| `PORT` | Server port; defaults to `5000`. |
| `NODE_ENV` | `production` serves the compiled frontend; otherwise Vite development middleware is used. |
| `DISABLE_HMR` | Optional: `true` disables Vite hot reload and file watching. |

`GEMINI_API_KEY`, `APP_URL`, and `SESSION_SECRET` are not read by the current
application. Do not add an AI key to run RegisTrack. Existing secrets are not
removed or changed by these setup instructions.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run Express plus Vite development middleware. |
| `npm run lint` | Type-check with `tsc --noEmit`. |
| `npm run build` | Build the frontend into `dist` and server into `dist-server`. |
| `npm start` | Run the compiled Express server in production mode. |
| `npm run db:setup` | Initialize a new, empty, dedicated local database only. |
| `npm run preview` | Vite frontend preview only; does not run the API or support full application behavior. |

For a local production run after building:
`NODE_ENV=production node --env-file=.env dist-server/index.js`.

## Publish

RegisTrack requires a **server deployment**, such as Replit Autoscale. Static
hosting serves the frontend but cannot run `/api` routes, login, or PostgreSQL
operations. The project configuration specifies:

- Target: Autoscale
- Build: `npm run build`
- Run: `npm start`
- Server port: `5000` (or the supplied `PORT`)

Confirm these settings in Publishing before publishing again; changing project
configuration does not replace an already-published Static deployment.
Ensure production has its database connection and the bootstrap secret if it
needs its first Registrar.

For Replit-managed PostgreSQL, Publish compares development and production
schemas and applies the confirmed schema changes. Review any rename or destructive
change warnings. **Do not select an overwrite-data option** when preserving
production records. No database setup/migration command belongs in the build or
server-start command, and the local setup script rejects remote database hosts.

If schema comparison cannot complete, do not assume production matches
development; resolve the database/publishing issue before proceeding.

## Verification and data safety

The scripts under `scripts/verify-*.ts` are application checks that can create or
modify records. They are not part of normal startup. Do not run them against
production or a database holding real records without a separate, explicit plan.
Use a disposable database for startup/setup checks. Preserve all existing data
and never print database URLs, passwords, session tokens, or personal records.
