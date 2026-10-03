import { readFile } from 'node:fs/promises';
import { env } from 'node:process';
import { Client } from 'pg';

class LocalSetupError extends Error {}

// Deliberately independent of DATABASE_URL: never default to the app's database.
async function setupLocalDatabase(): Promise<void> {
  if (!env.LOCAL_DATABASE_URL) {
    throw new LocalSetupError('Set LOCAL_DATABASE_URL explicitly to a new, empty local PostgreSQL database.');
  }

  let url: URL;
  try {
    url = new URL(env.LOCAL_DATABASE_URL);
  } catch {
    throw new LocalSetupError('LOCAL_DATABASE_URL must be a valid PostgreSQL URL.');
  }
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !['127.0.0.1', '[::1]'].includes(url.hostname) ||
    url.search || url.hash
  ) {
    throw new LocalSetupError('Setup accepts only numeric loopback hosts (127.0.0.1 or [::1]), with no URL query or fragment.');
  }
  const database = decodeURIComponent(url.pathname.slice(1));
  if (!/^registrack_(local|temp)_[a-z0-9_]+$/.test(database)) {
    throw new LocalSetupError('Use a dedicated database named registrack_local_<name> or registrack_temp_<name>.');
  }
  const port = Number(url.port || 5432);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new LocalSetupError('The local database port is invalid.');
  }

  const client = new Client({
    host: url.hostname === '[::1]' ? '::1' : url.hostname,
    port,
    database,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    ssl: false,
    connectionTimeoutMillis: 5_000,
  });
  let transactionStarted = false;
  try {
    await client.connect();
    const target = await client.query<{ address: string; database: string }>(
      'SELECT host(inet_server_addr()) AS address, current_database() AS database',
    );
    if (!['127.0.0.1', '::1'].includes(target.rows[0]?.address) || target.rows[0]?.database !== database) {
      throw new LocalSetupError('Connected database does not match the requested local target.');
    }
    await client.query('BEGIN');
    transactionStarted = true;
    await client.query('SELECT pg_advisory_xact_lock($1::bigint)', [7_314_290_124]);
    const objects = await client.query<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema'
        UNION ALL
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema'
        UNION ALL
        SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema'
      ) AS exists
    `);
    if (objects.rows[0].exists) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      console.info('Database is not empty; setup skipped without schema or data changes.');
      return;
    }
    const schema = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
    await client.query(schema);
    await client.query('COMMIT');
    transactionStarted = false;
    console.info('Local RegisTrack schema created. No accounts or operational records were seeded.');
  } catch (error) {
    if (transactionStarted) await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    await client.end().catch(() => undefined);
  }
}

setupLocalDatabase().catch((error: unknown) => {
  // Connection errors can contain credentials; do not print raw error objects.
  const reason = error instanceof LocalSetupError
    ? error.message
    : 'Check the dedicated loopback URL, database permissions, and PostgreSQL availability.';
  console.error(`Local database setup failed. ${reason} No existing schema or records were changed.`);
  process.exitCode = 1;
});