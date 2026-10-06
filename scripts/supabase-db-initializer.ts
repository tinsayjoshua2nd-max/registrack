import type { QueryResultRow } from 'pg';

export class SupabaseSetupError extends Error {}

export interface SupabaseSetupClient {
  connect(): Promise<void>;
  query<T extends QueryResultRow = QueryResultRow>(
    queryText: string,
  ): Promise<{ rows: T[] }>;
  end(): Promise<void>;
}

export function requireSupabaseDatabaseUrl(value: string | undefined): string {
  if (!value) {
    throw new SupabaseSetupError(
      'Set SUPABASE_DATABASE_URL explicitly to the new, empty Supabase database.',
    );
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new SupabaseSetupError('SUPABASE_DATABASE_URL must be a valid PostgreSQL URL.');
  }

  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !url.hostname ||
    url.pathname.length < 2
  ) {
    throw new SupabaseSetupError(
      'SUPABASE_DATABASE_URL must identify a PostgreSQL database.',
    );
  }

  return value;
}

export async function initializeEmptySupabasePublicSchema(
  client: SupabaseSetupClient,
  schema: string,
): Promise<void> {
  let transactionStarted = false;
  try {
    await client.connect();
    await client.query('BEGIN');
    transactionStarted = true;
    await client.query('SELECT pg_catalog.pg_advisory_xact_lock(7314290124::bigint)');

    const publicSchema = await client.query<{ exists: boolean }>(
      "SELECT pg_catalog.to_regnamespace('public') IS NOT NULL AS exists",
    );
    if (publicSchema.rows[0]?.exists !== true) {
      throw new SupabaseSetupError(
        'The target database has no public schema; no schema changes were committed.',
      );
    }

    const objects = await client.query<{ has_objects: boolean }>(`
      SELECT EXISTS (
        SELECT 1 FROM pg_catalog.pg_class
          WHERE relnamespace = pg_catalog.to_regnamespace('public')
        UNION ALL
        SELECT 1 FROM pg_catalog.pg_proc
          WHERE pronamespace = pg_catalog.to_regnamespace('public')
        UNION ALL
        SELECT 1 FROM pg_catalog.pg_type
          WHERE typnamespace = pg_catalog.to_regnamespace('public')
        UNION ALL
        SELECT 1 FROM pg_catalog.pg_operator
          WHERE oprnamespace = pg_catalog.to_regnamespace('public')
        UNION ALL
        SELECT 1 FROM pg_catalog.pg_opclass
          WHERE opcnamespace = pg_catalog.to_regnamespace('public')
        UNION ALL
        SELECT 1 FROM pg_catalog.pg_opfamily
          WHERE opfnamespace = pg_catalog.to_regnamespace('public')
        UNION ALL
        SELECT 1 FROM pg_catalog.pg_collation
          WHERE collnamespace = pg_catalog.to_regnamespace('public')
        UNION ALL
        SELECT 1 FROM pg_catalog.pg_conversion
          WHERE connamespace = pg_catalog.to_regnamespace('public')
        UNION ALL
        SELECT 1 FROM pg_catalog.pg_statistic_ext
          WHERE stxnamespace = pg_catalog.to_regnamespace('public')
        UNION ALL
        SELECT 1 FROM pg_catalog.pg_ts_config
          WHERE cfgnamespace = pg_catalog.to_regnamespace('public')
        UNION ALL
        SELECT 1 FROM pg_catalog.pg_ts_dict
          WHERE dictnamespace = pg_catalog.to_regnamespace('public')
        UNION ALL
        SELECT 1 FROM pg_catalog.pg_ts_parser
          WHERE prsnamespace = pg_catalog.to_regnamespace('public')
        UNION ALL
        SELECT 1 FROM pg_catalog.pg_ts_template
          WHERE tmplnamespace = pg_catalog.to_regnamespace('public')
      ) AS has_objects
    `);

    if (objects.rows[0]?.has_objects !== false) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      throw new SupabaseSetupError(
        'The target public schema is not empty. Initialization stopped without changes.',
      );
    }

    await client.query(schema);
    await client.query('COMMIT');
    transactionStarted = false;
  } catch (error) {
    if (transactionStarted) {
      await client.query('ROLLBACK').catch(() => undefined);
    }
    throw error;
  } finally {
    await client.end().catch(() => undefined);
  }
}
