import assert from 'node:assert/strict';
import { chromium, request } from 'playwright-core';
import { randomUUID } from 'node:crypto';

const baseURL = process.env.REGISTRACK_TEST_URL || 'http://127.0.0.1:5000';
const hostname = new URL(baseURL).hostname;
if (!['localhost', '127.0.0.1'].includes(hostname) && !hostname.endsWith('.replit.dev')) {
  throw new Error('Browser verification is restricted to development URLs, never published apps.');
}
const credential = process.env.REGISTRAR_BOOTSTRAP_PASSWORD;
if (!credential) throw new Error('Bootstrap secret must be configured.');
const name = `Browser Verification ${randomUUID().slice(0, 8)}`;
const studentPassword = randomUUID();
const studentId = '98990003';
const api = await request.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL } });
assert.equal((await api.post('/api/login', { data: {
  role: 'superadmin', identifier: 'Stevie Ray Rotulo', password: credential,
} })).status(), 200);
const baseline = await (await api.get('/api/state')).json();
assert.equal(baseline.users.length, 1);
assert.equal(baseline.studentRecords.length, 0);
const browser = await chromium.launch({
  executablePath: '/repl/tools/bin/chromium', headless: true, args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const failures: string[] = [];
page.on('response', response => {
  if (response.url().includes('/api/') && response.status() >= 400) failures.push(`${response.status()} ${new URL(response.url()).pathname}`);
});
page.on('pageerror', error => failures.push(error.message));
try {
  await page.goto(baseURL);
  assert.equal(await page.locator('[id^="tab-login-"]').count(), 0);
  await page.locator('#login-identifier-input').fill('Stevie Ray Rotulo');
  await page.locator('#login-password-input').fill(credential);
  await page.locator('#btn-login-submit').click();
  await page.getByText('Stevie Ray Rotulo', { exact: true }).first().waitFor();
  await page.getByText('Student Records', { exact: true }).click();
  await page.getByRole('button', { name: 'Register New Student Profile' }).click();
  const form = page.locator('form').last();
  await form.locator('input').nth(0).fill(studentId);
  await form.locator('input').nth(1).fill(name);
  await form.locator('input[type=email]').fill(`${randomUUID().slice(0, 8)}@verification.local`);
  await form.locator('#new-student-password').fill(studentPassword);
  await form.getByRole('button', { name: 'Save Student Record' }).click();
  await page.getByText(name, { exact: true }).first().waitFor();
  await page.waitForTimeout(1500);
  assert.deepEqual(failures, [], 'Provisioning must not trigger stale-version or forbidden saves.');
  console.log('PASS: Registrar creates student through the existing UI with no save conflicts');
  const records = await (await api.get('/api/state')).json();
  assert(records.studentRecords.some((s: any) => s.studentId === studentId));
  await page.locator('#superadmin-logout-button').click();
  await page.locator('#login-identifier-input').fill(studentId);
  await page.locator('#login-password-input').fill(studentPassword);
  await page.locator('#btn-login-submit').click();
  await page.getByText(name, { exact: true }).first().waitFor();
  await page.locator('#nav-student-submit').click();
  await page.locator('form').last().locator('input[required]').first().fill('Browser verification request');
  await page.locator('textarea').first().fill('Development verification only.');
  for (const select of await page.locator('select[required]').all()) {
    if (!(await select.inputValue())) await select.selectOption({ index: 1 });
  }
  await page.locator('#submit-ticket-button').click();
  await page.getByText(/REG-\d{4}-\d{5}/).first().waitFor();
  await page.waitForTimeout(1500);
  assert.deepEqual(failures, [], 'A successful student submission must not trigger unauthorized audit writes.');
  const state = await (await api.get('/api/state')).json();
  assert.equal(state.tickets.length, 1);
  const body = await page.locator('body').innerText();
  assert(body.includes(state.tickets[0].ticketNumber));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  console.log('PASS: student submission confirms the persisted ticket and stays responsive on mobile');
} catch (error) {
  console.error('Visible buttons:', await page.locator('button:visible').allTextContents());
  console.error('API failures:', failures);
  console.error('Invalid controls:', await page.locator('input,select,textarea').evaluateAll(controls =>
    controls.filter(control => !(control as HTMLInputElement).validity.valid).map(control => ({
      id: control.id, message: (control as HTMLInputElement).validationMessage,
    })),
  ));
  throw error;
} finally {
  await browser.close();
  const state = await (await api.get('/api/state')).json();
  for (const user of state.users.filter((u: any) => u.name === name)) {
    assert.equal((await api.delete(`/api/users/${user.id}`)).status(), 200);
  }
  assert.equal((await api.post('/api/state/restore-backup', { data: { backup: baseline } })).status(), 200);
  await api.post('/api/logout');
  await api.dispose();
  console.log('Browser verification records removed.');
}