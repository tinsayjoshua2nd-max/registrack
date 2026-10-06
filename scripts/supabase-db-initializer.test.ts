import assert from 'node:assert/strict';
import test from 'node:test';
import {
  initializeEmptySupabasePublicSchema,
  requireSupabaseDatabaseUrl,
  SupabaseSetupError,
  type SupabaseSetupClient,
} from './supabase-db-initializer';

class FakeClient implements SupabaseSetupClient {
  calls: string[] = [];
  hasObjects = false;
  hasPublicSchema = true;
  failOnSchema = false;

  async connect(): Promise<void> {
    this.calls.push('CONNECT');
  }

  async query<T extends { [key: string]: unknown }>(queryText: string): Promise<{ rows: T[] }> {
    this.calls.push(queryText.trim().replace(/\s+/g, ' '));

    if (queryText.includes('AS has_objects')) {
      return { rows: [{ has_objects: this.hasObjects } as unknown as T] };
    }
    if (queryText.includes('to_regnamespace')) {
      return { rows: [{ exists: this.hasPublicSchema } as unknown as T] };
    }
    if (queryText === 'CREATE TEST SCHEMA') {
      if (this.failOnSchema) throw new Error('schema creation failed');
    }
    return { rows: [] };
  }

  async end(): Promise<void> {
    this.calls.push('END');
  }
}

test('requires an explicit PostgreSQL URL and rejects other URL schemes', () => {
  assert.throws(
    () => requireSupabaseDatabaseUrl(undefined),
    (error) => error instanceof SupabaseSetupError,
  );
  assert.throws(
    () => requireSupabaseDatabaseUrl('https://example.invalid/database'),
    (error) => error instanceof SupabaseSetupError,
  );
  assert.equal(
    requireSupabaseDatabaseUrl('postgresql://db.example.invalid:5432/postgres?sslmode=require'),
    'postgresql://db.example.invalid:5432/postgres?sslmode=require',
  );
});

test('rolls back and refuses to apply the schema when public contains objects', async () => {
  const client = new FakeClient();
  client.hasObjects = true;

  await assert.rejects(
    initializeEmptySupabasePublicSchema(client, 'CREATE TEST SCHEMA'),
    /public schema is not empty/,
  );

  assert.ok(client.calls.includes('ROLLBACK'));
  assert.ok(!client.calls.includes('CREATE TEST SCHEMA'));
  assert.equal(client.calls.at(-1), 'END');
});

test('applies schema and commits only after confirming public is empty', async () => {
  const client = new FakeClient();

  await initializeEmptySupabasePublicSchema(client, 'CREATE TEST SCHEMA');

  const schemaIndex = client.calls.indexOf('CREATE TEST SCHEMA');
  const commitIndex = client.calls.indexOf('COMMIT');
  assert.ok(client.calls.indexOf('BEGIN') < schemaIndex);
  assert.ok(schemaIndex < commitIndex);
  assert.ok(!client.calls.includes('ROLLBACK'));
  assert.equal(client.calls.at(-1), 'END');
});

test('rolls back schema errors instead of committing partial setup', async () => {
  const client = new FakeClient();
  client.failOnSchema = true;

  await assert.rejects(
    initializeEmptySupabasePublicSchema(client, 'CREATE TEST SCHEMA'),
    /schema creation failed/,
  );

  assert.ok(client.calls.includes('ROLLBACK'));
  assert.ok(!client.calls.includes('COMMIT'));
});

test('stops and rolls back when public schema is missing', async () => {
  const client = new FakeClient();
  client.hasPublicSchema = false;

  await assert.rejects(
    initializeEmptySupabasePublicSchema(client, 'CREATE TEST SCHEMA'),
    /no public schema/,
  );

  assert.ok(client.calls.includes('ROLLBACK'));
  assert.ok(!client.calls.includes('CREATE TEST SCHEMA'));
});
