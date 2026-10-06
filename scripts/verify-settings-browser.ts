import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright-core';
import { pool } from '../server/database';

type BrowserFixture = {
  base: string;
  password: string;
  names: { registrar: string; a: string; b: string; receiver: string };
  profiles: { id: string; studentId: string; name: string; email: string }[];
  initialSettings: { schoolCode: string; academicYear: string; semester: string };
  check: (name: string, work: () => Promise<void>) => Promise<void>;
};

export async function verifySettingsBrowser({ base, password, names, profiles, initialSettings, check }: BrowserFixture) {
  const browser = await chromium.launch({ executablePath: '/repl/tools/bin/chromium', headless: true, args: ['--no-sandbox'] });
  const studentContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const studentPage = await studentContext.newPage();
  const registrarContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const registrarPage = await registrarContext.newPage();
  const receiverContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const receiverPage = await receiverContext.newPage();
  const errors: string[] = [];
  for (const page of [studentPage, registrarPage, receiverPage]) page.on('pageerror', (error) => errors.push(error.message));
  const login = async (page: Page, name: string) => {
    // Remote fonts/images must not delay verification of an already-interactive app.
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.locator('#privacy-consent-checkbox').check();
    await page.locator('#login-identifier-input').fill(name);
    await page.locator('#login-password-input').fill(password);
    await page.locator('#btn-login-submit').click();
    await page.locator('#login-identifier-input').waitFor({ state: 'hidden' });
  };
  const waitValue = async (key: string, value: unknown) => {
    for (let i = 0; i < 50; i++) {
      const settings = (await pool.query("SELECT payload FROM registrack_data WHERE key='systemSettings'")).rows[0].payload;
      if (settings[key] === value) return;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.fail(`ZZ-TEST saved setting ${key} did not persist`);
  };
  const settingField = (label: string) => registrarPage.locator('label')
    .filter({ hasText: new RegExp(`^${label}$`) }).locator('..').locator('input');
  const assertInfo = async (page: Page, expected: BrowserFixture['initialSettings']) => {
    const section = page.getByRole('region', { name: 'Current institution information' });
    await section.waitFor({ state: 'visible' });
    for (const key of ['schoolCode', 'academicYear', 'semester'] as const) {
      await section.getByText(expected[key], { exact: true }).waitFor();
    }
  };
  const assertWidth = async (page: Page, label: string) => {
    const widths = await page.evaluate(() => ({
      viewport: window.innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth,
    }));
    console.log(`ZZ-TEST ${label} widths ${JSON.stringify(widths)}`);
    assert(widths.document <= widths.viewport && widths.body <= widths.viewport);
  };
  try {
    await check('browser login has no student signup button or registration form', async () => {
      await studentPage.goto(base, { waitUntil: 'domcontentloaded' });
      await studentPage.locator('#login-identifier-input').waitFor();
      assert.equal(await studentPage.getByRole('button', { name: /Create student account/i }).count(), 0);
      assert.equal(await studentPage.locator('#registration-student-id').count(), 0);
      await assertWidth(studentPage, 'login');
      await studentPage.screenshot({ path: '/tmp/zztest-settings-login-390.png' });
    });
    await check('browser Receiver creates an existing student account without changing official records', async () => {
      await pool.query("UPDATE registrack_accounts SET status='active' WHERE id='ZZ-TEST-receiver'");
      await login(receiverPage, names.receiver);
      await receiverPage.locator('#nav-admin-submit-ticket').click();
      await receiverPage.locator('#staff-student-account-open').click();
      await receiverPage.locator('#staff-student-record-select').selectOption(profiles[1].id);
      assert.equal(await receiverPage.locator(`#staff-student-record-select option[value="${profiles[0].id}"]`).count(), 0,
        'Existing login account must not be offered again');
      assert.equal(await receiverPage.locator(`#staff-student-record-select option[value="${profiles[3].id}"]`).count(), 0,
        'Archived record must not be offered');
      await receiverPage.locator('#staff-student-password').fill(password);
      await receiverPage.locator('#staff-student-confirm-password').fill(`${password}-different`);
      await receiverPage.locator('#staff-student-account-submit').click();
      await receiverPage.getByText('Password and confirmation do not match.', { exact: true }).waitFor();
      await receiverPage.locator('#staff-student-confirm-password').fill(password);
      await assertWidth(receiverPage, 'staff-account-modal');
      const before = JSON.stringify((await pool.query("SELECT payload,version FROM registrack_data WHERE key='studentRecords'")).rows);
      const created = receiverPage.waitForResponse((response) => response.url().endsWith('/api/users') && response.request().method() === 'POST');
      await receiverPage.locator('#staff-student-account-submit').click();
      assert.equal((await created).status(), 201);
      await receiverPage.locator('#staff-student-account-success-close').waitFor();
      assert((await receiverPage.getByRole('dialog').innerText()).includes(profiles[1].name));
      assert.equal(await receiverPage.locator('#staff-student-password').count(), 0);
      assert.equal(JSON.stringify((await pool.query("SELECT payload,version FROM registrack_data WHERE key='studentRecords'")).rows), before);
      await receiverPage.screenshot({ path: '/tmp/zztest-settings-staff-account-390.png' });
      await receiverPage.locator('#staff-student-account-success-close').click();
    });
    await check('browser student account created by staff logs in and sees the current institution profile', async () => {
      await login(studentPage, profiles[1].name);
      await studentPage.locator('button[title^="Click to view profile"]').click();
      await assertInfo(studentPage, initialSettings);
      await assertWidth(studentPage, 'student-profile');
      assert.equal(await studentPage.locator('#staff-student-account-open').count(), 0);
      await studentPage.screenshot({ path: '/tmp/zztest-settings-profile-390.png' });
    });
    const changed = { schoolCode: 'ZZ-TEST-NEW-CODE', academicYear: 'ZZ-TEST-NEW-YEAR', semester: 'ZZ-TEST-NEW-TERM' };
    await check('browser Registrar retains student-account creation and saves institution settings', async () => {
      await login(registrarPage, names.registrar);
      await registrarPage.locator('#superadmin-nav-students').click();
      await assertInfo(registrarPage, initialSettings);
      await registrarPage.getByRole('button', { name: /Register New Student Profile/i }).waitFor();
      await registrarPage.locator('#superadmin-nav-settings').click();
      assert.equal(await registrarPage.getByText('Saved only - not used yet', { exact: true }).count(), 0);
      assert.equal(await registrarPage.getByText('Open Student Self-Registration', { exact: true }).count(), 0);
      await registrarPage.getByText('Student Account Creation', { exact: true }).waitFor();
      await settingField('Institutional Code').fill(changed.schoolCode);
      await settingField('Academic Year').fill(changed.academicYear);
      await settingField('Semester / Term').fill(changed.semester);
      await registrarPage.getByRole('button', { name: 'Save System Parameters', exact: true }).click();
      await waitValue('semester', changed.semester);
      await registrarPage.reload({ waitUntil: 'domcontentloaded' });
      await registrarPage.locator('#superadmin-nav-settings').click();
      assert.equal(await settingField('Institutional Code').inputValue(), changed.schoolCode);
      assert.equal(await settingField('Academic Year').inputValue(), changed.academicYear);
      assert.equal(await settingField('Semester / Term').inputValue(), changed.semester);
    });
    await check('browser institution changes appear for staff and students without record edits', async () => {
      await registrarPage.locator('#superadmin-nav-students').click();
      await assertInfo(registrarPage, changed);
      await studentPage.reload({ waitUntil: 'domcontentloaded' });
      await studentPage.locator('button[title^="Click to view profile"]').click();
      await assertInfo(studentPage, changed);
      await registrarPage.screenshot({ path: '/tmp/zztest-settings-records.png' });
    });
    await check('browser intake preserves automatic routing and manual staff selections', async () => {
      await receiverPage.setViewportSize({ width: 1280, height: 900 });
      for (const [selected, expected] of [['Unassigned', names.receiver], [names.a, names.a]]) {
        await receiverPage.locator('#nav-admin-submit-ticket').click();
        await receiverPage.getByPlaceholder('Enter student full name', { exact: true }).fill(profiles[1].name);
        await receiverPage.getByPlaceholder('Enter 8-digit student ID', { exact: true }).fill(profiles[1].studentId);
        await receiverPage.getByPlaceholder('Enter requested document type', { exact: true }).fill('TOR');
        await receiverPage.getByPlaceholder('Enter the student’s intended purpose', { exact: true }).fill('ZZ-TEST-purpose');
        await receiverPage.locator('select').filter({ has: receiverPage.locator('option[value="Unassigned"]') }).selectOption(selected);
        const posted = receiverPage.waitForResponse((response) => response.url().endsWith('/api/tickets') && response.request().method() === 'POST');
        await receiverPage.getByRole('button', { name: 'Generate Support Ticket & Send to Student', exact: true }).click();
        const response = await posted;
        assert.equal(response.status(), 201);
        assert.equal((await response.json()).ticket.assignedTo, expected);
        await receiverPage.reload({ waitUntil: 'domcontentloaded' });
      }
    });
    await check('browser Evaluator has no student-account creation entry', async () => {
      const restrictedContext = await browser.newContext();
      const page = await restrictedContext.newPage();
      await login(page, names.a);
      assert.equal(await page.locator('#nav-admin-submit-ticket').count(), 0);
      assert.equal(await page.locator('#staff-student-account-open').count(), 0);
      await restrictedContext.close();
    });
    await check('browser has no uncaught application errors', async () => assert.deepEqual(errors, []));
  } finally {
    await browser.close();
  }
}
