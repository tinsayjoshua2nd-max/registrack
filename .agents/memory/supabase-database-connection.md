---
name: Supabase database connection
description: The user's decision to run RegisTrack on Supabase PostgreSQL and the connectivity constraint for its Replit runtime.
---

When configured, RegisTrack uses the private `SUPABASE_DATABASE_URL` ahead of Replit's runtime-managed `DATABASE_URL`. For Replit, use the Supabase Session pooler URI (port 5432); the project's direct database endpoint resolves to IPv6 and is not reachable from this runtime.

**Why:** The user explicitly requested Supabase for the application database, and the direct endpoint failed to connect while the session-pooler endpoint was reachable.

**How to apply:** Keep the connection string in Replit Secrets. Supabase is external to Replit's publish-time schema sync: review the target database and schema changes independently, and never run the local-only initializer against it.
