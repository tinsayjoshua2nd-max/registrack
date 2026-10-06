import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  getDatabaseConnectionString,
  requireDatabaseConnectionString,
} from './databaseConfig';

test('Supabase connection takes precedence when both database URLs are configured', () => {
  const supabaseUrl = 'postgresql://supabase.invalid:5432/registrack';
  const replitUrl = 'postgresql://replit.invalid:5432/registrack';

  assert.equal(
    getDatabaseConnectionString({
      SUPABASE_DATABASE_URL: supabaseUrl,
      DATABASE_URL: replitUrl,
    }),
    supabaseUrl,
  );
});

test('Replit database URL is used when the Supabase secret is absent', () => {
  const replitUrl = 'postgresql://replit.invalid:5432/registrack';

  assert.equal(
    getDatabaseConnectionString({ DATABASE_URL: replitUrl }),
    replitUrl,
  );
});

test('missing database configuration produces actionable diagnostics without connection details', () => {
  assert.throws(
    () => requireDatabaseConnectionString({}),
    (error: unknown) => {
      assert(error instanceof Error);
      assert.match(error.message, /SUPABASE_DATABASE_URL/);
      assert.match(error.message, /Replit PostgreSQL database/);
      assert.doesNotMatch(error.message, /postgresql:\/\//);
      return true;
    },
  );
});
