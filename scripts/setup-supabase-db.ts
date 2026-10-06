import { readFile } from 'node:fs/promises';
import { env } from 'node:process';
import { Client } from 'pg';
import {
  initializeEmptySupabasePublicSchema,
  requireSupabaseDatabaseUrl,
  SupabaseSetupError,
  type SupabaseSetupClient,
} from './supabase-db-initializer';

async function setupSupabaseDatabase(): Promise<void> {
  try {
    const connectionString = requireSupabaseDatabaseUrl(env.SUPABASE_DATABASE_URL);
    const schema = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
    const client = new Client({
      connectionString,
      connectionTimeoutMillis: 10_000,
    });
    await initializeEmptySupabasePublicSchema(
      client as unknown as SupabaseSetupClient,
      schema,
    );
    console.info(
      'Supabase RegisTrack schema created in the empty public schema. No accounts or operational records were seeded.',
    );
  } catch (error) {
    const reason = error instanceof SupabaseSetupError
      ? error.message
      : 'Check the SUPABASE_DATABASE_URL secret, network access, and database permissions. No partial schema changes were committed.';
    console.error(`Supabase database setup failed. ${reason}`);
    process.exitCode = 1;
  }
}

setupSupabaseDatabase();
