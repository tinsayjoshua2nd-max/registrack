// Refuses all targets except the dedicated, empty disposable PostgreSQL.
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import express from 'express';
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { pool } from '../server/database';
import { registerApi } from '../server/api';
import { hashPassword, createSessionToken, hashSessionToken } from '../server/security';
import { DEFAULT_SYSTEM_SETTINGS, INITIAL_REQUEST_CATEGORIES } from '../src/data/superAdminData';
import { verifySettingsBrowser } from './verify-settings-browser';

const target = new URL(process.env.DATABASE_URL || 'http://invalid');
assert.equal(target.hostname, '127.0.0.1', 'Disposable loopback database only');
assert.equal(target.port, '55439');
assert.equal(target.pathname, '/registrack_temp_zztest');
assert.equal((await pool.query("SELECT to_regclass('public.registrack_accounts') AS table_name")).rows[0].table_name, null,
  'Verification requires a fresh, empty database');
await pool.query(await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8'));
const password = `ZZ-TEST-${randomUUID()}`;
const passwordHash = await hashPassword(password);
const names = { registrar: 'ZZ-TEST-Registrar', a: 'ZZ-TEST-Evaluator-A', b: 'ZZ-TEST-Evaluator-B', receiver: 'ZZ-TEST-Receiver',
  records: 'ZZ-TEST-Records', staff: 'ZZ-TEST-Staff', admin: 'ZZ-TEST-Admin', officer: 'ZZ-TEST-Officer' };
for (const [id, role, status] of [
  ['registrar', 'superadmin', 'active'], ['a', 'evaluator', 'active'],
  ['b', 'evaluator', 'active'], ['receiver', 'receiver', 'inactive'],
  ['records', 'records_management', 'inactive'], ['staff', 'staff', 'active'],
  ['admin', 'admin', 'active'], ['officer', 'registrar', 'inactive'],
]) {
  await pool.query(`INSERT INTO registrack_accounts (id,name,email,role,status,password_hash,data)
    VALUES ($1,$2,$3,$4,$5,$6,'{}')`,
  [`ZZ-TEST-${id}`, names[id as keyof typeof names], `${id}@zz-test.invalid`, role, status, passwordHash]);
}
const profile = (id: string, suffix: string, isArchived = false) => ({
  id: `ZZ-TEST-profile-${suffix}`, studentId: id, name: `ZZ-TEST-Student-${suffix}`,
  email: `${suffix}@zz-test.invalid`, phone: '', degreeProgram: 'ZZ-TEST-Program', yearLevel: '1st Year',
  enrollmentStatus: 'Regular', unitsEnrolled: 18, isArchived, requestCount: 0, joinedDate: '2026-01-01',
});
const profiles = [profile('91000001', 'api'), profile('91000002', 'ui'),
  profile('91000003', 'closed'), profile('91000004', 'archived', true)];
const initialSettings = { ...DEFAULT_SYSTEM_SETTINGS, schoolCode: 'ZZ-TEST-CODE', academicYear: 'ZZ-TEST-YEAR',
  semester: 'ZZ-TEST-TERM', maxPendingTicketsPerStaff: 2 };
const fixtureTicket = (id: string, assignee: string, status: string) => ({
  id: `ZZ-TEST-${id}`, ticketNumber: `ZZ-TEST-${id}`, studentId: '91000001', studentName: profiles[0].name,
  subject: 'ZZ-TEST-request', description: '', category: 'TOR', documentType: 'TOR', priority: 'Normal',
  assignedTo: assignee, status, stage: status === 'completed' ? 'completed' : 'processing',
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  estimatedReleaseDate: 'ZZ-TEST-date', claimingRequirements: [], messages: [], internalNotes: [], timelineHistory: [],
});
const initialResources = {
  systemSettings: initialSettings, studentRecords: profiles, requestCategories: INITIAL_REQUEST_CATEGORIES,
  tickets: [fixtureTicket('a-pending', names.a, 'pending'), fixtureTicket('a-processing', names.a, 'processing'),
    fixtureTicket('b-completed', names.b, 'completed'), fixtureTicket('b-rejected', names.b, 'rejected')],
};
for (const [key, payload] of Object.entries(initialResources)) {
  await pool.query('INSERT INTO registrack_data (key,payload) VALUES ($1,$2::jsonb)', [key, JSON.stringify(payload)]);
}
const studentRecordsBefore = JSON.stringify((await pool.query("SELECT payload,version FROM registrack_data WHERE key='studentRecords'")).rows);
const token = createSessionToken();
await pool.query("INSERT INTO registrack_sessions (token_hash,account_id,expires_at) VALUES ($1,'ZZ-TEST-registrar',now()+interval '1 day')",
  [hashSessionToken(token)]);
const app = express();
app.set('trust proxy', 1);
app.use(express.json());
registerApi(app);
app.use('/api', (_req, res) => res.status(404).json({ error: 'API endpoint not found.' }));
const browserTemp = await mkdtemp('/tmp/zztest-settings-web.');
await build({ configFile: false, plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': process.cwd() } }, cacheDir: `${browserTemp}/cache`,
  build: { outDir: `${browserTemp}/dist`, emptyOutDir: true, reportCompressedSize: false } });
app.use(express.static(`${browserTemp}/dist`));
app.use((_req, res) => res.sendFile(`${browserTemp}/dist/index.html`));
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = (error as { statusCode?: number }).statusCode || 500;
  res.status(status).json({ error: 'Verification server rejected the request.' });
});
const server = await new Promise<import('node:http').Server>((resolve) => {
  const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
});
const base = `http://127.0.0.1:${(server.address() as import('node:net').AddressInfo).port}`;
let requestNumber = 0;
const request = async (path: string, method = 'GET', body?: unknown, cookie = '', ip?: string) => {
  const response = await fetch(`${base}${path}`, {
    method, headers: { 'Content-Type': 'application/json', Origin: base, Cookie: cookie,
      'X-Forwarded-For': ip || `192.0.2.${++requestNumber % 200 + 1}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] || '' };
};
const registrarCookie = `registrack_session=${token}`;
const cookieFor = async (id: string) => {
  const session = createSessionToken();
  await pool.query("INSERT INTO registrack_sessions (token_hash,account_id,expires_at) VALUES ($1,$2,now()+interval '1 day')",
    [hashSessionToken(session), `ZZ-TEST-${id}`]);
  return `registrack_session=${session}`;
};
const receiverCookie = await cookieFor('receiver');
const studentInput = (record: typeof profiles[number]) => ({
  user: { name: record.name, email: record.email, studentId: record.studentId, role: 'student',
    status: 'active', password, departmentOrOffice: record.degreeProgram },
});
const state = async (cookie = registrarCookie) => {
  const result = await request('/api/state', 'GET', undefined, cookie);
  assert.equal(result.status, 200);
  return result.body;
};
const setSettings = async (updates: Record<string, unknown>, expected = 200) => {
  const before = await state();
  const response = await request('/api/state/systemSettings', 'PUT',
    { payload: { ...before.systemSettings, ...updates }, version: before._versions.systemSettings }, registrarCookie);
  assert.equal(response.status, expected);
};
const createTicket = (suffix: string, assignedTo = 'Unassigned') => request('/api/tickets', 'POST',
  { ticket: { id: `ZZ-TEST-${suffix}`, studentId: '91000001', studentName: profiles[0].name,
    subject: 'ZZ-TEST-request', description: '', category: 'TOR', assignedTo } }, registrarCookie);
let checks = 0;
const check = async (name: string, work: () => Promise<void>) => {
  try { await work(); checks++; console.log(`PASS ${name}`); }
  catch (error) { console.error(`FAIL ${name}`); throw error; }
};
try {
  await check('public signup endpoints are removed and anonymous account creation is denied', async () => {
    assert.equal((await request('/api/registration-options')).status, 404);
    assert.equal((await request('/api/student-registration', 'POST',
      { studentId: profiles[0].studentId, email: profiles[0].email, password })).status, 404);
    assert.equal((await request('/api/users', 'POST', studentInput(profiles[0]))).status, 401);
  });
  await check('Receiver creates student credentials from the official record without rewriting it', async () => {
    await pool.query("UPDATE registrack_accounts SET status='active' WHERE id='ZZ-TEST-receiver'");
    const input = studentInput(profiles[0]);
    input.user.departmentOrOffice = 'ZZ-TEST-forged-program';
    const result = await request('/api/users', 'POST', input, receiverCookie);
    assert.equal(result.status, 201);
    assert.equal(result.body.user.name, profiles[0].name);
    assert.equal(result.body.user.role, 'student');
    assert.equal(result.body.user.departmentOrOffice, profiles[0].degreeProgram);
    assert.equal(JSON.stringify((await pool.query("SELECT payload,version FROM registrack_data WHERE key='studentRecords'")).rows), studentRecordsBefore);
    const account = (await pool.query("SELECT role,status,password_hash FROM registrack_accounts WHERE student_id='91000001'")).rows[0];
    assert.equal(account.role, 'student'); assert.equal(account.status, 'active'); assert.notEqual(account.password_hash, password);
  });
  await check('Receiver rejects absent or archived records, altered identity and invalid credentials', async () => {
    for (const updates of [
      { studentId: '91000099' }, { email: 'wrong@zz-test.invalid' },
      { studentId: '91000004', name: profiles[3].name, email: profiles[3].email },
      { name: 'ZZ-TEST-altered-name' }, { studentId: 'short' }, { password: 'short' },
    ]) {
      const input = studentInput(profiles[1]);
      assert.equal((await request('/api/users', 'POST', { user: { ...input.user, ...updates } }, receiverCookie)).status, 400);
    }
    assert.equal((await pool.query("SELECT count(*)::int AS count FROM registrack_accounts WHERE role='student'")).rows[0].count, 1);
  });
  await check('Receiver cannot duplicate accounts, create staff, edit records, or manage other accounts', async () => {
    assert.equal((await request('/api/users', 'POST', studentInput(profiles[0]), receiverCookie)).status, 409);
    const input = studentInput(profiles[1]);
    assert.equal((await request('/api/users', 'POST', { user: { ...input.user, role: 'registrar' } }, receiverCookie)).status, 403);
    assert.equal((await request('/api/users/ZZ-TEST-registrar', 'PUT', { updates: { name: 'ZZ-TEST-forged' } }, receiverCookie)).status, 403);
    assert.equal((await request('/api/users/ZZ-TEST-a', 'DELETE', undefined, receiverCookie)).status, 403);
    const snapshot = await state();
    assert.equal((await request('/api/state/studentRecords', 'PUT',
      { payload: [], version: snapshot._versions.studentRecords }, receiverCookie)).status, 403);
    await pool.query("UPDATE registrack_accounts SET status='inactive' WHERE id='ZZ-TEST-receiver'");
  });
  await check('Evaluator, Records Management, generic staff and admin cannot create student accounts', async () => {
    await pool.query("UPDATE registrack_accounts SET status='active' WHERE id='ZZ-TEST-records'");
    for (const id of ['a', 'records', 'staff', 'admin']) {
      assert.equal((await request('/api/users', 'POST', studentInput(profiles[1]), await cookieFor(id))).status, 403);
    }
    await pool.query("UPDATE registrack_accounts SET status='inactive' WHERE id='ZZ-TEST-records'");
  });
  await check('both Registrar Officer access levels can create student accounts', async () => {
    await pool.query("UPDATE registrack_accounts SET status='active' WHERE id='ZZ-TEST-officer'");
    for (const [suffix, cookie] of [['native', await cookieFor('officer')], ['legacy', registrarCookie]]) {
      const record = profile(suffix === 'native' ? '91000005' : '91000006', suffix);
      const result = await request('/api/users', 'POST', { user: { ...studentInput(record).user,
        degreeProgram: record.degreeProgram, yearLevel: record.yearLevel, enrollmentStatus: record.enrollmentStatus,
        unitsEnrolled: record.unitsEnrolled } }, cookie);
      assert.equal(result.status, 201);
      assert.equal(result.body.user.role, 'student');
    }
    await pool.query("UPDATE registrack_accounts SET status='inactive' WHERE id='ZZ-TEST-officer'");
  });
  await check('staff account creation rejects missing or cross-site origin', async () => {
    const missingOrigin = await fetch(`${base}/api/users`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: registrarCookie }, body: '{}' });
    assert.equal(missingOrigin.status, 403);
    const crossSite = await fetch(`${base}/api/users`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: registrarCookie, Origin: 'https://zz-test.invalid' }, body: '{}' });
    assert.equal(crossSite.status, 403);
  });
  await check('registered students can log in and see current institution data but cannot create tickets', async () => {
    const login = await request('/api/login', 'POST', { identifier: profiles[0].name, password });
    assert.equal(login.status, 200); assert.equal(login.body.user.role, 'student');
    assert.equal((await request('/api/users', 'POST', studentInput(profiles[1]), login.cookie)).status, 403);
    const studentState = await state(login.cookie);
    assert.deepEqual(studentState.systemSettings, { schoolCode: initialSettings.schoolCode,
      academicYear: initialSettings.academicYear, semester: initialSettings.semester });
    assert.deepEqual(studentState.studentRecords, []);
    assert.equal((await request('/api/tickets', 'POST', { ticket: { id: 'ZZ-TEST-forbidden' } }, login.cookie)).status, 403);
  });
  await check('automatic evaluator assignment counts pending and processing but ignores completed and rejected', async () => {
    const result = await createTicket('auto-b');
    assert.equal(result.status, 201); assert.equal(result.body.ticket.assignedTo, names.b);
    assert.equal(result.body.ticket.assignedRole, 'evaluator');
  });
  await check('concurrent automatic intake cannot exceed evaluator capacity and overflow stays queued', async () => {
    const results = await Promise.all([createTicket('concurrent-1'), createTicket('concurrent-2')]);
    assert(results.every((result) => result.status === 201));
    assert.deepEqual(results.map((result) => result.body.ticket.assignedTo).sort(), ['Unassigned', names.b].sort());
    const active = (await state()).tickets;
    assert.equal(active.filter((ticket: any) => ticket.assignedTo === names.b && ['pending', 'processing'].includes(ticket.status)).length, 2);
  });
  await check('manual assignment bypasses evaluator cap without changing the selected staff member', async () => {
    const result = await createTicket('manual-a', names.a);
    assert.equal(result.status, 201); assert.equal(result.body.ticket.assignedTo, names.a);
  });
  await check('automatic routing preserves higher-priority non-evaluator roles', async () => {
    await pool.query("UPDATE registrack_accounts SET status='active' WHERE id='ZZ-TEST-receiver'");
    const result = await createTicket('receiver-priority');
    assert.equal(result.status, 201); assert.equal(result.body.ticket.assignedTo, names.receiver);
    await pool.query("UPDATE registrack_accounts SET status='inactive' WHERE id='ZZ-TEST-receiver'");
  });
  await check('disabling automatic assignment leaves intake unassigned', async () => {
    await setSettings({ autoAssignmentEnabled: false });
    const result = await createTicket('auto-disabled');
    assert.equal(result.status, 201); assert.equal(result.body.ticket.assignedTo, 'Unassigned');
    await setSettings({ autoAssignmentEnabled: true });
  });
  await check('saved evaluator limits take effect immediately and invalid limits are rejected', async () => {
    await setSettings({ maxPendingTicketsPerStaff: 1 });
    assert.equal((await createTicket('lower-cap')).body.ticket.assignedTo, 'Unassigned');
    await setSettings({ maxPendingTicketsPerStaff: 3 });
    assert.equal((await createTicket('higher-cap')).body.ticket.assignedTo, names.b);
    const before = JSON.stringify((await state()).systemSettings);
    await setSettings({ maxPendingTicketsPerStaff: 0 }, 400);
    await setSettings({ maxPendingTicketsPerStaff: 51 }, 400);
    assert.equal(JSON.stringify((await state()).systemSettings), before);
    await setSettings({ maxPendingTicketsPerStaff: 2 });
  });
  await verifySettingsBrowser({ base, password, names, profiles, initialSettings, check });
  await check('official records and existing fixture tickets remain unchanged', async () => {
    const records = (await pool.query("SELECT payload FROM registrack_data WHERE key='studentRecords'")).rows[0].payload;
    for (const original of profiles) {
      assert.deepEqual(records.find((record: any) => record.id === original.id), original);
    }
    const current = (await state()).tickets;
    for (const original of initialResources.tickets) {
      assert.deepEqual(current.find((ticket: any) => ticket.id === original.id), original);
    }
  });
  console.log(`All ${checks} settings verification checks passed.`);
} finally {
  await pool.query("UPDATE registrack_data SET payload=$1::jsonb WHERE key='systemSettings'", [JSON.stringify(initialSettings)]);
  await rm(browserTemp, { recursive: true, force: true });
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await pool.end();
}
