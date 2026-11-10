// Generate genuine extension UI screenshots using public, local demonstration content.
// No browser profile, remote site, production source, or marketing UI is used.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from '@playwright/test';

const require = createRequire(import.meta.url);
const { prepareFullPageHarness, frenchMessages } = require('../tests/e2e/helpers/capture.js');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'store-assets');
const html = `<!doctype html><html lang="fr"><meta charset="utf-8"><title>Guide de démonstration</title>
<style>*{box-sizing:border-box}body{margin:0;background:#f1f5f9;color:#17243a;font:18px/1.65 system-ui,sans-serif}article{max-width:1080px;margin:30px auto;padding:36px 56px;background:white;border-top:6px solid #0284c7}small{color:#0369a1;font-weight:700;letter-spacing:.08em}h1{font-size:40px;line-height:1.2;margin:14px 0 20px}h2{font-size:24px;margin:22px 0 8px}p{margin:10px 0}.intro{font-size:21px;color:#475569}.steps{display:grid;grid-template-columns:1fr 1fr;gap:36px}aside{background:#e0f2fe;padding:16px 20px;margin-top:22px;border-left:4px solid #0284c7}footer{margin-top:22px;color:#64748b;font-size:14px}</style>
<article><small>GUIDE DE DÉMONSTRATION · CONTENU LOCAL</small><h1>Préparer une capture utile</h1><p class="intro">Un document clair commence par une sélection précise.</p><div class="steps"><section><h2>1. Choisir la bonne zone</h2><p>Gardez le titre et les informations nécessaires à la compréhension.</p><p>Ajustez les bords avant de confirmer la capture.</p></section><section><h2>2. Expliquer l’essentiel</h2><p>Ajoutez une flèche ou un surlignage pour attirer l’attention.</p><p>Vérifiez le résultat avant de l’exporter.</p></section></div><aside>Conseil : utilisez une légende courte et une seule idée par annotation.</aside><footer>Exemple créé pour présenter Scionos Capture. Aucune donnée personnelle.</footer></article></html>`;

await fs.mkdir(output, { recursive: true });
const context = await chromium.launchPersistentContext('', {
  channel: 'chromium', headless: true, viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1,
  args: ['--disable-extensions-except=' + root, '--load-extension=' + root]
});
const results = [];
async function save(page, name) {
  const destination = path.join(output, name);
  await page.screenshot({ path: destination, fullPage: false, animations: 'disabled' });
  const bytes = await fs.readFile(destination);
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  if (width !== 1280 || height !== 800) throw new Error('Unexpected dimensions: ' + destination);
  results.push({ path: destination, width, height, bytes: bytes.length });
}
try {
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  const editorUrl = 'chrome-extension://' + new globalThis.URL(worker.url()).host + '/editor.html';
  const source = await context.newPage();
  await source.setViewportSize({ width: 1100, height: 620 });
  await source.setContent(html);
  const png = await source.screenshot({ type: 'png' });
  const editor = await context.newPage();
  await editor.goto(editorUrl);
  await editor.evaluate(async base64 => {
    const binary = globalThis.atob(base64), bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    const createdAt = Date.parse('2026-11-10T12:00:00Z');
    await globalThis.CaptureStore.putCapture({ id: 'store-demo-140', blob: new globalThis.Blob([bytes], { type: 'image/png' }),
      createdAt, expiresAt: Date.now() + 3600000, title: 'Préparer une capture utile — Démonstration',
      url: 'https://example.com/guide', timestamp: new Date(createdAt).toISOString(), scale: 1,
      textBlocks: [], textCoordinateSpace: 'bitmap', textLayerLimited: false });
  }, png.toString('base64'));
  await editor.goto(editorUrl + '?capture=store-demo-140');
  await editor.waitForFunction(() => globalThis.document.querySelector('#main-canvas').width === 1100 && !globalThis.document.querySelector('#tool-arrow').disabled);
  await editor.locator('#tool-arrow').click();
  const canvas = await editor.locator('#main-canvas').boundingBox();
  const sx = canvas.width / 1100, sy = canvas.height / 620;
  await editor.mouse.move(canvas.x + 500*sx, canvas.y + 210*sy);
  await editor.mouse.down(); await editor.mouse.move(canvas.x + 340*sx, canvas.y + 260*sy); await editor.mouse.up();
  await editor.locator('#tool-highlight').count().then(async count => {
    if (count) {
      await editor.locator('#tool-highlight').click();
      await editor.mouse.move(canvas.x + 115*sx, canvas.y + 320*sy); await editor.mouse.down();
      await editor.mouse.move(canvas.x + 400*sx, canvas.y + 320*sy); await editor.mouse.up();
    }
  });
  await save(editor, 'screenshot-real-1-editor-v1.4.0.png');

  // The helper injects the exact production scripts and stubs transfer only.
  // This screenshot stops before capture, so no synthetic screenshot pixels are displayed.
  await prepareFullPageHarness(source, html);
  await source.setViewportSize({ width: 1280, height: 800 });
  await source.evaluate(messages => globalThis.__captureListener({ action: 'START_ZONE_CAPTURE', messages }, {}, () => {}), frenchMessages);
  await source.mouse.move(95, 65); await source.mouse.down();
  await source.mouse.move(905, 625); await source.mouse.up();
  await source.locator('[data-scionos-capture="adjustment"]').waitFor({ state: 'visible' });
  await save(source, 'screenshot-real-2-selection-v1.4.0.png');
  await source.keyboard.press('Escape');
  const popup = await context.newPage();
  await popup.goto(editorUrl.replace('editor.html', 'popup.html'));
  await popup.locator('#capture-delay').selectOption('3');
  await popup.locator('#btn-element').waitFor({ state: 'visible' });
  await save(popup, 'screenshot-real-3-popup-v1.4.0.png');
  console.log(JSON.stringify(results, null, 2));
} finally {
  await context.close();
}
