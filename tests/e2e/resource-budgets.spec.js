const path = require('node:path');
const { test, expect, chromium } = require('@playwright/test');
let context, origin;
test.beforeAll(async () => {
  const root = path.resolve(__dirname, '../..');
  context = await chromium.launchPersistentContext('', { channel: 'chromium', headless: true,
    args: ['--disable-extensions-except=' + root, '--load-extension=' + root] });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  origin = 'chrome-extension://' + new URL(worker.url()).host;
});
test.afterAll(async () => { await context?.close(); });
async function fixture(page, size = 120) {
  const bytes = await page.evaluate(async size => {
    const c = document.createElement('canvas'); c.width = c.height = size;
    c.getContext('2d').fillRect(0, 0, size, size);
    return [...new Uint8Array(await (await new Promise(resolve => c.toBlob(resolve))).arrayBuffer())];
  }, size);
  return { name: 'image.png', mimeType: 'image/png', buffer: Buffer.from(bytes) };
}
async function annotatedProject(page, count, points) {
  const bytes = await page.evaluate(async ({ count, points }) => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 120;
    const blob = await new Promise(resolve => canvas.toBlob(resolve));
    const annotations = Array.from({ length: count }, () => ({
      id: globalThis.crypto.randomUUID(), kind: 'draw', width: 4, color: '#000000',
      points: Array.from({ length: points }, () => ({ x: 60, y: 60 }))
    }));
    const project = await globalThis.ScionosCompositionUtils.encodeProject({
      items: [{ id: 'annotated', blob, annotations }], settings: {}
    });
    return [...new Uint8Array(await project.arrayBuffer())];
  }, { count, points });
  await page.locator('#project-file').setInputFiles({ name: 'annotations.scionos', mimeType: 'application/x-scionos-project', buffer: Buffer.from(bytes) });
  await expect(page.locator('#composition-count')).toHaveText('1 / 30');
  const canvas = page.locator('#main-canvas');
  const box = await canvas.boundingBox();
  await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } });
  await expect(page.locator('#annotation-controls')).toBeVisible();
  expect((await canvas.boundingBox()).y).toBe(box.y);
}

test('cropped originals still reserve admission pixels and undo stays within the budget', async () => {
  const page = await context.newPage();
  try {
    await page.goto(origin + '/editor.html');
    const image = await fixture(page, 3900);
    await page.locator('#image-files').setInputFiles(image);
    await expect(page.locator('#composition-count')).toHaveText('1 / 30');
    await page.locator('#tool-crop').click();
    for (const key of ['width', 'height']) await page.locator('#geometry-' + key).fill('10');
    await page.locator('#geometry-apply').click();
    await expect(page.locator('#main-canvas')).toHaveAttribute('width', '10');
    await page.locator('#composition-items button').first().click();
    await page.locator('#image-files').setInputFiles([image, image]);
    await expect(page.locator('#composition-count')).toHaveText('2 / 30');
    await page.locator('#composition-items button').first().click();
    await page.locator('#btn-undo').click();
    await expect(page.locator('#main-canvas')).toHaveAttribute('width', '3900');
  } finally { await page.close(); }
});
test('interactive duplication respects the imported annotation item limit', async () => {
  const page = await context.newPage();
  try {
    await page.goto(origin + '/editor.html');
    await annotatedProject(page, 1000, 1);
    await expect(page.locator('#btn-undo')).toBeDisabled();
    await page.locator('#annotation-duplicate').click();
    await expect(page.locator('#btn-undo')).toBeDisabled();
    await expect(page.locator('#annotation-controls')).toBeVisible();
  } finally { await page.close(); }
});

test('history byte and point budgets evict old states and bound undo plus redo together', async () => {
  const page = await context.newPage();
  try {
    await page.goto(origin + '/editor.html');
    await annotatedProject(page, 1, 10000);
    await page.locator('#annotation-width').evaluate(input => {
      for (let width = 5; width < 17; width++) {
        input.value = String(width); input.dispatchEvent(new globalThis.Event('change', { bubbles: true }));
      }
    });
    // The previous point-only bound allowed ten states (~1.6 MiB). The new
    // shared byte bound admits six of these states, across undo and redo together.
    const retainedStates = await page.evaluate(() => {
      const state = [{ id: '00000000-0000-4000-8000-000000000000', kind: 'draw', width: 16,
        color: '#000000', points: Array.from({ length: 10000 }, () => ({ x: 60, y: 60 })) }];
      return Math.min(10, Math.floor(globalThis.ScionosCompositionUtils.LIMITS.manifestBytes /
        (globalThis.ScionosCompositionUtils.jsonUtf8Bytes(state) + 128)));
    });
    expect(retainedStates).toBe(6);
    for (let count = 0; count < retainedStates; count++) {
      await expect(page.locator('#btn-undo')).toBeEnabled();
      await page.locator('#btn-undo').click();
    }
    await expect(page.locator('#btn-undo')).toBeDisabled();
    for (let count = 0; count < retainedStates; count++) {
      await expect(page.locator('#btn-redo')).toBeEnabled();
      await page.locator('#btn-redo').click();
    }
    await expect(page.locator('#btn-redo')).toBeDisabled();
  } finally { await page.close(); }
});

test('interactive strokes stop at the same point limit as project imports', async () => {
  const page = await context.newPage();
  try {
    await page.goto(origin + '/editor.html');
    await page.locator('#image-files').setInputFiles(await fixture(page));
    await expect(page.locator('#composition-count')).toHaveText('1 / 30');
    await page.locator('#tool-draw').click();
    const box = await page.locator('#main-canvas').boundingBox();
    await page.mouse.move(box.x + 10, box.y + 10); await page.mouse.down();
    await page.locator('#main-canvas').evaluate(canvas => {
      const rect = canvas.getBoundingClientRect();
      for (let index = 0; index < 10020; index++) canvas.dispatchEvent(new globalThis.PointerEvent('pointermove', {
        pointerId: 1, buttons: 1, clientX: rect.x + 10 + index % 2 * 20, clientY: rect.y + 10
      }));
    });
    await page.mouse.up();
    await page.evaluate(() => {
      const codec = globalThis.ScionosCompositionUtils;
      globalThis.ScionosCompositionUtils = { ...codec, async encodeProject(project) {
        globalThis.exportedPointCount = project.items[0].annotations[0].points.length;
        return codec.encodeProject(project);
      } };
    });
    await page.locator('#btn-save-project').click();
    await expect.poll(() => page.evaluate(() => globalThis.exportedPointCount)).toBe(10000);
  } finally { await page.close(); }
});

test('two click snapshots are retained through storage and a third is refused before freeze', async () => {
  const page = await context.newPage();
  try {
    await page.goto(origin + '/editor.html');
    await page.locator('#image-files').setInputFiles(await fixture(page));
    await expect(page.locator('#composition-count')).toHaveText('1 / 30');
    await page.evaluate(() => {
      globalThis.__scionosDiagnostics = [];
      const store = CaptureStore;
      let release;
      const gate = new Promise(resolve => { release = resolve; });
      globalThis.resourceRace = { release, started: [], finished: [] };
      globalThis.CaptureStore = { ...store, async saveLibraryProject(record, options) {
        globalThis.resourceRace.started.push(record.title);
        if (globalThis.resourceRace.started.length === 1) await gate;
        const result = await store.saveLibraryProject(record, options);
        globalThis.resourceRace.finished.push(record.title);
        return result;
      } };
    });
    await page.locator('#composition-title').fill('First');
    await page.locator('#btn-save-library').click();
    await expect.poll(() => page.evaluate(() => globalThis.resourceRace.started.length)).toBe(1);
    await page.locator('#composition-title').fill('Second');
    await page.locator('#btn-save-library').click();
    await expect.poll(() => page.evaluate(() => globalThis.__scionosDiagnostics.filter(e => e.stage === 'snapshot-ready').length)).toBe(2);
    await page.locator('#composition-title').fill('Third');
    await page.locator('#btn-save-library').click();
    expect(await page.evaluate(() => globalThis.__scionosDiagnostics.filter(e => e.stage === 'freeze-start').length)).toBe(2);
    await page.locator('#btn-copy').click();
    expect(await page.evaluate(() => globalThis.__scionosDiagnostics.filter(e => e.stage === 'freeze-start').length)).toBe(2);
    await page.evaluate(() => globalThis.resourceRace.release());
    await expect.poll(() => page.evaluate(() => globalThis.resourceRace.finished)).toEqual(['First', 'Second']);
    await page.locator('#btn-save-library').click();
    await expect.poll(() => page.evaluate(() => globalThis.resourceRace.finished)).toEqual(['First', 'Second', 'Third']);
  } finally { await page.close(); }
});
