const path = require('node:path');
const { test, expect, chromium } = require('@playwright/test');
let context, origin;
test.beforeAll(async () => {
  const root = path.resolve(__dirname, '../..');
  context = await chromium.launchPersistentContext('', { channel: 'chromium', headless: true, acceptDownloads: true,
    args: ['--disable-extensions-except=' + root, '--load-extension=' + root] });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  origin = 'chrome-extension://' + new URL(worker.url()).host;
});
test.afterAll(async () => { await context?.close(); });

for (const scenario of [
  { format: 'png', stage: 'snapshot', encoding: 1 },
  { format: 'pdf', stage: 'snapshot', encoding: 1 },
  { format: 'pdf', stage: 'page raster', encoding: 2 },
  { format: 'pdf', stage: 'header raster after page URL creation', encoding: 3, imageOnly: true }
]) for (const cancel of ['button', 'Escape']) {
  const { format, stage } = scenario;
  test(`${cancel} cancels pending ${format} export during ${stage} without side effects and permits retry`, async () => {
    const page = await context.newPage();
    const downloads = [];
    page.on('download', download => downloads.push(download.suggestedFilename()));
    try {
      await page.goto(origin + '/editor.html');
      const bytes = await page.evaluate(async () => {
        const canvas = document.createElement('canvas'); canvas.width = 120; canvas.height = 80;
        const ctx = canvas.getContext('2d'); ctx.fillStyle = 'rgb(10,90,180)'; ctx.fillRect(0, 0, 120, 80);
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        canvas.width = canvas.height = 1;
        return [...new Uint8Array(await blob.arrayBuffer())];
      });
      await page.locator('#image-files').setInputFiles({ name: 'cancel-export.png', mimeType: 'image/png', buffer: Buffer.from(bytes) });
      await expect(page.locator('#composition-count')).toHaveText('1 / 30');
      const before = await page.locator('#main-canvas').evaluate(canvas => canvas.toDataURL());
      await page.locator('#btn-download').click();
      await page.locator('#export-format').selectOption(format);
      if (scenario.imageOnly) {
        await page.locator('#pdf-image-only').check();
        await page.locator('#pdf-header').check();
        await page.locator('#pdf-header-title').check();
        await page.locator('#pdf-footer').uncheck();
      }
      await page.evaluate(({ encoding }) => {
        const create = document.createElement, encode = globalThis.HTMLCanvasElement.prototype.toBlob;
        const click = globalThis.HTMLAnchorElement.prototype.click, print = globalThis.print;
        const createUrl = URL.createObjectURL, revokeUrl = URL.revokeObjectURL;
        const state = globalThis.__exportCancellation = { canvases: [], prints: 0, downloads: 0, gateUsed: false, resume: null, encodings: 0, encoded: [], created: [], revoked: [] };
        URL.createObjectURL = function (...args) { const url = createUrl.apply(this, args); state.created.push(url); return url; };
        URL.revokeObjectURL = function (url) { state.revoked.push(url); return revokeUrl.call(this, url); };
        document.createElement = function (...args) {
          const element = create.apply(this, args);
          if (args[0] === 'canvas') state.canvases.push(element);
          return element;
        };
        globalThis.HTMLCanvasElement.prototype.toBlob = function (...args) {
          state.encodings++; state.encoded.push(this);
          if (!state.gateUsed && state.encodings === encoding) {
            state.gateUsed = true; state.gated = this;
            state.resume = () => { state.resume = null; return encode.apply(this, args); };
            return;
          }
          return encode.apply(this, args);
        };
        globalThis.HTMLAnchorElement.prototype.click = function (...args) {
          if (this.download) state.downloads++;
          return click.apply(this, args);
        };
        globalThis.print = () => { state.prints++; };
        state.restore = () => {
          state.resume?.(); document.createElement = create;
          globalThis.HTMLCanvasElement.prototype.toBlob = encode;
          globalThis.HTMLAnchorElement.prototype.click = click;
          globalThis.print = print;
          URL.createObjectURL = createUrl; URL.revokeObjectURL = revokeUrl;
        };
      }, scenario);
      await page.locator('#export-confirm').click();
      await expect.poll(() => page.evaluate(() => Boolean(globalThis.__exportCancellation.resume))).toBe(true);
      await expect(page.locator('#export-confirm')).toBeDisabled();
      const gated = await page.evaluate(() => ({ dimensions: [globalThis.__exportCancellation.gated.width, globalThis.__exportCancellation.gated.height],
        encodings: globalThis.__exportCancellation.encodings,
        urls: globalThis.__exportCancellation.created.length,
        firstCopy: [globalThis.__exportCancellation.encoded[0].width, globalThis.__exportCancellation.encoded[0].height] }));
      expect(gated.encodings).toBe(scenario.encoding);
      if (scenario.encoding === 1) expect(gated.dimensions).toEqual([120, 80]);
      else expect(gated.firstCopy).toEqual([1, 1]); // snapshot encoding has completed before PDF raster encoding
      expect(gated.urls).toBe(scenario.imageOnly ? 1 : 0);
      if (cancel === 'button') await page.locator('#export-cancel').click();
      else await page.keyboard.press('Escape');
      await expect(page.locator('#export-dialog')).not.toBeVisible();
      await page.evaluate(() => globalThis.__exportCancellation.resume());
      // Completion of the export task is observable via its finally block; no timing sleep.
      await expect(page.locator('#export-confirm')).toBeEnabled();
      const result = await page.evaluate(() => ({ prints: globalThis.__exportCancellation.prints,
        downloads: globalThis.__exportCancellation.downloads,
        created: globalThis.__exportCancellation.created, revoked: globalThis.__exportCancellation.revoked,
        printChildren: document.getElementById('print-area').childNodes.length,
        printMarker: document.getElementById('print-area').hasAttribute('data-composition-print'),
        surfaces: globalThis.__exportCancellation.canvases.map(canvas => [canvas.width, canvas.height]) }));
      expect(result.revoked).toEqual(result.created);
      expect(new Set(result.revoked).size).toBe(result.revoked.length);
      expect(result.created).toHaveLength(scenario.imageOnly ? 1 : 0);
      expect(result.printChildren).toBe(0); expect(result.printMarker).toBe(false);
      expect.soft(result.prints, 'cancelled export must not print after encoding completes').toBe(0);
      expect.soft(result.downloads, 'cancelled export must not start a download after encoding completes').toBe(0);
      expect.soft(downloads, 'no browser download event after cancellation').toEqual([]);
      expect.soft(result.surfaces.length).toBeGreaterThan(0);
      expect.soft(result.surfaces.every(([width, height]) => width === 1 && height === 1), 'cancelled snapshot copies must be released').toBe(true);
      expect(await page.locator('#main-canvas').evaluate(canvas => canvas.toDataURL())).toBe(before);
      await page.evaluate(() => {
        globalThis.dispatchEvent(new globalThis.Event('afterprint'));
        globalThis.__exportCancellation.prints = globalThis.__exportCancellation.downloads = 0;
      });
      downloads.length = 0;
      await page.locator('#btn-download').click(); await page.locator('#export-format').selectOption(format);
      const download = format === 'png' ? page.waitForEvent('download') : null;
      await page.locator('#export-confirm').click();
      await expect(page.locator('#export-dialog')).not.toBeVisible();
      await expect(page.locator('#export-confirm')).toBeEnabled();
      if (download) await expect((await download).failure()).resolves.toBeNull();
      expect(await page.evaluate(() => ({ prints: globalThis.__exportCancellation.prints, downloads: globalThis.__exportCancellation.downloads })))
        .toEqual(format === 'pdf' ? { prints: 1, downloads: 0 } : { prints: 0, downloads: 1 });
      expect(await page.locator('#main-canvas').evaluate(canvas => canvas.toDataURL())).toBe(before);
    } finally {
      await page.evaluate(() => {
        globalThis.dispatchEvent(new globalThis.Event('afterprint'));
        globalThis.__exportCancellation?.restore();
      }).catch(() => {});
      await page.close();
    }
  });
}
