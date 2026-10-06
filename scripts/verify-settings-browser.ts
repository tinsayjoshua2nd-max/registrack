import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright-core';
import { pool } from '../server/database';

type BrowserFixture = {
  base: string;
  password: string;
  names: { registrar: string; a: string; b: string; receiver: string };
  profiles: { studentId: string; name: string; email: string }[];
  initialSettings: { schoolCode: string; academicYear: string; semester: string };
  check: (name: string, work: () => Promise<void>) => Promise<void>;
};
export async function verifySettingsBrowser({ base, password, names, profiles, initialSettings, check }: BrowserFixture) {
  const browser = await chromium.launch({ executablePath: '/repl/tools/bin/chromium', headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const studentPage = await context.newPage();
  const registrarContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const registrarPage = await registrarContext.newPage();
  const errors: string[] = [];
  for (const page of [studentPage, registrarPage]) page.on('pageerror', (error) => errors.push(error.message));
  const visible = async (page: Page, selector: string) => page.locator(selector).waitFor({ state: 'visible' });
  const login = async (page: Page, name: string) => {
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await visible(page, '#privacy-consent-checkbox');
    await page.locator('#privacy-consent-checkbox').check();
    await page.locator('#login-identifier-input').fill(name);
    await page.locator('#login-password-input').fill(password);
    await page.locator('#btn-login-submit').click();
    await page.locator('#login-identifier-input').waitFor({ state: 'hidden' });
  };
  const settingsValue = async (key: string) =>
    (await pool.query("SELECT payload FROM registrack_data WHERE key='systemSettings'")).rows[0].payload[key];
  const waitValue = async (key: string, value: unknown) => {
    for (let i = 0; i < 50; i++) {
      if (await settingsValue(key) === value) return;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.fail(`ZZ-TEST saved setting ${key} did not persist`);
  };
  const settingField = (label: string) => registrarPage.locator('label')
    .filter({ hasText: new RegExp(`^${label}$`) }).locator('..').locator('input');
  const institution = (page: Page) => page.getByRole('region', { name: 'Current institution information' });
  const assertInfo = async (page: Page, expected: BrowserFixture['initialSettings']) => {
    const section = institution(page);
    await section.waitFor({ state: 'visible' });
    for (const value of [expected.schoolCode, expected.academicYear, expected.semester]) {
      await section.getByText(value, { exact: true }).waitFor();
    }
  };
  try {
    await check('browser signup requires privacy consent and matching password confirmation', async () => {
      await studentPage.goto(base, { waitUntil: 'domcontentloaded' });
      await studentPage.getByRole('button', { name: 'Create student account', exact: true }).click();
      const create = studentPage.getByRole('button', { name: 'Create account', exact: true });
      assert(await create.isDisabled());
      await studentPage.locator('#privacy-consent-checkbox').check();
      await studentPage.locator('#registration-student-id').fill(profiles[1].studentId);
      await studentPage.locator('#registration-email').fill(profiles[1].email);
      await studentPage.locator('#registration-password').fill(password);
      await studentPage.locator('#registration-confirm-password').fill(`${password}-different`);
      await create.click();
      await studentPage.getByText('Password and confirmation do not match.', { exact: true }).waitFor();
      await studentPage.locator('#registration-confirm-password').fill(password);
      await create.click();
      await studentPage.getByText('Student account created', { exact: true }).waitFor();
      assert(await studentPage.locator('#login-identifier-input').isVisible(), 'Signup must not auto-login');
      assert((await studentPage.getByRole('status').innerText()).includes(profiles[1].name));
      await studentPage.screenshot({ path: '/tmp/zztest-settings-signup-390.png', fullPage: true });
    });
    await check('browser student login and active profile show current institution values at 390px', async () => {
      await studentPage.getByRole('button', { name: 'Return to login', exact: true }).click();
      await studentPage.locator('#login-identifier-input').fill(profiles[1].name);
      await studentPage.locator('#login-password-input').fill(password);
      await studentPage.locator('#btn-login-submit').click();
      await studentPage.locator('#login-identifier-input').waitFor({ state: 'hidden' });
      await studentPage.locator('button[title^="Click to view profile"]').click();
      await assertInfo(studentPage, initialSettings);
      const widths = await studentPage.evaluate(() => ({
        viewport: window.innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth,
      }));
      console.log(`ZZ-TEST profile widths ${JSON.stringify(widths)}`);
      assert(widths.document <= widths.viewport && widths.body <= widths.viewport);
      assert.equal(await studentPage.getByRole('button', { name: /Submit a Request/i }).count(), 0);
      await studentPage.screenshot({ path: '/tmp/zztest-settings-profile-390.png', fullPage: true });
    });
    const changed = { schoolCode: 'ZZ-TEST-NEW-CODE', academicYear: 'ZZ-TEST-NEW-YEAR', semester: 'ZZ-TEST-NEW-TERM' };
    await check('browser Registrar saves and reloads institution settings with no saved-only badges', async () => {
      await login(registrarPage, names.registrar);
      await registrarPage.locator('#superadmin-nav-students').click();
      await assertInfo(registrarPage, initialSettings);
      await registrarPage.locator('#superadmin-nav-settings').click();
      assert.equal(await registrarPage.getByText('Saved only - not used yet', { exact: true }).count(), 0);
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
    await check('browser changed institution settings appear for students and staff without record edits', async () => {
      await registrarPage.locator('#superadmin-nav-students').click();
      await assertInfo(registrarPage, changed);
      await studentPage.reload({ waitUntil: 'domcontentloaded' });
      await studentPage.locator('button[title^="Click to view profile"]').click();
      await assertInfo(studentPage, changed);
      await registrarPage.screenshot({ path: '/tmp/zztest-settings-records.png', fullPage: true });
    });
    await check('browser registration switch hides signup and refreshes availability without signing in', async () => {
      await registrarPage.locator('#superadmin-nav-settings').click();
      const toggle = registrarPage.getByText('Open Student Self-Registration', { exact: true })
        .locator('xpath=../..').locator('input[type="checkbox"]');
      await toggle.uncheck();
      await registrarPage.getByRole('button', { name: 'Save System Parameters', exact: true }).click();
      await waitValue('allowStudentRegistration', false);
      const closedContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const closedPage = await closedContext.newPage();
      const availability = closedPage.waitForResponse((response) => response.url().endsWith('/api/registration-options'));
      await closedPage.goto(base, { waitUntil: 'domcontentloaded' });
      await availability;
      await closedPage.getByText('Checking student registration availability…', { exact: true }).waitFor({ state: 'hidden' });
      assert.equal(await closedPage.getByRole('button', { name: 'Create student account', exact: true }).count(), 0);
      await toggle.check();
      await registrarPage.getByRole('button', { name: 'Save System Parameters', exact: true }).click();
      await waitValue('allowStudentRegistration', true);
      await closedPage.evaluate(() => window.dispatchEvent(new Event('focus')));
      await closedPage.getByRole('button', { name: 'Create student account', exact: true }).waitFor();
      await closedPage.route('**/api/registration-options', (route) => route.abort());
      await closedPage.evaluate(() => window.dispatchEvent(new Event('focus')));
      await closedPage.getByText('Student registration availability could not be checked.', { exact: true }).waitFor();
      assert.equal(await closedPage.getByRole('button', { name: 'Create student account', exact: true }).count(), 0);
      await closedContext.close();
    });
    await check('browser intake uses automatic routing while preserving explicit manual assignments', async () => {
      await pool.query("UPDATE registrack_accounts SET status='active' WHERE id='ZZ-TEST-receiver'");
      const staffContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await staffContext.newPage();
      await login(page, names.receiver);
      for (const [selected, expected] of [['Unassigned', names.receiver], [names.a, names.a]]) {
        await page.locator('#nav-admin-submit-ticket').click();
        await page.getByPlaceholder('Enter student full name', { exact: true }).fill(profiles[1].name);
        await page.getByPlaceholder('Enter 8-digit student ID', { exact: true }).fill(profiles[1].studentId);
        await page.getByPlaceholder('Enter requested document type', { exact: true }).fill('TOR');
        await page.getByPlaceholder('Enter the student’s intended purpose', { exact: true }).fill('ZZ-TEST-purpose');
        await page.locator('select').filter({ has: page.locator('option[value="Unassigned"]') }).selectOption(selected);
        const posted = page.waitForResponse((response) => response.url().endsWith('/api/tickets') && response.request().method() === 'POST');
        await page.getByRole('button', { name: 'Generate Support Ticket & Send to Student', exact: true }).click();
        const response = await posted;
        assert.equal(response.status(), 201);
        assert.equal((await response.json()).ticket.assignedTo, expected);
        await page.reload({ waitUntil: 'domcontentloaded' });
      }
      await staffContext.close();
    });
    await check('browser has no uncaught application errors', async () => assert.deepEqual(errors, []));
  } finally {
    await browser.close();
  }
}
