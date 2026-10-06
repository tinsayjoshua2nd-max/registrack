// Short API regression checks. Never connect this script to real application data.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import express from 'express';
import { pool } from '../server/database';
import { registerApi } from '../server/api';
import { createSessionToken, hashSessionToken } from '../server/security';
import { DEFAULT_SYSTEM_SETTINGS, INITIAL_REQUEST_CATEGORIES } from '../src/data/superAdminData';

const target = new URL(process.env.DATABASE_URL || 'http://invalid');
assert.equal(target.hostname, '127.0.0.1', 'Only disposable PostgreSQL is permitted.');
assert.equal(target.port, '55439');
assert.equal(target.pathname, '/registrack_temp_zztest');

const cookies = new Map<string, string>();
const accounts = [
  { key: 'receiver', role: 'receiver', status: 'active' },
  { key: 'registrar', role: 'registrar', status: 'active' },
  { key: 'legacy', role: 'superadmin', status: 'active' },
  { key: 'inactive-registrar', role: 'registrar', status: 'inactive' },
  { key: 'inactive-legacy', role: 'superadmin', status: 'inactive' },
  { key: 'unrelated', role: 'evaluator', status: 'active' },
  { key: 'student', role: 'student', status: 'active' },
];
const fixtureTicket = (key: string, rejected = false) => ({
  id: `ZZ-TEST-${key}`, ticketNumber: `ZZ-TEST-${key}`,
  studentId: '90000001', studentName: 'ZZ-TEST-student', email: 'student@zz-test.invalid',
  phone: 'ZZ-TEST-phone', degreeProgram: 'ZZ-TEST-program', yearLevel: 'ZZ-TEST-year',
  category: 'TOR', documentType: 'TOR', subject: 'ZZ-TEST-request', description: 'ZZ-TEST-request',
  priority: 'Normal', assignedTo: 'ZZ-TEST-receiver', assignedStaff: 'ZZ-TEST-receiver',
  assignedEvaluator: 'ZZ-TEST-receiver', assignedRole: 'receiver', stage: 'processing',
  status: rejected ? 'rejected' : 'processing',
  rejectionReason: rejected ? 'ZZ-TEST-rejection-reason' : undefined,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  estimatedReleaseDate: '2026-11-01', claimingRequirements: [], messages: [], internalNotes: [],
  timelineHistory: [{
    stage: 'processing', title: 'ZZ-TEST-existing', timestamp: '2026-01-01T00:00:00.000Z',
    actor: 'ZZ-TEST-receiver', ...(rejected ? { action: 'reject', notes: 'ZZ-TEST-rejection-reason' } : {}),
  }],
});

await pool.query(await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8'));
for (const account of accounts) {
  await pool.query(
    `INSERT INTO registrack_accounts (id,name,email,role,status,student_id,password_hash,data)
     VALUES ($1,$1,$2,$3,$4,$5,'ZZ-TEST-unused',$6)`,
    [`ZZ-TEST-${account.key}`, `${account.key}@zz-test.invalid`, account.role, account.status,
      account.role === 'student' ? '90000001' : null, JSON.stringify({ departmentOrOffice: 'ZZ-TEST-office' })],
  );
  const token = createSessionToken();
  await pool.query("INSERT INTO registrack_sessions VALUES ($1,$2,now()+interval '1 hour')", [
    hashSessionToken(token), `ZZ-TEST-${account.key}`,
  ]);
  cookies.set(account.key, `registrack_session=${token}`);
}
const initial = {
  tickets: [fixtureTicket('handoff-registrar'), fixtureTicket('handoff-legacy', true), fixtureTicket('guards')],
  studentRecords: [{
    id: 'ZZ-TEST-profile', studentId: '90000001', name: 'ZZ-TEST-student',
    email: 'student@zz-test.invalid', degreeProgram: 'ZZ-TEST-program', yearLevel: 'ZZ-TEST-year',
    enrollmentStatus: 'Regular', isArchived: false,
  }],
  requestCategories: INITIAL_REQUEST_CATEGORIES,
  systemSettings: { ...DEFAULT_SYSTEM_SETTINGS, maintenanceMode: false, maxPendingPerStudent: 100 },
  auditLogs: [], systemActivities: [], notifications: [], announcements: [],
  deletedRequestsHistory: [], completedRequestsHistory: [],
};
for (const [key, payload] of Object.entries(initial)) {
  await pool.query('INSERT INTO registrack_data(key,payload,version) VALUES ($1,$2,1)', [key, JSON.stringify(payload)]);
}

const app = express();
app.use(express.json());
registerApi(app);
app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) =>
  res.status(error.statusCode || 500).json({ error: error.message }));
const server = app.listen(0, '127.0.0.1');
await new Promise<void>(resolve => server.once('listening', resolve));
const address = server.address();
assert(address && typeof address !== 'string');
const base = `http://127.0.0.1:${address.port}`;
async function request(actor: string, path: string, method = 'GET', body?: unknown) {
  const response = await fetch(base + path, {
    method, headers: { Origin: base, Cookie: cookies.get(actor)!, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}
async function state(actor = 'receiver') {
  const result = await request(actor, '/api/state');
  assert.equal(result.status, 200);
  return result.body;
}
async function handoff(actor: string, key: string, recipient: string, expected = 200) {
  const before = await state();
  const ticket = before.tickets.find((item: any) => item.id === `ZZ-TEST-${key}`);
  assert(ticket);
  const result = await request(actor, `/api/tickets/${ticket.id}/workflow`, 'POST', {
    action: 'handoff', assignedTo: `ZZ-TEST-${recipient}`, notes: 'ZZ-TEST-handoff-reason',
    operationId: `ZZ-TEST-${randomUUID()}`, expectedUpdatedAt: ticket.updatedAt,
  });
  assert.equal(result.status, expected, JSON.stringify(result.body));
  return { before, ticket, result };
}
async function check(name: string, run: () => Promise<void>) {
  try { await run(); } catch (error) { console.error(`FAIL ${name}`); throw error; }
  console.info(`PASS ${name}`);
}
try {
  await check('handoff to active Registrar Officer and legacy Registrar Officer persists without changing stage or rejection', async () => {
    for (const recipient of ['registrar', 'legacy']) {
      const { ticket, result } = await handoff('receiver', `handoff-${recipient}`, recipient);
      const updated = result.body.ticket;
      assert.equal(updated.assignedTo, `ZZ-TEST-${recipient}`);
      assert.equal(updated.assignedStaff, updated.assignedTo);
      assert.equal(updated.assignedEvaluator, updated.assignedTo);
      assert.equal(updated.assignedRole, recipient === 'legacy' ? 'superadmin' : 'registrar');
      for (const field of ['stage', 'status', 'estimatedReleaseDate', 'rejectionReason']) {
        assert.equal(updated[field], ticket[field], field);
      }
      assert.equal(updated.timelineHistory.at(-1).action, 'handoff');
      assert.equal(updated.timelineHistory.at(-1).actor, 'ZZ-TEST-receiver');
      assert.equal(updated.timelineHistory.at(-1).notes, 'ZZ-TEST-handoff-reason');
      assert.deepEqual((await state()).tickets.find((item: any) => item.id === ticket.id), updated);
      const studentCopy = (await state('student')).tickets.find((item: any) => item.id === ticket.id);
      assert.equal(studentCopy.stage, ticket.stage);
      assert.equal(studentCopy.estimatedReleaseDate, ticket.estimatedReleaseDate);
      assert.equal(studentCopy.rejectionReason, ticket.rejectionReason);
      assert.equal(studentCopy.timelineHistory.length, updated.timelineHistory.length);
      assert(!('notes' in studentCopy.timelineHistory.at(-1)));
      if (recipient === 'legacy') assert.equal(studentCopy.timelineHistory[0].notes, 'ZZ-TEST-rejection-reason');
    }
  });
  await check('explicit intake assignment accepts both Registrar Officer account types', async () => {
    for (const recipient of ['registrar', 'legacy']) {
      const created = await request('receiver', '/api/tickets', 'POST', {
        ticket: { ...fixtureTicket(`intake-${recipient}`), assignedTo: `ZZ-TEST-${recipient}` },
      });
      assert.equal(created.status, 201, JSON.stringify(created.body));
      assert.equal(created.body.ticket.assignedTo, `ZZ-TEST-${recipient}`);
      assert.equal(created.body.ticket.assignedRole, recipient === 'legacy' ? 'superadmin' : 'registrar');
    }
  });
  await check('student, inactive and missing assignees remain blocked; unrelated staff cannot hand off', async () => {
    for (const recipient of ['student', 'inactive-registrar', 'inactive-legacy', 'missing']) {
      const { before } = await handoff('receiver', 'guards', recipient, 400);
      assert.deepEqual(await state(), before);
    }
    for (const actor of ['student', 'unrelated']) {
      const { before } = await handoff(actor, 'guards', 'legacy', 403);
      assert.deepEqual(await state(), before);
    }
  });
  await check('both Registrar Officer account types can return an assigned request to Receiver / Releasing', async () => {
    for (const actor of ['registrar', 'legacy']) {
      const { ticket, result } = await handoff(actor, `handoff-${actor}`, 'receiver');
      assert.equal(result.body.ticket.assignedTo, 'ZZ-TEST-receiver');
      assert.equal(result.body.ticket.assignedRole, 'receiver');
      assert.equal(result.body.ticket.stage, ticket.stage);
      assert.equal(result.body.ticket.status, ticket.status);
    }
  });
  console.info('PASS all four Registrar handoff regression checks');
} finally {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  await pool.end();
}
