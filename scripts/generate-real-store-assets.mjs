// Genuine unpacked extension screenshots; only the local demonstration page is fictional.
// Production extension DOM/styles stay unchanged. No personal profile or server is used.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { chromium, expect } from '@playwright/test';

const require = createRequire(import.meta.url);
const { prepareFullPageHarness, frenchMessages } = require('../tests/e2e/helpers/capture.js');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'store-assets');
const { version } = JSON.parse(await fs.readFile(path.join(root, 'manifest.json'), 'utf8'));
const generatedAt = new Date().toISOString();
const viewport = { width: 1280, height: 800 };
const html = '<!doctype html><html lang="fr"><meta charset="utf-8"><title>Guide de démonstration</title>'
  + '<style>*{box-sizing:border-box}body{margin:0;background:#f1f5f9;color:#17243a;font:18px/1.65 system-ui,sans-serif}article{max-width:1080px;margin:30px auto;padding:36px 56px;background:white;border-top:6px solid #0284c7}small{color:#0369a1;font-weight:700;letter-spacing:.08em}h1{font-size:40px;line-height:1.2;margin:14px 0 20px}h2{font-size:24px;margin:22px 0 8px}p{margin:10px 0}.intro{font-size:21px;color:#475569}.steps{display:grid;grid-template-columns:1fr 1fr;gap:36px}aside{background:#e0f2fe;padding:16px 20px;margin-top:22px;border-left:4px solid #0284c7}footer{margin-top:22px;color:#64748b;font-size:14px}</style>'
  + '<article><small>GUIDE DE DÉMONSTRATION · CONTENU LOCAL</small><h1>Préparer une capture utile</h1><p class="intro">Un document clair commence par une sélection précise.</p><div class="steps"><section><h2>1. Choisir la bonne zone</h2><p>Gardez le titre et les informations nécessaires à la compréhension.</p><p>Ajustez les bords avant de confirmer la capture.</p></section><section><h2>2. Expliquer l’essentiel</h2><p>Ajoutez une flèche ou un surlignage pour attirer l’attention.</p><p>Vérifiez le résultat avant de l’exporter.</p></section></div><aside>Conseil : utilisez une légende courte et une seule idée par annotation.</aside><footer>Exemple créé pour présenter Scionos Capture. Aucune donnée personnelle.</footer></article></html>';
const secondHtml = html.replace('Préparer une capture utile', 'Assembler un document clair')
  .replace('Un document clair commence par une sélection précise.', 'Réunissez vos images, puis choisissez leur ordre.')
  .replace('1. Choisir la bonne zone', '1. Importer vos images')
  .replace('2. Expliquer l’essentiel', '2. Organiser le document');

await fs.mkdir(output, { recursive: true });
// Empty userDataDir creates a temporary Playwright profile, removed on close.
const context = await chromium.launchPersistentContext('', {
  channel: 'chromium', headless: true, acceptDownloads: true, locale: 'fr-FR',
  viewport, deviceScaleFactor: 1,
  args: ['--disable-extensions-except=' + root, '--load-extension=' + root]
});
const results = [];
const validations = {};
async function save(page, ordinal, feature, checks) {
  await page.evaluate(() => globalThis.document.fonts.ready);
  const name = 'screenshot-real-' + ordinal + '-' + feature + '-v' + version + '.png';
  const destination = path.join(output, name);
  await page.screenshot({ path: destination, fullPage: false, animations: 'disabled' });
  const bytes = await fs.readFile(destination);
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  if (width !== viewport.width || height !== viewport.height) throw new Error('Unexpected dimensions: ' + name);
  results.push({ name, width, height, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), checks });
}
async function annotateArrow(editor) {
  await editor.locator('#tool-arrow').click();
  const box = await editor.locator('#main-canvas').boundingBox();
  const sx = box.width / 1100, sy = box.height / 620;
  await editor.mouse.move(box.x + 520 * sx, box.y + 215 * sy);
  await editor.mouse.down();
  await editor.mouse.move(box.x + 350 * sx, box.y + 260 * sy);
  await editor.mouse.up();
  await expect(editor.locator('#btn-undo')).toBeEnabled();
  await editor.locator('#tool-select').click();
}
try {
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  const origin = 'chrome-extension://' + new globalThis.URL(worker.url()).host;
  const source = await context.newPage();
  await source.setViewportSize({ width: 1100, height: 620 });
  await source.setContent(html);
  const png = await source.screenshot({ type: 'png' });
  await source.setContent(secondHtml);
  const secondPng = await source.screenshot({ type: 'png' });
  const editor = await context.newPage();
  await editor.goto(origin + '/editor.html');
  await editor.locator('#language-button').click();
  await editor.locator('[data-language-mode="fr"]').click();
  await editor.locator('#image-files').setInputFiles([
    { name: '01-selection-demo.png', mimeType: 'image/png', buffer: png },
    { name: '02-document-demo.png', mimeType: 'image/png', buffer: secondPng }
  ]);
  await expect(editor.locator('#composition-items li button')).toHaveCount(2);
  await expect(editor.locator('#main-canvas')).toHaveAttribute('width', '1100');
  await expect(editor.locator('#editor-version')).toHaveText('v' + version);
  await editor.locator('#composition-title').fill('Guide de capture — Démonstration');
  await editor.locator('#item-title').fill('Sélectionner la zone utile');
  await editor.locator('#item-caption').fill('Garder le contexte, puis annoter l’essentiel.');
  await annotateArrow(editor);
  await editor.locator('#composition-items li button').nth(1).click();
  await editor.locator('#item-title').fill('Assembler et partager');
  await editor.locator('#item-caption').fill('Deux images réunies dans un document.');
  await editor.locator('#composition-items li button').first().click();
  await editor.locator('#composition-direction').selectOption('horizontal');
  await editor.locator('#composition-gap').fill('24');
  await editor.locator('#composition-padding').fill('24');
  await editor.locator('#composition-numbered').check();
  await editor.locator('.composition-panel').evaluate(panel => { panel.scrollTop = 0; });
  await editor.locator('#btn-save-library').click();
  await editor.waitForFunction(async () => (await globalThis.CaptureStore.listLibraryProjects()).length === 1);
  await expect(editor.locator('#toast')).toHaveClass(/visible/);
  await expect(editor.locator('#toast')).not.toHaveClass(/visible/, { timeout: 10000 });
  await expect(editor.locator('#toast')).toHaveCSS('opacity', '0');
  await editor.locator('.composition-panel').evaluate(panel => { panel.scrollTop = panel.scrollHeight; });
  await save(editor, 1, 'composition', ['real editor', 'installed version', 'two imported demo images', 'editable arrow annotation', 'library save']);

  await editor.locator('#btn-download').click();
  await expect(editor.locator('#export-format option')).toHaveText(['PNG', 'JPEG', 'WebP', 'Markdown ZIP', 'HTML', 'PDF']);
  await editor.locator('#export-format').selectOption('pdf');
  await editor.locator('#pdf-header-pagination').check();
  await expect(editor.locator('#pdf-settings')).toBeVisible();
  await save(editor, 3, 'export', ['real export dialog', 'six formats asserted', 'PDF paper, orientation, margins, headers and pagination visible']);
  await editor.locator('#export-cancel').click();

  // Verify actual new-format downloads; Playwright removes them with the temporary context.
  await editor.locator('#btn-download').click();
  await editor.locator('#export-format').selectOption('markdown');
  const zipWaiting = editor.waitForEvent('download');
  await editor.locator('#export-confirm').click();
  const zip = await zipWaiting;
  const zipBytes = await fs.readFile(await zip.path());
  if (zipBytes.readUInt32LE(0) !== 0x04034b50) throw new Error('Markdown ZIP signature missing');
  validations.markdownZip = { name: zip.suggestedFilename(), bytes: zipBytes.length, signature: 'PK0304' };
  const projectWaiting = editor.waitForEvent('download');
  await editor.locator('#btn-save-project').click();
  const project = await projectWaiting;
  const projectBytes = await fs.readFile(await project.path());
  validations.project = await editor.evaluate(async base64 => {
    const bytes = Uint8Array.from(globalThis.atob(base64), character => character.charCodeAt(0));
    const decoded = await globalThis.ScionosCompositionUtils.decodeProject(new globalThis.Blob([bytes]));
    return { items: decoded.items.length, annotations: decoded.items.map(item => item.annotations.length) };
  }, projectBytes.toString('base64'));
  if (validations.project.items !== 2 || !validations.project.annotations.some(count => count > 0)) throw new Error('Editable project validation failed');

  const library = await context.newPage();
  await library.goto(origin + '/library.html');
  await expect(library.locator('#project-list .card')).toHaveCount(1);
  await library.locator('#project-list .card').first().getByRole('button', { name: /dupliquer/i }).click();
  await expect(library.locator('#project-list .card')).toHaveCount(2);
  const copy = library.locator('#project-list .card').filter({ hasText: 'copie' });
  library.once('dialog', dialog => dialog.accept('Document de travail — Démonstration'));
  await copy.getByRole('button', { name: /renommer/i }).click();
  await expect.poll(async () => (await library.locator('#project-list h2').allTextContents()).sort()).toEqual(['Document de travail — Démonstration', 'Guide de capture — Démonstration']);
  await library.locator('#retention-days').selectOption('30');
  await library.locator('#budget-mib').fill('256');
  await library.locator('#save-preferences').click();
  await expect(library.locator('#library-status')).toContainText(/réglages enregistrés/i);
  await save(library, 2, 'bibliotheque', ['real saved projects', 'duplicate and rename through UI', '30-day retention and 256 MiB quota']);

  // Exact production selection scripts, transport stubbed by existing e2e helper.
  // Stop before capture: none of the helper's synthetic capture pixels are displayed.
  await prepareFullPageHarness(source, html);
  await source.setViewportSize(viewport);
  await source.evaluate(messages => globalThis.__captureListener({ action: 'START_ZONE_CAPTURE', messages }, {}, () => {}), frenchMessages);
  await source.mouse.move(95, 65); await source.mouse.down();
  await source.mouse.move(1130, 625); await source.mouse.up();
  await source.locator('[data-scionos-capture="adjustment"]').waitFor({ state: 'visible' });
  await save(source, 4, 'selection', ['production selection overlay', 'real resize handles', 'local demo page', 'no synthetic captured pixels']);
  await source.keyboard.press('Escape');

  const popup = await context.newPage();
  await popup.goto(origin + '/popup.html');
  await popup.locator('#capture-delay').selectOption('3');
  await expect(popup.locator('#btn-element')).toBeVisible();
  await expect(popup.locator('#btn-compose')).toBeVisible();
  await expect(popup.locator('#popup-version')).toHaveText('v' + version);
  await save(popup, 5, 'popup', ['unmodified popup document', 'installed version', 'composition entry', 'three-second delay']);
  const manifest = { version, generatedAt, viewport, locale: 'fr-FR', disposableProfile: true, extensionUiModified: false,
    demoContent: 'Local fictional demonstration guide. No personal data or remote site.',
    selectionCoverage: 'Production UI scripts injected by existing e2e helper; transport stubbed; no capture requested.',
    popupCoverage: 'Actual popup document opened as extension tab at native 340px body width.',
    validations, images: results.sort((a, b) => a.name.localeCompare(b.name)) };
  await fs.writeFile(path.join(output, 'screenshots-real-v' + version + '.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify(manifest, null, 2));
} finally {
  await context.close();
}
