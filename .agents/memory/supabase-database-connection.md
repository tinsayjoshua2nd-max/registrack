---
name: Supabase database connection
description: The user's decision to run RegisTrack on Supabase PostgreSQL and the connectivity constraint for its Replit runtime.
---

When configured, RegisTrack uses the private `SUPABASE_DATABASE_URL` ahead of Replit's runtime-managed `DATABASE_URL`. For Replit, use the Supabase Session pooler URI (port 5432); the project's direct database endpoint resolves to IPv6 and is not reachable from this runtime. A separate, explicit Supabase initializer is permitted only for a new database whose `public` schema has no objects; it must refuse existing schemas. Supabase remains separate from Replit Publish schema synchronization.

**Why:** The user explicitly requested Supabase for the application database, and the direct endpoint failed to connect while the session-pooler endpoint was reachable. The user also needs a safe first-time schema setup without risking existing Supabase records.

**How to apply:** Keep the connection string in Replit Secrets. Use only the opt-in Supabase initializer for an empty `public` schema; never point the local-only initializer at Supabase or use the Supabase initializer to repair/migrate an existing database. Both initializers must remain manual commands, never run during app startup or post-merge setup. Review Supabase schema changes independently of Replit's Publish workflow.
