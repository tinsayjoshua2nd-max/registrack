import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

// Development-only verification. Credentials stay in memory and are never logged.
const base = process.env.REGISTRACK_TEST_URL || 'http://127.0.0.1:5000';
const hostname = new URL(base).hostname;
if (!['localhost', '127.0.0.1'].includes(hostname) && !hostname.endsWith('.replit.dev')) {
  throw new Error('Verification is restricted to development URLs, never published apps.');
}
const password = process.env.REGISTRAR_BOOTSTRAP_PASSWORD;
if (!password) throw new Error('Registrar bootstrap secret is required for development verification.');
const createdIds: string[] = [];
let baseline: Record<string, any> | undefined;
let registrar: Client;

class Client {
  cookie = '';
  async request(path: string, method = 'GET', body?: unknown, expected = 200): Promise<any> {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Origin: base, Cookie: this.cookie },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const cookie = response.headers.get('set-cookie');
    if (cookie) this.cookie = cookie.split(';')[0];
    const result = await response.json();
    assert.equal(response.status, expected, `${method} ${path}: ${result.error || response.status}`);
    return result;
  }
  async login(role: string, identifier: string, credential: string) {
    return this.request('/api/login', 'POST', { role, identifier, password: credential });
  }
}

async function createAccount(role: string, studentId?: string) {
  const suffix = randomUUID().slice(0, 8);
  const initialPassword = randomUUID();
  const { user } = await registrar.request('/api/users', 'POST', {
    user: {
      name: `Verification ${role} ${suffix}`, email: `${suffix}@verification.local`,
      role, status: 'active', studentId, password: initialPassword,
      departmentOrOffice: role === 'student' ? 'Verification Program' : 'Registrar Office',
      degreeProgram: role === 'student' ? 'Verification Program' : undefined,
      yearLevel: role === 'student' ? '1st Year' : undefined,
    },
  }, 201);
  createdIds.push(user.id);
  assert(!JSON.stringify(user).match(/password/i));
  const client = new Client();
  await client.login(role === 'student' ? 'student' : 'admin', user.name, initialPassword);
  return { user, client, initialPassword };
}

async function save(client: Client, key: string, payload: unknown) {
  const state = await client.request('/api/state');
  return client.request(`/api/state/${key}`, 'PUT', { payload, version: state._versions[key] || 0 });
}

try {
  registrar = new Client();
  const session = await registrar.login('superadmin', 'Stevie Ray Rotulo', password);
  assert(session.user.id && session.user.name === 'Stevie Ray Rotulo');
  baseline = await registrar.request('/api/state') as Record<string, any>;
  assert.equal(baseline.users.length, 1, 'Verification must begin with only the Registrar account.');
  assert.equal(baseline.tickets.length, 0);
  assert(baseline.requestCategories.length > 0 && baseline.roles.length > 0);
  const stranger = new Client();
  await stranger.request('/api/login', 'POST', { role: 'superadmin', identifier: 'Stevie Ray Rotulo', password: randomUUID() }, 401);
  await stranger.request('/api/state', 'GET', undefined, 401);
  console.log('PASS: sole Registrar, real defaults, authentication and password rejection');

  const receiver = await createAccount('receiver');
  const evaluator = await createAccount('evaluator');
  const a = await createAccount('student', '98990001');
  const b = await createAccount('student', '98990002');
  const studentState = await a.client.request('/api/state');
  assert.equal(studentState.users.length, 0);
  const profileState = await registrar.request('/api/state');
  assert.equal(profileState.studentRecords.length, 2);
  assert(profileState.studentRecords.every((s: any) => s.degreeProgram === 'Verification Program'));
  console.log('PASS: account provisioning atomically creates accurate student profiles');

  const category = baseline.requestCategories.find((c: any) => c.active)?.name;
  const draft = {
    id: `verify-${randomUUID()}`, ticketNumber: `REG-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`,
    studentId: a.user.studentId, studentName: a.user.name, email: a.user.email,
    category, subject: 'Verification request', description: 'Development verification only.',
    documentType: 'None', copies: 1, status: 'pending', stage: 'submitted', messages: [],
    internalNotes: [], timelineHistory: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  const { ticket } = await a.client.request('/api/tickets', 'POST', { ticket: draft }, 201);
  const repeated = await a.client.request('/api/tickets', 'POST', { ticket: draft });
  assert.equal(repeated.ticket.id, ticket.id);
  assert.equal(repeated.ticket.ticketNumber, ticket.ticketNumber);
  assert.equal((await a.client.request('/api/state')).tickets.length, 1);
  assert.equal((await b.client.request('/api/state')).tickets.length, 0);
  assert.equal((await evaluator.client.request('/api/state')).tickets.length, 0);
  assert.equal((await receiver.client.request('/api/state')).tickets.length, 1);
  console.log('PASS: canonical ticket confirmation, idempotency, student/officer isolation');

  await a.client.request(`/api/tickets/${ticket.id}/messages`, 'POST', { message: 'Verification student message' });
  const officeState = await receiver.client.request('/api/state');
  assert(officeState.tickets[0].messages.some((m: any) => m.message === 'Verification student message'));
  assert(officeState.notifications.some((n: any) => n.audience === 'officer' && n.type === 'chat_message'));
  await evaluator.client.request(`/api/tickets/${ticket.id}/messages`, 'POST', { message: 'Not assigned' }, 403);
  await receiver.client.request(`/api/tickets/${ticket.id}/messages`, 'POST', { message: 'Verification office reply' });
  const updatedA = await a.client.request('/api/state');
  assert(updatedA.notifications.some((n: any) => n.type === 'chat_message' && n.audience !== 'officer'));
  assert.equal((await b.client.request('/api/state')).notifications.length, 0);
  console.log('PASS: real two-way chat and recipient-specific notifications');

  let assignments = await registrar.request('/api/state');
  await save(registrar, 'tickets', assignments.tickets.map((t: any) => ({
    ...t, assignedTo: evaluator.user.name, updatedAt: new Date().toISOString(),
  })));
  assert.equal((await evaluator.client.request('/api/state')).tickets.length, 1);
  assignments = await registrar.request('/api/state');
  await save(registrar, 'tickets', assignments.tickets.map((t: any) => ({
    ...t, assignedTo: receiver.user.name, updatedAt: new Date().toISOString(),
  })));
  assert.equal((await evaluator.client.request('/api/state')).tickets.length, 0);
  await evaluator.client.request(`/api/tickets/${ticket.id}/messages`, 'POST', { message: 'Former assignee' }, 403);
  console.log('PASS: reassignment immediately revokes the previous officer’s access');

  const versionState = await registrar.request('/api/state');
  await registrar.request('/api/state/announcements', 'PUT', { payload: [], version: versionState._versions.announcements || 0 });
  await registrar.request('/api/state/announcements', 'PUT', { payload: [], version: versionState._versions.announcements || 0 }, 409);
  await evaluator.client.request('/api/state/studentRecords', 'PUT', { payload: [], version: 0 }, 403);
  console.log('PASS: stale writes and unauthorized student-profile edits are rejected');

  const state = await receiver.client.request('/api/state');
  const currentTicket = state.tickets.find((t: any) => t.id === ticket.id);
  await save(receiver.client, 'tickets', [{ ...currentTicket, internalNotes: [{ author: receiver.user.name, text: 'Private staff note' }], updatedAt: new Date().toISOString() }]);
  await receiver.client.request(`/api/tickets/${ticket.id}/delete`, 'POST', { reason: 'Development verification cleanup' });
  const deletedStudent = await a.client.request('/api/state');
  assert.equal(deletedStudent.tickets.length, 0);
  assert.equal(deletedStudent.deletedRequestsHistory[0].ticketSnapshot.internalNotes.length, 0);
  const deletedOfficer = await receiver.client.request('/api/state');
  await receiver.client.request(`/api/tickets/${deletedOfficer.deletedRequestsHistory[0].id}/restore`, 'POST', {});
  assert.equal((await a.client.request('/api/state')).tickets.length, 1);
  console.log('PASS: atomic deletion/restoration and private history-note redaction');

  const restoredState = await receiver.client.request('/api/state');
  await save(receiver.client, 'tickets', restoredState.tickets.map((t: any) => ({
    ...t, status: 'completed', stage: 'completed', updatedAt: new Date().toISOString(),
  })));
  const archived = await registrar.request('/api/archive-completed', 'POST', {});
  assert.equal(archived.count, 1);
  const history = await a.client.request('/api/state');
  assert.equal(history.tickets.length, 0);
  assert.equal(history.completedRequestsHistory.length, 1);
  assert.equal(history.completedRequestsHistory[0].ticketSnapshot.internalNotes.length, 0);
  const savedSettings = (await registrar.request('/api/state')).systemSettings;
  await save(registrar, 'systemSettings', { ...savedSettings, maintenanceMode: true });
  await b.client.request('/api/tickets', 'POST', {
    ticket: { ...draft, id: `verify-${randomUUID()}`, ticketNumber: `REG-${new Date().getFullYear()}-${randomUUID().slice(0, 8)}`, studentId: b.user.studentId },
  }, 503);
  await save(registrar, 'systemSettings', savedSettings);
  console.log('PASS: completion archive is persistent and maintenance actually pauses intake');

  const newPassword = randomUUID();
  await a.client.request('/api/change-password', 'POST', { oldPassword: a.initialPassword, newPassword });
  await a.client.request('/api/logout', 'POST', {});
  await a.client.login('student', a.user.name, newPassword);
  await registrar.request(`/api/users/${a.user.id}`, 'PUT', { updates: { status: 'suspended' } });
  await a.client.request('/api/state', 'GET', undefined, 401);
  console.log('PASS: password changes and disabled-account session revocation');
} finally {
  if (registrar!) {
    for (const id of createdIds.reverse()) {
      await registrar.request(`/api/users/${id}`, 'DELETE');
    }
    if (baseline) {
      await registrar.request('/api/state/restore-backup', 'POST', { backup: baseline });
      const final = await registrar.request('/api/state');
      assert.equal(final.users.length, 1);
      assert.equal(final.tickets.length, 0);
      assert.equal(final.studentRecords.length, 0);
      console.log('PASS: verification records removed; only Registrar remains');
    }
    await registrar.request('/api/logout', 'POST', {});
  }
}