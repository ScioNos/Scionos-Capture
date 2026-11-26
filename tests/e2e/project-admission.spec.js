const path = require('node:path');
const { test, expect, chromium } = require('@playwright/test');
let context, origin;
test.beforeAll(async () => {
  const root = path.resolve(__dirname, '../..');
  context = await chromium.launchPersistentContext('', { channel: 'chromium', headless: true,
    viewport: { width: 1440, height: 1000 },
    args: ['--disable-extensions-except=' + root, '--load-extension=' + root] });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  origin = 'chrome-extension://' + new URL(worker.url()).host;
});
test.afterAll(async () => { await context?.close(); });

test('normal duplication assigns a unique UUID before admission and roundtrips both annotations', async () => {
  const page = await context.newPage();
  try {
    await page.goto(origin + '/editor.html');
    const fixture = await page.evaluate(async () => {
      const U = globalThis.ScionosCompositionUtils;
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 120;
      const blob = await new Promise(resolve => canvas.toBlob(resolve));
      const original = { id: globalThis.crypto.randomUUID(), kind: 'step', x: 30, y: 30, number: 1, radius: 12, color: '#000000' };
      const doc = { items: [{ id: 'duplicate', width: 120, height: 120, blob, annotations: [original] }] };
      // Reproduce the former ordering through the same public admission API:
      // move retains the old UUID, so admission before UUID assignment rejects it.
      const inherited = globalThis.ScionosAnnotationModel.move(original, 10, 10);
      let beforeError = '';
      try { U.measureProject({ ...doc, items: [{ ...doc.items[0], annotations: [original, inherited] }] }); }
      catch (error) { beforeError = error.message; }
      return { beforeError, id: original.id, bytes: [...new Uint8Array(await (await U.encodeProject(doc)).arrayBuffer())] };
    });
    expect(fixture.beforeError).toMatch(/Duplicate annotation id/);
    await page.locator('#project-file').setInputFiles({ name: 'duplicate.scionos', mimeType: 'application/x-scionos-project', buffer: Buffer.from(fixture.bytes) });
    await expect(page.locator('#composition-count')).toHaveText('1 / 30');
    await page.locator('#main-canvas').click({ position: { x: 30, y: 30 } });
    await expect(page.locator('#annotation-controls')).toBeVisible();
    await page.locator('#annotation-duplicate').click();
    await expect(page.locator('#btn-undo')).toBeEnabled();
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#btn-save-project').click();
    const saved = await require('node:fs/promises').readFile(await (await downloadPromise).path());
    const annotations = await page.evaluate(async bytes => (await globalThis.ScionosCompositionUtils.decodeProject(new Blob([new Uint8Array(bytes)]))).items[0].annotations, [...saved]);
    expect(annotations).toHaveLength(2);
    expect(annotations[0].id).toBe(fixture.id);
    expect(annotations[1].id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(new Set(annotations.map(annotation => annotation.id)).size).toBe(2);
    expect(annotations.map(({ x, y }) => ({ x, y }))).toEqual([{ x: 30, y: 30 }, { x: 40, y: 40 }]);
  } finally { await page.close(); }
});

test('fractional drag exceeding manifest bytes is refused before geometry and history change', async () => {
  const page = await context.newPage();
  try {
    await page.goto(origin + '/editor.html');
    const fixture = await page.evaluate(async () => {
      const U = globalThis.ScionosCompositionUtils;
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 120;
      const blob = await new Promise(resolve => canvas.toBlob(resolve));
      const stroke = { kind: 'draw', color: '#000000', width: 2,
        points: Array.from({ length: 10000 }, (_, i) => ({ x: 10 + i % 2, y: 10 })) };
      const annotations = [stroke, ...Array.from({ length: 100 }, () => ({ kind: 'text', x: 80, y: 80,
        text: 'a', color: '#000000', bgColor: 'transparent', fontSize: 14 }))];
      const doc = { title: '', settings: { title: '', direction: 'vertical', gap: 0, padding: 0 },
        exportSettings: { sourcePolicy: 'none' }, items: [{ id: 'fractional', width: 120, height: 120, timestamp: 1, blob, annotations }] };
      let left = U.LIMITS.manifestBytes - U.measureProject(doc).manifestBytes - 512;
      for (const annotation of annotations.slice(1)) {
        const add = Math.min(left, 9999); annotation.text += 'a'.repeat(add); left -= add;
      }
      if (left) throw new Error('Fixture byte boundary');
      const fractional = globalThis.ScionosAnnotationModel.move(stroke, 0.75, 0.75);
      let beforeError = '';
      try { U.measureProject({ ...doc, items: [{ ...doc.items[0], annotations: [fractional, ...annotations.slice(1)] }] }); }
      catch (error) { beforeError = error.message; }
      // The old handler wrote this valid geometry unconditionally, even though
      // the portable representation cannot be saved. Exercise that exact candidate.
      return { beforeError, bytes: [...new Uint8Array(await (await U.encodeProject(doc)).arrayBuffer())] };
    });
    expect(fixture.beforeError).toMatch(/Manifest size limit/);
    await page.locator('#project-file').setInputFiles({ name: 'fractional.scionos', mimeType: 'application/x-scionos-project', buffer: Buffer.from(fixture.bytes) });
    await expect(page.locator('#composition-count')).toHaveText('1 / 30');
    const box = await page.locator('#main-canvas').boundingBox();
    await page.mouse.move(box.x + 10, box.y + 10);
    await page.mouse.down();
    await page.mouse.move(box.x + 10.75, box.y + 10.75);
    await page.mouse.up();
    await expect(page.locator('#toast')).toBeVisible();
    await expect(page.locator('#btn-undo')).toBeDisabled();
    await expect(page.locator('#btn-redo')).toBeDisabled();
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#btn-save-project').click();
    const saved = await require('node:fs/promises').readFile(await (await downloadPromise).path());
    const result = await page.evaluate(async bytes => {
      const U = globalThis.ScionosCompositionUtils;
      const doc = await U.decodeProject(new Blob([new Uint8Array(bytes)]));
      return { points: doc.items[0].annotations[0].points,
        count: doc.items[0].annotations.length, bytes: U.decodeZip(new Uint8Array(bytes))[0].data.length };
    }, [...saved]);
    expect(result.count).toBe(101);
    expect(result.bytes).toBeLessThanOrEqual(1048576);
    expect(result.points).toEqual(Array.from({ length: 10000 }, (_, i) => ({ x: 10 + i % 2, y: 10 })));
  } finally { await page.close(); }
});


test('UTF-8 manifest budget refuses duplication before history mutation and permits recovery', async () => {
  const page = await context.newPage();
  try {
    await page.goto(origin + '/editor.html');
    const bytes = await page.evaluate(async () => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 120;
      const blob = await new Promise(resolve => canvas.toBlob(resolve));
      const annotations = Array.from({ length: 34 }, () => ({ id: globalThis.crypto.randomUUID(), kind: 'text',
        text: '中'.repeat(10000), x: 60, y: 60, fontSize: 14, color: '#000000', bgColor: 'transparent' }));
      return [...new Uint8Array(await (await globalThis.ScionosCompositionUtils.encodeProject({
        items: [{ id: 'manifest-limit', blob, annotations }], settings: {}
      })).arrayBuffer())];
    });
    await page.locator('#project-file').setInputFiles({ name: 'budget.scionos', mimeType: 'application/x-scionos-project', buffer: Buffer.from(bytes) });
    await expect(page.locator('#composition-count')).toHaveText('1 / 30');
    const canvas = page.locator('#main-canvas');
    const box = await canvas.boundingBox();
    await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } });
    await expect(page.locator('#annotation-controls')).toBeVisible();
    await expect(page.locator('#btn-undo')).toBeDisabled();
    await page.locator('#annotation-duplicate').click();
    await expect(page.locator('#btn-undo')).toBeDisabled();
    await expect(page.locator('#toast')).toBeVisible();
    // A smaller edit is still admitted after refusal, and undo/redo retain saveability.
    await page.locator('#annotation-text').fill('Recovery');
    await page.locator('#annotation-text').dispatchEvent('change');
    await expect(page.locator('#btn-undo')).toBeEnabled();
    await page.locator('#btn-undo').click();
    await page.locator('#btn-redo').click();
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#btn-save-project').click();
    const download = await downloadPromise;
    const saved = await require('node:fs/promises').readFile(await download.path());
    expect(saved.length).toBeLessThan(1024 * 1024 + 10000);
    // Decode through the public codec, not an implementation-only diagnostic.
    const result = await page.evaluate(async bytes => {
      const decoded = await globalThis.ScionosCompositionUtils.decodeProject(new Blob([new Uint8Array(bytes)]));
      return { count: decoded.items[0].annotations.length,
        recovered: decoded.items[0].annotations.some(annotation => annotation.text === 'Recovery') };
    }, [...saved]);
    expect(result).toEqual({ count: 34, recovered: true });
  } finally { await page.close(); }
});

test('near-limit imported annotations remain saveable and metadata growth is refused atomically', async () => {
  const page = await context.newPage();
  try {
    await page.goto(origin + '/editor.html');
    const bytes = await page.evaluate(async () => {
      const U = globalThis.ScionosCompositionUtils;
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 120;
      const blob = await new Promise(resolve => canvas.toBlob(resolve));
      const doc = { title: '', settings: { title: '', direction: 'vertical', gap: 0, padding: 0 },
        exportSettings: { sourcePolicy: 'none' }, items: [{ id: 'near-limit', blob, width: 120, height: 120, timestamp: 1,
          annotations: Array.from({ length: 105 }, () => ({ kind: 'text', x: 60, y: 60, text: 'a',
            color: '#000000', bgColor: 'transparent', fontSize: 14 })) }] };
      let left = U.LIMITS.manifestBytes - U.measureProject(doc).manifestBytes - 32;
      for (const annotation of doc.items[0].annotations) {
        const add = Math.min(left, 9999); annotation.text += 'a'.repeat(add); left -= add;
      }
      if (left) throw new Error('Fixture byte boundary');
      return [...new Uint8Array(await (await U.encodeProject(doc)).arrayBuffer())];
    });
    await page.locator('#project-file').setInputFiles({ name: 'boundary.scionos', mimeType: 'application/x-scionos-project', buffer: Buffer.from(bytes) });
    await expect(page.locator('#composition-count')).toHaveText('1 / 30');
    await page.locator('#item-caption').fill('中'.repeat(100));
    await expect(page.locator('#item-caption')).toHaveValue('');
    await expect(page.locator('#composition-undo')).toBeDisabled();
    await page.locator('#source-policy').selectOption('full');
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#btn-save-project').click();
    const saved = await require('node:fs/promises').readFile(await (await downloadPromise).path());
    const result = await page.evaluate(async bytes => {
      const U = globalThis.ScionosCompositionUtils;
      const decoded = await U.decodeProject(new Blob([new Uint8Array(bytes)]));
      return { bytes: U.decodeZip(new Uint8Array(bytes))[0].data.length,
        annotations: decoded.items[0].annotations.length, caption: decoded.items[0].caption };
    }, [...saved]);
    expect(result.bytes).toBeLessThanOrEqual(1048576);
    expect(result.annotations).toBe(105); expect(result.caption).toBe('');
  } finally { await page.close(); }
});
