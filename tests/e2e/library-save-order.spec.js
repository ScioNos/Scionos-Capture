const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { test, expect, chromium } = require('@playwright/test');

let context;
let origin;

test.beforeAll(async () => {
  const root = path.resolve(__dirname, '../..');
  context = await chromium.launchPersistentContext('', {
    channel: 'chromium', headless: true, viewport: { width: 1440, height: 1000 },
    args: ['--disable-extensions-except=' + root, '--load-extension=' + root]
  });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  origin = 'chrome-extension://' + new URL(worker.url()).host;
});

test.afterAll(async () => { if (context) await context.close(); });

async function projectFile(page, title, color = '#123456') {
  const bytes = await page.evaluate(async ({ title, color }) => {
    const canvas = document.createElement('canvas'); canvas.width = 120; canvas.height = 80;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = color; ctx.fillRect(0, 0, 120, 80);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const project = await globalThis.ScionosCompositionUtils.encodeProject({ title, settings: { title }, items: [{ id: 'image-1', blob }] });
    return [...new Uint8Array(await project.arrayBuffer())];
  }, { title, color });
  return { name: title + '.scionos', mimeType: 'application/x-scionos-project', buffer: Buffer.from(bytes) };
}

async function openEditor(page, title, { stored = true, color } = {}) {
  await page.goto(origin + '/editor.html');
  const file = await projectFile(page, title, color);
  if (stored) {
    const id = randomUUID();
    await page.evaluate(async ({ id, title, bytes }) => {
      await CaptureStore.saveLibraryProject({ id, title, blob: new Blob([new Uint8Array(bytes)]) }, { expectedRevision: null });
    }, { id, title, bytes: [...file.buffer] });
    await page.goto(origin + '/editor.html?project=' + id);
    await expect(page.locator('#composition-title')).toHaveValue(title);
    return id;
  }
  await page.locator('#project-file').setInputFiles(file);
  await expect(page.locator('#composition-title')).toHaveValue(title);
  return null;
}

// Keep the real codec and IndexedDB store. Only suspend the first encoder's
// completion so every ordering assertion is controlled by a gate, never a sleep.
async function gateFirstEncode(page, { fail = false } = {}) {
  await page.evaluate(({ fail }) => {
    const codec = globalThis.ScionosCompositionUtils;
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    const state = { started: [], finished: [], writes: [], errors: [], snapshotsEncoded: 0, release };
    globalThis.saveRace = state;
    const toBlob = globalThis.HTMLCanvasElement.prototype.toBlob;
    globalThis.HTMLCanvasElement.prototype.toBlob = function (callback, ...args) {
      return toBlob.call(this, blob => { state.snapshotsEncoded += 1; callback(blob); }, ...args);
    };
    globalThis.ScionosCompositionUtils = { ...codec, async encodeProject(project) {
      const index = state.started.push(project.title);
      const blob = await codec.encodeProject(project);
      if (index === 1) {
        await gate;
        if (fail) throw new Error('Deterministic encoder failure');
      }
      state.finished.push(project.title);
      return blob;
    } };
    const store = globalThis.CaptureStore;
    globalThis.CaptureStore = { ...store, async saveLibraryProject(record, options) {
      try {
        const metadata = await store.saveLibraryProject(record, options);
        state.writes.push({ id: record.id, title: record.title, expectedRevision: options.expectedRevision, revision: metadata.revision });
        return metadata;
      } catch (error) { state.errors.push(error.code || error.message); throw error; }
    } };
  }, { fail });
}

async function savedProject(page, id) {
  return page.evaluate(async id => {
    const stored = await CaptureStore.getLibraryProject(id);
    const project = await globalThis.ScionosCompositionUtils.decodeProject(stored.blob);
    const bitmap = await globalThis.createImageBitmap(project.items[0].blob);
    const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(bitmap, 0, 0); bitmap.close();
    return { title: stored.title, revision: stored.revision, projectTitle: project.title, pixel: [...ctx.getImageData(0, 0, 1, 1).data] };
  }, id);
}

test('overlapping saves keep click order and freeze each requested snapshot', async () => {
  const page = await context.newPage();
  try {
    const id = await openEditor(page, 'Initial');
    await gateFirstEncode(page);
    await page.locator('#composition-title').fill('Older snapshot');
    await page.locator('#btn-save-library').click();
    await expect.poll(() => page.evaluate(() => globalThis.saveRace.started)).toEqual(['Older snapshot']);
    await page.locator('#composition-title').fill('Newer snapshot');
    await page.locator('#btn-save-library').click();
    await page.locator('#composition-title').fill('Unsaved later edit');
    // Both click-time snapshots finish their two PNG encoders while the first
    // project encoder remains blocked. A concurrent implementation must finish
    // the newer save first, reproducing the historical overwrite deterministically.
    await expect.poll(() => page.evaluate(() => globalThis.saveRace.snapshotsEncoded)).toBe(4);
    if (await page.evaluate(() => globalThis.saveRace.started.length === 2)) {
      await expect.poll(() => page.evaluate(() => globalThis.saveRace.writes.length)).toBe(1);
    }
    await page.evaluate(() => globalThis.saveRace.release());
    await expect.poll(() => page.evaluate(() => globalThis.saveRace.writes.length)).toBe(2);
    expect(await page.evaluate(() => globalThis.saveRace.writes)).toEqual([
      { id, title: 'Older snapshot', expectedRevision: 1, revision: 2 },
      { id, title: 'Newer snapshot', expectedRevision: 2, revision: 3 }
    ]);
    expect(await savedProject(page, id)).toMatchObject({ title: 'Newer snapshot', projectTitle: 'Newer snapshot', revision: 3 });
    await expect(page.locator('#composition-title')).toHaveValue('Unsaved later edit');
    // The completed snapshot must not mark the later edit as saved.
    const replacement = await projectFile(page, 'Replacement');
    const dialog = page.waitForEvent('dialog');
    await page.locator('#project-file').setInputFiles(replacement);
    await (await dialog).dismiss();
    await expect(page.locator('#composition-title')).toHaveValue('Unsaved later edit');
  } finally { await page.close(); }
});

test('overlapping first saves create one library project', async () => {
  const page = await context.newPage();
  try {
    await openEditor(page, 'New document', { stored: false });
    await gateFirstEncode(page);
    await page.locator('#btn-save-library').click();
    await expect.poll(() => page.evaluate(() => globalThis.saveRace.started.length)).toBe(1);
    await page.locator('#composition-title').fill('Second click');
    await page.locator('#btn-save-library').click();
    await page.evaluate(() => globalThis.saveRace.release());
    await expect.poll(() => page.evaluate(() => globalThis.saveRace.writes.length)).toBe(2);
    const writes = await page.evaluate(() => globalThis.saveRace.writes);
    expect(writes[0]).toMatchObject({ title: 'New document', expectedRevision: null, revision: 1 });
    expect(writes[1]).toEqual({ id: writes[0].id, title: 'Second click', expectedRevision: 1, revision: 2 });
    expect(await savedProject(page, writes[0].id)).toMatchObject({ title: 'Second click', projectTitle: 'Second click', revision: 2 });
  } finally { await page.close(); }
});

test('a suspended save stays with its original document after opening another project', async () => {
  const page = await context.newPage();
  try {
    const xId = await openEditor(page, 'Project X', { color: '#ff0000' });
    const yFile = await projectFile(page, 'Project Y', '#0000ff');
    await gateFirstEncode(page);
    await page.locator('#composition-title').fill('Project X saved');
    await page.locator('#btn-save-library').click();
    await expect.poll(() => page.evaluate(() => globalThis.saveRace.started.length)).toBe(1);
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#project-file').setInputFiles(yFile);
    await expect(page.locator('#composition-title')).toHaveValue('Project Y');
    await page.locator('#btn-save-library').click();
    await expect.poll(() => page.evaluate(() => globalThis.saveRace.writes.length)).toBe(1);
    const yWrite = await page.evaluate(() => globalThis.saveRace.writes[0]);
    expect(yWrite).toMatchObject({ title: 'Project Y', expectedRevision: null, revision: 1 });
    expect(yWrite.id).not.toBe(xId);
    await page.evaluate(() => globalThis.saveRace.release());
    await expect.poll(() => page.evaluate(() => globalThis.saveRace.writes.length)).toBe(2);
    expect(await savedProject(page, xId)).toEqual({ title: 'Project X saved', projectTitle: 'Project X saved', revision: 2, pixel: [255, 0, 0, 255] });
    expect(await savedProject(page, yWrite.id)).toEqual({ title: 'Project Y', projectTitle: 'Project Y', revision: 1, pixel: [0, 0, 255, 255] });
    await expect(page.locator('#composition-title')).toHaveValue('Project Y');
    // A late completion must not replace Y's active identity or revision either.
    await page.locator('#composition-title').fill('Project Y updated');
    await page.locator('#btn-save-library').click();
    await expect.poll(() => page.evaluate(() => globalThis.saveRace.writes.length)).toBe(3);
    expect(await page.evaluate(() => globalThis.saveRace.writes[2])).toEqual({ id: yWrite.id, title: 'Project Y updated', expectedRevision: 1, revision: 2 });
    expect(await savedProject(page, xId)).toMatchObject({ projectTitle: 'Project X saved', revision: 2, pixel: [255, 0, 0, 255] });
  } finally { await page.close(); }
});

test('an encoder failure does not block the next queued save', async () => {
  const page = await context.newPage();
  try {
    const id = await openEditor(page, 'Before failure');
    await gateFirstEncode(page, { fail: true });
    await page.locator('#composition-title').fill('Failed snapshot');
    await page.locator('#btn-save-library').click();
    await expect.poll(() => page.evaluate(() => globalThis.saveRace.started.length)).toBe(1);
    await page.locator('#composition-title').fill('Recovered snapshot');
    await page.locator('#btn-save-library').click();
    await page.evaluate(() => globalThis.saveRace.release());
    await expect.poll(() => page.evaluate(() => globalThis.saveRace.writes.length)).toBe(1);
    expect(await page.evaluate(() => globalThis.saveRace.writes[0])).toEqual({ id, title: 'Recovered snapshot', expectedRevision: 1, revision: 2 });
    expect(await savedProject(page, id)).toMatchObject({ projectTitle: 'Recovered snapshot', revision: 2 });
  } finally { await page.close(); }
});
