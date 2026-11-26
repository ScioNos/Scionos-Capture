const path = require('node:path');
const { test, expect, chromium } = require('@playwright/test');
let context, origin;
test.beforeAll(async () => {
  const root = path.resolve(__dirname, '../..');
  context = await chromium.launchPersistentContext('', { channel: 'chromium', headless: true,
    viewport: { width: 1440, height: 1000 }, args: ['--disable-extensions-except=' + root, '--load-extension=' + root] });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  origin = 'chrome-extension://' + new URL(worker.url()).host;
});
test.afterAll(async () => { await context?.close(); });

async function pdfContents(page) {
  await page.evaluate(() => { globalThis.print = () => {}; });
  await page.locator('#btn-pdf').click(); await page.locator('#export-confirm').click();
  await expect(page.locator('#export-dialog')).not.toBeVisible();
  const bytes = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({ data: new Uint8Array(bytes), isEvalSupported: false, useSystemFonts: true });
  try {
    const pdf = await task.promise, text = [], links = [];
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number);
      text.push(...(await page.getTextContent()).items.map(item => item.str || ''));
      links.push(...(await page.getAnnotations()).filter(annotation => annotation.subtype === 'Link'));
    }
    return { text: text.join(' '), links };
  } finally {
    await task.destroy();
    await page.evaluate(() => globalThis.dispatchEvent(new globalThis.Event('afterprint')));
  }
}

test('legacy bitmap-coordinate text absent from pixels cannot reappear in PDF or through undo and redo', async () => {
  const page = await context.newPage();
  const secret = 'LEGACY_INVISIBLE_BITMAP_SECRET';
  try {
    await page.goto(origin + '/editor.html');
    const id = await page.evaluate(async secret => {
      const canvas = document.createElement('canvas'); canvas.width = 400; canvas.height = 250;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 400, 250);
      // Deliberately no glyphs: the legacy metadata must not confer paint evidence.
      const blob = await new Promise(resolve => canvas.toBlob(resolve));
      const id = globalThis.crypto.randomUUID(), createdAt = Date.now();
      await CaptureStore.putCapture({ id, blob, width: 400, height: 250, createdAt,
        expiresAt: createdAt + 300000, title: 'Legacy pixels', url: '', scale: 1,
        textCoordinateSpace: 'bitmap', textLayerLimited: false,
        textBlocks: [{ text: secret, x: 30, y: 40, width: 320, height: 24, fontSize: 18, url: 'https://example.com/legacy-secret' }] });
      return id;
    }, secret);
    await page.goto(origin + '/editor.html?capture=' + id);
    await expect(page.locator('#main-canvas')).toHaveAttribute('width', '400');
    expect(await page.locator('#main-canvas').evaluate(canvas => [...canvas.getContext('2d').getImageData(50, 50, 1, 1).data])).toEqual([255, 255, 255, 255]);
    const initial = await pdfContents(page);
    expect(initial.text).not.toContain(secret); expect(initial.links).toEqual([]);
    await page.locator('#tool-step').click(); await page.locator('#main-canvas').click({ position: { x: 100, y: 160 } });
    await expect(page.locator('#btn-undo')).toBeEnabled();
    await page.locator('#btn-undo').click();
    const undone = await pdfContents(page);
    expect(undone.text).not.toContain(secret); expect(undone.links).toEqual([]);
    await page.locator('#btn-redo').click();
    const redone = await pdfContents(page);
    expect(redone.text).not.toContain(secret); expect(redone.links).toEqual([]);
  } finally { await page.close(); }
});
