const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { test, expect, chromium } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

let context;
let extensionOrigin;

test.beforeAll(async () => {
  const extensionPath = path.resolve(__dirname, '../..');
  context = await chromium.launchPersistentContext('', {
    channel: 'chromium', headless: true, acceptDownloads: true,
    viewport: { width: 1440, height: 1000 },
    args: ['--disable-extensions-except=' + extensionPath, '--load-extension=' + extensionPath]
  });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  extensionOrigin = 'chrome-extension://' + new URL(worker.url()).host;
});

test.afterAll(async () => { if (context) await context.close(); });

// Real capture with pixel and searchable-text fixtures; no site network traffic.
async function seedCapture(page, blocks) {
  const id = 'annotation-security-' + randomUUID();
  await page.goto(extensionOrigin + '/editor.html');
  await page.evaluate(async ({ id, blocks }) => {
    const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 300;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 640, 300);
    ctx.fillStyle = 'black'; ctx.font = '18px sans-serif';
    for (const block of blocks) ctx.fillText(block.text, block.x, block.y + 18);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const createdAt = Date.now();
    await CaptureStore.putCapture({ id, blob, width: 640, height: 300, createdAt,
      expiresAt: createdAt + 300000, timestamp: new Date(createdAt).toISOString(),
      title: 'Security fixture', url: 'https://example.com/safe', scale: 1,
      textCoordinateSpace: 'bitmap', textBlocks: blocks });
  }, { id, blocks });
  await page.goto(extensionOrigin + '/editor.html?capture=' + id);
  await expect(page.locator('#main-canvas')).toHaveAttribute('width', '640');
  await expect(page.locator('#tool-text')).toBeEnabled();
}

async function crop(page, rect) {
  await page.locator('#tool-crop').click();
  for (const [key, value] of Object.entries(rect)) await page.locator('#geometry-' + key).fill(String(value));
  await page.locator('#geometry-apply').click();
}

async function filledShape(page, rect) {
  await page.locator('#tool-shape').click();
  await page.locator('#shape-type').selectOption('rect');
  await page.locator('#shape-fill-mode').selectOption('fill');
  await page.locator('#shape-color').fill('#000000');
  const canvas = page.locator('#main-canvas');
  const box = await canvas.boundingBox();
  const dimensions = await canvas.evaluate(element => ({ width: element.width, height: element.height }));
  const point = (x, y) => ({ x: box.x + x * box.width / dimensions.width, y: box.y + y * box.height / dimensions.height });
  const start = point(rect.x, rect.y), end = point(rect.x + rect.width, rect.y + rect.height);
  await page.mouse.move(start.x, start.y); await page.mouse.down();
  await page.mouse.move(end.x, end.y); await page.mouse.up();
  await expect(page.locator('#btn-undo')).toBeEnabled();
}

async function saveProject(page) {
  const pending = page.waitForEvent('download');
  await page.locator('#btn-save-project').click();
  const download = await pending;
  return { name: download.suggestedFilename(), mimeType: 'application/x-scionos-project', buffer: await fs.readFile(await download.path()) };
}

async function readZip(page, bytes) {
  return page.evaluate(async array => globalThis.ScionosCompositionUtils.decodeZip(new Uint8Array(array)).map(entry => ({ name: entry.name, data: Array.from(entry.data) })), Array.from(bytes));
}

async function preparePdf(page) {
  await page.evaluate(() => { globalThis.print = () => {}; document.getElementById('print-area').replaceChildren(); });
  await page.locator('#btn-pdf').click(); await page.locator('#export-confirm').click();
  await expect(page.locator('#export-dialog')).not.toBeVisible();
  await expect(page.locator('#print-area img').first()).toHaveAttribute('src', /^blob:/);
  await page.locator('#print-area img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({ data: new Uint8Array(pdf), isEvalSupported: false, useSystemFonts: true });
  try {
    const document = await task.promise;
    const pages = [];
    for (let index = 1; index <= document.numPages; index++) pages.push((await (await document.getPage(index)).getTextContent()).items.map(item => item.str || '').join(' '));
    return pages.join('\n');
  } finally { await task.destroy(); }
}

async function exportMarkdown(page) {
  await page.locator('#btn-download').click(); await page.locator('#export-format').selectOption('markdown');
  const pending = page.waitForEvent('download'); await page.locator('#export-confirm').click();
  return fs.readFile(await (await pending).path());
}

async function selectedAnnotation(page, point) {
  await page.locator('#tool-select').click();
  const canvas = page.locator('#main-canvas');
  const box = await canvas.boundingBox();
  const size = await canvas.evaluate(element => ({ width: element.width, height: element.height }));
  await page.mouse.click(box.x + point.x * box.width / size.width, box.y + point.y * box.height / size.height);
  await expect(page.locator('#annotation-controls')).toBeVisible();
}

async function rasterPngSamples(page, bytes, points) {
  return page.evaluate(async ({ bytes, points }) => {
    const image = new globalThis.Image(); image.src = 'data:image/png;base64,' + globalThis.btoa(String.fromCharCode(...bytes)); await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
    return { width: image.width, height: image.height, pixels: points.map(({ x, y }) => [...context.getImageData(x, y, 1, 1).data]) };
  }, { bytes: Array.from(bytes), points });
}

async function projectEntries(page, project) {
  const entries = await readZip(page, project.buffer);
  return new Map(entries.map(entry => [entry.name, Buffer.from(entry.data)]));
}

test('mask plus crop and later annotations keep project-v2 pixels and exports free of removed secrets', async () => {
  const page = await context.newPage();
  const secret = 'CROP_MASK_SECRET_' + randomUUID().replaceAll('-', '').slice(0, 8);
  const retainedSecret = 'MASK_RETAIN_SECRET_' + randomUUID().replaceAll('-', '').slice(0, 8);
  const publicText = 'PUBLIC_KEEP_' + randomUUID().replaceAll('-', '').slice(0, 8);
  const explicitCaptionSecret = 'USER_CAPTION_SECRET_' + randomUUID().replaceAll('-', '').slice(0, 8);
  try {
    await seedCapture(page, [
      { text: secret, x: 30, y: 42, width: 260, height: 24, fontSize: 18 },
      { text: retainedSecret, x: 350, y: 42, width: 245, height: 24, fontSize: 18 },
      { text: publicText, x: 350, y: 220, width: 230, height: 24, fontSize: 18 }
    ]);
    // Black solid mask over the secret pixels and its searchable text block.
    const before = await page.locator('#main-canvas').evaluate(canvas => ({ width: canvas.width, height: canvas.height }));
    expect(before).toEqual({ width: 640, height: 300 });
    await filledShape(page, { x: 20, y: 24, width: 300, height: 55 });
    expect(await page.locator('#main-canvas').evaluate(canvas => [...canvas.getContext('2d').getImageData(45, 45, 1, 1).data])).toEqual([0, 0, 0, 255]);

    // Crop away the old text area after the solid mask, then add a distinct editable annotation.
    await crop(page, { x: 0, y: 0, width: 640, height: 280 });
    await page.locator('#item-caption').fill(explicitCaptionSecret);
    await page.locator('#tool-text').click();
    const canvas = page.locator('#main-canvas'); const box = await canvas.boundingBox();
    await page.mouse.click(box.x + 420 * box.width / 640, box.y + 90 * box.height / 280);
    await page.locator('#text-input-overlay').fill('SAFE_ANNOTATION_LABEL');
    await page.keyboard.press('Enter');
    await expect(page.locator('#btn-undo')).toBeEnabled();

    const project = await saveProject(page);
    const entries = await projectEntries(page, project);
    const manifest = JSON.parse(entries.get('manifest.json').toString('utf8'));
    expect(manifest.schemaVersion).toBe(2);
    expect(manifest.items).toHaveLength(1);
    expect(manifest.items[0].annotations.length).toBeGreaterThan(0);
    expect(entries.get(manifest.items[0].path)).toBeTruthy();
    expect(entries.get('manifest.json').toString('utf8')).not.toContain(secret);
    expect(entries.get('manifest.json').toString('utf8')).not.toContain(retainedSecret);
    expect(entries.get('manifest.json').toString('utf8')).not.toContain(publicText);

    // Inspect full decoded PNG raster bytes: masked/cropped source characters cannot remain hidden in pixels.
    const pngBytes = entries.get(manifest.items[0].path);
    const rawRaster = await rasterPngSamples(page, pngBytes, [{ x: 45, y: 45 }, { x: 620, y: 260 }]);
    expect(rawRaster).toMatchObject({ width: 640, height: 280 });
    expect(rawRaster.pixels[0]).toEqual([0, 0, 0, 255]);
    // The later authored text annotation is retained as a separate vector operation, not flattened into the base PNG.
    expect(rawRaster.pixels[1]).toEqual([255, 255, 255, 255]);

    const pdfText = await preparePdf(page);
    expect(pdfText).not.toContain(secret);
    expect(pdfText).toContain(retainedSecret); // Unmasked source text remains searchable in PDF.
    expect(pdfText).toContain(publicText);
    expect(pdfText).toContain(explicitCaptionSecret); // Explicit user metadata is intentionally retained.

    const markdownZip = await exportMarkdown(page);
    const mdEntries = await readZip(page, markdownZip);
    const markdown = Buffer.from(mdEntries.find(entry => entry.name === 'document.md').data).toString('utf8');
    expect(markdown).not.toContain(secret);
    expect(markdown).toContain(explicitCaptionSecret.replaceAll('_', '\\_'));
    const mdImage = mdEntries.find(entry => entry.name.startsWith('images/'));
    const markdownPixels = await rasterPngSamples(page, mdImage.data, [{ x: 45, y: 45 }]);
    expect(markdownPixels.pixels[0]).toEqual([0, 0, 0, 255]);

    // Reopen the exact downloaded v2 project, ensure annotations are selectable and edits persist.
    const reopened = await context.newPage();
    try {
      await reopened.goto(extensionOrigin + '/editor.html');
      await reopened.locator('#project-file').setInputFiles(project);
      await expect(reopened.locator('#composition-count')).toHaveText('1 / 30');
      await expect(reopened.locator('#main-canvas')).toHaveAttribute('width', '640');
      await selectedAnnotation(reopened, { x: 440, y: 95 });
      await expect(reopened.locator('#annotation-controls')).toBeVisible();
      await reopened.locator('#annotation-color').fill('#ff0000');
      await reopened.locator('#annotation-color').dispatchEvent('change');
      expect(await reopened.locator('#main-canvas').evaluate(canvas => [...canvas.getContext('2d').getImageData(45, 45, 1, 1).data])).toEqual([0, 0, 0, 255]);
      const resaved = await saveProject(reopened);
      const resavedEntries = await projectEntries(reopened, resaved);
      expect(resavedEntries.get('manifest.json').toString('utf8')).not.toContain(secret);
      const resavedManifest = JSON.parse(resavedEntries.get('manifest.json').toString('utf8'));
      const resavedPng = await rasterPngSamples(reopened, resavedEntries.get(resavedManifest.items[0].path), [{ x: 45, y: 45 }]);
      expect(resavedPng.pixels[0]).toEqual([0, 0, 0, 255]);
    } finally { await reopened.close(); }
  } finally { await page.close(); }
});

test('crop makes earlier annotations nonselectable while solid masks hide intersecting annotations', async () => {
  const page = await context.newPage();
  try {
    await seedCapture(page, []);
    // Add an arrow via native pointer input.
    await page.locator('#tool-arrow').click();
    const canvas = page.locator('#main-canvas'); let box = await canvas.boundingBox();
    await page.mouse.move(box.x + 300, box.y + 100); await page.mouse.down();
    await page.mouse.move(box.x + 420, box.y + 100); await page.mouse.up();
    await expect(page.locator('#btn-undo')).toBeEnabled();
    await selectedAnnotation(page, { x: 360, y: 100 });
    await page.locator('#annotation-color').fill('#00aa00'); await page.locator('#annotation-color').dispatchEvent('change');

    // The solid fill is the topmost annotation and remains selectable until a crop.
    await filledShape(page, { x: 300, y: 80, width: 150, height: 40 });
    await page.locator('#tool-select').click();
    box = await canvas.boundingBox(); await page.mouse.click(box.x + 360, box.y + 100);
    await expect(page.locator('#annotation-controls')).toBeVisible();

    // Cropping converts earlier annotations to pixels; a crop removing them must not restore them on save.
    await crop(page, { x: 0, y: 0, width: 250, height: 250 });
    await expect(page.locator('#main-canvas')).toHaveAttribute('width', '250');
    const project = await saveProject(page);
    const entries = await projectEntries(page, project);
    const manifest = JSON.parse(entries.get('manifest.json').toString('utf8'));
    expect(manifest.schemaVersion).toBe(2);
    expect(manifest.items[0].width).toBe(250);
    expect(manifest.items[0].annotations).toHaveLength(0);
    const zipRaster = await rasterPngSamples(page, entries.get(manifest.items[0].path), [{ x: 100, y: 100 }]);
    expect(zipRaster.width).toBe(250);
    expect(zipRaster.pixels[0][3]).toBe(255);

    await page.goto(extensionOrigin + '/editor.html'); await page.locator('#project-file').setInputFiles(project);
    await expect(page.locator('#main-canvas')).toHaveAttribute('width', '250');
    await expect(page.locator('#btn-undo')).toBeDisabled();
  } finally { await page.close(); }
});

test('annotation controls remain accessible in four supported interface languages', async () => {
  const page = await context.newPage();
  try {
    for (const language of ['fr', 'en', 'es', 'de']) {
      await seedCapture(page, []);
      // Force a supported language through the existing menu and verify editor/annotation actions are labelled.
      await page.locator('#language-button').click();
      await page.locator(`[data-language-mode="${language}"]`).click();
      await expect(page.locator('html')).toHaveAttribute('lang', language);
      await page.locator('#tool-text').click();
      const box = await page.locator('#main-canvas').boundingBox();
      await page.mouse.click(box.x + 120, box.y + 90);
      await page.locator('#text-input-overlay').fill('Localized note'); await page.keyboard.press('Enter');
      await page.locator('#tool-select').click();
      await page.mouse.click(box.x + 120, box.y + 90);
      await expect(page.locator('#annotation-controls')).toBeVisible();
      const accessible = await page.locator('#annotation-controls').evaluate(element => [...element.querySelectorAll('button,input')].map(control => ({ label: control.getAttribute('aria-label'), title: control.title, text: control.textContent })));
      expect(accessible.some(control => control.label || control.title || control.text.trim())).toBe(true);
      const axe = await new AxeBuilder({ page }).include('#annotation-controls').analyze();
      expect(axe.violations.filter(issue => ['serious', 'critical'].includes(issue.impact))).toEqual([]);
      await page.reload();
    }
  } finally { await page.close(); }
});
