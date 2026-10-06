-- Reference schema for new, empty PostgreSQL databases only.
-- Explicit initializers apply this schema; the app never creates tables at startup.
-- Replit-managed production schema is synchronized through Publish.
-- No seed data, resets, or changes to existing tables belong here.

CREATE TABLE IF NOT EXISTS public.registrack_accounts (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  student_id text,
  password_hash text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS registrack_accounts_email_key
  ON public.registrack_accounts (email);
CREATE UNIQUE INDEX IF NOT EXISTS registrack_accounts_student_id_key
  ON public.registrack_accounts (student_id);
CREATE UNIQUE INDEX IF NOT EXISTS registrack_accounts_name_unique
  ON public.registrack_accounts (lower(name));

CREATE TABLE IF NOT EXISTS public.registrack_sessions (
  token_hash text PRIMARY KEY,
  account_id text NOT NULL REFERENCES public.registrack_accounts(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS public.registrack_data (
  key text PRIMARY KEY,
  payload jsonb NOT NULL,
  version bigint NOT NULL DEFAULT 1
);