import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { AppNotification } from '../context/HelpdeskContext';
import { getNotificationsForAccount, markNotificationReadForAccount } from './studentNotifications';

const student = { role: 'student' as const, studentId: '20231492' };
const otherStudent = { role: 'student' as const, studentId: '20224891' };
const officer = { role: 'admin' as const };
const registrar = { role: 'superadmin' as const };
const tickets = [
  { ticketNumber: 'OWN', studentId: student.studentId },
  { ticketNumber: 'OTHER', studentId: otherStudent.studentId },
];
const notification = (overrides: Partial<AppNotification> = {}): AppNotification => ({
  id: 'update',
  title: 'Status Update',
  message: 'Document processing',
  timestamp: 'Oct 1, 2026',
  exactTime: '08:00 AM',
  dateStr: 'Oct 1, 2026',
  read: false,
  ticketNumber: 'OWN',
  type: 'status_update',
  ...overrides,
});

test('students see only their own legacy request updates', () => {
  const feed = [notification(), notification({ id: 'other', ticketNumber: 'OTHER' })];
  assert.deepEqual(getNotificationsForAccount(feed, student, tickets).map(n => n.id), ['update']);
  assert.deepEqual(getNotificationsForAccount(feed, otherStudent, tickets).map(n => n.id), ['other']);
});

test('officer-only alerts remain hidden even on the student’s own ticket', () => {
  assert.deepEqual(getNotificationsForAccount([
    notification({ audience: 'officer' }),
    notification({ id: 'legacy-chat', title: 'New Student Message on #OWN', type: 'chat_message' }),
    notification({ id: 'legacy-private', title: 'Request Deleted: OWN' }),
  ], student, tickets), []);
});

test('legacy registrar replies are visible to the owning student only', () => {
  for (const title of ['Registrar Message Received', 'Registrar Admin Replied: #OWN', 'Registrar Auto-Reply: #OWN']) {
    const feed = [notification({ title, type: 'chat_message' })];
    assert.equal(getNotificationsForAccount(feed, student, tickets).length, 1);
    assert.equal(getNotificationsForAccount(feed, otherStudent, tickets).length, 0);
  }
});

test('unscoped broadcasts, unknown tickets and unknown chat direction are hidden', () => {
  const feed = [
    notification({ type: 'announcement', ticketNumber: undefined }),
    notification({ id: 'unknown-ticket', ticketNumber: 'UNKNOWN' }),
    notification({ id: 'unknown-chat', type: 'chat_message', title: 'System message' }),
  ];
  assert.deepEqual(getNotificationsForAccount(feed, student, tickets), []);
});

test('explicit account updates use exact recipient IDs, including after ticket removal', () => {
  const feed = [notification({ audience: 'student', recipientStudentId: student.studentId })];
  assert.equal(getNotificationsForAccount(feed, student, []).length, 1);
  assert.equal(getNotificationsForAccount(feed, otherStudent, []).length, 0);
});

test('a recipient conflicting with current ticket ownership cannot expose another request', () => {
  assert.deepEqual(getNotificationsForAccount([
    notification({ recipientStudentId: student.studentId, ticketNumber: 'OTHER' }),
  ], student, tickets), []);
});

test('unauthenticated or unidentified students get no notifications', () => {
  assert.deepEqual(getNotificationsForAccount([notification()], null, tickets), []);
  assert.deepEqual(getNotificationsForAccount([notification()], { role: 'student' }, tickets), []);
});

test('officer and registrar lists remain unchanged', () => {
  const feed = [notification(), notification({ audience: 'officer' })];
  assert.equal(getNotificationsForAccount(feed, officer, tickets), feed);
  assert.equal(getNotificationsForAccount(feed, registrar, tickets), feed);
});

test('student read state is independent from officer read state and persists in the data', () => {
  const feed = [notification()];
  const studentRead = markNotificationReadForAccount(feed, 'update', student, tickets);
  assert.equal(studentRead[0].read, false);
  assert.equal(getNotificationsForAccount(studentRead, student, tickets)[0].read, true);
  assert.equal(getNotificationsForAccount(studentRead, officer, tickets)[0].read, false);
  assert.equal(getNotificationsForAccount(JSON.parse(JSON.stringify(studentRead)), student, tickets)[0].read, true);
  const officerRead = markNotificationReadForAccount(feed, 'update', officer, tickets);
  assert.equal(officerRead[0].read, true);
  assert.equal(getNotificationsForAccount(officerRead, student, tickets)[0].read, false);
});

test('student cannot mark other students’ or officer-only notifications read', () => {
  const feed = [notification({ ticketNumber: 'OTHER' }), notification({ id: 'officer', audience: 'officer' })];
  assert.deepEqual(markNotificationReadForAccount(feed, 'update', student, tickets), feed);
  assert.deepEqual(markNotificationReadForAccount(feed, 'officer', student, tickets), feed);
});

test('marking an update twice does not duplicate student read markers', () => {
  const once = markNotificationReadForAccount([notification()], 'update', student, tickets);
  const twice = markNotificationReadForAccount(once, 'update', student, tickets);
  assert.deepEqual(twice[0].readByStudentIds, [student.studentId]);
});