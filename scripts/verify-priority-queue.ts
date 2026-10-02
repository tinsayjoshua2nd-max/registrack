import assert from 'node:assert/strict';
import { randomInt, randomUUID } from 'node:crypto';
import { chromium, request, type APIRequestContext, type Page } from 'playwright-core';
import { pool } from '../server/database';
import type { Ticket } from '../src/types';
import { getPriorityActionQueue, normalizeTicketPriority } from '../src/utils/ticketQueue';

// Development only: create isolated fixtures and delete only those exact IDs.
const baseURL = process.env.REGISTRACK_TEST_URL || 'http://127.0.0.1:5000';
const host = new URL(baseURL).hostname;
assert(['localhost', '127.0.0.1'].includes(host) || host.endsWith('.replit.dev'));
const bootstrapPassword = process.env.REGISTRAR_BOOTSTRAP_PASSWORD;
assert(bootstrapPassword, 'Bootstrap secret must be configured.');
const suffix = randomUUID().slice(0, 8);
const accountIds: string[] = [];
const ticketIds: string[] = [];
const staffNames: string[] = [];
const clients: APIRequestContext[] = [];
const browser = await chromium.launch({ executablePath: '/repl/tools/bin/chromium', headless: true, args: ['--no-sandbox'] });
const options = { baseURL, extraHTTPHeaders: { Origin: baseURL } };
const root = await request.newContext(options);
const errors: string[] = [];
type QueueStaff = { name: string; role: string; password: string; api: APIRequestContext; page: Page };
const login = async (client: APIRequestContext, identifier: string, password: string) => {
  assert.equal((await client.post('/api/login', { data: { identifier, password } })).status(), 200);
};
await login(root, 'Stevie Ray Rotulo', bootstrapPassword);
const before = await (await root.get('/api/state')).json();
const category = before.requestCategories.find((item: any) => item.active);
assert(category, 'An active request category is needed.');

const sample = (id: string, priority: string, extra: Partial<Ticket> = {}) => ({
  id, ticketNumber: id, priority, status: 'pending', stage: 'submitted',
  estimatedReleaseDate: '', createdAt: '2026-01-01T00:00:00Z', ...extra,
} as Ticket);
assert.equal(normalizeTicketPriority('Priority'), 'Deadline-sensitive');
assert.equal(normalizeTicketPriority('invalid'), undefined);
assert.deepEqual(getPriorityActionQueue([
  sample('urgent-late', 'Urgent', { estimatedReleaseDate: '2026-01-04' }),
  sample('normal', 'Normal'), sample('closed', 'Urgent', { status: 'completed' }),
  sample('rejected', 'Urgent', { status: 'rejected' }),
  sample('closed-stage', 'Urgent', { stage: 'completed' }),
  sample('urgent-early', 'Urgent', { estimatedReleaseDate: '2026-01-02' }),
  sample('legacy-priority', 'Priority'),
]).map(item => item.id), ['legacy-priority', 'urgent-early', 'urgent-late']);

async function provision(role: string): Promise<QueueStaff> {
  const password = randomUUID();
  const name = `Queue Verification ${role} ${staffNames.length} ${suffix}`;
  const response = await root.post('/api/users', { data: { user: {
    name, email: `queue-${randomUUID()}@verification.local`, role, status: 'active',
    password, departmentOrOffice: 'Queue Verification',
  } } });
  assert.equal(response.status(), 201);
  const { user } = await response.json();
  accountIds.push(user.id);
  staffNames.push(name);
  const api = await request.newContext(options);
  clients.push(api);
  await login(api, name, password);
  const context = await browser.newContext(options);
  const page = await context.newPage();
  page.on('pageerror', error => {
    if (error.message === 'WebSocket closed without opened.' && error.stack?.includes('/@vite/client')) return;
    errors.push(error.message);
  });
  return { name, role, password, api, page };
}

async function create(assignee: string, priority: string) {
  const id = `queue-verification-${randomUUID()}`;
  ticketIds.push(id);
  const response = await root.post('/api/tickets', { data: { ticket: {
    id, studentId: String(randomInt(90_000_000, 99_000_000)), studentName: `Queue Student ${suffix}`,
    subject: `Queue Verification ${suffix}`, description: 'Temporary development verification',
    category: category.name, priority, assignedTo: assignee,
  } } });
  assert.equal(response.status(), 201);
  return (await response.json()).ticket as Ticket;
}

async function changeTicket(id: string, patch: Partial<Ticket>) {
  const state = await (await root.get('/api/state')).json();
  const ticket = state.tickets.find((item: Ticket) => item.id === id);
  assert(ticket);
  const updatedAt = new Date(Math.max(Date.now(), Date.parse(ticket.updatedAt) + 1)).toISOString();
  const response = await root.put('/api/state/tickets', { data: {
    payload: state.tickets.map((item: Ticket) => item.id === id ? { ...item, ...patch, updatedAt } : item),
    version: state._versions.tickets,
  } });
  assert.equal(response.status(), 200);
}

async function openDashboard(staff: QueueStaff) {
  await staff.page.goto(baseURL);
  await staff.page.locator('#login-identifier-input').fill(staff.name);
  await staff.page.locator('#login-password-input').fill(staff.password);
  await staff.page.locator('#btn-login-submit').click();
  await staff.page.locator('#nav-admin-dashboard').waitFor();
}

async function checkQueue(staff: QueueStaff) {
  const state = await (await staff.api.get('/api/state')).json();
  const expected = getPriorityActionQueue(state.tickets);
  const expectedIds = expected.filter(item => ticketIds.includes(item.id)).map(item => item.id);
  await staff.page.waitForFunction(({ all, ids }) => {
    const region = document.querySelector('section[aria-label="Urgent & Priority Action Queue"]');
    const actual = Array.from(region?.querySelectorAll('[data-ticket-id]') || [])
      .map(row => row.getAttribute('data-ticket-id')).filter(id => all.includes(id || ''));
    return JSON.stringify(actual) === JSON.stringify(ids);
  }, { all: ticketIds, ids: expectedIds }, { timeout: 20000 });
  assert.equal(await staff.page.getByTestId('priority-queue-count').textContent(), `${expected.length} Priority Tickets`);
  if (staff.role !== 'receiver') {
    assert(state.tickets.every((item: Ticket) => item.assignedTo === staff.name));
  }
}

async function openTriage(staff: QueueStaff, id: string) {
  await staff.page.locator(`[data-ticket-id="${id}"]`).getByRole('button', { name: 'Manage & Triage', exact: true }).click();
  await staff.page.locator('#triage-ticket-priority').waitFor();
}

async function savedPriority(page: Page, value: string) {
  await page.waitForFunction(value => {
    const input = document.getElementById('triage-ticket-priority') as HTMLSelectElement | null;
    return input?.value === value && !input.disabled;
  }, value, { timeout: 20000 });
}

try {
  const receiver = await provision('receiver');
  const receiver2 = await provision('receiver');
  const records = await provision('records_management');
  const evaluator = await provision('evaluator');
  const registrar = await provision('registrar');
  const staff = [receiver, receiver2, records, evaluator, registrar];
  const receiverUrgent = await create(receiver.name, 'Urgent');
  const recordsPriority = await create(records.name, 'Priority');
  assert.equal(recordsPriority.priority, 'Deadline-sensitive');
  const evaluatorUrgent = await create(evaluator.name, 'Urgent');
  await create(evaluator.name, 'Normal');
  const registrarPriority = await create(registrar.name, 'Deadline-sensitive');
  const completed = await create(records.name, 'Urgent');
  const rejected = await create(evaluator.name, 'Deadline-sensitive');
  await changeTicket(completed.id, { status: 'completed', stage: 'completed' });
  await changeTicket(rejected.id, { status: 'rejected' });

  await Promise.all(staff.map(openDashboard));
  await Promise.all(staff.map(checkQueue));
  console.log('PASS: both receivers see the current shared queue; Records, Evaluator, and Registrar see only their assigned active urgent/priority cases');
  assert.equal((await evaluator.api.patch(`/api/tickets/${recordsPriority.id}/priority`, { data: { priority: 'Urgent' } })).status(), 403);
  assert.equal((await evaluator.api.patch(`/api/tickets/${evaluatorUrgent.id}/priority`, { data: { priority: 'invalid' } })).status(), 400);
  const concurrent = await Promise.all([
    receiver.api.patch(`/api/tickets/${receiverUrgent.id}/priority`, { data: { priority: 'Deadline-sensitive' } }),
    registrar.api.patch(`/api/tickets/${registrarPriority.id}/priority`, { data: { priority: 'Urgent' } }),
  ]);
  assert(concurrent.every(response => response.status() === 200));
  const concurrentState = await (await root.get('/api/state')).json();
  assert.equal(concurrentState.tickets.find((item: Ticket) => item.id === receiverUrgent.id).priority, 'Deadline-sensitive');
  assert.equal(concurrentState.tickets.find((item: Ticket) => item.id === registrarPriority.id).priority, 'Urgent');
  await Promise.all(staff.map(checkQueue));
  console.log('PASS: simultaneous priority changes from different staff accounts preserve both updates');

  await openTriage(receiver2, evaluatorUrgent.id);
  await openTriage(evaluator, evaluatorUrgent.id);
  await evaluator.page.locator('#triage-ticket-priority').selectOption('Normal');
  await savedPriority(evaluator.page, 'Normal');
  await savedPriority(receiver2.page, 'Normal');
  await Promise.all(staff.map(checkQueue));
  await receiver2.page.locator('#triage-ticket-priority').selectOption('Deadline-sensitive');
  await savedPriority(receiver2.page, 'Deadline-sensitive');
  await savedPriority(evaluator.page, 'Deadline-sensitive');
  await Promise.all(staff.map(checkQueue));
  console.log('PASS: Manage & Triage saves real priority changes and updates other staff queues and already-open dialogs');
  await evaluator.page.screenshot({ path: '/tmp/registrack-priority-queue.png', fullPage: true });

  // Reload ensures the whole-resource workflow action begins from the current version.
  await receiver.page.reload();
  await receiver.page.locator('#nav-admin-dashboard').waitFor();
  await openTriage(receiver, receiverUrgent.id);
  const notificationsBeforeHandoff = (await (await root.get('/api/state')).json()).notifications;
  await receiver.page.getByRole('button', {
    name: `Done Managing Intake → Pass to Records Management (${records.name})`, exact: true,
  }).click();
  await records.page.waitForFunction(id =>
    !!document.querySelector(`[data-ticket-id="${id}"]`), receiverUrgent.id, { timeout: 20000 });
  await Promise.all(staff.map(checkQueue));
  const notificationsAfterHandoff = (await (await root.get('/api/state')).json()).notifications;
  for (const notification of notificationsBeforeHandoff) {
    const unchanged = notificationsAfterHandoff.find((item: any) => item.id === notification.id);
    assert(JSON.stringify(unchanged) === JSON.stringify(notification), 'Handoff must preserve existing notifications.');
  }
  console.log('PASS: triage workflow hands the request to Records and updates that officer’s live action queue');

  await openTriage(records, recordsPriority.id);
  await changeTicket(recordsPriority.id, { assignedTo: evaluator.name, assignedRole: 'evaluator' });
  await records.page.waitForFunction(() => !document.getElementById('triage-ticket-priority'), undefined, { timeout: 20000 });
  await Promise.all(staff.map(checkQueue));
  assert.equal((await records.api.patch(`/api/tickets/${recordsPriority.id}/priority`, { data: { priority: 'Normal' } })).status(), 403);
  assert.deepEqual(errors, []);
  console.log('PASS: reassignment moves the queue item, closes the previous officer’s dialog, and prevents former-assignee updates');
} finally {
  await browser.close();
  await pool.query(
    `WITH fixture_numbers AS (
       SELECT entry->>'ticketNumber' AS number FROM registrack_data,
         jsonb_array_elements(payload) entry WHERE key = 'tickets' AND entry->>'id' = ANY($1::text[])
     )
     UPDATE registrack_data SET payload = COALESCE((
       SELECT jsonb_agg(entry) FROM jsonb_array_elements(payload) entry
       WHERE CASE
         WHEN key = 'tickets' THEN COALESCE(entry->>'id', '') <> ALL($1::text[])
         WHEN key = 'auditLogs' THEN COALESCE(entry->>'actorName', '') <> ALL($2::text[])
         WHEN key = 'systemActivities' THEN COALESCE(entry->>'actor', '') <> ALL($2::text[])
         ELSE entry->>'ticketNumber' IS NULL OR entry->>'ticketNumber' NOT IN (SELECT number FROM fixture_numbers)
       END
     ), '[]'::jsonb), version = version + 1
     WHERE key IN ('tickets', 'notifications', 'auditLogs', 'systemActivities',
       'deletedRequestsHistory', 'completedRequestsHistory')`,
    [ticketIds, staffNames],
  );
  for (const id of accountIds) assert.equal((await root.delete(`/api/users/${id}`)).status(), 200);
  await pool.query(
    `UPDATE registrack_data SET payload = COALESCE((
       SELECT jsonb_agg(entry) FROM jsonb_array_elements(payload) entry
       WHERE COALESCE(entry->>'id', '') <> ALL($1::text[])
     ), '[]'::jsonb), version = version + 1 WHERE key = 'deletedAccounts'`, [accountIds],
  );
  const after = await (await root.get('/api/state')).json();
  assert(JSON.stringify(after.users.map((item: any) => item.id).sort()) === JSON.stringify(before.users.map((item: any) => item.id).sort()));
  for (const key of ['tickets', 'notifications', 'studentRecords', 'deletedRequestsHistory', 'completedRequestsHistory']) {
    assert(JSON.stringify(after[key]) === JSON.stringify(before[key]), `${key}: existing data must be preserved.`);
  }
  await Promise.all(clients.map(client => client.dispose()));
  await root.dispose();
  await pool.end();
  console.log('PASS: all temporary fixtures removed; existing accounts and requests preserved');
}