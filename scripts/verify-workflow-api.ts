// Short HTTP/API checks only. Refuses to connect to the application's database.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import express from 'express';
import { pool } from '../server/database';
import { registerApi } from '../server/api';
import { createSessionToken, hashSessionToken } from '../server/security';
import { DEFAULT_SYSTEM_SETTINGS, INITIAL_REQUEST_CATEGORIES, INITIAL_ROLES } from '../src/data/superAdminData';

const target = new URL(process.env.DATABASE_URL || 'http://invalid');
assert.equal(target.hostname, '127.0.0.1', 'Only disposable loopback PostgreSQL is permitted.');
assert.equal(target.port, '55439');
assert.equal(target.pathname, '/registrack_temp_zztest');
const roles = ['receiver', 'records_management', 'evaluator', 'registrar', 'superadmin', 'admin', 'staff', 'student', 'other_student', 'fallback_student'];
const cookies = new Map<string, string>();
const avatar = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aP1sAAAAASUVORK5CYII=';
const student = (id: string, name: string) => ({
  id: `ZZ-TEST-profile-${id}`, studentId: id, name, email: `${id}@zz-test.invalid`, phone: 'ZZ-TEST-phone',
  degreeProgram: 'ZZ-TEST-program', yearLevel: 'ZZ-TEST-year', enrollmentStatus: 'Regular',
  unitsEnrolled: 18, isArchived: false, requestCount: 1, joinedDate: '2026-01-01', profilePicture: avatar,
});
function ticket(id: string, role: string, stage = 'processing', studentId = '90000001') {
  return {
    id: `ZZ-TEST-${id}`, ticketNumber: `ZZ-TEST-${id}`, studentId, studentName: 'ZZ-TEST-student',
    email: `${studentId}@zz-test.invalid`, phone: 'ZZ-TEST-phone', degreeProgram: 'ZZ-TEST-program', yearLevel: 'ZZ-TEST-year',
    category: 'TOR', documentType: 'TOR', subject: 'ZZ-TEST-request', description: 'ZZ-TEST-request',
    priority: 'Normal', assignedTo: `ZZ-TEST-${role}`, assignedRole: role, status: stage === 'submitted' ? 'pending' : 'processing',
    stage, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    estimatedReleaseDate: 'ZZ-TEST-estimate', claimingRequirements: [], messages: [], internalNotes: [],
    timelineHistory: [{ stage, title: 'ZZ-TEST-existing', timestamp: '2026-01-01T00:00:00.000Z', actor: 'ZZ-TEST-existing' }],
  };
}

await pool.query(await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8'));
for (const role of roles) {
  const accountRole = role.endsWith('student') ? 'student' : role;
  const studentId = role === 'student' ? '90000001' : role === 'other_student' ? '90000002' : role === 'fallback_student' ? '90000003' : null;
  await pool.query(
    `INSERT INTO registrack_accounts (id,name,email,role,status,student_id,password_hash,data) VALUES ($1,$2,$3,$4,'active',$5,'ZZ-TEST-unused',$6)`,
    [`ZZ-TEST-${role}`, `ZZ-TEST-${role}`, `${role}@zz-test.invalid`, accountRole, studentId,
      JSON.stringify({ departmentOrOffice: 'ZZ-TEST-office', phoneNumber: 'ZZ-TEST-phone', profilePicture: avatar,
        degreeProgram: 'ZZ-TEST-program', yearLevel: 'ZZ-TEST-year', unitsEnrolled: 99, lastLogin: 'ZZ-TEST-lastLogin', privateMarker: 'ZZ-TEST-private' })],
  );
  const token = createSessionToken();
  await pool.query('INSERT INTO registrack_sessions VALUES ($1,$2,now()+interval \'1 hour\')', [hashSessionToken(token), `ZZ-TEST-${role}`]);
  cookies.set(role, `registrack_session=${token}`);
}
const fixtureTickets = [
  ticket('receiver', 'receiver', 'submitted'), ticket('records', 'records_management', 'reviewed'),
  ticket('evaluator', 'evaluator'), ticket('registrar', 'registrar'),
  ticket('odd', 'receiver', 'ZZ-TEST-odd-stage'), ticket('ready', 'receiver', 'ready'),
  ticket('unrelated', 'receiver', 'processing', '90000002'),
  { ...ticket('legacy-completed-status', 'receiver', 'ZZ-TEST-odd-stage'), status: 'completed' },
  { ...ticket('legacy-completed-stage', 'receiver', 'completed'), status: 'pending' },
  {
    ...ticket('privacy', 'receiver'),
    completionNotes: 'ZZ-TEST-completion-note',
    rejectionReason: 'ZZ-TEST-rejection-reason',
    timelineHistory: [
      ...ticket('privacy', 'receiver').timelineHistory,
      { stage: 'processing', action: 'step_back', title: 'ZZ-TEST-staff-event', notes: 'ZZ-TEST-timeline-staff-note' },
      { stage: 'processing', action: 'reject', title: 'ZZ-TEST-rejection-event', notes: 'ZZ-TEST-rejection-reason' },
    ],
  },
  ticket('notify-forward', 'receiver'),
  ticket('notify-step-back', 'receiver'),
  ticket('notify-handoff', 'receiver'),
  ticket('notify-reject', 'receiver'),
  ticket('notify-repair', 'receiver', 'ZZ-TEST-legacy-stage'),
  ticket('notify-force-close', 'receiver', 'ready'),
  ticket('notify-ready', 'receiver', 'for_seal'),
  ticket('notify-ready-handoff', 'receiver', 'ready'),
  ticket('notify-completion', 'receiver', 'ready'),
];
const initialCompletedHistory = [{
  id: 'ZZ-TEST-completed-history',
  ticketId: 'ZZ-TEST-privacy',
  ticketNumber: 'ZZ-TEST-privacy',
  studentId: '90000001',
  notes: 'ZZ-TEST-history-root-note',
  completedByOfficerEmail: 'ZZ-TEST-officer@zz-test.invalid',
  ticketSnapshot: {
    ...fixtureTickets.find((item) => item.id === 'ZZ-TEST-privacy'),
    completionNotes: 'ZZ-TEST-history-completion-note',
  },
}];
const initialDeletedHistory = [{
  id: 'ZZ-TEST-deleted-history',
  ticketId: 'ZZ-TEST-privacy',
  ticketNumber: 'ZZ-TEST-privacy',
  studentId: '90000001',
  reason: 'ZZ-TEST-deletion-reason',
  notes: 'ZZ-TEST-deletion-note',
  deletedByOfficerEmail: 'zz-test-officer@zz-test.invalid',
  ticketSnapshot: {
    ...fixtureTickets.find((item) => item.id === 'ZZ-TEST-privacy'),
  },
}];
const initial: Record<string, unknown> = {
  tickets: fixtureTickets, studentRecords: [student('90000001', 'ZZ-TEST-student'), student('90000002', 'ZZ-TEST-other_student')],
  roles: INITIAL_ROLES, requestCategories: INITIAL_REQUEST_CATEGORIES,
  systemSettings: { ...DEFAULT_SYSTEM_SETTINGS, maintenanceMode: false, maxPendingPerStudent: 100 },
  auditLogs: [], systemActivities: [], notifications: [], announcements: [],
  deletedRequestsHistory: initialDeletedHistory,
  completedRequestsHistory: initialCompletedHistory,
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
async function request(role: string, path: string, method = 'GET', body?: unknown) {
  const response = await fetch(base + path, { method, headers: {
    Origin: base, Cookie: cookies.get(role)!, 'Content-Type': 'application/json',
  }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}
async function state(role = 'superadmin') {
  const result = await request(role, '/api/state');
  assert.equal(result.status, 200);
  return result.body;
}
async function workflow(role: string, id: string, action: string, input: Record<string, unknown> = {}, expected = 200) {
  const before = await state();
  const current = before.tickets.find((item: any) => item.id === `ZZ-TEST-${id}`);
  assert(current);
  const payload = { action, expectedUpdatedAt: current.updatedAt, operationId: `ZZ-TEST-${randomUUID()}`, ...input };
  const result = await request(role, `/api/tickets/${current.id}/workflow`, 'POST', payload);
  assert.equal(result.status, expected, `ZZ-TEST ${action}: ${JSON.stringify(result.body)}`);
  return { ...result, payload, before, current };
}
async function saveTicketFields(role: string, id: string, changes: Record<string, unknown>, snapshot?: any) {
  const before = snapshot || await state();
  const current = before.tickets.find((item: any) => item.id === `ZZ-TEST-${id}`);
  assert(current);
  const payload = before.tickets.map((item: any) => item.id === current.id ? { ...item, ...changes } : item);
  const result = await request(role, '/api/state/tickets', 'PUT', { payload, version: before._versions.tickets });
  return { ...result, before, current };
}
let checks = 0;
async function check(name: string, work: () => Promise<void>) {
  try { await work(); }
  catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
  checks++;
  console.info(`PASS ${name}`);
}
try {
  await check('role payloads and all requested screen dependencies', async () => {
    const beforeAccounts = JSON.stringify((await pool.query('SELECT id,data FROM registrack_accounts ORDER BY id')).rows);
    for (const role of ['receiver', 'records_management', 'evaluator', 'registrar', 'student', 'superadmin']) {
      const boot = await request(role, '/api/bootstrap');
      assert.equal(boot.status, 200);
      const data = boot.body.state;
      assert.equal(boot.body.user.name, `ZZ-TEST-${role}`);
      if (role === 'student') {
        assert.deepEqual(data.users, []); assert.deepEqual(data.studentRecords, []);
        assert.deepEqual(data.completedRequestsHistory, []);
        assert(data.tickets.length && data.tickets.every((t: any) => t.studentId === '90000001'));
        assert(data.tickets.every((t: any) => t.internalNotes.length === 0));
      } else if (role === 'superadmin' || role === 'registrar') {
        assert.equal(boot.body.user.role, 'superadmin', 'Privileged portal access level');
        assert.equal(boot.body.user.adminRoleTitle, 'Registrar Officer');
        assert.equal(boot.body.user.staffRole, role);
        assert.deepEqual(boot.body.user.permissions, ['all']);
        for (const key of Object.keys(initial)) assert(data[key] !== undefined, `Registrar Officer resource ${key}`);
        assert.equal(data.tickets.length, fixtureTickets.length);
        assert.deepEqual(data.deletedRequestsHistory, initialDeletedHistory);
        assert.deepEqual(data.completedRequestsHistory, initialCompletedHistory);
        assert.equal(data.studentRecords[0].unitsEnrolled, 18);
        assert(data.users.every((u: any) => u.email && u.departmentOrOffice && u.lastLogin && u.createdAt));
        assert(data.users.every((u: any) => !('privateMarker' in u) && !('password_hash' in u)));
      } else {
        assert(data.users.every((u: any) => u.role !== 'student' && u.id && u.name && u.role && u.status && u.departmentOrOffice && u.profilePicture));
        assert(data.users.every((u: any) => !('email' in u) && !('phoneNumber' in u) && !('unitsEnrolled' in u)));
        assert.deepEqual(data.auditLogs, []); assert.deepEqual(data.systemActivities, []);
        assert(data.studentRecords.every((s: any) => !('unitsEnrolled' in s) && !('enrollmentStatus' in s)));
        if (role === 'receiver') {
          assert.deepEqual(data.deletedRequestsHistory, initialDeletedHistory);
          assert.deepEqual(data.completedRequestsHistory, initialCompletedHistory);
          const own = data.studentRecords.find((s: any) => s.studentId === '90000001');
          for (const field of ['id','name','studentId','email','phone','degreeProgram','yearLevel']) assert(own[field]);
          assert(data.studentRecords.some((s: any) => s.studentId === '90000003'), 'Account-only student remains searchable');
          assert(data.users.some((u: any) => u.role === 'records_management' && u.status === 'active'));
        } else {
          assert(data.tickets.every((t: any) => t.assignedTo === `ZZ-TEST-${role}`));
          assert(data.studentRecords.every((s: any) => s.studentId === '90000001' && s.name && s.profilePicture));
          assert(data.studentRecords.every((s: any) => !('email' in s) && !('degreeProgram' in s)));
          assert(data.tickets.every((t: any) => t.studentName && t.email && t.phone && Array.isArray(t.messages) && Array.isArray(t.timelineHistory)));
        }
      }
    }
    assert.equal(JSON.stringify((await pool.query('SELECT id,data FROM registrack_accounts ORDER BY id')).rows), beforeAccounts);
    assert.deepEqual((await state()).tickets, fixtureTickets, 'Read scoping must not repair stored tickets');
  });
  await check('student ticket and history privacy across state and bootstrap', async () => {
    const ticketId = 'ZZ-TEST-privacy';
    const studentState = await state('student');
    const studentTicket = studentState.tickets.find((entry: any) => entry.id === ticketId);
    assert(studentTicket);
    assert.equal(studentTicket.stage, 'processing');
    assert.equal(studentTicket.estimatedReleaseDate, 'ZZ-TEST-estimate');
    assert.equal(studentTicket.rejectionReason, 'ZZ-TEST-rejection-reason');
    assert(studentTicket.timelineHistory.some((event: any) => event.title === 'ZZ-TEST-staff-event'));
    assert(studentTicket.timelineHistory.some((event: any) =>
      event.action === 'reject' && event.notes === 'ZZ-TEST-rejection-reason'));
    assert(studentTicket.timelineHistory.every((event: any) =>
      event.action === 'reject' || !('notes' in event)));
    assert.deepEqual(studentState.completedRequestsHistory, []);
    const studentDeletedRecord = studentState.deletedRequestsHistory.find(
      (record: any) => record.id === 'ZZ-TEST-deleted-history',
    );
    assert(studentDeletedRecord, 'Student retains the permitted deletion-history entry.');
    assert(!('reason' in studentDeletedRecord));
    assert(!('notes' in studentDeletedRecord));
    assert(!('deletedByOfficerEmail' in studentDeletedRecord));

    const studentBootstrap = await request('student', '/api/bootstrap');
    assert.equal(studentBootstrap.status, 200);
    assert.deepEqual(studentBootstrap.body.state.completedRequestsHistory, []);
    const serializedStudentPayloads = JSON.stringify([studentState, studentBootstrap.body.state]);
    for (const marker of [
      'ZZ-TEST-timeline-staff-note',
      'ZZ-TEST-completion-note',
      'ZZ-TEST-history-root-note',
      'ZZ-TEST-history-completion-note',
      'ZZ-TEST-officer@zz-test.invalid',
      'ZZ-TEST-deletion-reason',
      'ZZ-TEST-deletion-note',
      'zz-test-officer@zz-test.invalid',
    ]) assert(!serializedStudentPayloads.includes(marker), `Student payload leaked ${marker}`);

    const receiverState = await state('receiver');
    const receiverTicket = receiverState.tickets.find((entry: any) => entry.id === ticketId);
    assert(receiverTicket.timelineHistory.some((event: any) => event.notes === 'ZZ-TEST-timeline-staff-note'));
    assert.equal(receiverTicket.completionNotes, 'ZZ-TEST-completion-note');
    assert.deepEqual(receiverState.deletedRequestsHistory, initialDeletedHistory);
    assert.deepEqual(receiverState.completedRequestsHistory, initialCompletedHistory);
    for (const role of ['registrar', 'superadmin']) {
      const privilegedState = await state(role);
      const privilegedTicket = privilegedState.tickets.find((entry: any) => entry.id === ticketId);
      assert(privilegedTicket.timelineHistory.some((event: any) => event.notes === 'ZZ-TEST-timeline-staff-note'));
      assert.equal(privilegedTicket.completionNotes, 'ZZ-TEST-completion-note');
      assert.deepEqual(privilegedState.deletedRequestsHistory, initialDeletedHistory);
      assert.deepEqual(privilegedState.completedRequestsHistory, initialCompletedHistory);
    }
  });
  await check('student workflow notices hide staff reasons and preserve rejection reasons', async () => {
    const reasons = {
      forward: 'ZZ-TEST-forward-staff-note',
      stepBack: 'ZZ-TEST-step-back-staff-note',
      handoff: 'ZZ-TEST-handoff-staff-note',
      rejection: 'ZZ-TEST-workflow-rejection-reason',
      reopen: 'ZZ-TEST-reopen-staff-note',
      repair: 'ZZ-TEST-repair-staff-note',
      forceClose: 'ZZ-TEST-force-close-staff-note',
      ready: 'ZZ-TEST-ready-staff-note',
      completion: 'ZZ-TEST-completion-staff-note',
    };
    await workflow('receiver', 'notify-forward', 'stage', {
      targetStage: 'for_seal', notes: reasons.forward,
    });
    await workflow('receiver', 'notify-step-back', 'stage', {
      targetStage: 'submitted', notes: reasons.stepBack,
    });
    await workflow('receiver', 'notify-handoff', 'handoff', {
      assignedTo: 'ZZ-TEST-evaluator', notes: reasons.handoff,
    });
    await workflow('receiver', 'notify-ready-handoff', 'handoff', {
      assignedTo: 'ZZ-TEST-evaluator', notes: reasons.handoff,
    });
    const rejection = await workflow('receiver', 'notify-reject', 'reject', { notes: reasons.rejection });
    assert.equal(rejection.body.ticket.rejectionReason, reasons.rejection);
    await workflow('registrar', 'notify-reject', 'reopen', {
      notes: reasons.reopen, confirmed: true,
    });
    await workflow('receiver', 'notify-repair', 'repair', {
      targetStage: 'processing', notes: reasons.repair,
    });
    await workflow('registrar', 'notify-force-close', 'force_close', {
      notes: reasons.forceClose, confirmed: true,
    });
    await workflow('receiver', 'notify-ready', 'stage', {
      targetStage: 'ready', notes: reasons.ready,
    });
    await workflow('receiver', 'notify-completion', 'stage', {
      targetStage: 'completed', notes: reasons.completion, confirmed: true,
    });

    const expectations = [
      ['notify-forward', `Your request ZZ-TEST-notify-forward is now For University Seal.`, reasons.forward, 'status_update'],
      ['notify-step-back', `Your request ZZ-TEST-notify-step-back was moved back to Submitted for further processing.`, reasons.stepBack, 'status_update'],
      ['notify-handoff', `Your request ZZ-TEST-notify-handoff is now being handled by another staff member.`, reasons.handoff, 'status_update'],
      ['notify-ready-handoff', `Your request ZZ-TEST-notify-ready-handoff is now being handled by another staff member.`, reasons.handoff, 'status_update'],
      ['notify-reject', reasons.rejection, reasons.rejection, 'status_update'],
      ['notify-reject', `Your request ZZ-TEST-notify-reject has been reopened for further processing.`, reasons.reopen, 'status_update'],
      ['notify-repair', `Your request ZZ-TEST-notify-repair was updated.`, reasons.repair, 'status_update'],
      ['notify-force-close', `Your request ZZ-TEST-notify-force-close is complete.`, reasons.forceClose, 'release_ready'],
      ['notify-ready', `Your request ZZ-TEST-notify-ready is ready for claiming.`, reasons.ready, 'release_ready'],
      ['notify-completion', `Your request ZZ-TEST-notify-completion is complete.`, reasons.completion, 'release_ready'],
    ] as const;
    const studentState = await state('student');
    const studentBootstrap = await request('student', '/api/bootstrap');
    assert.equal(studentBootstrap.status, 200);
    assert.deepEqual(studentState.completedRequestsHistory, []);
    assert.deepEqual(studentBootstrap.body.state.completedRequestsHistory, []);
    for (const [ticketNumber, message, reason, type] of expectations) {
      const studentNotification = studentState.notifications.find((entry: any) =>
        entry.ticketNumber === ticketNumber && entry.message === message);
      assert(studentNotification, `Missing student notification for ${ticketNumber}`);
      assert.equal(studentNotification.message, message);
      assert.equal(studentNotification.title, ticketNumber === 'notify-reject'
        && message === reasons.rejection ? 'Action Needed' : `Request ${ticketNumber} Updated`);
      assert.equal(studentNotification.audience, 'student');
      assert.equal(studentNotification.recipientStudentId, '90000001');
      assert.equal(studentNotification.type, type);
      assert(studentNotification.id);
      if (ticketNumber !== 'notify-reject') assert(!studentNotification.message.includes(reason));
      const bootstrapNotification = studentBootstrap.body.state.notifications.find(
        (entry: any) => entry.ticketNumber === ticketNumber && entry.message === message,
      );
      assert.equal(bootstrapNotification.message, message);
    }
    const rejectedStudentTicket = studentState.tickets.find((entry: any) => entry.id === 'ZZ-TEST-notify-reject');
    assert.equal(rejectedStudentTicket.rejectionReason, undefined, 'Reopen clears the old rejection reason.');
    assert(rejectedStudentTicket.timelineHistory.some((event: any) =>
      event.action === 'reject' && event.notes === reasons.rejection));
    for (const reason of Object.values(reasons).filter((value) => value !== reasons.rejection)) {
      assert(!JSON.stringify([studentState, studentBootstrap.body.state]).includes(reason),
        `Student payload leaked staff reason ${reason}`);
    }
    for (const role of ['receiver', 'registrar', 'superadmin']) {
      const staffState = await state(role);
      for (const [ticketNumber, _message, reason] of expectations) {
        const staffTicket = staffState.tickets.find((entry: any) => entry.ticketNumber === ticketNumber);
        if (ticketNumber === 'notify-handoff' && role === 'receiver') {
          assert(staffTicket, 'Receiver retains visibility of the handoff ticket.');
        }
        if (staffTicket) {
          assert(staffTicket.timelineHistory.some((event: any) => event.notes === reason),
            `${role} timeline lost workflow reason ${reason}`);
        }
        const notification = staffState.notifications.find((entry: any) =>
          entry.ticketNumber === ticketNumber && entry.message === _message);
        assert(notification, `${role} lost workflow notification for ${ticketNumber}`);
        assert.equal(notification.message, _message, `${role} notification message changed for ${ticketNumber}`);
      }
      if (role !== 'receiver') {
        for (const reason of Object.values(reasons)) {
          assert(staffState.auditLogs.some((entry: any) => entry.details.includes(reason)),
            `${role} audit history lost ${reason}`);
        }
      }
    }
  });
  await check('creation permission matches the Application Form', async () => {
    for (const role of ['student', 'records_management', 'evaluator', 'admin', 'staff']) {
      assert.equal((await request(role, '/api/tickets', 'POST', { ticket: { id: 'ZZ-TEST-forbidden' } })).status, 403);
    }
    for (const role of ['receiver', 'registrar', 'superadmin']) {
      const created = await request(role, '/api/tickets', 'POST', { ticket: {
        ...ticket(`create-${role}`, 'receiver'), assignedTo: 'ZZ-TEST-receiver',
      } });
      assert.equal(created.status, 201, JSON.stringify(created.body));
    }
  });
  await check('Student Track/Chat and session-owned staff chat names', async () => {
    for (const role of ['student', 'receiver']) {
      const sent = await request(role, '/api/tickets/ZZ-TEST-receiver/messages', 'POST', {
        message: { id: `ZZ-TEST-message-${role}`, message: 'ZZ-TEST-chat', senderName: 'ZZ-TEST-spoof' },
      });
      assert.equal(sent.status, 200);
      assert.equal(sent.body.ticket.messages.at(-1).senderName, `ZZ-TEST-${role}`);
      if (role === 'student') assert.deepEqual(sent.body.ticket.internalNotes, []);
    }
    const studentState = await state('student');
    assert(studentState.tickets.find((t: any) => t.id === 'ZZ-TEST-receiver').messages.length === 2);
    assert(studentState.notifications.some((n: any) => n.type === 'chat_message'));
    assert.equal((await request('other_student', '/api/tickets/ZZ-TEST-receiver/messages', 'POST', {
      message: { id: 'ZZ-TEST-forbidden-message', message: 'ZZ-TEST-chat' },
    })).status, 403);
    const receiverState = await state('receiver');
    const acknowledgment = await request('receiver', '/api/state/notifications', 'PUT', {
      payload: receiverState.notifications, version: receiverState._versions.notifications,
    });
    assert.equal(acknowledgment.status, 200);
    assert(Array.isArray(acknowledgment.body.payload), 'Officer notification acknowledgments remain usable');
  });
  await check('adjacent stages, required reasons, confirmation, audit and replay', async () => {
    await workflow('receiver', 'receiver', 'stage', { targetStage: 'ready' }, 400);
    const move = await workflow('receiver', 'receiver', 'stage', { targetStage: 'processing', actor: 'ZZ-TEST-spoof', timestamp: 'ZZ-TEST-spoof' });
    const event = move.body.ticket.timelineHistory.at(-1);
    assert.equal(event.actor, 'ZZ-TEST-receiver');
    assert(!Number.isNaN(Date.parse(event.timestamp)));
    assert.deepEqual(move.body.ticket.timelineHistory[0], move.current.timelineHistory[0]);
    const replay = await request('receiver', '/api/tickets/ZZ-TEST-receiver/workflow', 'POST', move.payload);
    assert.equal(replay.status, 200);
    const afterReplay = await state();
    assert.equal(afterReplay.auditLogs.filter((l: any) => l.operationId === move.payload.operationId).length, 1);
    assert.equal(afterReplay.auditLogs.find((l: any) => l.operationId === move.payload.operationId).timestamp, event.timestamp);
    await workflow('receiver', 'receiver', 'stage', { targetStage: 'submitted' }, 400);
    await workflow('receiver', 'receiver', 'stage', { targetStage: 'submitted', notes: 'ZZ-TEST-correction' });
    await workflow('receiver', 'ready', 'stage', { targetStage: 'completed' }, 400);
    await workflow('receiver', 'ready', 'stage', { targetStage: 'completed', confirmed: true });
    await workflow('receiver', 'ready', 'stage', { targetStage: 'ready', notes: 'ZZ-TEST-back' }, 400);
  });
  await check('legacy stages, reject, and handoff with current authorization', async () => {
    await workflow('records_management', 'records', 'stage', { targetStage: 'for_seal' });
    await workflow('receiver', 'odd', 'stage', { targetStage: 'processing' }, 400);
    await workflow('receiver', 'odd', 'repair', { targetStage: 'processing', notes: 'ZZ-TEST-repair' });
    const rejected = await workflow('receiver', 'odd', 'reject', { notes: 'ZZ-TEST-clarification' });
    assert.equal(rejected.body.ticket.stage, 'processing');
    const handoff = await workflow('receiver', 'odd', 'handoff', { assignedTo: 'ZZ-TEST-evaluator' });
    assert.equal(handoff.body.ticket.status, 'rejected');
    assert.equal(handoff.body.ticket.stage, 'processing');
    const evaluatorState = await state('evaluator');
    assert(evaluatorState.tickets.some((t: any) => t.id === 'ZZ-TEST-odd'));
    await workflow('records_management', 'odd', 'stage', { targetStage: 'for_seal' }, 403);
    await workflow('receiver', 'evaluator', 'stage', { targetStage: 'for_seal' }, 403);
    await workflow('receiver', 'odd', 'reopen', { notes: 'ZZ-TEST-resume', confirmed: true }, 403);
    await workflow('superadmin', 'odd', 'reopen', { notes: 'ZZ-TEST-resume', confirmed: true });
    const advanced = await workflow('registrar', 'odd', 'stage', { targetStage: 'for_seal' });
    assert.equal(advanced.body.ticket.stage, 'for_seal');
    assert.equal(advanced.body.ticket.status, 'processing');
    assert.equal(advanced.body.ticket.rejectionReason, undefined);
  });
  await check('workflow authorization: restricted staff denied; assigned Evaluator and Registrar Officers allowed', async () => {
    await workflow('receiver', 'evaluator', 'stage', { targetStage: 'for_seal' }, 403);
    await workflow('evaluator', 'evaluator', 'stage', { targetStage: 'for_seal' });
    await workflow('registrar', 'evaluator', 'stage', { targetStage: 'ready' });
    await workflow('superadmin', 'evaluator', 'stage', { targetStage: 'for_seal', notes: 'ZZ-TEST-legacy-access' });
    await workflow('superadmin', 'evaluator', 'stage', { targetStage: 'ready' });
  });
  await check('browser audit/activity identity, server time, whitelists, and existing-row preservation', async () => {
    const current = await state();
    const oldAudit = {
      id: 'ZZ-TEST-audit-existing', timestamp: 'ZZ-TEST-original-time',
      actorName: 'ZZ-TEST-original-actor', actorRole: 'ZZ-TEST-original-role',
      action: 'ZZ-TEST-existing', category: 'System', details: 'ZZ-TEST-existing',
      ipAddress: 'Unavailable', severity: 'info', legacyExtra: 'ZZ-TEST-preserve',
    };
    const oldActivity = {
      id: 'ZZ-TEST-activity-existing', timeStr: 'ZZ-TEST-original-time', timestamp: 'ZZ-TEST-original-time',
      actor: 'ZZ-TEST-original-actor', text: 'ZZ-TEST-existing', actionType: 'setting_updated',
      legacyExtra: 'ZZ-TEST-preserve',
    };
    await pool.query("UPDATE registrack_data SET payload = $1 WHERE key='auditLogs'", [JSON.stringify([...current.auditLogs, oldAudit])]);
    await pool.query("UPDATE registrack_data SET payload = $1 WHERE key='systemActivities'", [JSON.stringify([...current.systemActivities, oldActivity])]);
    const refreshed = await state();
    const audit = {
      id: 'ZZ-TEST-audit-new', timestamp: 'ZZ-TEST-forged-time', actorName: 'ZZ-TEST-forged-actor',
      actorRole: 'ZZ-TEST-forged-role', action: 'ZZ-TEST-browser-action', category: 'System',
      details: 'ZZ-TEST-browser details', ipAddress: 'Unavailable', severity: 'info',
      actor: 'ZZ-TEST-forged-shadow-actor', actorAccountId: 'ZZ-TEST-forged-id', unknownField: 'ZZ-TEST-drop',
    };
    const activity = {
      id: 'ZZ-TEST-activity-new', timeStr: 'ZZ-TEST-forged-time', timestamp: 'ZZ-TEST-forged-time',
      actor: 'ZZ-TEST-forged-actor', text: 'ZZ-TEST-browser activity', actionType: 'setting_updated',
      actorName: 'ZZ-TEST-forged-name', actorAccountId: 'ZZ-TEST-forged-id', unknownField: 'ZZ-TEST-drop',
    };
    const startedAt = Date.now();
    const auditAck = await request('superadmin', '/api/state/auditLogs', 'PUT', {
      payload: [oldAudit, audit], version: refreshed._versions.auditLogs,
    });
    assert.equal(auditAck.status, 200);
    const activityAck = await request('superadmin', '/api/state/systemActivities', 'PUT', {
      payload: [oldActivity, activity], version: refreshed._versions.systemActivities,
    });
    assert.equal(activityAck.status, 200);
    const saved = await state();
    const savedAudit = saved.auditLogs.find((entry: any) => entry.id === audit.id);
    const savedActivity = saved.systemActivities.find((entry: any) => entry.id === activity.id);
    assert.equal(savedAudit.actorName, 'ZZ-TEST-superadmin');
    assert.equal(savedAudit.actorRole, 'Registrar Officer');
    assert.equal(savedAudit.actorAccountId, 'ZZ-TEST-superadmin');
    assert(!Number.isNaN(Date.parse(savedAudit.timestamp)));
    assert.equal(savedActivity.actor, 'ZZ-TEST-superadmin');
    assert.equal(savedActivity.actorAccountId, 'ZZ-TEST-superadmin');
    assert(!Number.isNaN(Date.parse(savedActivity.timestamp)));
    assert.notEqual(savedActivity.timeStr, 'ZZ-TEST-forged-time');
    assert(Date.parse(savedAudit.timestamp) >= startedAt && Date.parse(savedAudit.timestamp) <= Date.now());
    assert(Date.parse(savedActivity.timestamp) >= startedAt && Date.parse(savedActivity.timestamp) <= Date.now());
    assert(savedAudit && Object.keys(savedAudit).every(key =>
      ['id', 'timestamp', 'actorName', 'actorRole', 'actorAccountId', 'action', 'category', 'details', 'ipAddress', 'severity'].includes(key)));
    assert(savedActivity && Object.keys(savedActivity).every(key =>
      ['id', 'timeStr', 'timestamp', 'actor', 'actorAccountId', 'text', 'actionType', 'ticketNumber'].includes(key)));
    assert(!('actor' in savedAudit) && !('unknownField' in savedAudit));
    assert(!('actorName' in savedActivity) && !('unknownField' in savedActivity));
    assert.deepEqual(saved.auditLogs.find((entry: any) => entry.id === oldAudit.id), oldAudit);
    assert.deepEqual(saved.systemActivities.find((entry: any) => entry.id === oldActivity.id), oldActivity);
  });
  await check('new audit/activity string limits: boundaries accepted, excess rejected with 400', async () => {
    const before = await state();
    const audit = {
      id: 'ZZ-TEST-audit-boundary', action: 'x'.repeat(200), category: 'x'.repeat(200),
      severity: 'x'.repeat(200), ipAddress: 'x'.repeat(200), details: 'x'.repeat(2000),
    };
    for (const [field, maximum] of Object.entries({ action: 200, category: 200, severity: 200, ipAddress: 200, details: 2000 })) {
      const response = await request('superadmin', '/api/state/auditLogs', 'PUT', {
        version: before._versions.auditLogs, payload: [{ ...audit, [field]: 'x'.repeat(maximum + 1) }],
      });
      assert.equal(response.status, 400, `Oversized ${field} must be rejected`);
      assert(response.body.error.includes(field) && response.body.error.includes(String(maximum)));
    }
    const activity = { id: 'ZZ-TEST-activity-boundary', actionType: 'setting_updated', text: 'x'.repeat(2000) };
    const oversizedText = await request('superadmin', '/api/state/systemActivities', 'PUT', {
      version: before._versions.systemActivities, payload: [{ ...activity, text: 'x'.repeat(2001) }],
    });
    assert.equal(oversizedText.status, 400);
    assert(oversizedText.body.error.includes('text') && oversizedText.body.error.includes('2000'));
    const unchanged = await state();
    assert.deepEqual(unchanged.auditLogs, before.auditLogs);
    assert.deepEqual(unchanged.systemActivities, before.systemActivities);
    assert.equal((await request('receiver', '/api/state/auditLogs', 'PUT', {
      version: before._versions.auditLogs, payload: [audit],
    })).status, 200);
    assert.equal((await request('receiver', '/api/state/systemActivities', 'PUT', {
      version: before._versions.systemActivities, payload: [activity],
    })).status, 200);
    const saved = await state();
    assert.equal(saved.auditLogs.find((entry: any) => entry.id === audit.id).actorName, 'ZZ-TEST-receiver');
    assert.equal(saved.auditLogs.find((entry: any) => entry.id === audit.id).actorRole, 'Receiver / Releasing');
    assert.equal(saved.systemActivities.find((entry: any) => entry.id === activity.id).actor, 'ZZ-TEST-receiver');
  });
  await check('non-stage ticket fields remain saveable while stage, status, and history remain blocked', async () => {
    const current = await state();
    const original = current.tickets.find((entry: any) => entry.id === 'ZZ-TEST-receiver');
    assert(original);
    const save = (changes: Record<string, unknown>) => request('superadmin', '/api/state/tickets', 'PUT', {
      payload: current.tickets.map((entry: any) => entry.id === original.id ? { ...entry, ...changes } : entry),
      version: current._versions.tickets,
    });
    for (const changes of [
      { stage: 'completed' }, { status: 'completed' },
      { timelineHistory: [...original.timelineHistory, { stage: 'completed', title: 'ZZ-TEST-forged' }] },
    ]) {
      assert.equal((await save(changes)).status, 403);
    }
    const editable = await save({ priority: 'Urgent', releaseLocation: 'ZZ-TEST-release-location' });
    assert.equal(editable.status, 200);
    assert.equal(editable.body.payload.find((entry: any) => entry.id === original.id).priority, 'Urgent');
    assert.equal(editable.body.payload.find((entry: any) => entry.id === original.id).releaseLocation, 'ZZ-TEST-release-location');
  });
  await check('old-clock non-stage edits apply, including release data, requirements, and internal notes', async () => {
    const before = await state();
    const original = before.tickets.find((entry: any) => entry.id === 'ZZ-TEST-receiver');
    const note = {
      id: 'ZZ-TEST-old-clock-note', ticketId: original.id, author: 'ZZ-TEST-receiver', authorRole: 'Receiver',
      note: 'ZZ-TEST-old-clock-note', timestamp: '1990-01-01T00:00:00.000Z',
    };
    const startedAt = Date.now();
    const response = await saveTicketFields('receiver', 'receiver', {
      updatedAt: '1990-01-01T00:00:00.000Z', releaseLocation: 'ZZ-TEST-old-clock-release',
      estimatedReleaseDate: 'ZZ-TEST-old-clock-estimate', claimingRequirements: ['ZZ-TEST-requirement'],
      internalNotes: [...original.internalNotes, note],
    }, before);
    assert.equal(response.status, 200);
    const saved = response.body.payload.find((entry: any) => entry.id === original.id);
    assert.equal(saved.releaseLocation, 'ZZ-TEST-old-clock-release');
    assert.equal(saved.estimatedReleaseDate, 'ZZ-TEST-old-clock-estimate');
    assert.deepEqual(saved.claimingRequirements, ['ZZ-TEST-requirement']);
    assert(saved.internalNotes.some((entry: any) => entry.id === note.id));
    assert(Date.parse(saved.updatedAt) >= startedAt && Date.parse(saved.updatedAt) <= Date.now());
    assert.deepEqual(saved.timelineHistory, original.timelineHistory);
    assert.equal(saved.stage, original.stage);
    assert.equal(saved.status, original.status);
  });
  await check('2099 clock has no permanent priority; timestamp-only saves keep ticket time', async () => {
    const startedAt = Date.now();
    const future = await saveTicketFields('superadmin', 'receiver', {
      updatedAt: '2099-01-01T00:00:00.000Z', releaseLocation: 'ZZ-TEST-future-clock-release',
    });
    assert.equal(future.status, 200);
    const futureSaved = future.body.payload.find((entry: any) => entry.id === 'ZZ-TEST-receiver');
    assert(Date.parse(futureSaved.updatedAt) >= startedAt && Date.parse(futureSaved.updatedAt) <= Date.now());
    const subsequent = await saveTicketFields('receiver', 'receiver', {
      updatedAt: '1990-01-01T00:00:00.000Z', releaseLocation: 'ZZ-TEST-after-future-release',
    });
    assert.equal(subsequent.status, 200);
    const saved = subsequent.body.payload.find((entry: any) => entry.id === 'ZZ-TEST-receiver');
    assert.equal(saved.releaseLocation, 'ZZ-TEST-after-future-release');
    const timestampOnly = await saveTicketFields('receiver', 'receiver', { updatedAt: '2099-01-01T00:00:00.000Z' });
    assert.equal(timestampOnly.status, 200);
    assert.deepEqual(timestampOnly.body.payload.find((entry: any) => entry.id === saved.id), saved);
  });
  await check('non-stage saves retain officer access, immutable identity, message, and assignment guards', async () => {
    const before = await state();
    for (const [changes, expected] of [
      [{ id: 'ZZ-TEST-forged-id' }, 400], [{ studentId: '90000002' }, 400],
      [{ ticketNumber: 'ZZ-TEST-forged-number' }, 400],
      [{ messages: [{ id: 'ZZ-TEST-forged-message', message: 'ZZ-TEST-forged' }] }, 403],
      [{ assignedTo: 'ZZ-TEST-no-active-staff' }, 400],
    ] as [Record<string, unknown>, number][]) {
      assert.equal((await saveTicketFields('superadmin', 'receiver', changes, before)).status, expected);
    }
    assert.equal((await saveTicketFields('records_management', 'receiver', { releaseLocation: 'ZZ-TEST-forbidden' }, before)).status, 403);
    assert.deepEqual((await state()).tickets, before.tickets);
  });
  await check('two sessions saving from the same resource version: second gets 409', async () => {
    const before = await state();
    const first = await saveTicketFields('superadmin', 'receiver', { releaseLocation: 'ZZ-TEST-first-session' }, before);
    assert.equal(first.status, 200);
    const second = await saveTicketFields('receiver', 'receiver', { releaseLocation: 'ZZ-TEST-second-session' }, before);
    assert.equal(second.status, 409);
    assert.equal((await state()).tickets.find((entry: any) => entry.id === 'ZZ-TEST-receiver').releaseLocation, 'ZZ-TEST-first-session');
  });
  await check('state-save bypass, stale updates, audit spoof and transactional rollback', async () => {
    let data = await state();
    const payload = data.tickets.map((t: any) => t.id === 'ZZ-TEST-receiver' ? { ...t, stage: 'completed', status: 'completed' } : t);
    assert.equal((await request('superadmin', '/api/state/tickets', 'PUT', { payload, version: data._versions.tickets })).status, 403);
    const current = data.tickets.find((t: any) => t.id === 'ZZ-TEST-receiver');
    assert.equal((await request('receiver', `/api/tickets/${current.id}/workflow`, 'POST', {
      action: 'stage', targetStage: 'processing', expectedUpdatedAt: 'ZZ-TEST-stale', operationId: `ZZ-TEST-${randomUUID()}`,
    })).status, 409);
    assert.equal((await request('superadmin', '/api/state/auditLogs', 'PUT', {
      payload: [{ id: 'ZZ-TEST-forged', action: 'WORKFLOW_STAGE' }], version: data._versions.auditLogs,
    })).status, 403);
    // Fail evidence storage deliberately. The HTTP request must roll back everything.
    const savedAuditLogs = data.auditLogs;
    await pool.query("UPDATE registrack_data SET payload = '{}' WHERE key='auditLogs'");
    const failed = await workflow('receiver', 'receiver', 'stage', { targetStage: 'processing' }, 500);
    data = await state();
    assert.deepEqual(data.tickets, failed.before.tickets);
    assert.deepEqual(data.notifications, failed.before.notifications);
    await pool.query("UPDATE registrack_data SET payload = $1 WHERE key='auditLogs'", [JSON.stringify(savedAuditLogs)]);
  });
  await check('administrative reopen, Ready-gated Force Close, restore and cold archive', async () => {
    await workflow('registrar', 'receiver', 'force_close', { notes: 'ZZ-TEST-close', confirmed: true }, 400);
    await workflow('registrar', 'ready', 'reopen', { notes: 'ZZ-TEST-reopen' }, 400);
    await workflow('registrar', 'ready', 'reopen', { notes: 'ZZ-TEST-reopen', confirmed: true });
    await workflow('registrar', 'ready', 'stage', { targetStage: 'for_seal' });
    await workflow('registrar', 'ready', 'stage', { targetStage: 'ready' });
    await workflow('registrar', 'ready', 'force_close', { notes: 'ZZ-TEST-close', confirmed: true });
    const deleted = await request('receiver', '/api/tickets/ZZ-TEST-receiver/delete', 'POST', { reason: 'ZZ-TEST-delete' });
    assert.equal(deleted.status, 200);
    const history = (await state()).deletedRequestsHistory.find((r: any) => r.ticketId === 'ZZ-TEST-receiver');
    const restored = await request('receiver', `/api/tickets/${history.id}/restore`, 'POST');
    assert.equal(restored.status, 200);
    assert.equal(restored.body.ticket.stage, history.ticketSnapshot.stage);
    const archived = await request('registrar', '/api/archive-completed', 'POST', {});
    assert.equal(archived.status, 200);
    const data = await state();
    assert(!data.tickets.some((t: any) => t.id === 'ZZ-TEST-ready'));
    const completed = data.completedRequestsHistory.find((r: any) => r.ticketId === 'ZZ-TEST-ready');
    assert(completed.ticketSnapshot.timelineHistory.some((event: any) => event.action === 'reopen'));
    for (const id of ['legacy-completed-status', 'legacy-completed-stage']) {
      const original = fixtureTickets.find(entry => entry.id === `ZZ-TEST-${id}`)!;
      const snapshot = data.completedRequestsHistory.find((entry: any) => entry.ticketId === original.id).ticketSnapshot;
      assert.equal(snapshot.stage, original.stage);
      assert.equal(snapshot.status, original.status);
      assert(!data.tickets.some((entry: any) => entry.id === original.id));
    }
  });
  await check('backup recovery records intentional stage changes', async () => {
    const data = await state();
    const changed = data.tickets.map((t: any) => t.id === 'ZZ-TEST-receiver' ? { ...t, stage: 'ready', status: 'processing' } : t);
    const response = await request('registrar', '/api/state/restore-backup', 'POST', { backup: { tickets: changed } });
    assert.equal(response.status, 200, JSON.stringify(response.body));
    const after = await state();
    assert(after.auditLogs.some((log: any) => log.action === 'WORKFLOW_BACKUP_RESTORE'));
    assert.equal(after.tickets.find((t: any) => t.id === 'ZZ-TEST-receiver').timelineHistory.at(-1).action, 'backup_restore');
  });
  await check('all Registrar Officer accounts can manage accounts; automatic login opens the privileged portal', async () => {
    const password = `ZZ-TEST-${randomUUID()}`;
    const created = await request('registrar', '/api/users', 'POST', { user: {
      name: 'ZZ-TEST-second-registrar', email: 'second-registrar@zz-test.invalid', password,
      role: 'registrar', status: 'active', departmentOrOffice: 'ZZ-TEST-office',
    } });
    assert.equal(created.status, 201);
    const id = created.body.user.id;
    const login = await request('registrar', '/api/login', 'POST', {
      role: 'auto', identifier: 'ZZ-TEST-second-registrar', password,
    });
    assert.equal(login.status, 200);
    assert.equal(login.body.user.role, 'superadmin');
    assert.equal(login.body.user.adminRoleTitle, 'Registrar Officer');
    assert.equal(login.body.user.staffRole, 'registrar');
    assert.deepEqual(login.body.user.permissions, ['all']);
    const token = createSessionToken();
    await pool.query('INSERT INTO registrack_sessions VALUES ($1,$2,now()+interval \'1 hour\')', [hashSessionToken(token), id]);
    cookies.set('second_registrar', `registrack_session=${token}`);
    assert.equal((await request('second_registrar', '/api/users/ZZ-TEST-staff', 'PUT', {
      updates: { departmentOrOffice: 'ZZ-TEST-updated-office' },
    })).status, 200);
    const reset = await request('second_registrar', `/api/users/${id}/reset-password`, 'POST');
    assert.equal(reset.status, 200);
    assert.equal(typeof reset.body.password, 'string');
    assert.equal((await request('registrar', '/api/login', 'POST', {
      role: 'auto', identifier: 'ZZ-TEST-second-registrar', password: reset.body.password,
    })).status, 200);
    assert.equal((await request('registrar', `/api/users/${id}`, 'DELETE')).status, 200);
    assert.equal((await request('second_registrar', '/api/state')).status, 401);
  });
  await check('Registrar Officers can save every administrative resource and bypass maintenance intake', async () => {
    for (const key of ['studentRecords', 'roles', 'requestCategories', 'systemSettings']) {
      const before = await state('registrar');
      const saved = await request('registrar', `/api/state/${key}`, 'PUT', {
        payload: before[key], version: before._versions[key],
      });
      assert.equal(saved.status, 200, `Registrar Officer can save ${key}`);
      assert.deepEqual(saved.body.payload, before[key]);
    }
    const before = await state('registrar');
    assert.equal((await request('registrar', '/api/state/systemSettings', 'PUT', {
      payload: { ...before.systemSettings, maintenanceMode: true }, version: before._versions.systemSettings,
    })).status, 200);
    assert.equal((await request('receiver', '/api/tickets', 'POST', { ticket: {
      ...ticket('maintenance-blocked', 'receiver'), assignedTo: 'ZZ-TEST-receiver',
    } })).status, 503);
    assert.equal((await request('registrar', '/api/tickets', 'POST', { ticket: {
      ...ticket('maintenance-registrar', 'receiver'), assignedTo: 'ZZ-TEST-receiver',
    } })).status, 201);
    const after = await state('registrar');
    assert.equal((await request('registrar', '/api/state/systemSettings', 'PUT', {
      payload: { ...after.systemSettings, maintenanceMode: false }, version: after._versions.systemSettings,
    })).status, 200);
  });
  await check('other staff and students cannot use Registrar Officer-only API features', async () => {
    for (const role of ['receiver', 'records_management', 'evaluator', 'admin', 'staff', 'student']) {
      const boot = await request(role, '/api/bootstrap');
      assert.equal(boot.body.user.role, role === 'student' ? 'student' : 'admin');
      assert(!boot.body.user.permissions?.includes('all'));
      for (const [path, method, body] of [
        ['/api/users', 'POST', { user: {} }],
        ['/api/users/ZZ-TEST-registrar', 'PUT', { updates: { role: 'receiver' } }],
        ['/api/users/ZZ-TEST-registrar', 'DELETE', {}],
        ['/api/users/ZZ-TEST-registrar/reset-password', 'POST', {}],
        ['/api/archive-completed', 'POST', {}],
        ['/api/state/restore-backup', 'POST', { backup: { tickets: [] } }],
      ] as const) assert.equal((await request(role, path, method, body)).status, 403, `${role}: ${path}`);
      for (const key of ['studentRecords', 'roles', 'requestCategories', 'systemSettings']) {
        const before = await state('registrar');
        assert.equal((await request(role, `/api/state/${key}`, 'PUT', {
          payload: before[key], version: before._versions[key],
        })).status, 403, `${role}: ${key}`);
      }
    }
  });
  await check('the last active Registrar Officer cannot be demoted, deactivated or deleted', async () => {
    await pool.query("UPDATE registrack_accounts SET status='inactive' WHERE id='ZZ-TEST-superadmin'");
    for (const updates of [{ role: 'receiver' }, { status: 'inactive' }]) {
      assert.equal((await request('registrar', '/api/users/ZZ-TEST-registrar', 'PUT', { updates })).status, 400);
    }
    assert.equal((await request('registrar', '/api/users/ZZ-TEST-registrar', 'DELETE')).status, 400);
    await pool.query("UPDATE registrack_accounts SET status='active' WHERE id='ZZ-TEST-superadmin'");
  });
  console.info(`${checks} API check groups passed. Only isolated ZZ-TEST records were used.`);
} finally {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  await pool.end();
}