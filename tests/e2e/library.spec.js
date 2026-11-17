const path = require('node:path');
const { test, expect, chromium } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

let context;
let origin;
test.beforeAll(async () => {
  const root = path.resolve(__dirname, '../..');
  context = await chromium.launchPersistentContext('', { channel: 'chromium', headless: true, acceptDownloads: true,
    args: ['--disable-extensions-except=' + root, '--load-extension=' + root] });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  origin = 'chrome-extension://' + new URL(worker.url()).host;
  const page = await context.newPage();
  await page.goto(origin + '/library.html');
  await expect(page.locator('#language-button')).toHaveAttribute('aria-label', /.+/);
  await page.locator('#language-button').click();
  await page.locator('[data-language-mode="fr"]').click();
  await expect(page.locator('h1')).toHaveText('Bibliothèque');
  await page.close();
});
test.afterAll(async () => { if (context) await context.close(); });

async function seed(page, id, title, source) {
  await page.evaluate(async ({ id, title, source }) => {
    const canvas = document.createElement('canvas'); canvas.width = 60; canvas.height = 40;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#123456'; ctx.fillRect(0, 0, 60, 40);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const project = await globalThis.ScionosCompositionUtils.encodeProject({ title, settings: { title }, items: [{ id: 'image-1', blob, title: '', caption: '' }] });
    await CaptureStore.saveLibraryProject({ id, title, source, thumbnail: blob, blob: project }, { expectedRevision: null });
  }, { id, title, source });
}

test('library searches, renames, duplicates, exports, and removes real projects', async () => {
  const page = await context.newPage();
  try {
    await page.goto(origin + '/library.html');
    await expect(page.locator('#library-empty')).toBeVisible();
    await seed(page, 'test-first', 'Alpha', 'https://example.org/first');
    await seed(page, 'test-second', 'Beta', 'https://elsewhere.test/');
    await page.reload();
    await expect(page.locator('#project-list .card')).toHaveCount(2);
    await page.locator('#library-search').fill('example.org');
    await expect(page.locator('#project-list .card')).toHaveCount(1);
    await expect(page.locator('#project-list h2')).toHaveText('Alpha');
    page.once('dialog', dialog => dialog.accept('Nouvel Alpha'));
    await expect(page.locator('#project-list .card').first()).toBeVisible();
    await page.locator('#project-list .card').first().getByRole('button', { name: /renommer/i }).click();
    await expect(page.locator('#project-list h2')).toHaveText('Nouvel Alpha');
    const decodedTitle = await page.evaluate(async () => {
      const saved = await CaptureStore.getLibraryProject('test-first');
      return (await globalThis.ScionosCompositionUtils.decodeProject(saved.blob)).title;
    });
    expect(decodedTitle).toBe('Nouvel Alpha');
    await page.locator('#project-list .card').first().getByRole('button', { name: /dupliquer/i }).click();
    await expect(page.locator('#project-list .card')).toHaveCount(2);
    const copy = page.locator('#project-list .card').filter({ hasText: 'copie' });
    await expect(copy).toHaveCount(1);
    const download = page.waitForEvent('download');
    await copy.getByRole('button', { name: /exporter/i }).click();
    expect((await download).suggestedFilename()).toContain('.scionos');
    page.once('dialog', dialog => dialog.accept());
    await copy.getByRole('button', { name: /supprimer/i }).click();
    await expect(page.locator('#project-list .card')).toHaveCount(1);
  } finally { await page.close(); }
});

test('library preferences, expiration choice and confirmed clear work', async () => {
  const page = await context.newPage();
  try {
    await page.goto(origin + '/library.html');
    // Initial settings load is async; wait for its render before editing controls.
    await expect(page.locator('#storage-estimate')).not.toBeEmpty();
    await expect(page.locator('#library-status')).toBeEmpty();
    await page.locator('#retention-days').selectOption('7');
    await page.locator('#budget-mib').fill('128');
    await page.locator('#save-preferences').click();
    await expect(page.locator('#library-status')).toContainText(/réglages enregistrés/i);
    expect(await page.evaluate(() => CaptureStore.getLibrarySettings())).toEqual({ quotaBytes: 128 * 1024 * 1024, retentionDays: 7 });
    await page.locator('#retention-days').selectOption('0');
    await page.locator('#save-preferences').click();
    await expect.poll(() => page.evaluate(async () => (await CaptureStore.getLibrarySettings()).retentionDays)).toBeNull();
    await page.locator('#budget-mib').fill('63');
    await page.locator('#save-preferences').click();
    await expect(page.locator('#library-status')).toHaveClass(/error/);
    page.once('dialog', dialog => dialog.dismiss());
    await page.locator('#delete-all').click();
    expect(await page.evaluate(async () => (await CaptureStore.listLibraryProjects()).length)).toBeGreaterThan(0);
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#delete-all').click();
    await expect(page.locator('#library-empty')).toBeVisible();
  } finally { await page.close(); }
});

test('library stays accessible on a narrow screen', async () => {
  const page = await context.newPage({ viewport: { width: 390, height: 800 } });
  try {
    await page.goto(origin + '/library.html');
    const report = await new AxeBuilder({ page }).analyze();
    expect(report.violations.filter(item => ['critical', 'serious'].includes(item.impact))).toEqual([]);
    await page.locator('#language-button').click();
    await page.locator('[data-language-mode="en"]').click();
    await expect(page.locator('h1')).toHaveText('Library');
    await expect(page.locator('#retention-days option').first()).toHaveText('No expiration');
  } finally { await page.close(); }
});
