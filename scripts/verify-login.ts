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
}

try {
  const staff = await provision('receiver', staffPassword);
  const student = await provision('student', studentPassword, studentId);

  await verifyPortal(registrar.name, registrarPassword, 'superadmin', '#superadmin-logout-button');
  await verifyPortal(` ${registrar.email.toUpperCase()} `, registrarPassword, 'superadmin', '#superadmin-logout-button');
  await verifyPortal(staff.name, staffPassword, 'admin', '#nav-admin-dashboard');
  await verifyPortal(` ${staff.email.toUpperCase()} `, staffPassword, 'admin', '#nav-admin-dashboard');
  await verifyPortal(studentId, studentPassword, 'student', '#nav-student-track');
  await page.reload();
  await page.locator('#nav-student-track').waitFor();
  console.log('PASS: one form routes Registrar/staff username and email, and Student ID to the correct portals; sessions survive reload');

  await login(student.name, studentPassword, 401);
  await login(studentId, studentPassword);
  await login(student.email, studentPassword, 401);
  await login(registrar.email, registrarPassword);
  await login(staff.email, randomUUID(), 401);
  await login(registrar.name, registrarPassword);
  assert.equal((await api.put(`/api/users/${staff.id}`, { data: { updates: { status: 'suspended' } } })).status(), 200);
  await login(staff.name, staffPassword, 401);
  await login(registrar.name, registrarPassword);
  console.log('PASS: student name/email, wrong password, and suspended accounts are rejected');

  await page.request.post('/api/logout');
  await page.goto(baseURL);
  await page.locator('#login-identifier-input').fill(studentId);
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