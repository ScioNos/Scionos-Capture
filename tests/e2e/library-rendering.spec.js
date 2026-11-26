const path = require('node:path');
const { test, expect, chromium } = require('@playwright/test');

let context;
let origin;
test.beforeAll(async () => {
  const root = path.resolve(__dirname, '../..');
  context = await chromium.launchPersistentContext('', { channel: 'chromium', headless: true,
    args: ['--disable-extensions-except=' + root, '--load-extension=' + root] });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  origin = 'chrome-extension://' + new URL(worker.url()).host;
});
test.afterAll(async () => { if (context) await context.close(); });

// Use the real library controller with a small deterministic store; no timing benchmark.
async function fixture(count = 3) {
  const page = await context.newPage();
  await page.goto(origin + '/library.html');
  await expect(page.locator('#storage-estimate')).not.toBeEmpty();
  await page.evaluate(count => {
    const thumbnail = new Blob(['thumbnail'], { type: 'image/png' });
    const state = globalThis.renderFixture = { created: [], revoked: [], actions: [], records: Array.from({ length: count }, (_, i) => ({
      id: 'p-' + i, revision: 1, title: 'Project ' + i, source: 'https://source/' + i,
      updatedAt: 1700000000000 - i, expiresAt: 1800000000000, size: 10, thumbnail, blob: thumbnail
    })) };
    const create = URL.createObjectURL.bind(URL);
    const revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = blob => { const url = create(blob); state.created.push(url); return url; };
    URL.revokeObjectURL = url => { state.revoked.push(url); revoke(url); };
    CaptureStore.purgeExpiredLibraryProjects = async () => [];
    CaptureStore.listLibraryProjects = async () => state.records.map(record => ({ ...record }));
    CaptureStore.getLibrarySettings = async () => ({ quotaBytes: 256 * 1024 * 1024, retentionDays: null });
    CaptureStore.setLibrarySettings = async () => { if (state.block) await new Promise(resolve => { state.release = resolve; }); };
    CaptureStore.getLibraryProject = async id => { state.actions.push(['get', id]); return state.records.find(record => record.id === id); };
    CaptureStore.saveLibraryProject = async (record, options) => {
      state.actions.push(['save', record.id, options.expectedRevision]);
      const index = state.records.findIndex(item => item.id === record.id);
      state.records[index] = { ...state.records[index], ...record, revision: options.expectedRevision + 1 };
    };
    CaptureStore.deleteLibraryProject = async (id, revision) => {
      state.actions.push(['delete', id, revision]);
      state.records = state.records.filter(record => record.id !== id);
    };
    globalThis.ScionosCompositionUtils = { ...globalThis.ScionosCompositionUtils, rewriteProjectMetadata: async blob => blob };
  }, count);
  await refresh(page);
  await expect(page.locator('#project-list .card')).toHaveCount(count);
  return page;
}
async function refresh(page) {
  await page.locator('#save-preferences').click();
  await expect(page.locator('#save-preferences')).toBeEnabled();
}
async function counts(page) {
  return page.evaluate(() => ({ created: globalThis.renderFixture.created.length, revoked: globalThis.renderFixture.revoked.length }));
}

test('search and unchanged refresh preserve DOM and thumbnail URLs without invoking actions', async () => {
  const page = await fixture();
  try {
    await page.evaluate(() => { globalThis.originalCards = [...document.querySelectorAll('#project-list .card')]; });
    for (let i = 0; i < 4; i++) {
      await page.locator('#library-search').fill('source/1');
      await expect(page.locator('#project-list .card')).toHaveCount(1);
      await page.locator('#library-search').fill('no match');
      await expect(page.locator('#project-list .card')).toHaveCount(0);
      await page.locator('#library-search').fill('');
    }
    await refresh(page);
    expect(await page.evaluate(() => [...document.querySelectorAll('#project-list .card')].every((node, i) => node === globalThis.originalCards[i]))).toBe(true);
    expect(await counts(page)).toEqual({ created: 3, revoked: 0 });
    expect(await page.evaluate(() => globalThis.renderFixture.actions)).toEqual([]);
    await expect(page.locator('.thumbnail').first()).toHaveAttribute('loading', 'lazy');
    await page.locator('#library-search').fill('source/0');
    await page.locator('#language-button').click();
    await page.locator('[data-language-mode="de"]').click();
    await expect(page.locator('.card').first().getByRole('button', { name: 'Umbenennen' })).toBeVisible();
    await page.locator('#library-search').fill('');
    await expect(page.getByRole('button', { name: 'Umbenennen', exact: true })).toHaveCount(3);
    expect(await counts(page)).toEqual({ created: 3, revoked: 0 });
    expect(await page.evaluate(() => document.querySelector('.card') === globalThis.originalCards[0])).toBe(true);
    page.once('dialog', dialog => dialog.accept('Renamed'));
    await page.locator('.card').first().getByRole('button', { name: 'Umbenennen' }).click();
    await expect(page.locator('.card h2').first()).toHaveText('Renamed');
    expect(await counts(page)).toEqual({ created: 4, revoked: 1 });
    expect(await page.evaluate(() => document.querySelectorAll('.card')[1] === globalThis.originalCards[1])).toBe(true);
    page.once('dialog', dialog => dialog.accept());
    await page.locator('.card').first().getByRole('button', { name: 'Löschen', exact: true }).click();
    await expect(page.locator('.card')).toHaveCount(2);
    expect(await page.evaluate(() => globalThis.renderFixture.actions)).toEqual([['get', 'p-0'], ['save', 'p-0', 1], ['delete', 'p-0', 2]]);
    expect(await counts(page)).toEqual({ created: 4, revoked: 2 });
    await page.evaluate(() => globalThis.dispatchEvent(new globalThis.Event('pagehide')));
    expect(await counts(page)).toEqual({ created: 4, revoked: 4 });
    await page.evaluate(() => globalThis.dispatchEvent(new globalThis.Event('pagehide')));
    expect(await counts(page)).toEqual({ created: 4, revoked: 4 });
  } finally { await page.close(); }
});

test('hidden cards are reenabled after busy refresh and invalidated on external revision or deletion', async () => {
  const page = await fixture();
  try {
    await page.evaluate(() => { globalThis.renderFixture.block = true; });
    await page.locator('#save-preferences').click();
    await expect(page.locator('.card button').first()).toBeDisabled();
    await page.locator('#library-search').fill('no match');
    await page.evaluate(() => { globalThis.renderFixture.release(); globalThis.renderFixture.block = false; });
    await expect(page.locator('#save-preferences')).toBeEnabled();
    await page.locator('#library-search').fill('');
    await expect(page.locator('#project-list button:disabled')).toHaveCount(0);
    await page.locator('#library-search').fill('no match');
    await page.evaluate(() => {
      globalThis.renderFixture.records[0].revision++;
      globalThis.renderFixture.records[0].title = 'Externally changed';
      globalThis.renderFixture.records.splice(1, 1);
    });
    await refresh(page);
    expect(await counts(page)).toEqual({ created: 3, revoked: 2 });
    await page.locator('#library-search').fill('');
    await expect(page.locator('.card')).toHaveCount(2);
    await expect(page.locator('.card h2').first()).toHaveText('Externally changed');
    expect(await counts(page)).toEqual({ created: 4, revoked: 2 });
    await page.locator('#library-search').fill('no match');
    await page.evaluate(() => globalThis.dispatchEvent(new globalThis.Event('pagehide')));
    expect(await counts(page)).toEqual({ created: 4, revoked: 4 });
    await page.evaluate(() => globalThis.dispatchEvent(new globalThis.PageTransitionEvent('pageshow', { persisted: true })));
    await page.locator('#library-search').fill('');
    await expect(page.locator('.card')).toHaveCount(2);
    expect(await counts(page)).toEqual({ created: 6, revoked: 4 });
  } finally { await page.close(); }
});

test('cache retains at most 1000 detached cards and never limits visible projects', async () => {
  const page = await fixture(1003);
  try {
    expect(await counts(page)).toEqual({ created: 1003, revoked: 0 });
    await page.locator('#library-search').fill('no match');
    await expect(page.locator('.card')).toHaveCount(0);
    expect(await counts(page)).toEqual({ created: 1003, revoked: 3 });
    await page.locator('#library-search').fill('');
    await expect(page.locator('.card')).toHaveCount(1003);
    expect(await counts(page)).toEqual({ created: 1006, revoked: 3 });
    await page.evaluate(() => globalThis.dispatchEvent(new globalThis.Event('pagehide')));
    expect(await counts(page)).toEqual({ created: 1006, revoked: 1006 });
  } finally { await page.close(); }
});
