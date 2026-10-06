// Uses only the disposable ZZ-TEST database populated by verify-workflow-api.ts.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { pool } from '../server/database';
import { hashPassword } from '../server/security';

const target = new URL(process.env.DATABASE_URL || 'http://invalid');
assert.equal(target.hostname, '127.0.0.1');
assert.equal(target.port, '55439');
assert.equal(target.pathname, '/registrack_temp_zztest');
const baseURL = 'http://127.0.0.1:5001';
const browser = await chromium.launch({
  executablePath: '/repl/tools/bin/chromium', headless: true, args: ['--no-sandbox'],
});
const failures: string[] = [];
try {
  for (const role of ['registrar', 'superadmin']) {
    const password = `ZZ-TEST-${randomUUID()}`;
    await pool.query('UPDATE registrack_accounts SET password_hash=$1 WHERE id=$2', [
      await hashPassword(password), `ZZ-TEST-${role}`,
    ]);
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    page.on('pageerror', error => failures.push(error.message));
    page.on('response', response => {
      if (response.url().includes('/api/') && response.status() >= 400) {
        failures.push(`${response.status()} ${new URL(response.url()).pathname}`);
      }
    });
    await page.goto(baseURL);
    await page.locator('#privacy-consent-checkbox').check();
    await page.locator('#login-identifier-input').fill(`ZZ-TEST-${role}`);
    await page.locator('#login-password-input').fill(password);
    await page.locator('#btn-login-submit').click();
    await page.locator('#superadmin-logout-button').waitFor();
    for (const view of [
      'dashboard', 'users', 'tickets', 'students', 'request-history',
      'reports', 'announcements', 'settings', 'audit-logs', 'backup',
    ]) {
      await page.locator(`#superadmin-nav-${view}`).click();
      assert.equal(await page.getByText(/^Super\s*Admin(?:istrator)?s?$/i).count(), 0, `${view}: no old role label`);
      assert(!/\bSuper Admin(?:istrator)?\b/i.test(await page.locator('body').innerText()), `${view}: no old explanatory wording`);
    }
    await page.locator('#superadmin-nav-users').click();
    assert(await page.getByText('Registrar Officer', { exact: true }).count() > 0);
    await page.getByRole('button', { name: 'Registrar Officers', exact: true }).click();
    assert(await page.getByText('ZZ-TEST-registrar', { exact: true }).count() > 0);
    assert(await page.getByText('ZZ-TEST-superadmin', { exact: true }).count() > 0, 'Legacy privileged account shares the role filter');
    if (role === 'registrar') {
      await page.locator('#superadmin-nav-students').click();
      await page.getByRole('button', { name: 'Register New Student Profile' }).click();
      const form = page.locator('form').last();
      await form.locator('input').nth(0).fill('90000009');
      await form.locator('input').nth(1).fill('ZZ-TEST-browser-student');
      await form.locator('input[type=email]').fill('browser-student@zz-test.invalid');
      await form.locator('#new-student-password').fill(`ZZ-TEST-${randomUUID()}`);
      await form.getByRole('button', { name: 'Save Student Record' }).click();
      await page.getByText('ZZ-TEST-browser-student', { exact: true }).first().waitFor();
      const state = await (await context.request.get(`${baseURL}/api/state`)).json();
      assert(state.studentRecords.some((record: any) => record.studentId === '90000009'));
      assert(state.users.some((user: any) => user.studentId === '90000009'));
      console.info('PASS Registrar Officer creates a student through the real UI with canonical persisted data');
      await page.locator('#superadmin-nav-users').click();
      await mkdir('.local/verification', { recursive: true });
      await page.screenshot({ path: '.local/verification/registrar-officer-desktop.png' });
      await page.setViewportSize({ width: 402, height: 874 });
      assert((await page.evaluate(() => document.documentElement.scrollWidth)) <= 402, 'Phone layout does not overflow');
      await page.screenshot({ path: '.local/verification/registrar-officer-mobile.png' });
    }
    assert.deepEqual(failures, [], 'No API authorization/save errors or browser exceptions');
    console.info(`PASS ${role === 'registrar' ? 'Registrar Officer' : 'legacy privileged account'} login, all management screens, labels and role filter`);
    await context.close();
  }
} finally {
  await browser.close();
  await pool.end();
}
