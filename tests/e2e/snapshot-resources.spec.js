const path = require('node:path');
const fs = require('node:fs/promises');
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
  { name: 'thumbnail copy', action: 'btn-save-project', draw: 1 },
  { name: 'project initial copy', action: 'btn-save-project', draw: 2 },
  { name: 'project crop after its source copy', action: 'btn-save-project', draw: 3, crop: true },
  { name: 'export initial copy', action: 'btn-html', draw: 2 }
]) test('snapshot releases owned canvases after ' + scenario.name + ' fails and permits retry', async () => {
  const page = await context.newPage();
  try {
    await page.goto(origin + '/editor.html');
    const bytes = await page.evaluate(async () => {
      const canvas = document.createElement('canvas'); canvas.width = 120; canvas.height = 80;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = 'rgb(10,90,180)'; ctx.fillRect(0, 0, 120, 80);
      return [...new Uint8Array(await (await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))).arrayBuffer())];
    });
    await page.locator('#image-files').setInputFiles({ name: 'snapshot.png', mimeType: 'image/png', buffer: Buffer.from(bytes) });
    await expect(page.locator('#composition-count')).toHaveText('1 / 30');
    if (scenario.crop) {
      await page.locator('#tool-crop').click();
      await page.locator('#geometry-width').fill('60'); await page.locator('#geometry-height').fill('40');
      await page.locator('#geometry-apply').click();
      await expect(page.locator('#main-canvas')).toHaveAttribute('width', '60');
    }
    const before = await page.locator('#main-canvas').evaluate(canvas => canvas.toDataURL());
    await page.evaluate(({ action, draw }) => {
      const originalCreate = document.createElement, originalDraw = globalThis.CanvasRenderingContext2D.prototype.drawImage;
      const state = globalThis.__snapshotResources = { active: false, canvases: [], draws: 0, failures: 0 };
      document.getElementById(action).addEventListener('click', () => { state.active = true; }, { capture: true, once: true });
      document.createElement = function (...args) {
        const element = originalCreate.apply(this, args);
        if (state.active && args[0] === 'canvas') state.canvases.push(element);
        return element;
      };
      globalThis.CanvasRenderingContext2D.prototype.drawImage = function (...args) {
        if (state.active && state.canvases.includes(this.canvas) && ++state.draws === draw) {
          state.failures++; throw new Error('snapshot drawing refused');
        }
        return originalDraw.apply(this, args);
      };
      state.restore = () => { state.active = false; document.createElement = originalCreate; globalThis.CanvasRenderingContext2D.prototype.drawImage = originalDraw; };
    }, scenario);
    await page.locator('#' + scenario.action).click();
    await expect(page.locator('#toast')).toContainText('snapshot drawing refused');
    const failed = await page.evaluate(() => {
      const state = globalThis.__snapshotResources; state.restore();
      return { failures: state.failures, canvases: state.canvases.map(canvas => [canvas.width, canvas.height]) };
    });
    expect(failed.failures).toBe(1); expect(failed.canvases.length).toBeGreaterThanOrEqual(scenario.draw);
    expect(failed.canvases.every(([width, height]) => width === 1 && height === 1)).toBe(true);
    expect(await page.locator('#main-canvas').evaluate(canvas => canvas.toDataURL())).toBe(before);
    const pending = page.waitForEvent('download'); await page.locator('#' + scenario.action).click();
    const download = await pending; await expect(download.failure()).resolves.toBeNull();
    const filename = await download.path(); expect((await fs.stat(filename)).size).toBeGreaterThan(0);
    expect(await page.locator('#main-canvas').evaluate(canvas => canvas.toDataURL())).toBe(before);
  } finally {
    await page.evaluate(() => globalThis.__snapshotResources?.restore()).catch(() => {});
    await page.close();
  }
});
