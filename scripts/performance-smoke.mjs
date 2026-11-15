// Synthetic, local-only performance comparison. Uses the installed Playwright
// Chromium for both roots; writes one JSON report under this checkout's dist/.
// node scripts/performance-smoke.mjs --root ABS --baseline-root ABS --output dist/performance-smoke.json
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { setInterval, clearInterval } from 'node:timers';
import { performance } from 'node:perf_hooks';
import { chromium } from '@playwright/test';

const checkout = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const options = { root: checkout, output: path.join(checkout, 'dist/performance-smoke.json'), repeats: 3 };
for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index];
  const value = process.argv[index + 1];
  if (!value || !['--root', '--baseline-root', '--output', '--repeats'].includes(key)) throw new Error('Use --root ABS, --baseline-root ABS, --output dist/report.json, --repeats 1..10.');
  if (key === '--repeats') options.repeats = Number(value);
  else options[{ '--root': 'root', '--baseline-root': 'baselineRoot', '--output': 'output' }[key]] = value;
}
for (const root of [options.root, options.baselineRoot].filter(Boolean)) assert(path.isAbsolute(root), 'Source roots must be absolute.');
assert(Number.isInteger(options.repeats) && options.repeats >= 1 && options.repeats <= 10, 'Repeats must be 1..10.');
options.output = path.resolve(options.output);
const relativeOutput = path.relative(path.join(checkout, 'dist'), options.output);
assert(relativeOutput && !relativeOutput.startsWith('..') && !path.isAbsolute(relativeOutput) && options.output.endsWith('.json'), 'Output must be a JSON file under this checkout dist/.');

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
  const name = Buffer.from(type);
  const output = Buffer.alloc(data.length + 12);
  output.writeUInt32BE(data.length); name.copy(output, 4); data.copy(output, 8);
  output.writeUInt32BE(crc32(Buffer.concat([name, data])), output.length - 4);
  return output;
}
function pngFixture(index, width = 1024, height = 1024) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const offset = y * (width * 4 + 1) + 1 + x * 4;
    raw[offset] = (x + index * 53) & 255;
    raw[offset + 1] = (y + index * 71) & 255;
    raw[offset + 2] = (x ^ y ^ (index * 29)) & 255;
    raw[offset + 3] = 255;
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6;
  return { name: `synthetic-${index}.png`, mimeType: 'image/png', buffer: Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), pngChunk('IHDR', header), pngChunk('IDAT', deflateSync(raw)), pngChunk('IEND', Buffer.alloc(0))
  ]) };
}
const fixtures = Array.from({ length: 4 }, (_, index) => pngFixture(index));

// Same external counters are installed in both versions. Diagnostics are an
// optional application hook; absent stages in a baseline remain explicitly absent.
function instrument() {
  globalThis.__scionosDiagnostics = [];
  globalThis.__perfCounters = {};
  const count = (key, amount = 1) => { const counters = globalThis.__perfCounters; counters[key] = (counters[key] || 0) + amount; };
  const create = globalThis.Document.prototype.createElement;
  globalThis.Document.prototype.createElement = function(...args) {
    if (String(args[0]).toLowerCase() === 'canvas') count('canvasCreated');
    return create.apply(this, args);
  };
  const encode = globalThis.HTMLCanvasElement.prototype.toBlob;
  globalThis.HTMLCanvasElement.prototype.toBlob = function(callback, ...args) {
    count('canvasEncodeCalls'); count('encodedPixelsRequested', this.width * this.height);
    return encode.call(this, blob => { count('canvasEncodeCompleted'); count('encodedBytes', blob?.size || 0); callback(blob); }, ...args);
  };
  const draw = globalThis.CanvasRenderingContext2D.prototype.drawImage;
  globalThis.CanvasRenderingContext2D.prototype.drawImage = function(...args) { count('drawImageCalls'); return draw.apply(this, args); };
  const bitmap = globalThis.createImageBitmap;
  globalThis.createImageBitmap = function(...args) { count('bitmapDecodeCalls'); return bitmap.apply(this, args); };
  const style = globalThis.getComputedStyle;
  globalThis.getComputedStyle = function(...args) { count('computedStyleCalls'); return style.apply(this, args); };
  const rect = globalThis.Element.prototype.getBoundingClientRect;
  globalThis.Element.prototype.getBoundingClientRect = function(...args) { count('elementRectCalls'); return rect.apply(this, args); };
}
async function resetCounters(page) {
  await page.evaluate(() => { globalThis.__perfCounters = {}; globalThis.__scionosDiagnostics = []; });
}
async function readCounters(page) {
  return page.evaluate(() => ({ counters: { ...globalThis.__perfCounters }, diagnostics: [...globalThis.__scionosDiagnostics] }));
}
async function heapSnapshot(cdp, page) {
  try {
    const heap = await cdp.send('Runtime.getHeapUsage');
    return { method: 'CDP Runtime.getHeapUsage', usedBytes: heap.usedSize, allocatedBytes: heap.totalSize };
  } catch {
    return page.evaluate(() => globalThis.performance.memory ? {
      method: 'performance.memory', usedBytes: globalThis.performance.memory.usedJSHeapSize,
      allocatedBytes: globalThis.performance.memory.totalJSHeapSize
    } : { method: 'unavailable', usedBytes: null, allocatedBytes: null });
  }
}
async function measure(page, cdp, action) {
  await resetCounters(page);
  const before = await heapSnapshot(cdp, page);
  const samples = [before];
  let pending = false;
  let active = true;
  const timer = setInterval(() => {
    if (pending || !active) return;
    pending = true;
    heapSnapshot(cdp, page).then(sample => { if (active) samples.push(sample); }).finally(() => { pending = false; });
  }, 25);
  const started = performance.now();
  let result;
  try { result = await action(); }
  finally { active = false; clearInterval(timer); }
  const durationMs = performance.now() - started;
  const after = await heapSnapshot(cdp, page);
  samples.push(after);
  const values = samples.map(sample => sample.usedBytes).filter(value => value !== null);
  return { durationMs, ...await readCounters(page), heap: {
    scope: 'JavaScript heap in this page target only; excludes canvas backing stores, decoded pixels, GPU, process RSS and browser total memory. Sampled maximum is not a guaranteed peak.',
    before, after, samples: samples.length, maxObservedUsedBytes: values.length ? Math.max(...values) : null
  }, result };
}
async function sourceIdentity(root) {
  const names = ['manifest.json', 'editor.js', 'composition-export.js', 'content-dom.js', 'capture-utils.js'];
  const files = {};
  for (const name of names) files[name] = createHash('sha256').update(await fs.readFile(path.join(root, name))).digest('hex');
  return { root, files };
}
async function runEditor(context, origin, count) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => dialog.dismiss());
  const cdp = await context.newCDPSession(page);
  try {
    await page.goto(origin + '/editor.html');
    await page.locator('#empty-state').waitFor({ state: 'visible' });
    const input = fixtures.slice(0, count);
    const imported = await measure(page, cdp, async () => {
      await page.locator('#image-files').setInputFiles(input);
      await page.waitForFunction(expected => globalThis.document.querySelectorAll('#composition-items li button').length === expected
        && !globalThis.document.getElementById('btn-html').disabled, count);
      return { items: count, inputBytes: input.reduce((sum, file) => sum + file.buffer.length, 0), width: 1024, height: 1024 };
    });
    const exported = await measure(page, cdp, async () => {
      const waiting = page.waitForEvent('download', { timeout: 60000 });
      await page.locator('#btn-html').click();
      const download = await waiting;
      const failure = await download.failure();
      assert(!failure, failure || 'HTML download failed.');
      assert(download.suggestedFilename().endsWith('.html'), 'Expected HTML export.');
      const outputPath = await download.path();
      const bytes = (await fs.stat(outputPath)).size;
      return { format: 'html', outputBytes: bytes };
    });
    assert.deepEqual(errors, [], 'Editor page errors.');
    return { images: count, imported, exported };
  } finally { await cdp.detach(); await page.close(); }
}
async function runDom(context, root, nodeCount) {
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  try {
    await page.setContent('<!doctype html><meta charset="utf-8"><title>Synthetic DOM fixture</title><style>body{margin:0;font:14px monospace}.row{height:24px;padding-left:12px}header{position:fixed;top:0;right:0;width:120px;height:20px;background:white}footer{position:fixed;bottom:0;right:0;width:120px;height:20px;background:white}</style><header>fixed top</header><main></main><footer>fixed bottom</footer>');
    await page.evaluate(count => {
      const fragment = globalThis.document.createDocumentFragment();
      for (let index = 0; index < count; index++) {
        const row = globalThis.document.createElement('div'); row.className = 'row'; row.textContent = `Synthetic row ${index}`; fragment.append(row);
      }
      globalThis.document.querySelector('main').append(fragment);
    }, nodeCount);
    for (const name of ['capture-utils.js', 'capture-content-utils.js', 'content-dom.js']) await page.addScriptTag({ path: path.join(root, name) });
    await page.evaluate(() => {
      globalThis.__perfDom = globalThis.ScionosContentDom.create({ Utils: globalThis.ScionosCaptureUtils, text: key => key });
      globalThis.__perfSurface = globalThis.__perfDom.getDocumentScrollSurface();
      globalThis.__perfAnchored = globalThis.__perfDom.createAnchoredElementManager(globalThis.__perfSurface);
    });
    const results = [];
    for (const fraction of [0, 0.5, 1]) {
      await page.evaluate(value => globalThis.scrollTo(0, (globalThis.document.documentElement.scrollHeight - globalThis.innerHeight) * value), fraction);
      await page.evaluate(() => new Promise(resolve => globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(resolve))));
      const extracted = await measure(page, cdp, () => page.evaluate(() => {
        const position = globalThis.__perfSurface.getPosition();
        const viewport = globalThis.__perfSurface.getCaptureRect();
        const blocks = globalThis.__perfDom.extractDomTextBlocks({ x: position.x, y: position.y, width: viewport.width, height: viewport.height }, globalThis.__perfSurface);
        return { blockCount: blocks.length, limited: Boolean(blocks.limited) };
      }));
      const anchored = await measure(page, cdp, () => page.evaluate(value => {
        const viewport = globalThis.__perfSurface.getCaptureRect();
        globalThis.__perfAnchored.prepare(Math.round(value * 2), 3, { left: viewport.left, top: viewport.top, right: viewport.left + viewport.width, bottom: viewport.top + viewport.height }, value === 1);
        const patches = globalThis.__perfAnchored.getBottomPatches().length;
        globalThis.__perfAnchored.restore();
        return { bottomPatchCount: patches };
      }, fraction));
      results.push({ scrollFraction: fraction, extracted, anchored });
    }
    return { syntheticRows: nodeCount, domElements: await page.locator('body *').count(), positions: results };
  } finally { await cdp.detach(); await page.close(); }
}
function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const half = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[half] : (sorted[half - 1] + sorted[half]) / 2;
}
function summary(run) {
  return [1, 4].map(images => {
    const samples = run.iterations.map(iteration => iteration.editor.find(sample => sample.images === images));
    return { images, importMedianMs: median(samples.map(sample => sample.imported.durationMs)),
      htmlExportMedianMs: median(samples.map(sample => sample.exported.durationMs)),
      htmlEncodeCalls: samples.map(sample => sample.exported.counters.canvasEncodeCalls || 0),
      htmlCanvasCreated: samples.map(sample => sample.exported.counters.canvasCreated || 0),
      htmlHeapMaxObservedUsedBytes: samples.map(sample => sample.exported.heap.maxObservedUsedBytes) };
  });
}
const report = { schemaVersion: 1, createdAt: new Date().toISOString(), configuration: {
  repeats: options.repeats, images: [1, 4], imageDimensions: [1024, 1024], domRows: [2000, 10000], viewport: { width: 1440, height: 1000 },
  heapSamplingIntervalMs: 25, fixture: 'Deterministic synthetic RGBA gradients; no user page or document data.',
  limitations: ['No forced GC; heap samples are observational and include instrumentation.', 'Counters count API calls and requested encoded pixels, not live canvas memory.', 'Timing includes Playwright/CDP overhead; no warmup or performance pass/fail thresholds.', 'Each root runs in a fresh temporary browser profile; baseline diagnostics may be unavailable.']
}, runs: [] };
for (const [label, root] of [['baseline', options.baselineRoot], ['current', options.root]]) {
  if (!root) continue;
  const run = { label, source: await sourceIdentity(root), iterations: [] };
  report.runs.push(run);
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium', headless: true, acceptDownloads: true, viewport: report.configuration.viewport,
    args: ['--disable-extensions-except=' + root, '--load-extension=' + root]
  });
  context.setDefaultTimeout(60000);
  await context.addInitScript(instrument);
  try {
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const origin = 'chrome-extension://' + new URL(worker.url()).host;
    run.browserVersion = context.browser().version();
    for (let iteration = 0; iteration < options.repeats; iteration++) {
      const sample = { index: iteration, editor: [], dom: [] };
      run.iterations.push(sample);
      for (const count of [1, 4]) sample.editor.push(await runEditor(context, origin, count));
      for (const nodes of [2000, 10000]) sample.dom.push(await runDom(context, root, nodes));
      console.log(`${label}: repetition ${iteration + 1}/${options.repeats} completed`);
    }
    run.summary = summary(run);
  } finally { await context.close(); }
}
if (report.runs.length === 2) report.comparison = [1, 4].map(images => {
  const before = report.runs[0].summary.find(sample => sample.images === images);
  const after = report.runs[1].summary.find(sample => sample.images === images);
  return { images, htmlExportMedianDeltaMs: after.htmlExportMedianMs - before.htmlExportMedianMs,
    htmlExportMedianRatio: before.htmlExportMedianMs ? after.htmlExportMedianMs / before.htmlExportMedianMs : null };
});
await fs.mkdir(path.dirname(options.output), { recursive: true });
await fs.writeFile(options.output, JSON.stringify(report, null, 2) + '\n');
console.log('Synthetic performance report: ' + options.output);
