// Real activeTab, scripting, captureVisibleTab and IndexedDB transfer on disposable profiles.
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const browsers = process.argv.slice(2);
if (!browsers.length) browsers.push('chrome', 'msedge');
if (browsers.some(browser => !['chrome', 'msedge', 'chromium'].includes(browser))) throw new Error('Use chrome, msedge or chromium.');

const server = http.createServer((request, response) => {
  const full = request.url.includes('full');
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end('<!doctype html><title>Scionos native capture fixture</title><style>html,body{margin:0;background:rgb(30,120,210);'
    + (full ? 'width:1000px;height:650px' : 'width:800px;height:1200px')
    + '}footer{position:fixed;bottom:0;width:100%;height:100px;background:red}</style>' + (full ? '<footer></footer>' : ''));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const baseUrl = 'http://127.0.0.1:' + server.address().port;

try {
  for (const browser of browsers) {
    const context = await chromium.launchPersistentContext('', {
      channel: browser, headless: true, viewport: { width: 800, height: 600 }, deviceScaleFactor: 1,
      ignoreDefaultArgs: ['--disable-extensions'], args: ['--enable-unsafe-extension-debugging']
    });
    try {
      const cdp = await context.browser().newBrowserCDPSession();
      const extension = await cdp.send('Extensions.loadUnpacked', { path: root });
      for (const mode of ['visible', 'full', 'zone', 'scrolling']) {
        const page = await context.newPage();
        const errors = [];
        page.on('dialog', async dialog => { errors.push(dialog.message()); await dialog.dismiss(); });
        await page.goto(baseUrl + '/' + mode); await page.bringToFront();
        const { targetInfos } = await cdp.send('Target.getTargets', { filter: [{ type: 'tab', exclude: false }, { exclude: true }] });
        const target = targetInfos.find(item => item.url === page.url());
        assert(target, 'Native tab target is missing.');
        // This action grants activeTab. No extra host or tabs permissions are added.
        await cdp.send('Extensions.triggerAction', { id: extension.id, targetId: target.targetId });
        const popup = await context.newPage();
        await popup.goto('chrome-extension://' + extension.id + '/popup.html');
        await popup.waitForFunction(() => globalThis.document.getElementById('txt-visible-title').textContent);
        await page.bringToFront();
        const opened = context.waitForEvent('page', { timeout: 30000 });
        // Headless has no toolbar popup surface; run its unchanged UI in an inactive tab.
        await popup.locator('#btn-' + mode).evaluate(button => button.click());
        if (mode === 'zone') {
          await page.locator('[data-scionos-capture="selection"]').waitFor();
          await page.mouse.move(100, 100); await page.mouse.down(); await page.mouse.move(400, 350); await page.mouse.up();
        } else if (mode === 'scrolling') {
          await page.locator('[data-scionos-capture="scrolling-controls"]').waitFor();
          for (const [name, value] of Object.entries({ x: 100, y: 100, width: 300, height: 900 })) await page.locator('input[name="' + name + '"]').fill(String(value));
          await page.locator('[data-scionos-capture="scrolling-controls"] button[type="submit"]').click();
        }
        const editor = await opened;
        await editor.waitForURL('**/editor.html?capture=*');
        await editor.waitForFunction(() => globalThis.document.getElementById('tool-text').disabled === false);
        const result = await editor.locator('#main-canvas').evaluate((canvas, mode) => {
          const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
          let mismatches = 0;
          for (let index = 0; index < pixels.length; index += 4) {
            const y = Math.floor(index / 4 / canvas.width);
            const expected = mode === 'full' && y >= canvas.height - 100 ? [255, 0, 0] : [30, 120, 210];
            if (pixels[index] !== expected[0] || pixels[index + 1] !== expected[1] || pixels[index + 2] !== expected[2] || pixels[index + 3] !== 255) mismatches++;
          }
          return { width: canvas.width, height: canvas.height, mismatches };
        }, mode);
        const expected = { visible: [800, 600], full: [1000, 650], zone: [300, 250], scrolling: [300, 900] }[mode];
        assert.deepEqual(errors, [], 'Native capture errors: ' + errors.join('; '));
        assert.deepEqual(result, { width: expected[0], height: expected[1], mismatches: 0 });
        assert.equal(await page.evaluate(() => globalThis.scrollX + globalThis.scrollY), 0);
        console.log(browser + ' ' + mode + ': ' + result.width + '×' + result.height + ', all pixels verified');
        await editor.close(); if (!popup.isClosed()) await popup.close(); await page.close();
      }
      console.log(browser + ' version: ' + context.browser().version());
    } finally { await context.close(); }
  }
} finally { await new Promise(resolve => server.close(resolve)); }
