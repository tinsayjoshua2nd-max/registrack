// Exercise the actual component with in-memory ZZ-TEST fixtures; no database or real accounts.
import assert from 'node:assert/strict';
import express from 'express';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import { isTicketAssignedToAccount } from '../src/utils/ticketQueue';

async function check(name: string, work: () => void | Promise<void>) {
  try { await work(); } catch (error) { console.error(`FAIL ${name}`); throw error; }
  console.info(`PASS ${name}`);
}
await check('assignment matching uses the current account, handles case/spacing, and excludes queues and partial names', () => {
  const account = { name: ' ZZ-TEST-Officer-A ' };
  assert(isTicketAssignedToAccount({ assignedTo: 'zz-test-officer-a' }, account));
  assert(isTicketAssignedToAccount({ assignedTo: ' ZZ-TEST-OFFICER-A ' }, account));
  for (const assignedTo of ['ZZ-TEST-Officer-B', 'ZZ-TEST-Officer-A Junior', 'Registrar Office', 'ZZ-TEST-Alexander Reyes', '']) {
    assert(!isTicketAssignedToAccount({ assignedTo }, account));
  }
  assert(!isTicketAssignedToAccount({ assignedTo: 'ZZ-TEST-Officer-A' }, null));
  assert(!isTicketAssignedToAccount({ assignedTo: '' }, { name: ' ' }));
});

const bundle = await build({
  stdin: {
    contents: `
      import React from 'react';
      import { createRoot } from 'react-dom/client';
      import { HelpdeskManagementView } from './src/components/SuperAdmin/HelpdeskManagementView';
      const root = createRoot(document.getElementById('root'));
      window.renderFixture = () => root.render(React.createElement(HelpdeskManagementView));
      window.renderFixture();
    `,
    resolveDir: process.cwd(), loader: 'tsx',
  },
  bundle: true, write: false, format: 'iife', platform: 'browser',
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [{
    name: 'zz-test-context',
    setup(builder) {
      builder.onResolve({ filter: /context\/HelpdeskContext$/ }, () => ({ path: 'context', namespace: 'zz-test' }));
      builder.onLoad({ filter: /.*/, namespace: 'zz-test' }, () => ({
        contents: 'export const useHelpdesk = () => window.fixtureContext;', loader: 'js',
      }));
    },
  }],
});
const makeTicket = (id: string, assignedTo: string, status = 'processing') => ({
  id: `ZZ-TEST-${id}`, ticketNumber: `ZZ-TEST-${id}`, assignedTo,
  studentId: '90000001', studentName: 'ZZ-TEST-student',
  subject: 'ZZ-TEST-request', category: 'TOR', documentType: 'TOR', priority: 'Normal',
  status, stage: status === 'completed' ? 'completed' : 'processing',
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  estimatedReleaseDate: '2026-11-01', messages: [], internalNotes: [], timelineHistory: [],
});
const context = {
  currentUser: { name: 'ZZ-TEST-Officer-A', role: 'superadmin', staffRole: 'registrar' },
  tickets: [
    makeTicket('own-exact', 'ZZ-TEST-Officer-A'),
    makeTicket('own-case', ' zz-test-officer-a ', 'completed'),
    makeTicket('other-officer', 'ZZ-TEST-Officer-B'),
    makeTicket('shared-queue', 'Registrar Office'),
    makeTicket('old-name', 'ZZ-TEST-Alexander Reyes'),
    makeTicket('partial-name', 'ZZ-TEST-Officer-A Junior'),
  ],
  users: [], stats: { urgentTickets: 0, pendingRequests: 5 },
};
const app = express();
app.get('/', (_req, res) => res.type('html').send(
  `<div id="root"></div><script>window.fixtureContext=${JSON.stringify(context)};</script><script src="/fixture.js"></script>`,
));
app.get('/fixture.js', (_req, res) => res.type('js').send(bundle.outputFiles[0].text));
const server = app.listen(0, '127.0.0.1');
await new Promise<void>(resolve => server.once('listening', resolve));
const address = server.address();
assert(address && typeof address !== 'string');
const browser = await chromium.launch({
  executablePath: '/repl/tools/bin/chromium', headless: true, args: ['--no-sandbox'],
});
try {
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${address.port}`);
  const button = page.getByRole('button', { name: 'Assigned to Me (2)', exact: true });
  await check('real Assigned to Me button filters own tickets, displays the matching count, and toggles back to all', async () => {
    await button.waitFor();
    assert.equal(await page.locator('tbody tr').count(), 6);
    await button.click();
    assert.equal(await button.getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('tbody tr').count(), 2);
    const rows = await page.locator('tbody').innerText();
    assert(rows.includes('ZZ-TEST-own-exact') && rows.includes('ZZ-TEST-own-case'));
    for (const id of ['other-officer', 'shared-queue', 'old-name', 'partial-name']) assert(!rows.includes(`ZZ-TEST-${id}`));
    await button.click();
    assert.equal(await button.getAttribute('aria-pressed'), 'false');
    assert.equal(await page.locator('tbody tr').count(), 6);
  });
  await check('Assigned to Me composes with search and handles an empty result', async () => {
    const search = page.getByPlaceholder('Search by ticket #, student name, staff, subject...');
    await search.fill('ZZ-TEST-other-officer');
    await button.click();
    await page.getByText('No tickets match the selected filters.', { exact: true }).waitFor();
    assert.equal(await button.getAttribute('aria-pressed'), 'true');
    await search.fill('');
    await page.getByText('ZZ-TEST-own-exact', { exact: true }).waitFor();
    assert.equal(await page.locator('tbody tr').count(), 2);
  });
  await check('the active filter and badge follow the signed-in Registrar account, including legacy accounts', async () => {
    await page.evaluate(() => {
      (window as any).fixtureContext.currentUser = {
        name: 'ZZ-TEST-Officer-B', role: 'superadmin', staffRole: 'superadmin',
      };
      (window as any).renderFixture();
    });
    const otherButton = page.getByRole('button', { name: 'Assigned to Me (1)', exact: true });
    await otherButton.waitFor();
    assert.equal(await otherButton.getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('tbody tr').count(), 1);
    assert((await page.locator('tbody').innerText()).includes('ZZ-TEST-other-officer'));
    assert(!(await page.locator('tbody').innerText()).includes('ZZ-TEST-own-exact'));
    await page.evaluate(() => {
      (window as any).fixtureContext.currentUser = null;
      (window as any).renderFixture();
    });
    await page.getByRole('button', { name: 'Assigned to Me (0)', exact: true }).waitFor();
    await page.getByText('No tickets match the selected filters.', { exact: true }).waitFor();
    assert.deepEqual(errors, []);
  });
} finally {
  await browser.close();
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
console.info('PASS all four Assigned to Me checks; only in-memory ZZ-TEST fixtures used');
