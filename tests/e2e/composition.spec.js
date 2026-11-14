const fs = require('node:fs/promises');
const path = require('node:path');
const zlib = require('node:zlib');
const { randomUUID } = require('node:crypto');
const { test, expect, chromium } = require('@playwright/test');

// Keep fixtures in memory: the extension must import the same bytes a user selects.
async function pngFixture(page, name, color, width = 240, height = 120) {
  const base64 = await page.evaluate(({ color, width, height }) => {
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d');
    context.fillStyle = color; context.fillRect(0, 0, width, height);
    return canvas.toDataURL('image/png').split(',')[1];
  }, { color, width, height });
  return { name, mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') };
}

async function downloadedBytes(download) {
  const filename = await download.path();
  if (!filename) throw new Error('The browser did not persist the download.');
  return fs.readFile(filename);
}

// Read ZIP directory entries instead of searching compressed bytes for Markdown.
// Support stored/deflated archives and reject encrypted, truncated or unsafe entries.
function unzipEntries(bytes) {
  let end = bytes.length - 22;
  while (end >= Math.max(0, bytes.length - 65_557) && bytes.readUInt32LE(end) !== 0x06054b50) end--;
  if (end < Math.max(0, bytes.length - 65_557)) throw new Error('ZIP end directory not found.');
  const count = bytes.readUInt16LE(end + 10);
  let cursor = bytes.readUInt32LE(end + 16);
  const entries = new Map();
  for (let index = 0; index < count; index++) {
    if (bytes.readUInt32LE(cursor) !== 0x02014b50) throw new Error('Invalid ZIP directory entry.');
    const flags = bytes.readUInt16LE(cursor + 8);
    const method = bytes.readUInt16LE(cursor + 10);
    const compressedSize = bytes.readUInt32LE(cursor + 20);
    const size = bytes.readUInt32LE(cursor + 24);
    const nameLength = bytes.readUInt16LE(cursor + 28);
    const extraLength = bytes.readUInt16LE(cursor + 30);
    const commentLength = bytes.readUInt16LE(cursor + 32);
    const local = bytes.readUInt32LE(cursor + 42);
    const name = bytes.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8');
    if (flags & 1 || name.includes('..') || name.startsWith('/') || entries.has(name)) throw new Error('Unsafe ZIP entry: ' + name);
    if (bytes.readUInt32LE(local) !== 0x04034b50) throw new Error('Invalid ZIP local header.');
    const start = local + 30 + bytes.readUInt16LE(local + 26) + bytes.readUInt16LE(local + 28);
    const compressed = bytes.subarray(start, start + compressedSize);
    const content = method === 0 ? compressed : method === 8 ? zlib.inflateRawSync(compressed) : null;
    if (!content || content.length !== size) throw new Error('Unsupported or truncated ZIP entry: ' + name);
    entries.set(name, content);
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

async function pdfPageTexts(page) {
  const bytes = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({ data: new Uint8Array(bytes), isEvalSupported: false, useSystemFonts: true });
  try {
    const document = await task.promise;
    const pages = [];
    for (let number = 1; number <= document.numPages; number++) {
      const content = await (await document.getPage(number)).getTextContent();
      pages.push(content.items.map(item => item.str || '').join(' '));
    }
    return pages;
  } finally { await task.destroy(); }
}
async function pdfText(page) { return (await pdfPageTexts(page)).join('\n'); }

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

async function seedTextCapture(page, url = 'https://example.com/public') {
  const id = 'composition-' + randomUUID();
  const secret = 'PRIVATE_' + randomUUID().replaceAll('-', '');
  const visible = 'PUBLIC_' + randomUUID().replaceAll('-', '');
  await page.goto(extensionOrigin + '/editor.html');
  await page.evaluate(async ({ id, secret, visible, url }) => {
    const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 240;
    const context = canvas.getContext('2d');
    context.fillStyle = 'white'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'black'; context.font = '18px sans-serif';
    context.fillText(secret, 40, 60); context.fillText(visible, 40, 160);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const createdAt = Date.now();
    await CaptureStore.putCapture({ id, blob, width: 640, height: 240,
      createdAt, expiresAt: createdAt + 300_000, timestamp: new Date(createdAt).toISOString(),
      title: 'PDF redaction fixture', url, scale: 1,
      textCoordinateSpace: 'bitmap', textLayerLimited: false,
      textBlocks: [
        { text: secret, x: 40, y: 40, width: 500, height: 24 },
        { text: visible, x: 40, y: 140, width: 500, height: 24 }
      ] });
  }, { id, secret, visible, url });
  await page.goto(extensionOrigin + '/editor.html?capture=' + id);
  return { secret, visible };
}

async function imagePixel(page, dataUrl, x, y) {
  return page.evaluate(async ({ dataUrl, x, y }) => {
    const image = new globalThis.Image(); image.src = dataUrl; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
    return { width: image.width, height: image.height, rgba: [...context.getImageData(x, y, 1, 1).data] };
  }, { dataUrl, x, y });
}

const items = page => page.locator('#composition-items li button');
async function openEmptyEditor(page) {
  await page.goto(extensionOrigin + '/editor.html');
  await expect(page.locator('#empty-state')).toBeVisible();
  await expect(page.locator('#composition-count')).toHaveText('0 / 30');
}
async function importPair(page) {
  const red = await pngFixture(page, 'red.png', '#ff0000');
  const blue = await pngFixture(page, 'blue.png', '#0000ff');
  await page.locator('#image-files').setInputFiles([red, blue]);
  await expect(items(page)).toHaveCount(2);
  await expect(page.locator('#main-canvas')).toHaveAttribute('width', '240');
}
async function exportDownload(page, format) {
  await page.locator('#btn-download').click();
  await page.locator('#export-format').selectOption(format);
  const waiting = page.waitForEvent('download');
  await page.locator('#export-confirm').click();
  const download = await waiting;
  await expect(page.locator('#export-dialog')).not.toBeVisible();
  return { name: download.suggestedFilename(), bytes: await downloadedBytes(download) };
}
async function saveProject(page) {
  const waiting = page.waitForEvent('download');
  await page.locator('#btn-save-project').click();
  const download = await waiting;
  expect(download.suggestedFilename()).toMatch(/\.scionos$/);
  return { name: download.suggestedFilename(), mimeType: 'application/x-scionos-project', buffer: await downloadedBytes(download) };
}
async function solidMask(page, { x = 20, y = 20, width = 80, height = 50 } = {}) {
  await page.locator('#tool-censor').click();
  await page.locator('#censor-type').selectOption('color');
  await page.locator('#censor-shape').selectOption('rect');
  await page.locator('#censor-color').evaluate(input => { input.value = '#000000'; input.dispatchEvent(new globalThis.Event('input', { bubbles: true })); });
  for (const [key, value] of Object.entries({ x, y, width, height })) await page.locator('#geometry-' + key).fill(String(value));
  await page.locator('#geometry-apply').click();
  await expect(page.locator('#btn-undo')).toBeEnabled();
}
async function canvasPixel(page, x, y) {
  return page.locator('#main-canvas').evaluate((canvas, point) => [...canvas.getContext('2d').getImageData(point.x, point.y, 1, 1).data], { x, y });
}
async function preparePdf(page) {
  await page.evaluate(() => { globalThis.print = () => {}; document.getElementById('print-area').replaceChildren(); });
  await page.locator('#btn-pdf').click();
  await page.locator('#export-confirm').click();
  await expect(page.locator('#export-dialog')).not.toBeVisible();
  await expect(page.locator('#print-area img').first()).toHaveAttribute('src', /^blob:/);
  await page.locator('#print-area img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
}

test('popup exposes help text, installed version and a working empty composition entry', async () => {
  const page = await context.newPage();
  try {
    await page.goto(extensionOrigin + '/popup.html');
    const version = await page.evaluate(() => globalThis.chrome.runtime.getManifest().version);
    await expect(page.locator('#txt-help')).toBeVisible();
    await expect(page.locator('#txt-help')).toHaveText(/Aide|Help|Hilfe|Ayuda/);
    await expect(page.locator('#popup-version')).toHaveText('v' + version);
    const opened = context.waitForEvent('page');
    await page.locator('#btn-compose').click();
    const editor = await opened;
    try {
      await editor.waitForURL(extensionOrigin + '/editor.html');
      await expect(editor.locator('#empty-state')).toBeVisible();
      await expect(editor.locator('#editor-version')).toHaveText('v' + version);
      for (const id of ['btn-download', 'btn-pdf', 'btn-html', 'btn-copy', 'btn-save-project']) await expect(editor.locator('#' + id)).toBeDisabled();
    } finally { await editor.close(); }
  } finally { if (!page.isClosed()) await page.close(); }
});

test('memory imports reorder and export both orientations with unchanged image proportions', async () => {
  const page = await context.newPage();
  try {
    await openEmptyEditor(page); await importPair(page);
    await page.locator('#item-title').fill('Red');
    await items(page).nth(1).click(); await page.locator('#item-title').fill('Blue');
    await page.locator('#item-up').click();
    await expect(items(page)).toHaveText(['1. Blue', '2. Red']);
    await expect(items(page).first()).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#item-up')).toBeDisabled();
    await expect(page.locator('#item-down')).toBeEnabled();
    // Empty headings remove their bands so exact image geometry is observable.
    await page.locator('#item-title').fill(''); await items(page).nth(1).click(); await page.locator('#item-title').fill('');
    const vertical = await exportDownload(page, 'png');
    const dataUrl = 'data:image/png;base64,' + vertical.bytes.toString('base64');
    expect(await imagePixel(page, dataUrl, 120, 60)).toEqual({ width: 240, height: 240, rgba: [0, 0, 255, 255] });
    expect((await imagePixel(page, dataUrl, 120, 180)).rgba).toEqual([255, 0, 0, 255]);
    await page.locator('#composition-direction').selectOption('horizontal');
    const horizontal = await exportDownload(page, 'png');
    const horizontalUrl = 'data:image/png;base64,' + horizontal.bytes.toString('base64');
    expect(await imagePixel(page, horizontalUrl, 120, 60)).toEqual({ width: 480, height: 120, rgba: [0, 0, 255, 255] });
    expect((await imagePixel(page, horizontalUrl, 360, 60)).rgba).toEqual([255, 0, 0, 255]);
    await page.locator('#item-remove').click(); await page.locator('#item-remove').click();
    await expect(items(page)).toHaveCount(0); await expect(page.locator('#empty-state')).toBeVisible();
    await expect(page.locator('#btn-download')).toBeDisabled();
  } finally { await page.close(); }
});

test('project round trip preserves ordered metadata, PDF settings and permanently flattened solid masks', async () => {
  const page = await context.newPage();
  const reopened = await context.newPage();
  try {
    await openEmptyEditor(page); await importPair(page);
    await page.locator('#item-title').fill('Masked red'); await page.locator('#item-caption').fill('Safe caption');
    await solidMask(page); expect(await canvasPixel(page, 50, 40)).toEqual([0, 0, 0, 255]);
    await page.locator('#btn-undo').click(); expect(await canvasPixel(page, 50, 40)).toEqual([255, 0, 0, 255]);
    await page.locator('#btn-redo').click(); expect(await canvasPixel(page, 50, 40)).toEqual([0, 0, 0, 255]);
    await items(page).nth(1).click(); await page.locator('#item-title').fill('Blue'); await page.locator('#item-up').click();
    await page.locator('#composition-title').fill('Round trip');
    await page.locator('#composition-direction').selectOption('horizontal');
    await page.locator('#composition-gap').fill('17'); await page.locator('#composition-padding').fill('9');
    await page.locator('#composition-numbered').check();
    await page.locator('#btn-pdf').click();
    await page.locator('#pdf-paper').selectOption('Letter'); await page.locator('#pdf-orientation').selectOption('landscape');
    await page.locator('#pdf-margin').fill('20'); await page.locator('#pdf-fit').uncheck(); await page.locator('#pdf-scale').fill('75');
    await page.locator('#pdf-header').uncheck(); await page.locator('#export-cancel').click();
    const project = await saveProject(page);
    const entries = unzipEntries(project.buffer);
    const manifest = JSON.parse(entries.get('manifest.json').toString('utf8'));
    expect(manifest.items.map(item => item.title)).toEqual(['Blue', 'Masked red']);
    expect(manifest.items[1].caption).toBe('Safe caption');
    expect(manifest.items.every(item => !('textBlocks' in item) && !('operations' in item))).toBe(true);
    await openEmptyEditor(reopened); await reopened.locator('#project-file').setInputFiles(project);
    await expect(items(reopened)).toHaveText(['1. Blue', '2. Masked red']);
    await expect(reopened.locator('#composition-title')).toHaveValue('Round trip');
    await expect(reopened.locator('#composition-direction')).toHaveValue('horizontal');
    await expect(reopened.locator('#composition-gap')).toHaveValue('17');
    await expect(reopened.locator('#composition-padding')).toHaveValue('9');
    await expect(reopened.locator('#composition-numbered')).toBeChecked();
    await items(reopened).nth(1).click(); expect(await canvasPixel(reopened, 50, 40)).toEqual([0, 0, 0, 255]);
    await expect(reopened.locator('#btn-undo')).toBeDisabled();
    await reopened.locator('#btn-pdf').click();
    await expect(reopened.locator('#pdf-paper')).toHaveValue('Letter');
    await expect(reopened.locator('#pdf-orientation')).toHaveValue('landscape');
    await expect(reopened.locator('#pdf-margin')).toHaveValue('20');
    await expect(reopened.locator('#pdf-scale')).toHaveValue('75');
    await expect(reopened.locator('#pdf-header')).not.toBeChecked();
    await reopened.locator('#export-cancel').click();
    const exported = await exportDownload(reopened, 'markdown');
    const files = unzipEntries(exported.bytes);
    const markdown = files.get('document.md').toString('utf8');
    expect(markdown.indexOf('Blue')).toBeLessThan(markdown.indexOf('Masked red'));
    expect(markdown).toContain('Safe caption');
    const references = [...markdown.matchAll(/!\[[^\n]*\]\((images\/[^)]+)\)/g)].map(match => match[1]);
    expect(references).toHaveLength(2);
    for (const reference of references) expect(files.has(reference)).toBe(true);
    const maskedUrl = 'data:image/png;base64,' + files.get(references[1]).toString('base64');
    expect((await imagePixel(reopened, maskedUrl, 50, 40)).rgba).toEqual([0, 0, 0, 255]);
  } finally { await page.close(); await reopened.close(); }
});

test('invalid imports preserve the document and pending masks block destructive or exporting actions', async () => {
  const page = await context.newPage();
  try {
    await openEmptyEditor(page); await importPair(page);
    await page.locator('#image-files').setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not a PNG') });
    await expect(page.locator('#toast')).toContainText(/Impossible|Unable/);
    await expect(items(page)).toHaveCount(2);
    const redBefore = await canvasPixel(page, 120, 60);
    await page.locator('#project-file').setInputFiles({ name: 'broken.scionos', mimeType: 'application/x-scionos-project', buffer: Buffer.from('not a ZIP') });
    await expect(items(page)).toHaveCount(2); expect(await canvasPixel(page, 120, 60)).toEqual(redBefore);
    await page.locator('#tool-censor').click(); await page.locator('#geometry-x').fill('30');
    await expect(page.locator('#geometry-panel')).toBeVisible();
    await page.locator('#item-remove').click(); await expect(items(page)).toHaveCount(2);
    await items(page).nth(1).click(); await expect(items(page).first()).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#btn-download').click(); await expect(page.locator('#export-dialog')).not.toBeVisible();
    await page.locator('#geometry-cancel').click(); await page.locator('#btn-download').click();
    await expect(page.locator('#export-dialog')).toBeVisible(); await page.locator('#export-cancel').click();
  } finally { await page.close(); }
});

test('long composition prints real multiple PDF pages with visible header, pagination and final image band', async () => {
  const page = await context.newPage();
  try {
    await openEmptyEditor(page);
    const buffer = Buffer.from(await page.evaluate(() => {
      const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 5000;
      const context = canvas.getContext('2d'); context.fillStyle = '#ff0000'; context.fillRect(0, 0, 640, 5000);
      context.fillStyle = '#0000ff'; context.fillRect(0, 4900, 640, 100);
      return canvas.toDataURL('image/png').split(',')[1];
    }), 'base64');
    await page.locator('#image-files').setInputFiles({ name: 'long.png', mimeType: 'image/png', buffer });
    await expect(items(page)).toHaveCount(1);
    await page.locator('#composition-title').fill('MULTIPAGE REPORT');
    await preparePdf(page);
    const slices = page.locator('#print-area .composition-print-slice > img');
    const count = await slices.count(); expect(count).toBeGreaterThan(1);
    const lastImage = await slices.last().getAttribute('src');
    const lastPixel = await page.evaluate(async src => {
      const image = new globalThis.Image(); image.src = src; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
      return [...context.getImageData(Math.floor(canvas.width / 2), canvas.height - 2, 1, 1).data];
    }, lastImage);
    expect(lastPixel).toEqual([0, 0, 255, 255]);
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.composition-print-band').first()).toBeVisible();
    const pages = await pdfPageTexts(page);
    expect(pages).toHaveLength(count);
    for (let index = 0; index < pages.length; index++) {
      expect(pages[index]).toContain('MULTIPAGE REPORT');
      expect(pages[index]).toContain(`${index + 1} / ${count}`);
    }
  } finally { await page.close(); }
});

test('composition exports never embed credentials from the captured source URL', async () => {
  const page = await context.newPage();
  const marker = 'COMPOSITION_AUTH_' + randomUUID().replaceAll('-', '');
  try {
    await seedTextCapture(page, 'https://alice:' + marker + '@example.com/private');
    const html = await exportDownload(page, 'html');
    const htmlText = html.bytes.toString('utf8');
    expect(htmlText).not.toContain(marker); expect(htmlText).not.toContain('https://alice:');
    expect(htmlText).toContain('https://example.com/private');
    const markdown = await exportDownload(page, 'markdown');
    const entries = unzipEntries(markdown.bytes);
    const document = entries.get('document.md').toString('utf8');
    expect(document).not.toContain(marker); expect(document).not.toContain('https://alice:');
    expect(document).toContain('https://example.com/private');
    await preparePdf(page);
    const printed = await pdfText(page);
    expect(printed).not.toContain(marker); expect(printed).not.toContain('https://alice:');
    expect(printed).toContain('https://example.com/private');
  } finally { await page.close(); }
});

test('composition PDF retains public source text but never restores masked confidential text', async () => {
  const page = await context.newPage();
  try {
    const { secret, visible } = await seedTextCapture(page);
    await expect(page.locator('#tool-censor')).toBeEnabled();
    await preparePdf(page);
    const baseline = await pdfText(page); expect(baseline).toContain(secret); expect(baseline).toContain(visible);
    await solidMask(page, { x: 30, y: 30, width: 520, height: 50 });
    const second = await pngFixture(page, 'second.png', '#0000ff', 640, 100);
    await page.locator('#image-files').setInputFiles(second); await expect(items(page)).toHaveCount(2);
    await page.locator('#composition-title').fill('Safe report');
    await preparePdf(page);
    const redacted = await pdfText(page); expect(redacted).toContain(visible); expect(redacted).toContain('Safe report'); expect(redacted).not.toContain(secret);
    const project = await saveProject(page);
    const entries = unzipEntries(project.buffer);
    expect(entries.get('manifest.json').toString('utf8')).not.toContain(secret);
    const reopened = await context.newPage();
    try {
      await openEmptyEditor(reopened); await reopened.locator('#project-file').setInputFiles(project);
      await expect(items(reopened)).toHaveCount(2); await preparePdf(reopened);
      const text = await pdfText(reopened); expect(text).not.toContain(secret); expect(text).toContain('Safe report');
    } finally { await reopened.close(); }
  } finally { await page.close(); }
});
