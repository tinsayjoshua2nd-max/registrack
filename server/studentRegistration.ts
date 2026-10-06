import { randomUUID } from 'node:crypto';
import { pool, withTransaction } from './database';
import { hashPassword } from './security';
import { DEFAULT_SYSTEM_SETTINGS } from '../src/data/superAdminData';

export class StudentRegistrationError extends Error {
  constructor(readonly statusCode: number, message: string) {
    super(message);
  }
}

function registrationEnabled(payload: unknown): boolean {
  if (payload === undefined) return DEFAULT_SYSTEM_SETTINGS.allowStudentRegistration;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new StudentRegistrationError(500, 'Registration settings are unavailable.');
  }
  const value = (payload as Record<string, unknown>).allowStudentRegistration;
  if (value === undefined) return DEFAULT_SYSTEM_SETTINGS.allowStudentRegistration;
  if (typeof value !== 'boolean') {
    throw new StudentRegistrationError(500, 'Registration settings are unavailable.');
  }
  return value;
}

export async function studentRegistrationOptions(): Promise<{ allowStudentRegistration: boolean }> {
  const result = await pool.query<{ payload: unknown }>(
    "SELECT payload FROM registrack_data WHERE key = 'systemSettings'",
  );
  return { allowStudentRegistration: registrationEnabled(result.rows[0]?.payload) };
}

// Create login credentials only. Official records remain Registrar-owned and untouched.
export async function registerStudentCredentials(input: unknown): Promise<{ username: string }> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new StudentRegistrationError(400, 'Enter your Student ID, registered email, and new password.');
  }
  const body = input as Record<string, unknown>;
  if (Object.keys(body).some((key) => !['studentId', 'email', 'password'].includes(key))) {
    throw new StudentRegistrationError(400, 'The registration includes an unsupported field.');
  }
  const studentId = typeof body.studentId === 'string' ? body.studentId.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!/^\d{8}$/.test(studentId)) {
    throw new StudentRegistrationError(400, 'Student ID must be exactly 8 digits.');
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new StudentRegistrationError(400, 'Enter your email as registered in Student Records.');
  }
  if (password.length < 8 || password.length > 256) {
    throw new StudentRegistrationError(400, 'Choose a password between 8 and 256 characters.');
  }
  const passwordHash = await hashPassword(password);
  return withTransaction(async (client) => {
    const settings = await client.query<{ payload: unknown }>(
      "SELECT payload FROM registrack_data WHERE key = 'systemSettings' FOR SHARE",
    );
    if (!registrationEnabled(settings.rows[0]?.payload)) {
      throw new StudentRegistrationError(403, 'Student account registration is currently closed.');
    }
    const records = await client.query<{ payload: unknown }>(
      "SELECT payload FROM registrack_data WHERE key = 'studentRecords' FOR SHARE",
    );
    const matches = Array.isArray(records.rows[0]?.payload)
      ? records.rows[0].payload.filter((record: unknown): record is Record<string, unknown> =>
        !!record && typeof record === 'object' && !Array.isArray(record) &&
        (record as Record<string, unknown>).studentId === studentId)
      : [];
    const profile = matches.length === 1 ? matches[0] : undefined;
    if (!profile || profile.isArchived === true || typeof profile.name !== 'string' ||
      !profile.name.trim() || profile.name.length > 120 ||
      typeof profile.email !== 'string' || profile.email.trim().toLowerCase() !== email) {
      throw new StudentRegistrationError(400, 'No eligible official student record matches those details. Contact the Registrar.');
    }
    const data = {
      departmentOrOffice: typeof profile.degreeProgram === 'string' ? profile.degreeProgram : '',
      degreeProgram: typeof profile.degreeProgram === 'string' ? profile.degreeProgram : '',
      yearLevel: typeof profile.yearLevel === 'string' ? profile.yearLevel : '',
      phoneNumber: typeof profile.phone === 'string' ? profile.phone : '',
      lastLogin: 'Never',
    };
    try {
      await client.query(
        `INSERT INTO registrack_accounts (id,name,email,role,status,student_id,password_hash,data)
         VALUES ($1,$2,$3,'student','active',$4,$5,$6::jsonb)`,
        [`usr-${randomUUID()}`, profile.name.trim(), email, studentId, passwordHash, JSON.stringify(data)],
      );
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new StudentRegistrationError(409, 'An account already uses these student details. Sign in or contact the Registrar.');
      }
      throw error;
    }
    return { username: profile.name.trim() };
  });
}
