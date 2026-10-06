import { randomUUID, timingSafeEqual } from 'node:crypto';
import { env } from 'node:process';
import type { NextFunction, Request, Response } from 'express';
import { withTransaction, pool } from './database';
import { normalizeTicketPriority } from '../src/utils/ticketQueue';
import { projectAccounts, projectStudents } from './rolePayload';
import { appendWorkflowEvidence, performTicketWorkflow, PROTECTED_WORKFLOW_FIELDS, WorkflowError } from './ticketWorkflow';
import {
  createSessionToken,
  hashPassword,
  hashSessionToken,
  makeTemporaryPassword,
  verifyPassword,
} from './security';
import {
  DEFAULT_SYSTEM_SETTINGS,
  INITIAL_REQUEST_CATEGORIES,
  INITIAL_ROLES,
} from '../src/data/superAdminData';

const SESSION_COOKIE = 'registrack_session';
const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_LIFETIME_SQL = '7 days';
const BOOTSTRAP_NAME = 'Stevie Ray Rotulo';
const BOOTSTRAP_EMAIL = 'registrar@registrack.local';
const SUPERADMIN_OFFICE = 'Office of the University Registrar';
const ACCOUNT_ROLES = new Set([
  'student',
  'registrar',
  'receiver',
  'records_management',
  'evaluator',
  'staff',
  'admin',
  'superadmin',
]);

const ARRAY_RESOURCES = new Set([
  'tickets',
  'users',
  'studentRecords',
  'roles',
  'auditLogs',
  'systemActivities',
  'announcements',
  'deletedRequestsHistory',
  'completedRequestsHistory',
  'notifications',
  'deletedAccounts',
]);

const STATE_KEYS = new Set([
  ...ARRAY_RESOURCES,
  'requestCategories',
  'systemSettings',
]);

const BACKUP_DATA_KEYS = [
  'studentRecords',
  'roles',
  'requestCategories',
  'systemSettings',
  'tickets',
  'deletedRequestsHistory',
  'completedRequestsHistory',
  'notifications',
  'announcements',
  'auditLogs',
  'systemActivities',
] as const;

type AccountRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  student_id: string | null;
  password_hash: string;
  data: Record<string, unknown>;
  created_at: Date;
};

type AccountPublic = Record<string, unknown> & {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  departmentOrOffice: string;
  lastLogin: string;
  createdAt: string;
};

type AuthenticatedAccount = {
  accountId: string;
  accountRole: string;
  name: string;
  email: string;
  studentId?: string;
  profilePicture?: string;
  degreeProgram?: string;
  yearLevel?: string;
  phoneNumber?: string;
};

type RequestWithAuth = Request & { auth?: AuthenticatedAccount };

type State = Record<string, unknown>;

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

class ApiError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

function publicAccount(row: AccountRow): AccountPublic {
  const data = removeCredentialFields(row.data) as Record<string, unknown>;
  for (const key of Object.keys(data)) {
    if (/password|credential|passphrase|secret/i.test(key)) delete data[key];
  }
  return {
    ...data,
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    studentId: row.student_id || undefined,
    departmentOrOffice: String(data.departmentOrOffice || ''),
    createdAt: row.created_at.toISOString().slice(0, 10),
    lastLogin: String(data.lastLogin || 'Never'),
  };
}

function toAuthenticatedUser(row: AccountRow): Record<string, unknown> {
  const account = publicAccount(row);
  const base = {
    id: row.id,
    name: row.name,
    email: row.email,
    profilePicture: typeof account.profilePicture === 'string' ? account.profilePicture : undefined,
  };

  if (row.role === 'student') {
    return {
      role: 'student',
      ...base,
      studentId: row.student_id || undefined,
      degreeProgram: typeof account.degreeProgram === 'string' ? account.degreeProgram : undefined,
      yearLevel: typeof account.yearLevel === 'string' ? account.yearLevel : undefined,
    };
  }

  if (row.role === 'superadmin') {
    return {
      role: 'superadmin',
      ...base,
      office: SUPERADMIN_OFFICE,
      adminRoleTitle: 'University Registrar',
      permissions: ['all'],
    };
  }

  return {
    role: 'admin',
    ...base,
    office: String(account.departmentOrOffice || SUPERADMIN_OFFICE),
    adminRoleTitle: String(account.adminRoleTitle || 'Registrar Officer'),
    staffRole: row.role,
  };
}

function accountFromRow(row: AccountRow): AuthenticatedAccount {
  const account = publicAccount(row);
  return {
    accountId: row.id,
    accountRole: row.role,
    name: row.name,
    email: row.email,
    studentId: row.student_id || undefined,
    profilePicture: typeof account.profilePicture === 'string' ? account.profilePicture : undefined,
    degreeProgram: typeof account.degreeProgram === 'string' ? account.degreeProgram : undefined,
    yearLevel: typeof account.yearLevel === 'string' ? account.yearLevel : undefined,
    phoneNumber: typeof account.phoneNumber === 'string' ? account.phoneNumber : undefined,
  };
}

function getCookie(req: Request, key: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0 || part.slice(0, separator).trim() !== key) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function cookieOptions(req: Request) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: req.secure || env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_LIFETIME_MS,
  };
}

function csrfGuard(req: Request, res: Response, next: NextFunction): void {
  const origin = req.get('origin');
  const fetchSite = req.get('sec-fetch-site');
  const allowedHosts = new Set(
    [req.get('host'), req.get('x-forwarded-host')]
      .filter(Boolean)
      .flatMap((host) => String(host).split(',').map((item) => item.trim().toLowerCase())),
  );

  if (fetchSite === 'cross-site') {
    res.status(403).json({ error: 'Cross-site request rejected.' });
    return;
  }

  if (!origin) {
    res.status(403).json({ error: 'An origin header is required for this request.' });
    return;
  }

  try {
    const parsedOrigin = new URL(origin);
    if (!allowedHosts.has(parsedOrigin.host.toLowerCase()) ||
      (req.secure && parsedOrigin.protocol !== 'https:')) {
      res.status(403).json({ error: 'Request origin does not match this application.' });
      return;
    }
  } catch {
    res.status(403).json({ error: 'Invalid request origin.' });
    return;
  }

  next();
}

function requireAuth(req: RequestWithAuth, res: Response, next: NextFunction): void {
  resolveAuth(req)
    .then((account) => {
      if (!account) {
        res.status(401).json({ error: 'You must sign in to access this resource.' });
        return;
      }
      req.auth = account;
      next();
    })
    .catch(next);
}

function requireSuperadmin(req: RequestWithAuth, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.auth?.accountRole !== 'superadmin') {
      res.status(403).json({ error: 'Only the Registrar can manage system accounts.' });
      return;
    }
    next();
  });
}

function resolveAuth(req: Request): Promise<AuthenticatedAccount | null> {
  const token = getCookie(req, SESSION_COOKIE);
  if (!token) return Promise.resolve(null);
  return pool
    .query<AccountRow>(
      `SELECT a.id, a.name, a.email, a.role, a.status, a.student_id, a.password_hash, a.data, a.created_at
       FROM registrack_sessions s
       JOIN registrack_accounts a ON a.id = s.account_id
       WHERE s.token_hash = $1 AND s.expires_at > now() AND a.status = 'active'
       LIMIT 1`,
      [hashSessionToken(token)],
    )
    .then((result) => (result.rows[0] ? accountFromRow(result.rows[0]) : null));
}

function fail(res: Response, status: number, message: string): void {
  res.status(status).json({ error: message });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cleanAccountInput(value: unknown): {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  studentId: string | null;
  password: string;
  data: Record<string, unknown>;
} {
  if (!isObject(value)) throw new Error('A user account object is required.');
  const account = value;
  const name = typeof account.name === 'string' ? account.name.trim() : '';
  const email = typeof account.email === 'string' ? account.email.trim().toLowerCase() : '';
  const role = typeof account.role === 'string' ? account.role : '';
  const status = account.status === undefined ? 'active' : account.status;
  const password = typeof account.password === 'string' ? account.password : '';
  const studentId = typeof account.studentId === 'string' && account.studentId.trim()
    ? account.studentId.trim()
    : null;
  const enrollmentStatuses = new Set(['Regular', 'Irregular', 'Graduating', 'Alumni', 'On Leave']);
  if (account.enrollmentStatus !== undefined &&
    account.enrollmentStatus !== '' &&
    (typeof account.enrollmentStatus !== 'string' || !enrollmentStatuses.has(account.enrollmentStatus))) {
    throw new Error('Choose a valid student enrollment status.');
  }
  if (account.degreeProgram !== undefined &&
    (typeof account.degreeProgram !== 'string' || account.degreeProgram.length > 160)) {
    throw new Error('Degree program must be a valid string under 160 characters.');
  }
  if (account.yearLevel !== undefined &&
    (typeof account.yearLevel !== 'string' || account.yearLevel.length > 80)) {
    throw new Error('Year level must be a valid string under 80 characters.');
  }
  const unitsEnrolled = account.unitsEnrolled === undefined || account.unitsEnrolled === ''
    ? undefined
    : Number(account.unitsEnrolled);
  if (unitsEnrolled !== undefined &&
    (!Number.isInteger(unitsEnrolled) || unitsEnrolled < 0 || unitsEnrolled > 300)) {
    throw new Error('Units enrolled must be a whole number between 0 and 300.');
  }

  if (!name || name.length > 120) throw new Error('Enter a valid account name (1–120 characters).');
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Enter a valid account email address.');
  }
  if (!ACCOUNT_ROLES.has(role)) throw new Error('Choose a valid account role.');
  if (typeof status !== 'string' || !['active', 'inactive', 'suspended'].includes(status)) {
    throw new Error('Choose a valid account status.');
  }
  if (password.length < 8 || password.length > 256) {
    throw new Error('Initial passwords must be at least 8 characters long.');
  }
  if (role === 'student' && (!studentId || !/^\d{8}$/.test(studentId))) {
    throw new Error('Student accounts must have an 8-digit student ID.');
  }

  const data = { ...account };
  for (const key of [
    'id',
    'name',
    'email',
    'role',
    'status',
    'password',
    'passwordHash',
    'password_hash',
    'studentId',
    'createdAt',
    'lastLogin',
  ]) {
    delete data[key];
  }
  for (const key of Object.keys(data)) {
    if (/password|credential|passphrase|secret/i.test(key)) delete data[key];
  }

  return {
    id: typeof account.id === 'string' && account.id ? account.id : `usr-${randomUUID()}`,
    name,
    email,
    role,
    status,
    studentId,
    password,
    data: {
      ...(removeCredentialFields(data) as Record<string, unknown>),
      lastLogin: 'Never',
    },
  };
}

function defaultData(key: string): unknown {
  if (key === 'roles') {
    return INITIAL_ROLES.map((role) => ({ ...role, userCount: 0 }));
  }
  if (key === 'requestCategories') {
    return INITIAL_REQUEST_CATEGORIES.map((category) => ({
      ...category,
      requiredDocuments: [...category.requiredDocuments],
    }));
  }
  if (key === 'systemSettings') {
    return JSON.parse(JSON.stringify(DEFAULT_SYSTEM_SETTINGS));
  }
  return ARRAY_RESOURCES.has(key) || key === 'requestCategories' ? [] : {};
}

async function loadData(key: string): Promise<unknown> {
  const result = await pool.query<{ payload: unknown }>(
    'SELECT payload FROM registrack_data WHERE key = $1',
    [key],
  );
  return result.rows[0] ? result.rows[0].payload : defaultData(key);
}

async function loadPublicUsers(): Promise<AccountPublic[]> {
  const result = await pool.query<AccountRow>(
    `SELECT id, name, email, role, status, student_id, password_hash, data, created_at
     FROM registrack_accounts
     ORDER BY created_at DESC`,
  );
  return result.rows.map(publicAccount);
}

function canAccessTicket(ticket: Record<string, unknown>, account: AuthenticatedAccount): boolean {
  if (account.accountRole === 'superadmin' || account.accountRole === 'receiver') return true;
  const name = account.name.trim().toLowerCase();
  if (!name) return false;
  return typeof ticket.assignedTo === 'string' && ticket.assignedTo.trim().toLowerCase() === name;
}

function visibleOfficerHistory(
  values: unknown,
  account: AuthenticatedAccount,
  tickets: Record<string, unknown>[],
): Record<string, unknown>[] {
  if (!Array.isArray(values)) return [];
  if (account.accountRole === 'superadmin' || account.accountRole === 'receiver') {
    return values.filter(isObject);
  }
  return values.filter(isObject).filter((record) => {
    const snapshot = isObject(record.ticketSnapshot)
      ? record.ticketSnapshot
      : tickets.find((ticket) => ticket.id === record.ticketId);
    return !!snapshot && canAccessTicket(snapshot, account);
  });
}

function visibleStudentNotifications(
  values: unknown,
  account: AuthenticatedAccount,
  tickets: Record<string, unknown>[],
): Record<string, unknown>[] {
  if (!account.studentId || !Array.isArray(values)) return [];
  const numbers = new Set(tickets.map((ticket) => String(ticket.ticketNumber || '')));
  return values.filter(isObject)
    .filter((notification) => {
      if (notification.audience === 'officer') return false;
      if (notification.recipientStudentId) return notification.recipientStudentId === account.studentId;
      return notification.type === 'announcement' ||
        (typeof notification.ticketNumber === 'string' && numbers.has(notification.ticketNumber));
    })
    .map((notification) => ({
      ...notification,
      read: Array.isArray(notification.readByStudentIds) &&
        notification.readByStudentIds.includes(account.studentId),
    }));
}

function redactStudentTicket(ticket: Record<string, unknown>): Record<string, unknown> {
  const { createdByAccountId: _createdByAccountId, ...safeTicket } = ticket;
  return {
    ...safeTicket,
    internalNotes: [],
    ...(Array.isArray(ticket.timelineHistory) ? {
      timelineHistory: ticket.timelineHistory.map((event) => {
        if (!isObject(event) || event.action === 'reject') return event;
        const { notes: _notes, ...safeEvent } = event;
        return safeEvent;
      }),
    } : {}),
  };
}

function scopeResourcePayload(
  account: AuthenticatedAccount,
  key: string,
  value: unknown,
): unknown {
  if (!Array.isArray(value)) return value;
  const records = value.filter(isObject);
  if (key === 'users') return projectAccounts(account, records);
  if (key === 'studentRecords') return projectStudents(account, records, [], []);
  if ((key === 'auditLogs' || key === 'systemActivities') && account.accountRole !== 'superadmin') return [];
  if (key === 'tickets') {
    if (account.accountRole === 'student') {
      return records
        .filter((ticket) => String(ticket.studentId || '') === account.studentId)
        .map(redactStudentTicket);
    }
    if (account.accountRole !== 'superadmin' && account.accountRole !== 'receiver') {
      return records.filter((ticket) => canAccessTicket(ticket, account));
    }
    return records;
  }
  if (key === 'deletedRequestsHistory' || key === 'completedRequestsHistory') {
    if (account.accountRole === 'student') {
      return records
        .filter((record) => String(record.studentId || '') === account.studentId)
        .map(redactStudentHistorySnapshot);
    }
    return visibleOfficerHistory(records, account, []);
  }
  if (key === 'notifications' && account.accountRole === 'student') {
    return records.filter((notification) =>
      notification.audience !== 'officer' &&
      (notification.recipientStudentId === account.studentId || notification.type === 'announcement'),
    ).map((notification) => ({
      ...notification,
      read: Array.isArray(notification.readByStudentIds) &&
        notification.readByStudentIds.includes(account.studentId),
    }));
  }
  return records;
}

async function upsertStudentRecord(
  client: import('pg').PoolClient,
  input: ReturnType<typeof cleanAccountInput>,
  account: AccountRow,
): Promise<void> {
  const studentId = account.student_id;
  if (!studentId) throw new Error('Student accounts must have an 8-digit student ID.');

  const stored = await lockResource(client, 'studentRecords');
  if (!Array.isArray(stored)) {
    throw new Error('Student records are unavailable; account creation was rolled back.');
  }
  const profiles = stored.filter(isObject);
  const existing = profiles.find((profile) => profile.studentId === studentId);
  const formDegree = typeof input.data.degreeProgram === 'string'
    ? input.data.degreeProgram.trim()
    : '';
  const officeOrDepartment = typeof input.data.departmentOrOffice === 'string'
    ? input.data.departmentOrOffice.trim()
    : '';
  const formYear = typeof input.data.yearLevel === 'string' ? input.data.yearLevel.trim() : '';
  const formPhone = typeof input.data.phoneNumber === 'string' ? input.data.phoneNumber.trim() : '';
  const formStatus = typeof input.data.enrollmentStatus === 'string'
    ? input.data.enrollmentStatus
    : undefined;
  const units = input.data.unitsEnrolled === undefined || input.data.unitsEnrolled === ''
    ? undefined
    : Number(input.data.unitsEnrolled);
  const profile: Record<string, unknown> = {
    ...existing,
    id: typeof existing?.id === 'string' ? existing.id : `stu-${randomUUID()}`,
    studentId,
    name: account.name,
    email: account.email,
    phone: formPhone || String(existing?.phone || ''),
    degreeProgram: formDegree || officeOrDepartment || String(existing?.degreeProgram || ''),
    yearLevel: formYear || String(existing?.yearLevel || ''),
    enrollmentStatus: formStatus || existing?.enrollmentStatus || 'Regular',
    unitsEnrolled: units ?? existing?.unitsEnrolled ?? 0,
    isArchived: existing?.isArchived === true,
    requestCount: Number(existing?.requestCount) || 0,
    joinedDate: typeof existing?.joinedDate === 'string'
      ? existing.joinedDate
      : new Date().toISOString().slice(0, 10),
  };
  if (typeof input.data.academicStanding === 'string') {
    profile.academicStanding = input.data.academicStanding;
  }
  if (typeof input.data.profilePicture === 'string') {
    profile.profilePicture = input.data.profilePicture;
  } else if (typeof existing?.profilePicture === 'string') {
    profile.profilePicture = existing.profilePicture;
  }

  const next = existing
    ? profiles.map((item) => item.studentId === studentId ? profile : item)
    : [profile, ...profiles];
  await saveResource(client, 'studentRecords', next);
}

async function syncStudentAccountsWithProfiles(
  client: import('pg').PoolClient,
  value: unknown,
): Promise<Record<string, unknown>[]> {
  if (!Array.isArray(value) || value.length > 50_000) {
    throw new ApiError(400, 'Student records must be an array with no more than 50,000 records.');
  }
  const incomingProfiles = value.filter(isObject);
  if (incomingProfiles.length !== value.length) throw new ApiError(400, 'Student records contains invalid entries.');
  const seenIds = new Set<string>();
  const seenStudentIds = new Set<string>();
  const profiles: Record<string, unknown>[] = [];

  for (const profile of incomingProfiles) {
    const id = typeof profile.id === 'string' ? profile.id.trim() : '';
    const studentId = typeof profile.studentId === 'string' ? profile.studentId.trim() : '';
    const name = typeof profile.name === 'string' ? profile.name.trim() : '';
    const email = typeof profile.email === 'string' ? profile.email.trim().toLowerCase() : '';
    if (!id || seenIds.has(id) || !/^\d{8}$/.test(studentId) || seenStudentIds.has(studentId)) {
      throw new ApiError(400, 'Each student record must have a unique record ID and 8-digit student ID.');
    }
    if (!name || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ApiError(400, `Student record ${id} must have a valid name and email address.`);
    }
    seenIds.add(id);
    seenStudentIds.add(studentId);

    const degreeProgram = typeof profile.degreeProgram === 'string' ? profile.degreeProgram.trim() : '';
    const yearLevel = typeof profile.yearLevel === 'string' ? profile.yearLevel.trim() : '';
    const phoneNumber = typeof profile.phone === 'string' ? profile.phone.trim() : '';
    profiles.push({ ...profile, id, studentId, name, email, degreeProgram, yearLevel, phone: phoneNumber });
    await client.query(
      `UPDATE registrack_accounts
       SET name = $1, email = $2, data = data || $3::jsonb
       WHERE role = 'student' AND student_id = $4`,
      [
        name,
        email,
        JSON.stringify({ degreeProgram, yearLevel, phoneNumber }),
        studentId,
      ],
    );
  }
  return profiles;
}

async function syncStudentProfileFromAccount(
  client: import('pg').PoolClient,
  account: AccountRow,
): Promise<void> {
  const studentId = account.student_id;
  if (!studentId || !/^\d{8}$/.test(studentId)) {
    throw new ApiError(400, 'Student accounts must have an 8-digit student ID.');
  }
  const stored = await lockResource(client, 'studentRecords');
  if (!Array.isArray(stored)) {
    throw new ApiError(400, 'Student records are unavailable; account update was rolled back.');
  }
  const profiles = stored.filter(isObject);
  const matching = profiles.filter((profile) => profile.studentId === studentId);
  if (matching.length > 1) throw new ApiError(409, 'Multiple student profiles share this student ID.');
  const existing = matching[0];
  const profile: Record<string, unknown> = {
    ...existing,
    id: typeof existing?.id === 'string' ? existing.id : `stu-${randomUUID()}`,
    studentId,
    name: account.name,
    email: account.email,
    phone: typeof account.data.phoneNumber === 'string'
      ? account.data.phoneNumber
      : String(existing?.phone || ''),
    degreeProgram: typeof account.data.degreeProgram === 'string'
      ? account.data.degreeProgram
      : String(existing?.degreeProgram || ''),
    yearLevel: typeof account.data.yearLevel === 'string'
      ? account.data.yearLevel
      : String(existing?.yearLevel || ''),
    enrollmentStatus: existing?.enrollmentStatus || 'Regular',
    unitsEnrolled: existing?.unitsEnrolled ?? 0,
    isArchived: existing?.isArchived === true,
    requestCount: Number(existing?.requestCount) || 0,
    joinedDate: typeof existing?.joinedDate === 'string'
      ? existing.joinedDate
      : account.created_at.toISOString().slice(0, 10),
  };
  if (typeof account.data.profilePicture === 'string') {
    profile.profilePicture = account.data.profilePicture;
  } else if (typeof existing?.profilePicture === 'string') {
    profile.profilePicture = existing.profilePicture;
  }
  const next = existing
    ? profiles.map((item) => item.studentId === studentId ? profile : item)
    : [profile, ...profiles];
  await saveResource(client, 'studentRecords', next);
}

async function getState(account: AuthenticatedAccount): Promise<State> {
  const keys = [...STATE_KEYS].filter((key) => key !== 'users' && key !== 'deletedAccounts');
  const result = await pool.query<{ key: string; payload: unknown; version: number }>(
    'SELECT key, payload, version FROM registrack_data WHERE key = ANY($1::text[])',
    [keys],
  );
  const stored = new Map(result.rows.map((row) => [row.key, row]));
  const state = Object.fromEntries(keys.map((key) => [
    key,
    stored.has(key) ? stored.get(key)?.payload : defaultData(key),
  ])) as State;
  const versions: Record<string, number> = Object.fromEntries(keys.map((key) => [
    key,
    Number(stored.get(key)?.version) || 0,
  ]));

  if (account.accountRole === 'superadmin') {
    state.users = projectAccounts(account, await loadPublicUsers());
    state.studentRecords = projectStudents(account, state.studentRecords, [], []);
    state.deletedAccounts = await loadData('deletedAccounts');
    state._versions = versions;
    return state;
  }

  if (account.accountRole !== 'student') {
    const accounts = await loadPublicUsers();
    state.users = projectAccounts(account, accounts);
    state.auditLogs = [];
    state.systemActivities = [];
    state.deletedAccounts = [];
    const tickets = Array.isArray(state.tickets) ? state.tickets.filter(isObject) : [];
    if (account.accountRole !== 'receiver') {
      state.tickets = tickets.filter((ticket) => canAccessTicket(ticket, account));
      state.deletedRequestsHistory = visibleOfficerHistory(state.deletedRequestsHistory, account, tickets);
      state.completedRequestsHistory = visibleOfficerHistory(state.completedRequestsHistory, account, tickets);
    }
    state.studentRecords = projectStudents(account, state.studentRecords, accounts, state.tickets);
    state._versions = versions;
    return state;
  }

  state.users = [];
  state.studentRecords = [];
  state.roles = [];
  state.auditLogs = [];
  state.systemActivities = [];
  state.systemSettings = {};
  state.deletedAccounts = [];

  const allTickets = Array.isArray(state.tickets) ? state.tickets as Record<string, unknown>[] : [];
  const ownTickets = allTickets.filter((ticket) => String(ticket.studentId || '') === account.studentId);
  state.tickets = ownTickets.map(redactStudentTicket);
  state.notifications = visibleStudentNotifications(state.notifications, account, ownTickets);
  state.deletedRequestsHistory = (Array.isArray(state.deletedRequestsHistory)
    ? state.deletedRequestsHistory as Record<string, unknown>[]
    : []).filter((record) => String(record.studentId || '') === account.studentId);
  state.completedRequestsHistory = (Array.isArray(state.completedRequestsHistory)
    ? state.completedRequestsHistory as Record<string, unknown>[]
    : []).filter((record) => String(record.studentId || '') === account.studentId);
  state.deletedRequestsHistory = (state.deletedRequestsHistory as Record<string, unknown>[])
    .map(redactStudentHistorySnapshot);
  state.completedRequestsHistory = (state.completedRequestsHistory as Record<string, unknown>[])
    .map(redactStudentHistorySnapshot);
  state._versions = versions;
  return state;
}

function redactStudentHistorySnapshot(record: Record<string, unknown>): Record<string, unknown> {
  return isObject(record.ticketSnapshot)
    ? { ...record, ticketSnapshot: redactStudentTicket(record.ticketSnapshot) }
    : record;
}

async function ensureBootstrapAccount(): Promise<void> {
  await withTransaction(async (client) => {
    await client.query('SELECT pg_advisory_xact_lock($1::bigint)', [7_314_290_123]);
    const result = await client.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM registrack_accounts WHERE role = 'superadmin'",
    );
    if (Number(result.rows[0]?.count || 0) > 0) return;

    const password = env.REGISTRAR_BOOTSTRAP_PASSWORD;
    if (!password) {
      throw new Error(
        'No Registrar account exists and REGISTRAR_BOOTSTRAP_PASSWORD is not configured. Add the initial password as a server secret to bootstrap the first account.',
      );
    }

    const passwordHash = await hashPassword(password);
    const id = `usr-${randomUUID()}`;
    await client.query(
      `INSERT INTO registrack_accounts
         (id, name, email, role, status, student_id, password_hash, data)
       VALUES ($1, $2, $3, 'superadmin', 'active', NULL, $4, $5::jsonb)`,
      [
        id,
        BOOTSTRAP_NAME,
        BOOTSTRAP_EMAIL,
        passwordHash,
        JSON.stringify({ departmentOrOffice: SUPERADMIN_OFFICE, lastLogin: 'Never' }),
      ],
    );
  });
}

async function verifyAccountCredential(
  account: Pick<AccountRow, 'role' | 'student_id' | 'password_hash'>,
  password: string,
): Promise<boolean> {
  const matchesPassword = await verifyPassword(password, account.password_hash);
  if (matchesPassword) return true;
  if (account.role !== 'student' || !account.student_id) return false;
  const supplied = Buffer.from(password);
  const studentId = Buffer.from(account.student_id);
  return supplied.length === studentId.length && timingSafeEqual(supplied, studentId);
}

function roleForLogin(userRole: string, requestedRole: string): boolean {
  if (requestedRole === 'auto') return true;
  if (requestedRole === 'student') return userRole === 'student';
  if (requestedRole === 'admin') return userRole !== 'student' && userRole !== 'superadmin';
  return requestedRole === 'superadmin' && userRole === 'superadmin';
}

function accountAuthRole(userRole: string): string {
  if (userRole === 'student') return 'student';
  if (userRole === 'superadmin') return 'superadmin';
  return 'admin';
}

function loginRateLimit(req: Request, res: Response, next: NextFunction): void {
  const key = req.ip || 'unknown';
  const now = Date.now();
  if (loginAttempts.size > 10_000) {
    for (const [address, attempt] of loginAttempts) {
      if (attempt.resetAt <= now) loginAttempts.delete(address);
    }
  }
  const entry = loginAttempts.get(key);
  if (!entry || entry.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    next();
    return;
  }
  if (entry.count >= 8) {
    res.status(429).json({ error: 'Too many sign-in attempts. Please wait 15 minutes and try again.' });
    return;
  }
  entry.count += 1;
  next();
}

export async function initializeApi(): Promise<void> {
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is unavailable. Connect the Replit PostgreSQL database before starting RegisTrack.');
  }
  await pool.query('SELECT 1');
  await ensureBootstrapAccount();
}

export function registerApi(app: import('express').Express): void {
  app.post('/api/login', csrfGuard, loginRateLimit, async (req, res, next) => {
    try {
      const { identifier, password } = req.body || {};
      const role = req.body?.role ?? 'auto';
      if (!['auto', 'student', 'admin', 'superadmin'].includes(role) ||
        typeof identifier !== 'string' || !identifier.trim() ||
        typeof password !== 'string' || !password) {
        fail(res, 400, 'Enter your account identifier and password.');
        return;
      }

      const normalized = identifier.trim().toLowerCase();
      const matches = await pool.query<AccountRow>(
        `SELECT id, name, email, role, status, student_id, password_hash, data, created_at
         FROM registrack_accounts
         WHERE (role = 'student' AND lower(name) = $1)
            OR (role <> 'student' AND (lower(name) = $1 OR lower(email) = $1))`,
        [normalized],
      );
      // Resolve identity only after verifying credentials. Never select an arbitrary
      // account when a username overlaps another account's ID or email.
      const authenticated: AccountRow[] = [];
      for (const candidate of matches.rows) {
        if (candidate.status === 'active' && roleForLogin(candidate.role, role) &&
          await verifyAccountCredential(candidate, password)) authenticated.push(candidate);
      }
      const row = authenticated.length === 1 ? authenticated[0] : undefined;
      if (!row) {
        const key = req.ip || 'unknown';
        const attempt = loginAttempts.get(key);
        if (attempt) attempt.count += 1;
        fail(res, 401, 'The account or password is incorrect, or this account is inactive.');
        return;
      }

      loginAttempts.delete(req.ip || 'unknown');
      const token = createSessionToken();
      await withTransaction(async (client) => {
        await client.query(
          'INSERT INTO registrack_sessions (token_hash, account_id, expires_at) VALUES ($1, $2, now() + $3::interval)',
          [hashSessionToken(token), row.id, SESSION_LIFETIME_SQL],
        );
        await client.query(
          `UPDATE registrack_accounts SET data = jsonb_set(data, '{lastLogin}', to_jsonb($1::text), true)
           WHERE id = $2`,
          [new Date().toISOString(), row.id],
        );
      });
      res.cookie(SESSION_COOKIE, token, cookieOptions(req));
      res.json({ user: toAuthenticatedUser(row) });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/session', async (req, res, next) => {
    try {
      const token = getCookie(req, SESSION_COOKIE);
      const account = await resolveAuth(req);
      if (!account || !token) {
        res.json({ user: null });
        return;
      }
      const result = await pool.query<AccountRow>(
        `SELECT id, name, email, role, status, student_id, password_hash, data, created_at
         FROM registrack_accounts WHERE id = $1 LIMIT 1`,
        [account.accountId],
      );
      res.json({ user: result.rows[0] ? toAuthenticatedUser(result.rows[0]) : null });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/logout', csrfGuard, async (req, res, next) => {
    try {
      const token = getCookie(req, SESSION_COOKIE);
      if (token) {
        await pool.query('DELETE FROM registrack_sessions WHERE token_hash = $1', [hashSessionToken(token)]);
      }
      res.clearCookie(SESSION_COOKIE, { ...cookieOptions(req), maxAge: undefined });
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/bootstrap', requireAuth, async (req: RequestWithAuth, res, next) => {
    try {
      if (!req.auth) return fail(res, 401, 'Your session is no longer valid.');
      res.json({ user: await currentPublicUser(req.auth), state: await getState(req.auth) });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/state', requireAuth, async (req: RequestWithAuth, res, next) => {
    try {
      if (!req.auth) return fail(res, 401, 'Your session is no longer valid.');
      res.json(await getState(req.auth));
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/state/restore-backup', csrfGuard, requireSuperadmin, async (req: RequestWithAuth, res, next) => {
    try {
      let source: unknown = req.body?.backup ?? req.body?.data ?? req.body?.payload ?? req.body;
      if (typeof source === 'string') {
        try {
          source = JSON.parse(source);
        } catch {
          return fail(res, 400, 'The backup is not valid JSON.');
        }
      }
      if (!isObject(source)) return fail(res, 400, 'The backup must be a JSON object.');
      if (!Array.isArray(source.tickets)) {
        return fail(res, 400, 'A complete backup must include the ticket request list.');
      }

      const restored: State = {};
      for (const key of BACKUP_DATA_KEYS) {
        if (source[key] === undefined) continue;
        if (key === 'systemSettings') {
          restored[key] = validateBackupSettings(source[key]);
          continue;
        }
        restored[key] = validateBackupArray(key, source[key]);
      }
      if (restored.tickets === undefined) {
        return fail(res, 400, 'The backup does not contain a valid ticket request list.');
      }

      await withTransaction(async (client) => {
        const previousTickets = await lockResource(client, 'tickets');
        for (const key of [...BACKUP_DATA_KEYS].sort()) {
          if (restored[key] === undefined) continue;
          await lockResource(client, key);
          await saveResource(client, key, key === 'auditLogs'
            ? mergeAppendOnlyRecords(await lockResource(client, key), restored[key]) : restored[key]);
        }
        const previousById = new Map((Array.isArray(previousTickets) ? previousTickets.filter(isObject) : [])
          .map(ticket => [String(ticket.id), ticket]));
        const imported = restored.tickets as Record<string, unknown>[];
        const evidenced: Record<string, unknown>[] = [];
        for (const ticket of imported) {
          const previous = previousById.get(String(ticket.id));
          if (previous && (stableJson(previous.stage) !== stableJson(ticket.stage) ||
            (previous.status === 'completed') !== (ticket.status === 'completed'))) {
            evidenced.push(await appendWorkflowEvidence(client, previous, {
              ...ticket, timelineHistory: [
                ...(Array.isArray(previous.timelineHistory) ? previous.timelineHistory : []),
                ...(Array.isArray(ticket.timelineHistory) ? ticket.timelineHistory : []).filter(event =>
                  !(Array.isArray(previous.timelineHistory) ? previous.timelineHistory : []).some(old => stableJson(old) === stableJson(event))),
              ],
            }, req.auth!, 'backup_restore', 'Intentional Super Admin backup recovery.', {
              lock: lockResource, save: saveResource,
            }));
          } else evidenced.push(ticket);
        }
        await saveResource(client, 'tickets', evidenced);
        const sequenceKey = 'system:ticket-sequence';
        const sequence = await lockResource(client, sequenceKey);
        const currentYear = new Date().getFullYear();
        const restoredMaximum = (restored.tickets as Record<string, unknown>[])
          .map((ticket) => {
            const match = /^REG-(\d{4})-(\d+)$/.exec(String(ticket.ticketNumber || ''));
            return match && Number(match[1]) === currentYear ? Number(match[2]) : 0;
          })
          .reduce((maximum, number) => Math.max(maximum, number), 0);
        const currentSequence = Number(isObject(sequence) ? sequence.value : 0);
        await saveResource(client, sequenceKey, {
          value: Math.max(Number.isSafeInteger(currentSequence) ? currentSequence : 0, restoredMaximum),
        });
      });

      res.json({
        ok: true,
        restored: Object.keys(restored),
        accountsPreserved: true,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        fail(res, error.statusCode, error.message);
        return;
      }
      next(error);
    }
  });

  app.post('/api/archive-completed', csrfGuard, requireSuperadmin, async (req: RequestWithAuth, res, next) => {
    try {
      const auth = req.auth;
      if (!auth) return fail(res, 401, 'Your session is no longer valid.');
      const count = await withTransaction(async (client) => {
        const activeValue = await lockResource(client, 'tickets');
        const historyValue = await lockResource(client, 'completedRequestsHistory');
        if (!Array.isArray(activeValue) || !Array.isArray(historyValue)) {
          throw new ApiError(400, 'Ticket or completed request history data is invalid.');
        }
        const activeTickets = activeValue.filter(isObject);
        const history = historyValue.filter(isObject);
        if (activeTickets.length !== activeValue.length || history.length !== historyValue.length) {
          throw new ApiError(400, 'Ticket or completed request history contains invalid records.');
        }

        const completedTickets = activeTickets.filter((ticket) =>
          ticket.status === 'completed' || ticket.stage === 'completed',
        );
        if (!completedTickets.length) return 0;
        const records = completedTickets
          .map((ticket) => completedRecordFromTicket(ticket, auth));
        const completedNumbers = new Set(completedTickets.map(ticket => String(ticket.ticketNumber)));
        await saveResource(client, 'completedRequestsHistory', [...records,
          ...history.filter(record => !completedNumbers.has(String(record.ticketNumber)))]);
        const archivedIds = new Set(completedTickets.map((ticket) => String(ticket.id)));
        await saveResource(client, 'tickets', activeTickets.filter((ticket) => !archivedIds.has(String(ticket.id))));
        return completedTickets.length;
      });
      res.json({ count });
    } catch (error) {
      if (error instanceof ApiError) {
        fail(res, error.statusCode, error.message);
        return;
      }
      next(error);
    }
  });

  app.post('/api/tickets', csrfGuard, requireAuth, async (req: RequestWithAuth, res, next) => {
    try {
      const auth = req.auth;
      if (!auth) return fail(res, 401, 'Your session is no longer valid.');
      if (auth.accountRole !== 'receiver' && auth.accountRole !== 'superadmin') {
        return fail(res, 403, 'Only Receiver and Super Admin can submit new requests.');
      }
      if (!isObject(req.body?.ticket)) return fail(res, 400, 'A ticket object is required.');
      const result = await withTransaction((client) => createCanonicalTicket(client, req.body.ticket, auth));
      res.status(result.created ? 201 : 200).json({ ticket: scopeTicket(auth, result.ticket) });
    } catch (error) {
      if (error instanceof ApiError) {
        fail(res, error.statusCode, error.message);
        return;
      }
      next(error);
    }
  });

  app.post('/api/tickets/:id/workflow', csrfGuard, requireAuth, async (req: RequestWithAuth, res, next) => {
    try {
      if (!req.auth) return fail(res, 401, 'Your session is no longer valid.');
      if (!isObject(req.body)) return fail(res, 400, 'A workflow action is required.');
      const ticket = await withTransaction(client => performTicketWorkflow(client, req.params.id, req.body, req.auth!, {
        lock: lockResource, save: saveResource,
        access: async (ticket, actor, client) => {
          const assignee = String(ticket.assignedTo || '').trim().toLowerCase();
          if (actor.accountRole === 'superadmin' || assignee === actor.name.trim().toLowerCase()) return true;
          if (actor.accountRole !== 'receiver') return false;
          const result = await client.query<{ payload: unknown }>(
            "SELECT payload FROM registrack_data WHERE key = 'systemSettings'",
          );
          const settings = isObject(result.rows[0]?.payload) ? result.rows[0].payload : {};
          return [SUPERADMIN_OFFICE, 'Registrar Office', 'Registrar Intake Queue', 'Unassigned',
            typeof settings.officeName === 'string' ? settings.officeName : '']
            .filter(Boolean).some(queue => queue.trim().toLowerCase() === assignee);
        },
        assignment: validateTicketAssignmentUpdate, completion: completedRecordFromTicket,
      }));
      res.json({ ticket: scopeTicket(req.auth, ticket) });
    } catch (error) {
      if (error instanceof WorkflowError) return fail(res, error.statusCode, error.message);
      next(error);
    }
  });

  app.patch('/api/tickets/:id/priority', csrfGuard, requireAuth, async (req: RequestWithAuth, res, next) => {
    try {
      const auth = req.auth;
      if (!auth) return fail(res, 401, 'Your session is no longer valid.');
      if (auth.accountRole === 'student') return fail(res, 403, 'Students cannot change request priority.');
      const priority = normalizeTicketPriority(req.body?.priority);
      if (!priority) return fail(res, 400, 'Choose a valid request priority.');
      const ticket = await withTransaction(async client => {
        const value = await lockResource(client, 'tickets');
        if (!Array.isArray(value) || !value.every(isObject)) {
          throw new ApiError(500, 'Ticket records are unavailable.');
        }
        const existing = value.find(item => item.id === req.params.id);
        if (!existing) throw new ApiError(404, 'This request is no longer available.');
        if (!canAccessTicket(existing, auth)) {
          throw new ApiError(403, 'You can only update tickets assigned to your account.');
        }
        if (existing.priority === priority) return existing;
        const updated = { ...existing, priority, updatedAt: new Date().toISOString() };
        await saveResource(client, 'tickets', value.map(item => item.id === existing.id ? updated : item));
        return updated;
      });
      res.json({ ticket: scopeTicket(auth, ticket) });
    } catch (error) {
      if (error instanceof ApiError) {
        fail(res, error.statusCode, error.message);
        return;
      }
      next(error);
    }
  });

  app.post('/api/tickets/:id/messages', csrfGuard, requireAuth, async (req: RequestWithAuth, res, next) => {
    try {
      const auth = req.auth;
      if (!auth) return fail(res, 401, 'Your session is no longer valid.');
      const result = await withTransaction((client) =>
        appendTicketMessage(client, req.params.id, req.body?.message, auth),
      );
      res.json({ ticket: scopeTicket(auth, result.ticket) });
    } catch (error) {
      if (error instanceof ApiError) {
        fail(res, error.statusCode, error.message);
        return;
      }
      next(error);
    }
  });

  app.post('/api/tickets/:id/delete', csrfGuard, requireAuth, async (req: RequestWithAuth, res, next) => {
    try {
      const auth = req.auth;
      if (!auth) return fail(res, 401, 'Your session is no longer valid.');
      if (auth.accountRole === 'student') {
        return fail(res, 403, 'Only an officer can delete a ticket.');
      }
      await withTransaction((client) => deleteTicket(client, req.params.id, req.body?.reason, auth));
      res.json({ ok: true });
    } catch (error) {
      if (error instanceof ApiError) {
        fail(res, error.statusCode, error.message);
        return;
      }
      next(error);
    }
  });

  app.post('/api/tickets/:id/restore', csrfGuard, requireAuth, async (req: RequestWithAuth, res, next) => {
    try {
      const auth = req.auth;
      if (!auth) return fail(res, 401, 'Your session is no longer valid.');
      if (auth.accountRole === 'student') {
        return fail(res, 403, 'Only an officer can restore a deleted ticket.');
      }
      const ticket = await withTransaction((client) => restoreTicket(client, req.params.id, auth));
      res.json({ ticket: scopeTicket(auth, ticket) });
    } catch (error) {
      if (error instanceof ApiError) {
        fail(res, error.statusCode, error.message);
        return;
      }
      next(error);
    }
  });

  app.put('/api/state/:key', csrfGuard, requireAuth, async (req: RequestWithAuth, res, next) => {
    try {
      const auth = req.auth;
      const key = req.params.key;
      const payload = req.body?.payload;
      const expectedVersion = req.body?.version;
      if (!auth) return fail(res, 401, 'Your session is no longer valid.');
      if (!STATE_KEYS.has(key) || key === 'users' || key === 'deletedAccounts') {
        return fail(res, 404, 'This system resource cannot be updated through this endpoint.');
      }
      if (payload === undefined || JSON.stringify(payload).length > 4_500_000) {
        return fail(res, 400, 'A valid system data payload under 4.5 MB is required.');
      }
      if (typeof expectedVersion !== 'number' ||
        !Number.isSafeInteger(expectedVersion) || expectedVersion < 0) {
        return fail(res, 400, 'A non-negative resource version is required.');
      }
      if (ARRAY_RESOURCES.has(key) && !Array.isArray(payload)) {
        return fail(res, 400, `${key} must be an array.`);
      }
      if (key === 'requestCategories' && !Array.isArray(payload)) {
        return fail(res, 400, 'requestCategories must be an array.');
      }
      if (key === 'systemSettings' && !isObject(payload)) {
        return fail(res, 400, 'System settings must be an object.');
      }
      if (!canWriteResource(auth, key)) {
        return fail(res, 403, 'Your account does not have permission to update this system data.');
      }

      const result = await withTransaction(async (client) => {
        if (key === 'studentRecords' && auth.accountRole !== 'student') {
          await client.query(
            "SELECT id FROM registrack_accounts WHERE role = 'student' ORDER BY id FOR UPDATE",
          );
        }
        const locked = await lockResourceWithVersion(client, key);
        if (locked.version !== expectedVersion) {
          throw new ApiError(409, `This resource changed since it was loaded. Current version is ${locked.version}.`);
        }
        const stored = locked.payload;
        if (auth.accountRole === 'student') {
          if (key === 'tickets') {
            const merged = await mergeStudentTickets(stored, payload, auth);
            await saveResource(client, key, merged);
            return { payload: merged, version: locked.version + 1 };
          }
          if (key === 'notifications') {
            const merged = mergeStudentNotifications(stored, payload, auth);
            await saveResource(client, key, merged);
            return { payload: merged, version: locked.version + 1 };
          }
          throw new Error('Students cannot update this resource.');
        }
        if (key === 'tickets') {
          const merged = await mergeOfficerTickets(client, stored, payload, auth);
          await saveResource(client, key, merged);
          return { payload: merged, version: locked.version + 1 };
        }
        if (key === 'notifications') {
          const merged = mergeOfficerNotifications(stored, payload);
          await saveResource(client, key, merged);
          return { payload: merged, version: locked.version + 1 };
        }
        if (key === 'deletedRequestsHistory' || key === 'completedRequestsHistory') {
          const merged = await mergeOfficerHistory(client, stored, payload, auth);
          await saveResource(client, key, merged);
          return { payload: merged, version: locked.version + 1 };
        }
        if (key === 'auditLogs' || key === 'systemActivities') {
          if (key === 'auditLogs' && Array.isArray(payload)) {
            const storedIds = new Set((Array.isArray(stored) ? stored.filter(isObject) : []).map(record => record.id));
            if (payload.filter(isObject).some(record => !storedIds.has(record.id) &&
              (String(record.action || '').startsWith('WORKFLOW_') || String(record.id || '').startsWith('workflow-audit-')))) {
              throw new ApiError(403, 'Workflow audit records are server-written only.');
            }
          }
          const merged = stampBrowserAuthoredRecords(stored, payload, key, auth);
          await saveResource(client, key, merged);
          return { payload: merged, version: locked.version + 1 };
        }
        if (key === 'studentRecords') {
          const synchronized = await syncStudentAccountsWithProfiles(client, payload);
          await saveResource(client, key, synchronized);
          return { payload: synchronized, version: locked.version + 1 };
        }
        await saveResource(client, key, payload);
        return { payload, version: locked.version + 1 };
      });
      res.json({
        payload: scopeResourcePayload(auth, key, result.payload),
        version: result.version,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        fail(res, error.statusCode, error.message);
        return;
      }
      if (error instanceof Error && error.message.startsWith('Students cannot')) {
        fail(res, 403, error.message);
        return;
      }
      next(error);
    }
  });

  app.post('/api/users', csrfGuard, requireSuperadmin, async (req: RequestWithAuth, res, next) => {
    try {
      const input = cleanAccountInput(req.body?.user);
      const passwordHash = await hashPassword(input.password);
      const inserted = await withTransaction(async (client) => {
        const result = await client.query<AccountRow>(
          `INSERT INTO registrack_accounts
             (id, name, email, role, status, student_id, password_hash, data)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
           RETURNING id, name, email, role, status, student_id, password_hash, data, created_at`,
          [
            input.id,
            input.name,
            input.email,
            input.role,
            input.status,
            input.studentId,
            passwordHash,
            JSON.stringify(input.data),
          ],
        );
        const user = result.rows[0];
        if (input.role === 'student') {
          await upsertStudentRecord(client, input, user);
        }
        return user;
      });
      res.status(201).json({ user: publicAccount(inserted) });
    } catch (error) {
      if (isUniqueViolation(error)) {
        fail(res, 409, 'That name, email, or student ID is already assigned to another account.');
        return;
      }
      if (error instanceof Error && !(error as Error & { code?: string }).code) {
        fail(res, 400, error.message);
        return;
      }
      next(error);
    }
  });

  app.put('/api/users/:id', csrfGuard, requireAuth, async (req: RequestWithAuth, res, next) => {
    try {
      const auth = req.auth;
      if (!auth) return fail(res, 401, 'Your session is no longer valid.');
      const isSelf = auth.accountId === req.params.id;
      if (auth.accountRole !== 'superadmin' && !isSelf) {
        return fail(res, 403, 'Only the Registrar can update another account.');
      }
      if (!isObject(req.body?.updates)) return fail(res, 400, 'Account updates must be an object.');
      const updates = req.body.updates as Record<string, unknown>;
      const allowed = auth.accountRole === 'superadmin'
        ? new Set(['name', 'email', 'role', 'status', 'departmentOrOffice', 'studentId', 'phoneNumber', 'profilePicture', 'avatarColor', 'adminRoleTitle', 'degreeProgram', 'yearLevel'])
        : new Set(['profilePicture']);
      if (Object.keys(updates).some((key) => !allowed.has(key))) {
        return fail(res, 400, 'The update includes a protected or unsupported account field.');
      }
      const row = await withTransaction(async (client) => {
        const result = await client.query<AccountRow>(
          `SELECT id, name, email, role, status, student_id, password_hash, data, created_at
           FROM registrack_accounts WHERE id = $1 FOR UPDATE`,
          [req.params.id],
        );
        const existing = result.rows[0];
        if (!existing) return null;
        if (existing.role === 'student' && updates.studentId !== undefined &&
          updates.studentId !== existing.student_id) {
          throw new Error('A student ID cannot be changed through account editing because it is linked to request history.');
        }
        if (auth.accountRole === 'superadmin' && existing.role === 'superadmin' &&
          updates.role !== undefined && updates.role !== 'superadmin') {
          const count = await client.query<{ count: string }>(
            "SELECT count(*)::text AS count FROM registrack_accounts WHERE role = 'superadmin' AND status = 'active'",
          );
          if (Number(count.rows[0]?.count || 0) <= 1) {
            throw new Error('The last active Registrar account cannot be demoted.');
          }
        }
        if (auth.accountRole === 'superadmin' && existing.role === 'superadmin' &&
          updates.status !== undefined && updates.status !== 'active') {
          const count = await client.query<{ count: string }>(
            "SELECT count(*)::text AS count FROM registrack_accounts WHERE role = 'superadmin' AND status = 'active'",
          );
          if (Number(count.rows[0]?.count || 0) <= 1) {
            throw new Error('The last active Registrar account cannot be deactivated.');
          }
        }

        const allowedColumns = new Set(['name', 'email', 'role', 'status', 'studentId']);
        const nextData = { ...existing.data };
        const assignments: string[] = [];
        const values: unknown[] = [];
        const columnEntries: Array<[string, string]> = [
          ['name', 'name'],
          ['email', 'email'],
          ['role', 'role'],
          ['status', 'status'],
          ['studentId', 'student_id'],
        ];

        for (const [property, column] of columnEntries) {
          if (updates[property] === undefined) continue;
          if (typeof updates[property] !== 'string' || !String(updates[property]).trim()) {
            throw new Error(`Enter a valid ${property}.`);
          }
          const value = String(updates[property]).trim();
          if (property === 'role' && !ACCOUNT_ROLES.has(value)) throw new Error('Choose a valid account role.');
          if (property === 'status' && !['active', 'inactive', 'suspended'].includes(value)) {
            throw new Error('Choose a valid account status.');
          }
          if (property === 'studentId' && value && !/^\d{8}$/.test(value)) {
            throw new Error('Student ID must be exactly 8 digits.');
          }
          assignments.push(`${column} = $${values.length + 1}`);
          values.push(value || null);
        }

        for (const property of ['departmentOrOffice', 'phoneNumber', 'profilePicture', 'avatarColor', 'adminRoleTitle', 'degreeProgram', 'yearLevel']) {
          if (updates[property] === undefined) continue;
          if (typeof updates[property] !== 'string' || String(updates[property]).length > 500_000) {
            throw new Error(`Enter a valid ${property}.`);
          }
          const maxLength = property === 'degreeProgram' ? 160 : property === 'yearLevel' ? 80 : 500_000;
          if (String(updates[property]).length > maxLength) {
            throw new Error(`Enter a valid ${property}.`);
          }
          nextData[property] = ['degreeProgram', 'yearLevel', 'phoneNumber'].includes(property)
            ? String(updates[property]).trim()
            : updates[property];
        }
        if (assignments.some((entry) => entry.startsWith('email ='))) {
          const email = String(updates.email).trim().toLowerCase();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid account email address.');
          values[assignments.findIndex((entry) => entry.startsWith('email ='))] = email;
        }
        assignments.push(`data = $${values.length + 1}::jsonb`);
        values.push(JSON.stringify(nextData));
        values.push(req.params.id);

        const saved = await client.query<AccountRow>(
          `UPDATE registrack_accounts SET ${assignments.join(', ')}
           WHERE id = $${values.length}
           RETURNING id, name, email, role, status, student_id, password_hash, data, created_at`,
          values,
        );
        const updatedAccount = saved.rows[0];
        if (updatedAccount?.role === 'student') {
          await syncStudentProfileFromAccount(client, updatedAccount);
        }
        return updatedAccount || null;
      });
      if (!row) return fail(res, 404, 'Account not found.');
      res.json({ user: publicAccount(row) });
    } catch (error) {
      if (isUniqueViolation(error)) {
        fail(res, 409, 'That name, email, or student ID is already assigned to another account.');
        return;
      }
      if (error instanceof Error && !(error as Error & { code?: string }).code) {
        fail(res, 400, error.message);
        return;
      }
      next(error);
    }
  });

  app.delete('/api/users/:id', csrfGuard, requireSuperadmin, async (req: RequestWithAuth, res, next) => {
    try {
      const deleted = await withTransaction(async (client) => {
        const result = await client.query<AccountRow>(
          `SELECT id, name, email, role, status, student_id, password_hash, data, created_at
           FROM registrack_accounts WHERE id = $1 FOR UPDATE`,
          [req.params.id],
        );
        const target = result.rows[0];
        if (!target) return null;
        if (target.role === 'superadmin' && target.status === 'active') {
          const count = await client.query<{ count: string }>(
            "SELECT count(*)::text AS count FROM registrack_accounts WHERE role = 'superadmin' AND status = 'active'",
          );
          if (Number(count.rows[0]?.count || 0) <= 1) {
            throw new Error('The last active Registrar account cannot be deleted.');
          }
        }

        const blacklist = await lockResource(client, 'deletedAccounts') as unknown[];
        const current = Array.isArray(blacklist) ? blacklist : [];
        await saveResource(client, 'deletedAccounts', [
          {
            id: target.id,
            name: target.name.toLowerCase(),
            email: target.email.toLowerCase(),
            studentId: target.student_id || undefined,
            deletedAt: new Date().toISOString(),
          },
          ...current,
        ]);
        await client.query('DELETE FROM registrack_sessions WHERE account_id = $1', [target.id]);
        await client.query('DELETE FROM registrack_accounts WHERE id = $1', [target.id]);
        return target;
      });
      if (!deleted) return fail(res, 404, 'Account not found.');
      res.json({ ok: true });
    } catch (error) {
      if (error instanceof Error && !(error as Error & { code?: string }).code) {
        fail(res, 400, error.message);
        return;
      }
      next(error);
    }
  });

  app.post('/api/users/:id/reset-password', csrfGuard, requireSuperadmin, async (req: RequestWithAuth, res, next) => {
    try {
      const password = makeTemporaryPassword();
      const passwordHash = await hashPassword(password);
      const result = await pool.query(
        'UPDATE registrack_accounts SET password_hash = $1 WHERE id = $2 RETURNING id',
        [passwordHash, req.params.id],
      );
      if (!result.rowCount) return fail(res, 404, 'Account not found.');
      res.json({ password });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/change-password', csrfGuard, requireAuth, async (req: RequestWithAuth, res, next) => {
    try {
      const auth = req.auth;
      const { oldPassword, newPassword } = req.body || {};
      if (!auth) return fail(res, 401, 'Your session is no longer valid.');
      if (typeof oldPassword !== 'string' || !oldPassword ||
        typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 256) {
        return fail(res, 400, 'Enter your current password and choose a new password with at least 8 characters.');
      }
      const result = await pool.query<Pick<AccountRow, 'role' | 'student_id' | 'password_hash'>>(
        'SELECT role, student_id, password_hash FROM registrack_accounts WHERE id = $1 AND status = $2',
        [auth.accountId, 'active'],
      );
      if (!result.rows[0] || !(await verifyAccountCredential(result.rows[0], oldPassword))) {
        return fail(res, 401, 'Your current password is incorrect.');
      }
      await pool.query(
        'UPDATE registrack_accounts SET password_hash = $1 WHERE id = $2',
        [await hashPassword(newPassword), auth.accountId],
      );
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });
}

function isUniqueViolation(error: unknown): boolean {
  return isObject(error) && error.code === '23505';
}

function completedRecordFromTicket(
  ticket: Record<string, unknown>,
  archiver: AuthenticatedAccount,
): Record<string, unknown> {
  const id = typeof ticket.id === 'string' ? ticket.id : '';
  const ticketNumber = typeof ticket.ticketNumber === 'string' ? ticket.ticketNumber : '';
  const studentId = typeof ticket.studentId === 'string' ? ticket.studentId : '';
  if (!id || !ticketNumber || !/^\d{8}$/.test(studentId)) {
    throw new ApiError(400, 'A completed ticket is missing its ID, request number, or student ID.');
  }

  const parsedCompletion = Date.parse(String(ticket.updatedAt || ''));
  const completedAt = Number.isFinite(parsedCompletion)
    ? new Date(parsedCompletion).toISOString()
    : new Date().toISOString();
  const completedDate = new Date(completedAt);
  const dateStr = completedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timeStr = completedDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const timeline = Array.isArray(ticket.timelineHistory)
    ? ticket.timelineHistory.filter(isObject)
    : [];
  const completionEvent = [...timeline].reverse().find((event) => event.stage === 'completed');
  const completedByName = typeof ticket.completedByOfficerName === 'string'
    ? ticket.completedByOfficerName
    : typeof completionEvent?.actor === 'string' ? completionEvent.actor : archiver.name;
  const completedByRole = typeof ticket.completedByOfficerRole === 'string'
    ? ticket.completedByOfficerRole
    : typeof ticket.assignedRole === 'string' ? ticket.assignedRole
      : completedByName === archiver.name ? 'superadmin' : 'other';

  return {
    id: `comp-${randomUUID()}`,
    ticketId: id,
    ticketNumber,
    studentName: String(ticket.studentName || ''),
    studentId,
    email: String(ticket.email || ''),
    phone: String(ticket.phone || ''),
    degreeProgram: String(ticket.degreeProgram || ''),
    yearLevel: String(ticket.yearLevel || ''),
    category: String(ticket.category || ''),
    documentType: String(ticket.documentType || ''),
    subject: String(ticket.subject || ''),
    description: String(ticket.description || ''),
    priority: String(ticket.priority || 'Normal'),
    completedAt,
    completedAtFormatted: `${dateStr} • ${timeStr}`,
    completedByOfficerName: completedByName,
    completedByOfficerRole: completedByRole,
    completedByOfficerEmail: typeof ticket.completedByOfficerEmail === 'string'
      ? ticket.completedByOfficerEmail
      : completedByName === archiver.name ? archiver.email : '',
    releaseDate: String(ticket.actualReleaseDate || dateStr),
    releaseLocation: String(ticket.releaseLocation || 'Registrar Counter Window'),
    notes: String(ticket.completionNotes || ticket.notes || 'Completed request archived by the Registrar.'),
    ticketSnapshot: { ...ticket },
  };
}

function canWriteResource(auth: AuthenticatedAccount, key: string): boolean {
  if (auth.accountRole === 'superadmin') return key !== 'users' && key !== 'deletedAccounts';
  if (auth.accountRole !== 'student') {
    return new Set([
      'tickets',
      'notifications',
      'deletedRequestsHistory',
      'completedRequestsHistory',
      'announcements',
      'auditLogs',
      'systemActivities',
    ]).has(key);
  }
  return key === 'tickets' || key === 'notifications';
}

type TicketIntakeConfig = {
  settings: Record<string, unknown>;
  categories: Record<string, unknown>[];
};

async function loadTicketIntakeConfig(client: import('pg').PoolClient): Promise<TicketIntakeConfig> {
  const settingsResult = await client.query<{ payload: unknown }>(
    'SELECT payload FROM registrack_data WHERE key = $1 FOR SHARE',
    ['systemSettings'],
  );
  const categoriesResult = await client.query<{ payload: unknown }>(
    'SELECT payload FROM registrack_data WHERE key = $1 FOR SHARE',
    ['requestCategories'],
  );
  const storedSettings = settingsResult.rows[0]?.payload;
  const storedCategories = categoriesResult.rows[0]?.payload;
  if (settingsResult.rows[0] && !isObject(storedSettings)) {
    throw new ApiError(500, 'Stored system settings are invalid.');
  }
  if (categoriesResult.rows[0] && !Array.isArray(storedCategories)) {
    throw new ApiError(500, 'Stored request categories are invalid.');
  }
  const settings: Record<string, unknown> = {
    ...DEFAULT_SYSTEM_SETTINGS,
    ...(isObject(storedSettings) ? storedSettings : {}),
  };
  if (typeof settings.maintenanceMode !== 'boolean' ||
    typeof settings.autoAssignmentEnabled !== 'boolean') {
    throw new ApiError(500, 'Maintenance or auto-assignment settings are invalid.');
  }
  if (settings.maxPendingPerStudent !== undefined &&
    (typeof settings.maxPendingPerStudent !== 'number' ||
      !Number.isSafeInteger(settings.maxPendingPerStudent) || settings.maxPendingPerStudent < 0)) {
    throw new ApiError(500, 'The per-student pending request limit is invalid.');
  }
  return {
    settings,
    categories: categoriesResult.rows[0]
      ? (storedCategories as unknown[]).filter(isObject)
      : INITIAL_REQUEST_CATEGORIES as unknown as Record<string, unknown>[],
  };
}

function normalizeCategory(value: unknown): string {
  return typeof value === 'string' ? value.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
}

function isActiveRequestCategory(value: unknown, categories: Record<string, unknown>[]): boolean {
  const requested = normalizeCategory(value);
  if (!requested) return false;
  const direct = categories.find((category) =>
    [category.name, category.code, category.id].some((candidate) =>
      normalizeCategory(candidate) === requested,
    ),
  );
  if (direct) return direct.active === true;

  const aliases: Record<string, string[]> = {
    transcriptofrecords: ['tor'],
    enrollment: ['cor', 'certificate of registration'],
    grades: ['cog', 'certificate of grades'],
    studentrecords: ['form 137 / sf10', 'certified true copies', 'honorable dismissal'],
    clearance: ['honorable dismissal'],
    idconcerns: ['other'],
    other: ['other'],
  };
  if (requested === 'certificates') {
    return categories.some((category) =>
      category.active === true && /certif/i.test(`${category.name || ''} ${category.code || ''}`),
    );
  }
  const candidates = aliases[requested] || [];
  return categories.some((category) =>
    category.active === true && [category.name, category.code, category.id].some((candidate) =>
      candidates.some((alias) => normalizeCategory(candidate) === normalizeCategory(alias)),
    ),
  );
}

function enforceTicketIntake(auth: AuthenticatedAccount, config: TicketIntakeConfig, category: unknown): void {
  if (config.settings.maintenanceMode === true && auth.accountRole !== 'superadmin') {
    throw new ApiError(503, 'New requests are temporarily unavailable while the Registrar system is in maintenance mode.');
  }
  if (!isActiveRequestCategory(category, config.categories)) {
    throw new ApiError(400, 'This request category is not active. Choose an available category.');
  }
}

function pendingTicketCount(tickets: Record<string, unknown>[], studentId: string): number {
  return tickets.filter((ticket) =>
    ticket.studentId === studentId &&
    ['pending', 'processing'].includes(String(ticket.status || '').toLowerCase()),
  ).length;
}

function pendingLimit(config: TicketIntakeConfig): number | undefined {
  const value = config.settings.maxPendingPerStudent;
  return typeof value === 'number' ? value : undefined;
}

async function resolveTicketAssignment(
  client: import('pg').PoolClient,
  settings: Record<string, unknown>,
  requestedName?: string,
): Promise<{ assignedTo: string; assignedRole?: string }> {
  const requested = requestedName?.trim();
  const queueLabels = new Set([
    SUPERADMIN_OFFICE,
    typeof settings.officeName === 'string' ? settings.officeName : '',
    'Registrar Office',
    'Registrar Intake Queue',
    'Unassigned',
  ].map((name) => name.toLowerCase()));
  if (requested && !queueLabels.has(requested.toLowerCase())) {
    const assigneeResult = await client.query<{ name: string; role: string }>(
      `SELECT name, role FROM registrack_accounts
       WHERE lower(name) = lower($1) AND status = 'active'
         AND role NOT IN ('student', 'superadmin')
       LIMIT 1`,
      [requested],
    );
    if (!assigneeResult.rows[0]) {
      throw new ApiError(400, 'The selected assignee is no longer an active staff account.');
    }
    return { assignedTo: assigneeResult.rows[0].name, assignedRole: assigneeResult.rows[0].role };
  }

  if (settings.autoAssignmentEnabled === true) {
    const staff = await client.query<{ name: string; role: string }>(
      `SELECT name, role FROM registrack_accounts
       WHERE status = 'active' AND role IN ('receiver', 'registrar', 'records_management', 'evaluator', 'staff', 'admin')
       ORDER BY CASE role
         WHEN 'receiver' THEN 0
         WHEN 'registrar' THEN 1
         WHEN 'records_management' THEN 2
         WHEN 'evaluator' THEN 3
         ELSE 4
       END, created_at, lower(name)
       LIMIT 1`,
    );
    if (staff.rows[0]) {
      return { assignedTo: staff.rows[0].name, assignedRole: staff.rows[0].role };
    }
    return { assignedTo: SUPERADMIN_OFFICE, assignedRole: 'registrar' };
  }
  return { assignedTo: 'Unassigned' };
}

async function lockResourceWithVersion(
  client: import('pg').PoolClient,
  key: string,
): Promise<{ payload: unknown; version: number }> {
  const result = await client.query<{ payload: unknown; version: number }>(
    'SELECT payload, version FROM registrack_data WHERE key = $1 FOR UPDATE',
    [key],
  );
  if (result.rows[0]) return { payload: result.rows[0].payload, version: Number(result.rows[0].version) || 0 };
  const initial = ARRAY_RESOURCES.has(key) || key === 'requestCategories' ? [] : {};
  await client.query(
    `INSERT INTO registrack_data (key, payload, version)
     VALUES ($1, $2::jsonb, 0) ON CONFLICT (key) DO NOTHING`,
    [key, JSON.stringify(initial)],
  );
  const inserted = await client.query<{ payload: unknown; version: number }>(
    'SELECT payload, version FROM registrack_data WHERE key = $1 FOR UPDATE',
    [key],
  );
  return {
    payload: inserted.rows[0]?.payload ?? initial,
    version: Number(inserted.rows[0]?.version) || 0,
  };
}

async function lockResource(client: import('pg').PoolClient, key: string): Promise<unknown> {
  return (await lockResourceWithVersion(client, key)).payload;
}

async function saveResource(
  client: import('pg').PoolClient,
  key: string,
  payload: unknown,
): Promise<void> {
  await client.query(
    `INSERT INTO registrack_data (key, payload, version)
     VALUES ($1, $2::jsonb, 1)
     ON CONFLICT (key) DO UPDATE SET
       payload = EXCLUDED.payload,
       version = registrack_data.version + 1`,
    [key, JSON.stringify(payload)],
  );
}

async function mergeStudentTickets(
  currentValue: unknown,
  submittedValue: unknown,
  auth: AuthenticatedAccount,
): Promise<Record<string, unknown>[]> {
  if (!auth.studentId) throw new Error('Your student account is missing its student ID.');
  if (!Array.isArray(currentValue) || !Array.isArray(submittedValue)) {
    throw new ApiError(400, 'Ticket data must be an array.');
  }
  const current = currentValue.filter(isObject);
  const submitted = submittedValue.filter(isObject);
  if (submitted.length !== submittedValue.length || submitted.length > 5_000) {
    throw new ApiError(400, 'Ticket data contains invalid entries or is too large.');
  }
  const ownTickets = current.filter((ticket) => String(ticket.studentId || '') === auth.studentId);
  const ownById = new Map(ownTickets.map((ticket) => [String(ticket.id || ''), ticket]));
  const incomingIds = new Set<string>();
  for (const input of submitted) {
    if (String(input.studentId || '') !== auth.studentId) {
      throw new ApiError(403, 'You cannot submit or edit a request owned by another student.');
    }
    const id = typeof input.id === 'string' ? input.id.trim() : '';
    if (!id || incomingIds.has(id)) throw new ApiError(400, 'Each ticket must have a unique ID.');
    incomingIds.add(id);
    const previous = ownById.get(id);
    if (!previous) {
      throw new ApiError(400, 'New requests must be created through POST /api/tickets.');
    }
    if (String(input.ticketNumber || '') !== String(previous.ticketNumber || '')) {
      throw new ApiError(400, 'A ticket ID and request number cannot be changed.');
    }
    const {
      updatedAt: _previousUpdatedAt,
      internalNotes: _previousNotes,
      createdByAccountId: _previousCreator,
      ...previousWithoutServerNotes
    } = previous;
    const {
      updatedAt: _incomingUpdatedAt,
      internalNotes: _incomingNotes,
      ...inputWithoutServerNotes
    } = input;
    if (stableJson(previousWithoutServerNotes) !== stableJson(inputWithoutServerNotes)) {
      throw new ApiError(403, 'Request details are read-only; use the message endpoint to contact the Registrar.');
    }
  }
  return current;
}

async function validateTicketAssignmentUpdate(
  client: import('pg').PoolClient,
  previous: Record<string, unknown>,
  incoming: Record<string, unknown>,
): Promise<void> {
  const settingsResult = await client.query<{ payload: unknown }>(
    'SELECT payload FROM registrack_data WHERE key = $1',
    ['systemSettings'],
  );
  const settings = isObject(settingsResult.rows[0]?.payload) ? settingsResult.rows[0].payload : {};
  const queueLabels = new Set([
    SUPERADMIN_OFFICE,
    typeof settings.officeName === 'string' ? settings.officeName : '',
    'Registrar Office',
    'Registrar Intake Queue',
    'Unassigned',
  ].map((label) => label.toLowerCase()));
  const changedNames = new Set<string>();
  for (const key of ['assignedTo', 'assignedStaff', 'assignedEvaluator']) {
    if (stableJson(previous[key]) === stableJson(incoming[key])) continue;
    if (incoming[key] === undefined || incoming[key] === null || incoming[key] === '') continue;
    if (typeof incoming[key] !== 'string') {
      throw new ApiError(400, 'Ticket assignees must be active staff accounts or an office queue.');
    }
    const name = incoming[key].trim();
    if (!name || queueLabels.has(name.toLowerCase())) continue;
    changedNames.add(name);
  }
  for (const name of changedNames) {
    const activeAccount = await client.query(
      `SELECT 1 FROM registrack_accounts
       WHERE lower(name) = lower($1) AND status = 'active'
         AND role NOT IN ('student', 'superadmin')
       LIMIT 1`,
      [name],
    );
    if (!activeAccount.rowCount) {
      throw new ApiError(400, 'Tickets may only be assigned to an active staff account or an office queue.');
    }
  }
}

async function mergeOfficerTickets(
  client: import('pg').PoolClient,
  currentValue: unknown,
  submittedValue: unknown,
  auth: AuthenticatedAccount,
): Promise<Record<string, unknown>[]> {
  if (!Array.isArray(currentValue) || !Array.isArray(submittedValue) ||
    submittedValue.length > 5_000) {
    throw new ApiError(400, 'Ticket data must be an array with no more than 5,000 requests.');
  }
  const current = currentValue.filter(isObject);
  const submitted = submittedValue.filter(isObject);
  if (current.length !== currentValue.length || submitted.length !== submittedValue.length) {
    throw new ApiError(400, 'Ticket data contains invalid entries.');
  }
  const currentById = new Map(current.map((ticket) => [String(ticket.id || ''), ticket]));
  const incomingById = new Map<string, Record<string, unknown>>();
  for (const ticket of submitted) {
    const id = typeof ticket.id === 'string' ? ticket.id.trim() : '';
    const ticketNumber = typeof ticket.ticketNumber === 'string' ? ticket.ticketNumber.trim() : '';
    if (!id || !ticketNumber || incomingById.has(id)) {
      throw new ApiError(400, 'Each ticket must have a unique ID and request number.');
    }
    incomingById.set(id, ticket);
  }

  const merged: Record<string, unknown>[] = [];
  for (const incoming of submitted) {
    const id = String(incoming.id);
    const previous = currentById.get(id);
    if (!previous) {
      throw new ApiError(400, 'New requests must be created through POST /api/tickets.');
    }
    if (String(previous.studentId || '') !== String(incoming.studentId || '') ||
      String(previous.ticketNumber || '') !== String(incoming.ticketNumber || '')) {
      throw new ApiError(400, 'A ticket’s ID, request number, and student owner cannot be changed.');
    }
    const { updatedAt: _previousUpdatedAt, ...previousContent } = previous;
    const { updatedAt: _incomingUpdatedAt, ...incomingContent } = incoming;
    if (stableJson(previousContent) === stableJson(incomingContent)) {
      merged.push(previous);
      continue;
    }
    if (!canAccessTicket(previous, auth)) {
      throw new ApiError(403, 'You can only update tickets assigned to your account.');
    }
    for (const field of PROTECTED_WORKFLOW_FIELDS) {
      if (stableJson(previous[field]) !== stableJson(incoming[field])) {
        throw new ApiError(403, 'Workflow changes must use the server workflow endpoint.');
      }
    }
    if (incoming.priority !== previous.priority) {
      const priority = normalizeTicketPriority(incoming.priority);
      if (!priority) throw new ApiError(400, 'Choose a valid request priority.');
      incomingContent.priority = priority;
    }
    await validateTicketAssignmentUpdate(client, previous, incoming);
    if (stableJson(previous.messages || []) !== stableJson(incoming.messages || [])) {
      throw new ApiError(403, 'Messages must be sent through POST /api/tickets/:id/messages.');
    }

    const updated = {
      ...incomingContent,
      assignedStaff: incoming.assignedTo,
      assignedEvaluator: incoming.assignedTo,
      messages: Array.isArray(previous.messages) ? previous.messages : [],
      internalNotes: mergeUniqueRecords(previous.internalNotes, incoming.internalNotes),
    };
    merged.push(stableJson(previousContent) === stableJson(updated)
      ? previous
      : { ...updated, updatedAt: new Date().toISOString() });
  }

  for (const existing of current) {
    if (incomingById.has(String(existing.id || ''))) continue;
    merged.push(existing);
  }
  return merged;
}

function formatArrival(date: Date): { timestamp: string; exactTime: string; dateStr: string } {
  const exactTime = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  const dateStr = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return { timestamp: `${dateStr} • ${exactTime}`, exactTime, dateStr };
}

function ticketFromHistory(record: Record<string, unknown>): Record<string, unknown> | undefined {
  return isObject(record.ticketSnapshot) ? record.ticketSnapshot : undefined;
}

function assertIdempotentTicketAccess(ticket: Record<string, unknown>, auth: AuthenticatedAccount): void {
  if (typeof ticket.createdByAccountId === 'string' &&
    ticket.createdByAccountId !== auth.accountId) {
    throw new ApiError(409, 'The request ID is already in use.');
  }
  if (auth.accountRole === 'student') {
    if (String(ticket.studentId || '') !== auth.studentId) {
      throw new ApiError(409, 'The request ID is already in use.');
    }
    return;
  }
  if (ticket.createdByAccountId !== auth.accountId && !canAccessTicket(ticket, auth)) {
    throw new ApiError(409, 'The request ID is already in use.');
  }
}

async function createCanonicalTicket(
  client: import('pg').PoolClient,
  input: Record<string, unknown>,
  auth: AuthenticatedAccount,
): Promise<{ ticket: Record<string, unknown>; created: boolean }> {
  const suppliedId = typeof input.id === 'string' ? input.id.trim() : '';
  const requestId = typeof input.requestId === 'string' ? input.requestId.trim() : '';
  if ((!suppliedId && !requestId) || suppliedId.length > 180 || requestId.length > 180) {
    throw new ApiError(400, 'Provide a unique ticket ID or requestId for idempotent ticket creation.');
  }
  const id = suppliedId || `ticket-${requestId}`;
  const isStudent = auth.accountRole === 'student';
  if (isStudent && !auth.studentId) throw new ApiError(400, 'Your student account is missing its student ID.');
  const studentId = isStudent
    ? String(auth.studentId)
    : typeof input.studentId === 'string' ? input.studentId.trim() : '';
  if (!/^\d{8}$/.test(studentId)) {
    throw new ApiError(400, 'A valid 8-digit student ID is required for the request.');
  }
  const activeValue = await lockResource(client, 'tickets');
  const deletedValue = await lockResource(client, 'deletedRequestsHistory');
  const completedValue = await lockResource(client, 'completedRequestsHistory');
  if (!Array.isArray(activeValue) || !Array.isArray(deletedValue) || !Array.isArray(completedValue)) {
    throw new ApiError(500, 'Ticket records are unavailable.');
  }
  const active = activeValue.filter(isObject);
  const deleted = deletedValue.filter(isObject);
  const completed = completedValue.filter(isObject);
  if (active.length !== activeValue.length || deleted.length !== deletedValue.length ||
    completed.length !== completedValue.length) {
    throw new ApiError(500, 'Stored ticket records contain invalid entries.');
  }
  const historySnapshots = [...deleted, ...completed]
    .map((record) => ticketFromHistory(record))
    .filter((ticket): ticket is Record<string, unknown> => !!ticket);
  const existing = [...active, ...historySnapshots].find((ticket) =>
    ticket.id === id || (requestId && ticket.requestId === requestId),
  );
  if (existing) {
    if (String(existing.studentId || '') !== studentId) {
      throw new ApiError(409, 'The request ID is already in use.');
    }
    assertIdempotentTicketAccess(existing, auth);
    return { ticket: existing, created: false };
  }

  if (typeof input.subject !== 'string' || !input.subject.trim() || input.subject.length > 240) {
    throw new ApiError(400, 'A request subject under 240 characters is required.');
  }
  if (typeof input.description !== 'string' || input.description.length > 20_000) {
    throw new ApiError(400, 'Enter a valid request description under 20,000 characters.');
  }
  const config = await loadTicketIntakeConfig(client);
  const category = typeof input.category === 'string' ? input.category.trim().slice(0, 120) : '';
  enforceTicketIntake(auth, config, category);
  const limit = pendingLimit(config);
  const currentPending = pendingTicketCount(active, studentId);
  if (limit !== undefined && currentPending >= limit) {
    throw new ApiError(429, `Student ${studentId} already has ${currentPending} pending requests, which is the allowed limit.`);
  }

  const studentRecordsResult = await client.query<{ payload: unknown }>(
    'SELECT payload FROM registrack_data WHERE key = $1',
    ['studentRecords'],
  );
  const studentRecords = Array.isArray(studentRecordsResult.rows[0]?.payload)
    ? studentRecordsResult.rows[0].payload.filter(isObject)
    : [];
  const profile = studentRecords.find((record) => record.studentId === studentId);
  const assignment = await resolveTicketAssignment(
    client,
    config.settings,
    isStudent ? undefined : typeof input.assignedTo === 'string' ? input.assignedTo : undefined,
  );
  const nowDate = new Date();
  const now = nowDate.toISOString();
  const sequence = await nextTicketSequence(client);
  const ticketNumber = `REG-${nowDate.getFullYear()}-${String(sequence).padStart(5, '0')}`;
  const priority = normalizeTicketPriority(input.priority ?? 'Normal');
  if (!priority) throw new ApiError(400, 'Choose a valid request priority.');
  const email = isStudent
    ? auth.email
    : typeof input.email === 'string' ? input.email.trim().toLowerCase() : String(profile?.email || '');
  const ticket: Record<string, unknown> = {
    id,
    ...(requestId ? { requestId } : {}),
    ticketNumber,
    studentName: isStudent ? auth.name : String(input.studentName || profile?.name || '').trim(),
    studentId,
    email,
    phone: isStudent
      ? String(profile?.phone || auth.phoneNumber || '')
      : String(input.phone || profile?.phone || ''),
    degreeProgram: isStudent
      ? String(profile?.degreeProgram || auth.degreeProgram || '')
      : String(input.degreeProgram || profile?.degreeProgram || ''),
    yearLevel: isStudent
      ? String(profile?.yearLevel || auth.yearLevel || '')
      : String(input.yearLevel || profile?.yearLevel || ''),
    category,
    documentType: String(input.documentType || 'None').slice(0, 120),
    copies: Math.max(1, Math.min(50, Number(input.copies) || 1)),
    purpose: typeof input.purpose === 'string' ? input.purpose.slice(0, 1_000) : '',
    deliveryOption: ['Office Pick-up', 'Digital Copy (Official PDF)', 'Courier Delivery'].includes(String(input.deliveryOption))
      ? input.deliveryOption
      : 'Office Pick-up',
    subject: input.subject.trim(),
    description: input.description.trim(),
    status: 'pending',
    stage: 'submitted',
    priority,
    assignedTo: assignment.assignedTo,
    assignedRole: assignment.assignedRole,
    assignedStaff: assignment.assignedTo,
    assignedEvaluator: assignment.assignedTo,
    createdAt: now,
    updatedAt: now,
    estimatedReleaseDate: '',
    releaseLocation: '',
    claimingRequirements: [],
    messages: [],
    internalNotes: [],
    timelineHistory: [{
      stage: 'submitted',
      title: 'Request submitted',
      timestamp: now,
      actor: auth.name,
      isCurrent: true,
      isPassed: false,
    }],
    createdByAccountId: auth.accountId,
  };
  if (!ticket.studentName) throw new ApiError(400, 'A student name is required for the request.');
  const arrival = formatArrival(nowDate);
  const notification: Record<string, unknown> = {
    id: `notif-${randomUUID()}`,
    title: `New Request Received: ${ticketNumber}`,
    message: `${ticket.studentName} submitted a ${category} request.`,
    ...arrival,
    read: false,
    ticketNumber,
    type: 'status_update',
    audience: 'officer',
  };
  const notificationsValue = await lockResource(client, 'notifications');
  if (!Array.isArray(notificationsValue)) throw new ApiError(500, 'Notification storage is unavailable.');
  await saveResource(client, 'tickets', [ticket, ...active]);
  await saveResource(client, 'notifications', [notification, ...notificationsValue.filter(isObject)]);
  return { ticket, created: true };
}

function scopeTicket(account: AuthenticatedAccount, ticket: Record<string, unknown>): Record<string, unknown> {
  if (account.accountRole !== 'student') return ticket;
  const { createdByAccountId: _createdByAccountId, ...safeTicket } = ticket;
  return redactStudentTicket(safeTicket);
}

async function appendTicketMessage(
  client: import('pg').PoolClient,
  ticketId: string,
  incomingValue: unknown,
  auth: AuthenticatedAccount,
): Promise<{ ticket: Record<string, unknown> }> {
  if (!ticketId || ticketId.length > 180) throw new ApiError(400, 'A valid ticket ID is required.');
  const incoming = isObject(incomingValue) ? incomingValue : { message: incomingValue };
  const text = typeof incoming.message === 'string' ? incoming.message.trim() : '';
  if (!text || text.length > 4_000) throw new ApiError(400, 'A message under 4,000 characters is required.');
  const messageId = typeof incoming.id === 'string' && incoming.id.trim()
    ? incoming.id.trim()
    : `msg-${randomUUID()}`;
  if (messageId.length > 180) throw new ApiError(400, 'The message ID is too long.');
  const ticketsValue = await lockResource(client, 'tickets');
  if (!Array.isArray(ticketsValue)) throw new ApiError(500, 'Ticket storage is unavailable.');
  const tickets = ticketsValue.filter(isObject);
  const index = tickets.findIndex((ticket) => ticket.id === ticketId);
  if (index < 0) throw new ApiError(404, 'Ticket not found.');
  const ticket = tickets[index];
  if (auth.accountRole === 'student') {
    if (String(ticket.studentId || '') !== auth.studentId) {
      throw new ApiError(403, 'You can only message your own request.');
    }
  } else if (!canAccessTicket(ticket, auth)) {
    throw new ApiError(403, 'You can only message tickets assigned to your account.');
  }
  const messages = Array.isArray(ticket.messages) ? ticket.messages.filter(isObject) : [];
  const duplicate = messages.find((message) => message.id === messageId);
  const senderRole = auth.accountRole === 'student' ? 'student' : 'registrar';
  if (duplicate) {
    if (duplicate.message !== text || duplicate.senderRole !== senderRole ||
      duplicate.senderName !== auth.name) {
      throw new ApiError(409, 'The message ID is already in use.');
    }
    return { ticket };
  }

  const date = new Date();
  const message = {
    id: messageId,
    ticketId,
    senderRole,
    senderName: auth.name,
    ...(typeof incoming.avatar === 'string' ? { avatar: incoming.avatar } : {}),
    message: text,
    timestamp: formatArrival(date).timestamp,
  };
  const updatedTicket = { ...ticket, messages: [...messages, message], updatedAt: date.toISOString() };
  const notification: Record<string, unknown> = {
    id: `notif-${randomUUID()}`,
    title: `New Message: ${String(ticket.ticketNumber || ticketId)}`,
    message: `${auth.name} sent a message on request ${String(ticket.ticketNumber || ticketId)}.`,
    ...formatArrival(date),
    read: false,
    ticketNumber: ticket.ticketNumber,
    type: 'chat_message',
    audience: senderRole === 'student' ? 'officer' : 'student',
    ...(senderRole === 'registrar' ? { recipientStudentId: ticket.studentId } : {}),
  };
  const notificationsValue = await lockResource(client, 'notifications');
  if (!Array.isArray(notificationsValue)) throw new ApiError(500, 'Notification storage is unavailable.');
  const nextTickets = tickets.slice();
  nextTickets[index] = updatedTicket;
  await saveResource(client, 'tickets', nextTickets);
  await saveResource(client, 'notifications', [notification, ...notificationsValue.filter(isObject)]);
  return { ticket: updatedTicket };
}

async function deleteTicket(
  client: import('pg').PoolClient,
  ticketId: string,
  reasonValue: unknown,
  auth: AuthenticatedAccount,
): Promise<void> {
  const ticketsValue = await lockResource(client, 'tickets');
  const historyValue = await lockResource(client, 'deletedRequestsHistory');
  if (!Array.isArray(ticketsValue) || !Array.isArray(historyValue)) {
    throw new ApiError(500, 'Ticket history storage is unavailable.');
  }
  const tickets = ticketsValue.filter(isObject);
  const history = historyValue.filter(isObject);
  const existingRecord = history.find((record) => record.ticketId === ticketId);
  if (existingRecord) {
    const snapshot = ticketFromHistory(existingRecord);
    if (!snapshot || !canAccessTicket(snapshot, auth)) {
      throw new ApiError(403, 'You can only delete tickets assigned to your account.');
    }
    return;
  }
  const index = tickets.findIndex((ticket) => ticket.id === ticketId);
  if (index < 0) throw new ApiError(404, 'Ticket not found.');
  const target = tickets[index];
  if (!canAccessTicket(target, auth)) {
    throw new ApiError(403, 'You can only delete tickets assigned to your account.');
  }
  const date = new Date();
  const reason = typeof reasonValue === 'string' && reasonValue.trim()
    ? reasonValue.trim().slice(0, 1_000)
    : 'Removed by Registrar staff';
  const deletedRecord: Record<string, unknown> = {
    id: `del-req-${randomUUID()}`,
    ticketId: target.id,
    ticketNumber: target.ticketNumber,
    studentName: target.studentName,
    studentId: target.studentId,
    email: target.email,
    phone: target.phone,
    degreeProgram: target.degreeProgram,
    yearLevel: target.yearLevel,
    category: target.category,
    documentType: target.documentType,
    subject: target.subject,
    description: target.description,
    priority: target.priority,
    stageAtDeletion: target.stage || 'submitted',
    statusAtDeletion: target.status || 'pending',
    deletedAt: date.toISOString(),
    deletedAtFormatted: formatArrival(date).timestamp,
    deletedByOfficerName: auth.name,
    deletedByOfficerRole: auth.accountRole,
    deletedByOfficerEmail: auth.email,
    reason,
    ticketSnapshot: target,
  };
  const notification: Record<string, unknown> = {
    id: `notif-${randomUUID()}`,
    title: `Request Deleted: ${String(target.ticketNumber || ticketId)}`,
    message: `Request ${String(target.ticketNumber || ticketId)} was deleted and archived by ${auth.name}.`,
    ...formatArrival(date),
    read: false,
    ticketNumber: target.ticketNumber,
    type: 'status_update',
    audience: 'officer',
  };
  const notificationsValue = await lockResource(client, 'notifications');
  if (!Array.isArray(notificationsValue)) throw new ApiError(500, 'Notification storage is unavailable.');
  await saveResource(client, 'deletedRequestsHistory', [deletedRecord, ...history]);
  await saveResource(client, 'tickets', tickets.filter((ticket) => ticket.id !== ticketId));
  await saveResource(client, 'notifications', [notification, ...notificationsValue.filter(isObject)]);
}

async function restoreTicket(
  client: import('pg').PoolClient,
  deletedRecordId: string,
  auth: AuthenticatedAccount,
): Promise<Record<string, unknown>> {
  const ticketsValue = await lockResource(client, 'tickets');
  const historyValue = await lockResource(client, 'deletedRequestsHistory');
  if (!Array.isArray(ticketsValue) || !Array.isArray(historyValue)) {
    throw new ApiError(500, 'Ticket history storage is unavailable.');
  }
  const tickets = ticketsValue.filter(isObject);
  const history = historyValue.filter(isObject);
  const recordIndex = history.findIndex((record) => record.id === deletedRecordId);
  if (recordIndex < 0) {
    const alreadyRestored = tickets.find((ticket) => ticket.restoredFromDeletedRecordId === deletedRecordId);
    if (alreadyRestored) {
      if (!canAccessTicket(alreadyRestored, auth)) {
        throw new ApiError(403, 'You can only restore tickets assigned to your account.');
      }
      return alreadyRestored;
    }
    throw new ApiError(404, 'Deleted request history record not found.');
  }
  const record = history[recordIndex];
  const snapshot = ticketFromHistory(record);
  if (!snapshot || typeof snapshot.id !== 'string' || typeof snapshot.ticketNumber !== 'string') {
    throw new ApiError(400, 'The deleted request does not contain a valid ticket snapshot.');
  }
  if (!canAccessTicket(snapshot, auth)) {
    throw new ApiError(403, 'You can only restore tickets assigned to your account.');
  }
  const collision = tickets.find((ticket) =>
    ticket.id === snapshot.id || ticket.ticketNumber === snapshot.ticketNumber,
  );
  if (collision) {
    if (collision.id === snapshot.id && collision.ticketNumber === snapshot.ticketNumber &&
      collision.restoredFromDeletedRecordId === deletedRecordId) return collision;
    throw new ApiError(409, 'A ticket with this ID or request number is already active.');
  }
  const restored: Record<string, unknown> = {
    ...snapshot,
    restoredFromDeletedRecordId: deletedRecordId,
    updatedAt: new Date().toISOString(),
  };
  const date = new Date();
  const notification: Record<string, unknown> = {
    id: `notif-${randomUUID()}`,
    title: `Request Restored: ${String(restored.ticketNumber)}`,
    message: `Request ${String(restored.ticketNumber)} was restored to the active queue by ${auth.name}.`,
    ...formatArrival(date),
    read: false,
    ticketNumber: restored.ticketNumber,
    type: 'status_update',
    audience: 'officer',
  };
  const notificationsValue = await lockResource(client, 'notifications');
  if (!Array.isArray(notificationsValue)) throw new ApiError(500, 'Notification storage is unavailable.');
  await saveResource(client, 'tickets', [restored, ...tickets]);
  await saveResource(client, 'deletedRequestsHistory', history.filter((_, index) => index !== recordIndex));
  await saveResource(client, 'notifications', [notification, ...notificationsValue.filter(isObject)]);
  return restored;
}

function mergeUniqueRecords(currentValue: unknown, incomingValue: unknown): unknown[] {
  const current = Array.isArray(currentValue) ? currentValue : [];
  const incoming = Array.isArray(incomingValue) ? incomingValue : [];
  const result = current.slice();
  const ids = new Set(current.filter(isObject).map((item) => String(item.id || '')));
  for (const item of incoming) {
    if (!isObject(item)) continue;
    const id = typeof item.id === 'string' ? item.id : '';
    if (id && ids.has(id)) continue;
    result.push(item);
    if (id) ids.add(id);
  }
  return result;
}

function mergeOfficerNotifications(currentValue: unknown, submittedValue: unknown): Record<string, unknown>[] {
  if (!Array.isArray(currentValue) || !Array.isArray(submittedValue)) {
    throw new ApiError(400, 'Notification data must be an array.');
  }
  const current = currentValue.filter(isObject);
  const submitted = submittedValue.filter(isObject);
  if (current.length !== currentValue.length || submitted.length !== submittedValue.length) {
    throw new ApiError(400, 'Notification data contains invalid entries.');
  }
  const incomingById = new Map(submitted.map((item) => [String(item.id || ''), item]));
  if (incomingById.has('')) throw new ApiError(400, 'Each notification must have a record ID.');
  const merged = current.map((notification) => {
    const incoming = incomingById.get(String(notification.id || ''));
    if (!incoming || stableJson(notification) === stableJson(incoming)) return notification;
    const readBy = new Set([
      ...(Array.isArray(notification.readByStudentIds) ? notification.readByStudentIds.map(String) : []),
      ...(Array.isArray(incoming.readByStudentIds) ? incoming.readByStudentIds.map(String) : []),
    ]);
    return {
      ...notification,
      read: notification.read === true || incoming.read === true,
      readByStudentIds: [...readBy],
    };
  });
  const knownIds = new Set(current.map((item) => String(item.id || '')));
  for (const item of submitted) {
    const id = String(item.id || '');
    if (!id) throw new ApiError(400, 'Each notification must have a record ID.');
    if (!knownIds.has(id)) {
      merged.unshift(item);
      knownIds.add(id);
    }
  }
  return merged;
}

function mergeAppendOnlyRecords(currentValue: unknown, submittedValue: unknown): Record<string, unknown>[] {
  if (!Array.isArray(currentValue) || !Array.isArray(submittedValue)) {
    throw new ApiError(400, 'Record data must be an array.');
  }
  const current = currentValue.filter(isObject);
  const submitted = submittedValue.filter(isObject);
  if (current.length !== currentValue.length || submitted.length !== submittedValue.length) {
    throw new ApiError(400, 'Record data contains invalid entries.');
  }
  const merged = current.slice();
  const knownIds = new Set(current.map((item) => String(item.id || '')));
  for (const item of submitted) {
    const id = String(item.id || '');
    if (!id) throw new ApiError(400, 'Each record must have an ID.');
    if (!knownIds.has(id)) {
      merged.push(item);
      knownIds.add(id);
    }
  }
  return merged;
}

function auditRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    receiver: 'Receiver / Receiving',
    records_management: 'Records Management',
    evaluator: 'Evaluator',
    registrar: 'Registrar Officer',
    superadmin: 'Super Administrator',
  };
  return labels[role] || role;
}

function stampBrowserAuthoredRecords(
  currentValue: unknown,
  submittedValue: unknown,
  resource: 'auditLogs' | 'systemActivities',
  auth: AuthenticatedAccount,
): Record<string, unknown>[] {
  const merged = mergeAppendOnlyRecords(currentValue, submittedValue);
  const existingIds = new Set(
    (Array.isArray(currentValue) ? currentValue.filter(isObject) : []).map(record => String(record.id || '')),
  );
  const timestamp = new Date().toISOString();
  const timeStr = new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return merged.map(record => {
    if (existingIds.has(String(record.id || ''))) return record;
    const fields = resource === 'auditLogs'
      ? ['id', 'timestamp', 'actorName', 'actorRole', 'actorAccountId', 'action', 'category', 'details', 'ipAddress', 'severity']
      : ['id', 'timeStr', 'timestamp', 'actor', 'actorAccountId', 'text', 'actionType', 'ticketNumber'];
    const allowed = Object.fromEntries(fields.filter(field => record[field] !== undefined)
      .map(field => [field, record[field]]));
    const limits: Record<string, number> = resource === 'auditLogs'
      ? { action: 200, category: 200, severity: 200, ipAddress: 200, details: 2000 }
      : { text: 2000 };
    for (const [field, maximum] of Object.entries(limits)) {
      if (allowed[field] === undefined) continue;
      if (typeof allowed[field] !== 'string') {
        throw new ApiError(400, `${resource}.${field} must be a string.`);
      }
      if (allowed[field].length > maximum) {
        throw new ApiError(400, `${resource}.${field} must be at most ${maximum} characters.`);
      }
    }
    if (resource === 'auditLogs') {
      return {
        ...allowed,
        timestamp,
        actorName: auth.name,
        actorRole: auditRoleLabel(auth.accountRole),
        actorAccountId: auth.accountId,
      };
    }
    return {
      ...allowed,
      timeStr,
      timestamp,
      actor: auth.name,
      actorAccountId: auth.accountId,
    };
  });
}

async function mergeOfficerHistory(
  client: import('pg').PoolClient,
  currentValue: unknown,
  submittedValue: unknown,
  auth: AuthenticatedAccount,
): Promise<Record<string, unknown>[]> {
  const merged = mergeAppendOnlyRecords(currentValue, submittedValue);
  if (auth.accountRole === 'superadmin' || auth.accountRole === 'receiver') return merged;

  const existingIds = new Set(
    (Array.isArray(currentValue) ? currentValue.filter(isObject) : []).map((record) => String(record.id || '')),
  );
  const tickets = await client.query<{ payload: unknown }>(
    'SELECT payload FROM registrack_data WHERE key = $1',
    ['tickets'],
  );
  const activeTickets = Array.isArray(tickets.rows[0]?.payload)
    ? tickets.rows[0].payload.filter(isObject)
    : [];
  for (const record of Array.isArray(submittedValue) ? submittedValue.filter(isObject) : []) {
    if (existingIds.has(String(record.id || ''))) continue;
    const snapshot = isObject(record.ticketSnapshot)
      ? record.ticketSnapshot
      : activeTickets.find((ticket) => ticket.id === record.ticketId);
    if (!snapshot || !canAccessTicket(snapshot, auth)) {
      throw new ApiError(403, 'You can only add history records for tickets assigned to your account.');
    }
  }
  return merged;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (isObject(value)) {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function validateBackupArray(key: string, value: unknown): unknown[] {
  if (!Array.isArray(value) || value.length > 50_000) {
    throw new ApiError(400, `${key} must be an array with no more than 50,000 records.`);
  }
  const records = value.map((record, index) => {
    if (!isObject(record)) throw new ApiError(400, `${key}[${index}] must be an object.`);
    const id = typeof record.id === 'string' ? record.id.trim() : '';
    if (!id || id.length > 200) throw new ApiError(400, `${key}[${index}] is missing a valid record ID.`);

    if (key === 'tickets') {
      if (typeof record.ticketNumber !== 'string' || !record.ticketNumber.trim() ||
        typeof record.studentId !== 'string' || !/^\d{8}$/.test(record.studentId)) {
        throw new ApiError(400, `Ticket ${id} is missing a valid ticket number or 8-digit student ID.`);
      }
      for (const listKey of ['messages', 'internalNotes', 'timelineHistory']) {
        if (record[listKey] !== undefined && !Array.isArray(record[listKey])) {
          throw new ApiError(400, `Ticket ${id} has invalid ${listKey} data.`);
        }
      }
    }

    if (key === 'studentRecords') {
      if (typeof record.studentId !== 'string' || !/^\d{8}$/.test(record.studentId) ||
        typeof record.name !== 'string' || typeof record.email !== 'string') {
        throw new ApiError(400, `Student record ${id} is missing a valid name, email, or 8-digit ID.`);
      }
    }

    if (key === 'roles') {
      if (typeof record.name !== 'string' || !isObject(record.permissions)) {
        throw new ApiError(400, `Role ${id} is missing a name or permission set.`);
      }
      validateRolePermissions(id, record.permissions);
    }

    if (key === 'requestCategories' && (
      typeof record.name !== 'string' ||
      typeof record.code !== 'string' ||
      !Number.isFinite(Number(record.turnaroundDays)) ||
      Number(record.turnaroundDays) < 0 ||
      !Number.isFinite(Number(record.fee)) ||
      Number(record.fee) < 0 ||
      !Array.isArray(record.requiredDocuments) ||
      record.requiredDocuments.some((item) => typeof item !== 'string') ||
      typeof record.active !== 'boolean'
    )) {
      throw new ApiError(400, `Request category ${id} has invalid name, code, fee, or turnaround data.`);
    }

    if (key === 'announcements' && typeof record.title !== 'string') {
      throw new ApiError(400, `Announcement ${id} is missing a title.`);
    }

    if (key === 'notifications' && typeof record.title !== 'string') {
      throw new ApiError(400, `Notification ${id} is missing a title.`);
    }

    if ((key === 'deletedRequestsHistory' || key === 'completedRequestsHistory') &&
      typeof record.ticketId !== 'string') {
      throw new ApiError(400, `Request history record ${id} is missing its ticket ID.`);
    }

    if (key === 'studentRecords') {
      const sanitized = { ...record };
      delete sanitized.password;
      delete sanitized.passwordHash;
      delete sanitized.password_hash;
      return removeCredentialFields(sanitized);
    }
    return removeCredentialFields(record);
  });

  const ids = records.map((record) => String((record as Record<string, unknown>).id));
  if (new Set(ids).size !== ids.length) throw new ApiError(400, `${key} contains duplicate record IDs.`);
  if (key === 'tickets') {
    const numbers = records.map((record) => String((record as Record<string, unknown>).ticketNumber));
    if (new Set(numbers).size !== numbers.length) {
      throw new ApiError(400, 'The backup contains duplicate ticket numbers.');
    }
  }
  if (key === 'studentRecords') {
    const studentIds = records.map((record) => String((record as Record<string, unknown>).studentId));
    if (new Set(studentIds).size !== studentIds.length) {
      throw new ApiError(400, 'The backup contains duplicate student IDs.');
    }
  }
  return records;
}

function validateBackupSettings(value: unknown): Record<string, unknown> {
  if (!isObject(value)) throw new ApiError(400, 'System settings must be an object.');
  const allowedSettings = [
    'schoolName',
    'schoolCode',
    'officeName',
    'schoolAddress',
    'contactEmail',
    'contactPhone',
    'academicYear',
    'semester',
    'emailNotificationsEnabled',
    'smsAlertsEnabled',
    'autoAssignmentEnabled',
    'maxPendingTicketsPerStaff',
    'maxPendingPerStudent',
    'allowStudentRegistration',
    'maintenanceMode',
  ];
  const settings: Record<string, unknown> = {};
  const booleanSettings = new Set([
    'emailNotificationsEnabled',
    'smsAlertsEnabled',
    'autoAssignmentEnabled',
    'allowStudentRegistration',
    'maintenanceMode',
  ]);
  const numericSettings = new Set(['maxPendingTicketsPerStaff', 'maxPendingPerStudent']);
  for (const key of allowedSettings) {
    const item = value[key];
    if (item === undefined) continue;
    if (booleanSettings.has(key) && typeof item !== 'boolean') {
      throw new ApiError(400, `System setting ${key} must be true or false.`);
    }
    if (numericSettings.has(key) && (
      typeof item !== 'number' || !Number.isInteger(item) || item < 0 || item > 10_000
    )) {
      throw new ApiError(400, `System setting ${key} must be a whole number between 0 and 10,000.`);
    }
    if (!booleanSettings.has(key) && !numericSettings.has(key) && typeof item !== 'string') {
      throw new ApiError(400, `System setting ${key} has an invalid value.`);
    }
    settings[key] = item;
  }

  const templates = value.emailTemplates;
  if (templates !== undefined) {
    if (!isObject(templates)) throw new ApiError(400, 'System email templates must be an object.');
    const safeTemplates: Record<string, string> = {};
    for (const key of ['ticketCreated', 'ticketReady', 'ticketResolved']) {
      const template = templates[key];
      if (template !== undefined && typeof template !== 'string') {
        throw new ApiError(400, `Email template ${key} must be text.`);
      }
      if (typeof template === 'string') {
        if (template.length > 20_000) throw new ApiError(400, `Email template ${key} is too long.`);
        safeTemplates[key] = template;
      }
    }
    settings.emailTemplates = {
      ...DEFAULT_SYSTEM_SETTINGS.emailTemplates,
      ...safeTemplates,
    };
  } else {
    settings.emailTemplates = { ...DEFAULT_SYSTEM_SETTINGS.emailTemplates };
  }
  return {
    ...DEFAULT_SYSTEM_SETTINGS,
    ...settings,
  };
}

function validateRolePermissions(id: string, permissions: Record<string, unknown>): void {
  const modules = {
    tickets: ['view', 'create', 'edit', 'delete'],
    students: ['view', 'create', 'edit', 'delete'],
    documents: ['view', 'create', 'edit', 'delete'],
    announcements: ['view', 'create', 'edit', 'delete'],
    users: ['view', 'create', 'edit', 'delete'],
    reports: ['view', 'export'],
    settings: ['view', 'edit'],
    auditLogs: ['view', 'export'],
  } as const;
  for (const [module, fields] of Object.entries(modules)) {
    const grants = permissions[module];
    if (!isObject(grants) || fields.some((field) => typeof grants[field] !== 'boolean')) {
      throw new ApiError(400, `Role ${id} has an invalid permission set for ${module}.`);
    }
  }
}

function removeCredentialFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(removeCredentialFields);
  if (!isObject(value)) return value;
  const sanitized: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (/password|credential|passphrase|secret/i.test(key)) continue;
    sanitized[key] = removeCredentialFields(item);
  }
  return sanitized;
}

async function nextTicketSequence(client: import('pg').PoolClient): Promise<number> {
  const key = 'system:ticket-sequence';
  const locked = await lockResource(client, key);
  const storedSequence = Number(isObject(locked) ? locked.value : 0);
  const ticketRows = await client.query<{ payload: unknown }>(
    'SELECT payload FROM registrack_data WHERE key = $1',
    ['tickets'],
  );
  const currentYear = new Date().getFullYear();
  const ticketSequence = (Array.isArray(ticketRows.rows[0]?.payload) ? ticketRows.rows[0]?.payload : [])
    .filter(isObject)
    .map((ticket) => {
      const match = /^REG-(\d{4})-(\d+)$/.exec(String(ticket.ticketNumber || ''));
      return match && Number(match[1]) === currentYear ? Number(match[2]) : 0;
    })
    .reduce((maximum, number) => Math.max(maximum, number), 0);
  const previous = Math.max(Number.isSafeInteger(storedSequence) ? storedSequence : 0, ticketSequence);
  const next = Number.isSafeInteger(previous) && previous > 0 ? previous + 1 : 1;
  await saveResource(client, key, { value: next });
  return next;
}

function mergeStudentNotifications(
  currentValue: unknown,
  submittedValue: unknown,
  auth: AuthenticatedAccount,
): Record<string, unknown>[] {
  if (!auth.studentId || !Array.isArray(currentValue) || !Array.isArray(submittedValue)) {
    throw new ApiError(400, 'Notification data is invalid.');
  }
  const studentId = auth.studentId;
  const current = currentValue.filter(isObject);
  const submitted = submittedValue.filter(isObject);
  const currentById = new Map(current.map((item) => [String(item.id || ''), item]));
  const incomingById = new Map(submitted.map((item) => [String(item.id || ''), item]));
  const updated = current.map((notification) => {
    const incoming = incomingById.get(String(notification.id || ''));
    if (!incoming) return notification;
    if (notification.audience === 'officer' ||
      (notification.recipientStudentId && notification.recipientStudentId !== studentId)) {
      throw new ApiError(403, 'You cannot update a notification for another account.');
    }
    const readBy = new Set(Array.isArray(notification.readByStudentIds)
      ? notification.readByStudentIds.map(String)
      : []);
    if (incoming.read === true || (
      Array.isArray(incoming.readByStudentIds) &&
      incoming.readByStudentIds.includes(studentId)
    )) {
      readBy.add(studentId);
    }
    return { ...notification, readByStudentIds: [...readBy] };
  });

  for (const [id, notification] of incomingById) {
    if (!currentById.has(id)) {
      throw new ApiError(403, 'Students cannot create notifications.');
    }
  }
  return updated;
}

async function currentPublicUser(account: AuthenticatedAccount): Promise<Record<string, unknown> | null> {
  const result = await pool.query<AccountRow>(
    `SELECT id, name, email, role, status, student_id, password_hash, data, created_at
     FROM registrack_accounts WHERE id = $1`,
    [account.accountId],
  );
  return result.rows[0] ? toAuthenticatedUser(result.rows[0]) : null;
}
