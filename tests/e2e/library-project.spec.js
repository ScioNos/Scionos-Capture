const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { test, expect, chromium } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

let context;
let extensionOrigin;

test.beforeAll(async () => {
  context = await chromium.launchPersistentContext('', {
    channel: 'chromium', headless: true, acceptDownloads: true,
    viewport: { width: 1440, height: 1000 },
    args: ['--disable-extensions-except=' + path.resolve(__dirname, '../..'), '--load-extension=' + path.resolve(__dirname, '../..')]
  });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  extensionOrigin = 'chrome-extension://' + new URL(worker.url()).host;
});

test.afterAll(async () => { if (context) await context.close(); });

async function seedCapture(page) {
  const id = 'library-project-' + randomUUID();
  const secret = 'PRIVATE_' + randomUUID().replaceAll('-', '');
  const visible = 'PUBLIC_' + randomUUID().replaceAll('-', '');
  await page.goto(extensionOrigin + '/editor.html');
  await page.evaluate(async ({ id, secret, visible }) => {
    const surface = document.createElement('canvas'); surface.width = 640; surface.height = 240;
    const ctx = surface.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, surface.width, surface.height);
    ctx.fillStyle = '#000'; ctx.font = '18px sans-serif';
    ctx.fillText(secret, 40, 60); ctx.fillText(visible, 40, 160);
    const blob = await new Promise(resolve => surface.toBlob(resolve, 'image/png'));
    const createdAt = Date.now();
    await CaptureStore.putCapture({ id, blob, width: 640, height: 240, createdAt,
      expiresAt: createdAt + 300000, timestamp: new Date(createdAt).toISOString(),
      title: 'Capture de test', url: 'https://example.com/private-fixture', scale: 1,
      textCoordinateSpace: 'bitmap', textBlocks: [
        { text: secret, x: 40, y: 40, width: 500, height: 24, fontSize: 18 },
        { text: visible, x: 40, y: 140, width: 500, height: 24, fontSize: 18 }
      ] });
  }, { id, secret, visible });
  await page.goto(extensionOrigin + '/editor.html?capture=' + id);
  await expect(page.locator('#main-canvas')).toHaveAttribute('width', '640');
  return { id, secret, visible };
}

async function canvasPixel(page, x, y) {
  return page.locator('#main-canvas').evaluate((canvas, point) =>
    [...canvas.getContext('2d').getImageData(point.x, point.y, 1, 1).data], { x, y });
}

async function solidMask(page, bounds = { x: 30, y: 30, width: 520, height: 50 }) {
  await page.locator('#tool-censor').click();
  await page.locator('#censor-type').selectOption('color');
  await page.locator('#censor-shape').selectOption('rect');
  await page.locator('#censor-color').evaluate(input => {
    input.value = '#000000'; input.dispatchEvent(new globalThis.Event('input', { bubbles: true }));
  });
  for (const [key, value] of Object.entries(bounds)) await page.locator('#geometry-' + key).fill(String(value));
  await page.locator('#geometry-apply').click();
  await expect(page.locator('#btn-undo')).toBeEnabled();
}

async function downloadProject(page) {
  const waiting = page.waitForEvent('download');
  await page.locator('#btn-save-project').click();
  const download = await waiting;
  const filename = await download.path();
  if (!filename) throw new Error('Project download was not persisted.');
  return { name: download.suggestedFilename(), mimeType: 'application/x-scionos-project', buffer: await fs.readFile(filename) };
}

async function pdfText(page) {
  await page.evaluate(() => { globalThis.print = () => {}; document.getElementById('print-area').replaceChildren(); });
  await page.locator('#btn-pdf').click();
  await page.locator('#export-confirm').click();
  await expect(page.locator('#export-dialog')).not.toBeVisible();
  await expect(page.locator('#print-area img').first()).toHaveAttribute('src', /^blob:/);
  const bytes = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({ data: new Uint8Array(bytes), isEvalSupported: false, useSystemFonts: true });
  try {
    const pdf = await task.promise;
    const text = [];
    for (let i = 1; i <= pdf.numPages; i++) text.push((await (await pdf.getPage(i)).getTextContent()).items.map(item => item.str || '').join(' '));
    return text.join('\n');
  } finally { await task.destroy(); }
}

async function canvasPoint(page, x, y) {
  const canvas = page.locator('#main-canvas');
  const box = await canvas.boundingBox();
  const size = await canvas.evaluate(element => ({ width: element.width, height: element.height }));
  return { x: box.x + x / size.width * box.width, y: box.y + y / size.height * box.height };
}

async function createTextAnnotation(page, label, x = 80, y = 140) {
  await page.locator('#tool-text').click();
  const point = await canvasPoint(page, x, y);
  await page.mouse.click(point.x, point.y);
  const input = page.locator('#text-input-overlay');
  await expect(input).toBeVisible();
  await input.fill(label);
  await input.press('Enter');
  await expect(page.locator('#btn-undo')).toBeEnabled();
}

async function selectAnnotation(page, x = 80, y = 140) {
  await page.locator('#tool-select').click();
  const point = await canvasPoint(page, x, y);
  await page.mouse.click(point.x, point.y);
  await expect(page.locator('#annotation-controls')).toBeVisible();
}

async function projectManifest(page, file) {
  return page.evaluate(bytes => {
    const entries = globalThis.ScionosCompositionUtils.decodeZip(Uint8Array.from(bytes));
    const manifest = entries.find(entry => entry.name === 'manifest.json');
    return JSON.parse(new globalThis.TextDecoder().decode(manifest.data));
  }, [...file.buffer]);
}

async function legacyProjectFixture(page) {
  const bytes = await page.evaluate(async () => {
    const canvas = document.createElement('canvas'); canvas.width = 100; canvas.height = 80;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#3a7'; ctx.fillRect(0, 0, 100, 80);
    const png = new Uint8Array(await (await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))).arrayBuffer());
    const manifest = { schemaVersion: 1, title: 'Ancien projet', settings: { direction: 'vertical', gap: 0, padding: 0, background: '#ffffff', title: 'Ancien projet', numbered: false }, exportSettings: {}, items: [{ id: 'legacy-item', path: 'images/001.png', width: 100, height: 80, title: 'Ancienne image', caption: '', url: '', timestamp: null }] };
    return [...globalThis.ScionosCompositionUtils.encodeZip([{ name: 'manifest.json', data: new globalThis.TextEncoder().encode(JSON.stringify(manifest)) }, { name: 'images/001.png', data: png }])];
  });
  return { name: 'legacy.scionos', mimeType: 'application/x-scionos-project', buffer: Buffer.from(bytes) };
}

const cards = page => page.locator('#project-list .card');
const card = (page, title) => cards(page).filter({ has: page.getByRole('heading', { name: title, exact: true }) });
async function cleanLibrary(page) {
  await page.goto(extensionOrigin + '/library.html');
  await expect(page.locator('#library-search')).toBeVisible();
  await page.evaluate(async () => {
    for (const item of await CaptureStore.listLibraryProjects()) await CaptureStore.deleteLibraryProject(item.id, item.revision);
  });
  await page.reload();
  await expect(cards(page)).toHaveCount(0);
}

test('v2 project keeps editable annotations and burns masks into the saved image', async () => {
  const page = await context.newPage();
  const reopened = await context.newPage();
  try {
    const { secret, visible } = await seedCapture(page);
    await createTextAnnotation(page, 'SECRET_ANNOTATION', 80, 45);
    await createTextAnnotation(page, 'Annotation conservée', 80, 185);
    await solidMask(page);
    expect(await canvasPixel(page, 45, 45)).toEqual([0, 0, 0, 255]);
    const project = await downloadProject(page);
    const manifest = await projectManifest(page, project);
    expect(manifest.schemaVersion).toBe(2);
    expect(manifest.items[0].annotations.some(annotation => annotation.text === 'Annotation conservée')).toBe(true);
    expect(JSON.stringify(manifest)).not.toContain(secret);
    expect(JSON.stringify(manifest)).not.toContain('SECRET_ANNOTATION');
    await reopened.goto(extensionOrigin + '/editor.html');
    await reopened.locator('#project-file').setInputFiles(project);
    await expect(reopened.locator('#main-canvas')).toHaveAttribute('width', '640');
    expect(await canvasPixel(reopened, 45, 45)).toEqual([0, 0, 0, 255]);
    await selectAnnotation(reopened, 80, 185);
    await expect(reopened.locator('#annotation-text')).toHaveValue('Annotation conservée');
    await reopened.locator('#annotation-text').fill('Annotation modifiée');
    await reopened.locator('#annotation-text').press('Tab');
    const updated = await downloadProject(reopened);
    expect((await projectManifest(reopened, updated)).items[0].annotations.some(annotation => annotation.text === 'Annotation modifiée')).toBe(true);
    const text = await pdfText(reopened);
    expect(text).not.toContain(secret);
    // Imported projects deliberately have no trusted source text layer.
    expect(text).not.toContain(visible);
    expect(await canvasPixel(reopened, 45, 45)).toEqual([0, 0, 0, 255]);
  } finally { await reopened.close(); await page.close(); }
});

test('moving an annotation near a canvas edge survives save and reopen', async () => {
  const page = await context.newPage();
  const reopened = await context.newPage();
  try {
    await seedCapture(page);
    await createTextAnnotation(page, 'EDGE', 180, 140);
    await selectAnnotation(page, 200, 150);
    const start = await canvasPoint(page, 200, 150);
    const end = await canvasPoint(page, 50, 25);
    await page.mouse.move(start.x, start.y); await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 5 }); await page.mouse.up();
    const file = await downloadProject(page);
    const manifest = await projectManifest(page, file);
    const annotation = manifest.items[0].annotations.find(item => item.text === 'EDGE');
    expect(annotation).toBeTruthy();
    expect(annotation.x).toBeGreaterThanOrEqual(0);
    expect(annotation.x).toBeLessThan(100);
    expect(annotation.y).toBeGreaterThanOrEqual(0);
    expect(annotation.y).toBeLessThan(60);
    await reopened.goto(extensionOrigin + '/editor.html');
    await reopened.locator('#project-file').setInputFiles(file);
    await expect(reopened.locator('#main-canvas')).toHaveAttribute('width', '640');
    await selectAnnotation(reopened, annotation.x + 10, annotation.y + 10);
    await expect(reopened.locator('#annotation-text')).toHaveValue('EDGE');
  } finally { await reopened.close(); await page.close(); }
});

test('v1 flattened project opens safely and saves as a v2 project', async () => {
  const page = await context.newPage();
  try {
    await page.goto(extensionOrigin + '/editor.html');
    const legacy = await legacyProjectFixture(page);
    await page.locator('#project-file').setInputFiles(legacy);
    await expect(page.locator('#main-canvas')).toHaveAttribute('width', '100');
    expect(await canvasPixel(page, 50, 40)).toEqual([51, 170, 119, 255]);
    const migrated = await downloadProject(page);
    const manifest = await projectManifest(page, migrated);
    expect(manifest.schemaVersion).toBe(2);
    expect(manifest.title).toBe('Ancien projet');
    expect(manifest.items[0].annotations).toEqual([]);
  } finally { await page.close(); }
});

test('library saves, searches, renames, duplicates, opens and deletes a project', async () => {
  const page = await context.newPage();
  const library = await context.newPage();
  try {
    await cleanLibrary(library);
    await seedCapture(page);
    await page.locator('#composition-title').fill('Projet alpha');
    await createTextAnnotation(page, 'Étape modifiable');
    await page.locator('#btn-save-library').click();
    await expect.poll(() => page.evaluate(async () => (await CaptureStore.listLibraryProjects()).length)).toBe(1);
    await library.reload();
    await expect(card(library, 'Projet alpha')).toBeVisible();
    await expect(card(library, 'Projet alpha').locator('img')).toBeVisible();
    await library.locator('#library-search').fill('private-fixture');
    await expect(cards(library)).toHaveCount(1);
    await library.locator('#library-search').fill('introuvable');
    await expect(cards(library)).toHaveCount(0);
    await library.locator('#library-search').clear();
    library.once('dialog', dialog => dialog.accept('Projet renommé'));
    await card(library, 'Projet alpha').getByRole('button', { name: /Renommer|Rename/ }).click();
    await expect(card(library, 'Projet renommé')).toBeVisible();
    await card(library, 'Projet renommé').getByRole('button', { name: /Dupliquer|Duplicate/ }).click();
    await expect(cards(library)).toHaveCount(2);
    await card(library, 'Projet renommé').getByRole('button', { name: /Ouvrir|Open/ }).click();
    await library.waitForURL(/editor\.html\?project=/);
    await expect(library.locator('#composition-title')).toHaveValue('Projet renommé');
    await selectAnnotation(library);
    await expect(library.locator('#annotation-text')).toHaveValue('Étape modifiable');
    await library.goto(extensionOrigin + '/library.html');
    await expect(cards(library)).toHaveCount(2);
    library.once('dialog', dialog => dialog.accept());
    await card(library, 'Projet renommé').getByRole('button', { name: /Supprimer|Delete/ }).click();
    await expect(cards(library)).toHaveCount(1);
    library.once('dialog', dialog => dialog.accept());
    await library.locator('#delete-all').click();
    await expect(cards(library)).toHaveCount(0);
  } finally { await library.close(); await page.close(); }
});

test('library settings validate quota and keep selected retention across reload', async () => {
  const page = await context.newPage();
  try {
    await cleanLibrary(page);
    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(accessibility.violations.filter(item => ['serious', 'critical'].includes(item.impact))).toEqual([]);
    await page.locator('#library-search').focus();
    await expect(page.locator('#library-search')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('#retention-days')).toBeFocused();
    await page.locator('#budget-mib').fill('63');
    await page.locator('#save-preferences').click();
    await expect(page.locator('#library-status')).toHaveAttribute('role', 'alert');
    await page.locator('#budget-mib').fill('64');
    await page.locator('#retention-days').selectOption('30');
    await page.locator('#save-preferences').click();
    await expect(page.locator('#library-status')).toContainText(/enregistrés|saved/i);
    await page.reload();
    await expect(page.locator('#budget-mib')).toHaveValue('64');
    await expect(page.locator('#retention-days')).toHaveValue('30');
    const quotaResult = await page.evaluate(async () => {
      const id = globalThis.crypto.randomUUID();
      try {
        await CaptureStore.saveLibraryProject({ id, title: 'Quota', blob: new Blob([new Uint8Array(64 * 1024 * 1024 + 1)]) }, { expectedRevision: null });
        return { accepted: true, stored: Boolean(await CaptureStore.getLibraryProject(id)) };
      } catch (error) {
        return { accepted: false, code: error.code, stored: Boolean(await CaptureStore.getLibraryProject(id)) };
      }
    });
    expect(quotaResult).toEqual({ accepted: false, code: 'LIBRARY_QUOTA_EXCEEDED', stored: false });
    await page.locator('#budget-mib').fill('256');
    await page.locator('#retention-days').selectOption('0');
    await page.locator('#save-preferences').click();
    await expect(page.locator('#library-status')).toContainText(/enregistrés|saved/i);
  } finally { await page.close(); }
});
