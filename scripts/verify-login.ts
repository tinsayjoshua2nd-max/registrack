import assert from 'node:assert/strict';
import { randomUUID, randomInt } from 'node:crypto';
import { chromium, request } from 'playwright-core';
import { pool } from '../server/database';

// Development only. Never log credentials or restore/delete existing user data.
const baseURL = process.env.REGISTRACK_TEST_URL || 'http://127.0.0.1:5000';
const hostname = new URL(baseURL).hostname;
if (!['localhost', '127.0.0.1'].includes(hostname) && !hostname.endsWith('.replit.dev')) {
  throw new Error('Login verification is restricted to development URLs.');
}
const registrarPassword = process.env.REGISTRAR_BOOTSTRAP_PASSWORD;
if (!registrarPassword) throw new Error('Bootstrap secret is required.');
const api = await request.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL } });
const login = async (identifier: string, password: string, expected = 200) => {
  const response = await api.post('/api/login', { data: { identifier, password } });
  assert.equal(response.status(), expected);
  return response.json();
};
const { user: registrar } = await login('Stevie Ray Rotulo', registrarPassword);
const before = await (await api.get('/api/state')).json();
const createdIds: string[] = [];
const browser = await chromium.launch({
  executablePath: '/repl/tools/bin/chromium', headless: true, args: ['--no-sandbox'],
});
const context = await browser.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL } });
const page = await context.newPage();
const pageErrors: string[] = [];
let hotReloadWarnings = 0;
page.on('pageerror', error => {
  // The development proxy can reject Vite's hot-reload socket while normal
  // app requests work. Ignore only that developer-tool stack, not app errors.
  if (error.message === 'WebSocket closed without opened.' && error.stack?.includes('/@vite/client')) {
    hotReloadWarnings++;
    return;
  }
  pageErrors.push(error.message);
});
const staffPassword = randomUUID();
const studentPassword = randomUUID();
const suffix = randomUUID().slice(0, 8);
const studentId = String(randomInt(90_000_000, 99_000_000));
let trackingFixtureId = `tracking-verification-${suffix}`;
let trackingTicketNumber = '';
let fixtureStaffName = '';

async function provision(role: string, password: string, studentId?: string) {
  const response = await api.post('/api/users', { data: { user: {
    name: `Login Verification ${role} ${suffix}`, email: `${role}-${suffix}@verification.local`,
    role, status: 'active', password, studentId, departmentOrOffice: 'Verification',
    degreeProgram: role === 'student' ? 'Verification' : undefined,
    yearLevel: role === 'student' ? '1st Year' : undefined,
  } } });
  assert.equal(response.status(), 201);
  const { user } = await response.json();
  createdIds.push(user.id);
  return user;
}

async function verifyPortal(identifier: string, password: string, role: string, marker: string) {
  await page.request.post('/api/logout');
  await page.goto(baseURL);
  assert.equal(await page.locator('[id^="tab-login-"]').count(), 0);
  await page.locator('#login-identifier-input').fill(identifier);
  await page.locator('#login-password-input').fill(password);
  await page.locator('#btn-login-submit').click();
  await page.locator(marker).waitFor({ timeout: 15000 });
  const session = await (await page.request.get('/api/session')).json();
  assert.equal(session.user.role, role);
  if (role === 'student') {
    assert.equal(await page.locator('#nav-student-submit').count(), 0);
    assert.equal(await page.getByText('Submit a Request', { exact: true }).count(), 0);
    assert.equal(await page.locator('#submit-ticket-button').count(), 0);
    await page.getByText(trackingTicketNumber, { exact: true }).first().waitFor();
    const rejected = await page.request.post('/api/tickets', { data: { ticket: {
      id: `blocked-${randomUUID()}`, subject: 'Student submission must be blocked',
      description: 'Development authorization verification', category: 'Enrollment',
    } } });
    assert.equal(rejected.status(), 403);
  }
}

try {
  const staff = await provision('receiver', staffPassword);
  const student = await provision('student', studentPassword, studentId);
  fixtureStaffName = staff.name;
  const category = before.requestCategories.find((item: any) => item.active === true);
  assert(category, 'An active category is required for tracking verification.');
  await verifyPortal(staff.name, staffPassword, 'admin', '#nav-admin-dashboard');
  await page.locator('#nav-admin-submit-ticket').click();
  assert.equal(await page.getByText('Subject / Summary', { exact: false }).count(), 0);
  await page.getByPlaceholder('Enter student full name').fill(student.name);
  await page.getByPlaceholder('Enter 8-digit student ID', { exact: true }).fill(studentId);
  await page.getByPlaceholder('Enter email address', { exact: true }).fill(student.email);
  await page.locator('select').filter({ has: page.locator('option[value="TOR"]') }).selectOption(category.name);
  await page.locator('select').filter({ has: page.locator('option', { hasText: 'Select staff member' }) }).selectOption(staff.name);
  await page.getByPlaceholder('Enter the student’s intended purpose').fill('Temporary tracking verification');
  await page.getByPlaceholder('Add any specific evaluator findings, receipt numbers, or special instructions...').fill('Development-only verification');
  const recordFixture = (request: any) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/tickets') {
      const draft = request.postDataJSON()?.ticket;
      if (draft?.studentId === studentId) trackingFixtureId = draft.id;
    }
  };
  page.on('request', recordFixture);
  const pendingRequest = page.waitForResponse(response =>
    new URL(response.url()).pathname === '/api/tickets' && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Generate Support Ticket & Send to Student', exact: true }).click();
  const createdRequest = await pendingRequest;
  page.off('request', recordFixture);
  assert.equal(createdRequest.status(), 201);
  const generatedTicket = (await createdRequest.json()).ticket;
  trackingTicketNumber = generatedTicket.ticketNumber;
  assert(generatedTicket.subject.endsWith(' Request'));
  await page.getByText('Support Ticket Generated Successfully!', { exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Test Track in Student Account', exact: true }).count(), 0);
  assert.equal((await (await page.request.get('/api/session')).json()).user.role, 'admin');
  await page.screenshot({ path: '/tmp/registrack-staff-ticket-confirmation.png', fullPage: true });
  console.log('PASS: staff form generates a ticket without a Subject / Summary field; confirmation has no student test button and staff remains in the staff portal');
  await login(registrar.name, registrarPassword);

  await verifyPortal(registrar.name, registrarPassword, 'superadmin', '#superadmin-logout-button');
  await verifyPortal(` ${registrar.email.toUpperCase()} `, registrarPassword, 'superadmin', '#superadmin-logout-button');
  await verifyPortal(staff.name, staffPassword, 'admin', '#nav-admin-dashboard');
  assert.equal(await page.locator('#nav-admin-submit-ticket').count(), 1);
  await verifyPortal(` ${staff.email.toUpperCase()} `, staffPassword, 'admin', '#nav-admin-dashboard');
  await verifyPortal(` ${student.name.toUpperCase()} `, studentPassword, 'student', '#nav-student-track');
  await verifyPortal(student.name, studentId, 'student', '#nav-student-track');
  await page.reload();
  await page.locator('#nav-student-track').waitFor();
  await page.locator('#nav-student-faq').click();
  assert.equal(await page.getByText('Submit Request for this Topic', { exact: true }).count(), 0);
  await page.locator('#nav-student-track').click();
  await page.getByRole('button').filter({ hasText: trackingTicketNumber }).first().click();
  await page.getByRole('heading', { name: 'Live Request Status Portal', exact: true }).waitFor();
  await page.screenshot({ path: '/tmp/registrack-student-tracking.png', fullPage: true });
  console.log('PASS: staff can create requests; students can see and select them for tracking, have no submission controls, and direct student submissions are forbidden');
  console.log('PASS: one form routes staff/Registrar username and email, and student username with either Student ID or password; sessions survive reload');

  await login(student.name, studentId);
  const newStudentPassword = randomUUID();
  assert.equal((await api.post('/api/change-password', { data: {
    oldPassword: studentId, newPassword: newStudentPassword,
  } })).status(), 200);
  await login(student.name, studentPassword, 401);
  await login(student.name, newStudentPassword);
  await verifyPortal(student.name, newStudentPassword, 'student', '#nav-student-track');
  await login(studentId, newStudentPassword, 401);
  await login(student.name, studentId);
  await login(student.email, newStudentPassword, 401);
  await login(registrar.email, registrarPassword);
  await login(staff.email, randomUUID(), 401);
  await login(registrar.name, registrarPassword);
  await login(staff.email, studentId, 401);
  await login(registrar.name, registrarPassword);
  assert.equal((await api.put(`/api/users/${staff.id}`, { data: { updates: { status: 'suspended' } } })).status(), 200);
  await login(staff.name, staffPassword, 401);
  await login(registrar.name, registrarPassword);
  assert.equal((await api.put(`/api/users/${student.id}`, { data: { updates: { status: 'suspended' } } })).status(), 200);
  await login(student.name, studentId, 401);
  await login(registrar.name, registrarPassword);
  await login(student.name, newStudentPassword, 401);
  await login(registrar.name, registrarPassword);
  console.log('PASS: students can create a password using their Student ID; new password and ID both work, while wrong credentials and suspended accounts are rejected');

  await page.request.post('/api/logout');
  await page.goto(baseURL);
  await page.locator('#login-identifier-input').fill(student.name);
  await page.locator('#login-password-input').fill(randomUUID());
  await page.getByRole('button', { name: 'Show password', exact: true }).click();
  assert.equal(await page.locator('#login-password-input').getAttribute('type'), 'text');
  await page.getByRole('button', { name: 'Hide password', exact: true }).click();
  assert.equal(await page.locator('#login-password-input').getAttribute('type'), 'password');
  await page.locator('#login-password-input').press('Enter');
  await page.getByRole('alert').waitFor();
  assert.equal((await (await page.request.get('/api/session')).json()).user, null);
  assert.equal(await page.locator('#btn-login-submit').isEnabled(), true);
  await login(registrar.name, registrarPassword);
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  }
  assert.deepEqual(pageErrors, []);
  if (hotReloadWarnings) console.log(`INFO: ${hotReloadWarnings} development hot-reload proxy warnings; no application errors`);
  console.log('PASS: visible login errors, keyboard submission, password visibility, and mobile fit');
} catch (error) {
  console.error('Login check failed:', error instanceof Error ? error.message : 'Unknown error.');
  console.error('Browser errors:', pageErrors);
  console.error('Page headings:', await page.locator('h1,h2').allTextContents());
  throw error;
} finally {
  await browser.close();
  await login(registrar.name, registrarPassword);
  // Remove only this test's request and its associated notification.
  await pool.query(
    `WITH fixture_numbers AS (
       SELECT entry->>'ticketNumber' AS number FROM registrack_data,
         jsonb_array_elements(payload) entry
       WHERE key = 'tickets' AND entry->>'id' = $1
     )
     UPDATE registrack_data SET payload = COALESCE((
       SELECT jsonb_agg(entry) FROM jsonb_array_elements(payload) entry
       WHERE CASE WHEN key = 'tickets' THEN entry->>'id' IS DISTINCT FROM $1
         WHEN key = 'auditLogs' THEN entry->>'actorName' IS DISTINCT FROM $2
         WHEN key = 'systemActivities' THEN entry->>'actor' IS DISTINCT FROM $2
         ELSE entry->>'ticketNumber' IS NULL OR entry->>'ticketNumber' NOT IN
           (SELECT number FROM fixture_numbers) END
     ), '[]'::jsonb), version = version + 1
     WHERE key IN ('tickets', 'notifications', 'auditLogs', 'systemActivities')`,
    [trackingFixtureId, fixtureStaffName],
  );
  for (const id of createdIds.reverse()) {
    assert.equal((await api.delete(`/api/users/${id}`)).status(), 200);
  }
  // Account deletion intentionally retains profiles/deletion history. Remove
  // only the exact fixtures created here, without restoring any baseline data.
  await pool.query(
    `UPDATE registrack_data SET payload = COALESCE((
       SELECT jsonb_agg(entry) FROM jsonb_array_elements(payload) entry
       WHERE CASE WHEN key = 'studentRecords'
         THEN entry->>'studentId' IS DISTINCT FROM $1
         ELSE COALESCE(entry->>'id', '') <> ALL($2::text[]) END
     ), '[]'::jsonb), version = version + 1
     WHERE key IN ('studentRecords', 'deletedAccounts')`,
    [studentId, createdIds],
  );
  const after = await (await api.get('/api/state')).json();
  assert.deepEqual(after.users.map((user: any) => user.id).sort(), before.users.map((user: any) => user.id).sort());
  for (const key of ['tickets', 'notifications', 'studentRecords', 'deletedRequestsHistory', 'completedRequestsHistory']) {
    assert(JSON.stringify(after[key]) === JSON.stringify(before[key]), `${key} must preserve existing data.`);
  }
  await api.post('/api/logout');
  await api.dispose();
  await pool.end();
  console.log('PASS: temporary login accounts removed; existing accounts and request data preserved');
}