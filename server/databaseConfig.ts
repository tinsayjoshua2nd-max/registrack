export interface DatabaseConnectionEnvironment {
  SUPABASE_DATABASE_URL?: string;
  DATABASE_URL?: string;
}

const MISSING_DATABASE_CONFIGURATION =
  'No database connection is configured. Set SUPABASE_DATABASE_URL or connect the Replit PostgreSQL database.';

export function getDatabaseConnectionString(
  environment: DatabaseConnectionEnvironment,
): string | undefined {
  return environment.SUPABASE_DATABASE_URL || environment.DATABASE_URL || undefined;
}

export function requireDatabaseConnectionString(
  environment: DatabaseConnectionEnvironment,
): string {
  const connectionString = getDatabaseConnectionString(environment);
  if (!connectionString) {
    throw new Error(MISSING_DATABASE_CONFIGURATION);
  }
  return connectionString;
}
