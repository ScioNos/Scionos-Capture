// Local synthetic PDF preparation benchmark. No native print dialog or saved PDF.
// node scripts/pdf-performance-smoke.mjs [--root ABS] [--output dist/report.json]
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { setInterval, clearInterval } from 'node:timers';
import { chromium } from '@playwright/test';

const checkout = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const options = { root: checkout, output: path.join(checkout, 'dist/verify-1.5.2/pdf-performance.json') };
for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index], value = process.argv[index + 1];
  assert(value && ['--root', '--output'].includes(key), 'Use --root ABS and --output dist/report.json.');
  options[key === '--root' ? 'root' : 'output'] = value;
}
assert(path.isAbsolute(options.root), 'Source root must be absolute.');
options.output = path.resolve(options.output);
const relativeOutput = path.relative(path.join(checkout, 'dist'), options.output);
assert(relativeOutput && !relativeOutput.startsWith('..') && !path.isAbsolute(relativeOutput) && options.output.endsWith('.json'), 'Report must be JSON under this checkout dist/.');

function instrument() {
  globalThis.print = () => {};
  globalThis.__scionosDiagnostics = [];
  globalThis.__pdfStats = { canvases: 0, encodes: [], created: [], revoked: [] };
  const originalCreate = globalThis.Document.prototype.createElement;
  globalThis.Document.prototype.createElement = function(...args) {
    if (String(args[0]).toLowerCase() === 'canvas') globalThis.__pdfStats.canvases++;
    return originalCreate.apply(this, args);
  };
  const originalBlob = globalThis.HTMLCanvasElement.prototype.toBlob;
  globalThis.HTMLCanvasElement.prototype.toBlob = function(callback, ...args) {
    const stats = globalThis.__pdfStats;
    const entry = { width: this.width, height: this.height, pixels: this.width * this.height };
    stats.encodes.push(entry);
    const ordinal = stats.encodes.length;
    if (globalThis.__pdfFault === 'encode' && ordinal === 2) {
      globalThis.queueMicrotask(() => callback(null));
      return;
    }
    if (globalThis.__pdfFault === 'bytes' && ordinal === 2) {
      // Deliberately only a size descriptor: reject before URL creation, no 128 MiB allocation.
      globalThis.queueMicrotask(() => callback({ size: 128 * 1024 * 1024, type: 'image/png' }));
      return;
    }
    return originalBlob.call(this, blob => { entry.bytes = blob?.size ?? null; callback(blob); }, ...args);
  };
  const originalUrl = globalThis.URL.createObjectURL;
  const originalRevoke = globalThis.URL.revokeObjectURL;
  globalThis.URL.createObjectURL = function(blob) {
    const url = originalUrl.call(this, blob);
    globalThis.__pdfStats.created.push(url);
    return url;
  };
  globalThis.URL.revokeObjectURL = function(url) {
    globalThis.__pdfStats.revoked.push(url);
    return originalRevoke.call(this, url);
  };
}
async function heap(cdp) {
  const value = await cdp.send('Runtime.getHeapUsage');
  return { usedBytes: value.usedSize, allocatedBytes: value.totalSize,
    embedderHeapUsedBytes: value.embedderHeapUsedSize ?? null, backingStorageBytes: value.backingStorageSize ?? null };
}
async function measure(page, cdp, action) {
  const before = await heap(cdp), samples = [before], samplingErrors = [];
  let pending;
  const timer = setInterval(() => {
    if (pending) return;
    pending = heap(cdp).then(value => samples.push(value)).catch(error => samplingErrors.push(error.message)).finally(() => { pending = undefined; });
  }, 25);
  const start = performance.now();
  let result;
  try { result = await action(); }
  finally { clearInterval(timer); if (pending) await pending; }
  const durationMs = performance.now() - start;
  const after = await heap(cdp);
  samples.push(after);
  return { durationMs, result, heap: { method: 'CDP Runtime.getHeapUsage', before, after,
    intervalMs: 25, sampleCount: samples.length, samplingErrors,
    maxObservedUsedBytes: Math.max(...samples.map(sample => sample.usedBytes)) },
  counters: await page.evaluate(() => ({ ...globalThis.__pdfStats, created: globalThis.__pdfStats.created.length, revoked: globalThis.__pdfStats.revoked.length })) };
}
async function runCase(context, origin, spec) {
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const cdp = await context.newCDPSession(page);
  try {
    await page.goto(origin + '/editor.html');
    await page.waitForFunction(() => Boolean(globalThis.ScionosCompositionExport && globalThis.ScionosCompositionUtils));
    const fixture = await page.evaluate(async spec => {
      const canvas = globalThis.document.createElement('canvas');
      canvas.width = spec.width; canvas.height = spec.height;
      const ctx = canvas.getContext('2d');
      const items = [];
      const started = globalThis.performance.now();
      try {
        for (let index = 0; index < spec.images; index++) {
          if (spec.pattern === 'noise') {
            const pixels = ctx.createImageData(spec.width, spec.height);
            let seed = (0x5c10cafe ^ (index + 1)) >>> 0;
            for (let offset = 0; offset < pixels.data.length; offset += 4) {
              seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
              pixels.data[offset] = seed & 255; pixels.data[offset + 1] = (seed >>> 8) & 255;
              pixels.data[offset + 2] = (seed >>> 16) & 255; pixels.data[offset + 3] = 255;
            }
            ctx.putImageData(pixels, 0, 0);
          } else {
            ctx.fillStyle = `rgb(${40 + index * 7}, ${80 + index * 5}, ${120 + index * 3})`;
            ctx.fillRect(0, 0, spec.width, spec.height);
          }
          const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
          if (!blob) throw new Error('Fixture PNG encoding failed.');
          items.push({ id: `synthetic-${index}`, blob, width: spec.width, height: spec.height, title: '', caption: '', url: '', textBlocks: [] });
        }
      } finally { canvas.width = canvas.height = 1; }
      globalThis.__pdfSnapshot = { title: '', settings: { title: '', direction: 'vertical', padding: 0, gap: 0 }, items };
      globalThis.__pdfOptions = { format: 'A4', orientation: 'landscape', scale: 'fit', marginsMm: 5 };
      globalThis.__pdfFault = spec.fault;
      if (spec.fault === 'pixels') {
        const utils = globalThis.ScionosCompositionUtils;
        globalThis.ScionosCompositionUtils = { ...utils, computeLayout: (...args) => ({ ...utils.computeLayout(...args), width: 8000, height: 4001 }) };
      }
      const utils = globalThis.ScionosCompositionUtils;
      const layout = utils.computeLayout(items, globalThis.__pdfSnapshot.settings);
      const plan = utils.buildPagePlan(layout.width, layout.height, globalThis.__pdfOptions);
      globalThis.__pdfStats = { canvases: 0, encodes: [], created: [], revoked: [] };
      globalThis.__scionosDiagnostics = [];
      return { durationMs: globalThis.performance.now() - started, inputBytes: items.reduce((sum, item) => sum + item.blob.size, 0),
        inputPngBytes: items.map(item => item.blob.size), inputPixels: spec.width * spec.height * spec.images,
        layout: { width: layout.width, height: layout.height }, plannedPages: plan.pages.length,
        plannedRasterPixels: plan.pages.reduce((sum, slice) => sum + Math.ceil(slice.sourceWidth) * Math.ceil(slice.sourceHeight), 0) };
    }, spec);
    const prepared = await measure(page, cdp, () => page.evaluate(async () => {
      const started = globalThis.performance.now();
      let error = null;
      try { await globalThis.ScionosCompositionExport.print(globalThis.__pdfSnapshot, globalThis.__pdfOptions, globalThis.document.getElementById('print-area'), 'fr'); }
      catch (value) { error = value.message; }
      return { durationMs: globalThis.performance.now() - started, error, pagesProduced: globalThis.document.querySelectorAll('#print-area .composition-print-page').length,
        diagnostics: [...globalThis.__scionosDiagnostics] };
    }));
    const inspected = await page.evaluate(async () => {
      const started = globalThis.performance.now();
      const area = globalThis.document.getElementById('print-area');
      const pages = [];
      try {
        for (const [index, image] of [...area.querySelectorAll('.composition-print-slice > img')].entries()) {
          const response = await globalThis.fetch(image.src);
          if (!response.ok) throw new Error(`Page blob fetch failed: ${response.status}`);
          const blob = await response.blob();
          const header = new globalThis.DataView(await blob.slice(0, 24).arrayBuffer());
          if (header.getUint32(0) !== 0x89504e47 || blob.type !== 'image/png') throw new Error('Expected real PNG page.');
          const width = header.getUint32(16), height = header.getUint32(20);
          if (width !== image.naturalWidth || height !== image.naturalHeight) throw new Error('PNG and decoded page dimensions differ.');
          pages.push({ page: index + 1, bytes: blob.size, width, height, pixels: width * height });
        }
      } finally {
        globalThis.dispatchEvent(new globalThis.Event('afterprint'));
        globalThis.dispatchEvent(new globalThis.Event('afterprint'));
      }
      const stats = globalThis.__pdfStats;
      return { durationMs: globalThis.performance.now() - started, pages,
        totalPngBytes: pages.reduce((sum, item) => sum + item.bytes, 0), totalRasterPixels: pages.reduce((sum, item) => sum + item.pixels, 0),
        cleanup: { createdUrls: stats.created.length, revokedUrls: stats.revoked.length,
          uniqueRevokedUrls: new Set(stats.revoked).size, allOwnedUrlsRevoked: stats.created.every(url => stats.revoked.includes(url)),
          children: area.childNodes.length, hidden: area.hidden, printMarker: area.hasAttribute('data-composition-print') } };
    });
    assert.deepEqual(errors, [], `${spec.id}: browser errors`);
    assert(inspected.cleanup.allOwnedUrlsRevoked && inspected.cleanup.children === 0 && !inspected.cleanup.printMarker && inspected.cleanup.hidden, `${spec.id}: print cleanup failed`);
    assert.equal(inspected.cleanup.revokedUrls, inspected.cleanup.createdUrls, 'Every owned URL revoked exactly once.');
    assert.equal(inspected.cleanup.uniqueRevokedUrls, inspected.cleanup.createdUrls);
    if (spec.fault) {
      assert.match(prepared.result.error || '', { pixels: /pixel budget/, bytes: /byte budget/, encode: /cannot encode/ }[spec.fault]);
      assert.equal(prepared.result.pagesProduced, 0);
      assert.equal(prepared.counters.created, prepared.counters.revoked, 'Error itself must release URLs before afterprint.');
      if (spec.fault === 'pixels') assert.equal(prepared.counters.canvases, 0, 'Pixel refusal must precede page canvas allocation.');
      else assert(prepared.counters.created > 0, 'Failure must occur after a real page URL exists.');
    } else {
      assert.equal(prepared.result.error, null);
      assert.equal(inspected.pages.length, fixture.plannedPages);
      assert.equal(inspected.totalRasterPixels, fixture.plannedRasterPixels);
      assert.equal(prepared.counters.encodes.reduce((sum, entry) => sum + entry.pixels, 0), inspected.totalRasterPixels);
      if (spec.images === 10) assert(inspected.pages.length > 50, 'Ten-image fixture must exercise more than 50 pages.');
    }
    return { ...spec, fixture, prepared, inspected, heapAfterCleanup: await heap(cdp), browserErrors: errors, status: 'passed' };
  } finally { await cdp.detach(); await page.close(); }
}

const report = { schemaVersion: 1, createdAt: new Date().toISOString(), nodeVersion: process.version,
  configuration: { root: options.root, images: [1, 4, 10], dimensions: [400, 1600], patterns: ['uniform', 'noise'],
    noiseSeed: 'xorshift32(0x5c10cafe XOR (imageIndex + 1)); opaque RGB', print: 'Stubbed print() => {}; explicit repeated afterprint cleanup.',
    limits: { rasterPixels: 32000000, pngBytes: 128 * 1024 * 1024, pages: 200 },
    limitations: [
      'Measures composition print preparation and real PNG page blobs; no PDF file generation, print preview, spooler or native dialog.',
      'Runtime.getHeapUsage observes this page target JavaScript heap. It does not measure process RSS, GPU memory, all canvas backing stores, decoded images or total browser memory; embedder/backingStorage fields are separate CDP observations, not a complete native memory total.',
      '25 ms sampled maximum is not a guaranteed peak. No forced GC. Fresh page per case; no warmup or timing pass/fail thresholds.',
      'Near-limit real uniform case uses about 32 million pixels. Pixel refusal injects geometry over the limit using a 4x4 PNG; byte refusal injects only a size descriptor after one real PNG. Neither refusal allocates a huge image/blob.',
      '200 pages are not required or exercised: the 10-image series exceeds 50 pages within the production budgets; no production budget is disabled.'
    ] }, source: {}, cases: [], network: { policy: 'Browser context offline from creation; HTTP(S) routing also aborts requests. Only synthetic extension resources, local data and blob URLs.', blockedRequests: 0 }, lifecycle: { temporaryProfile: true, contextClosed: false, profileRemoved: false } };
for (const name of ['manifest.json', 'composition-export.js', 'composition-utils.js', 'capture-utils.js']) report.source[name] = createHash('sha256').update(await fs.readFile(path.join(options.root, name))).digest('hex');
const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'scionos-pdf-performance-'));
let context;
try {
  context = await chromium.launchPersistentContext(profile, { channel: 'chromium', headless: true, offline: true, viewport: { width: 1200, height: 800 },
    args: ['--disable-background-networking', '--disable-sync', '--no-first-run', '--disable-extensions-except=' + options.root, '--load-extension=' + options.root] });
  context.setDefaultTimeout(60000);
  await context.route(/^https?:\/\//iu, route => { report.network.blockedRequests++; return route.abort('blockedbyclient'); });
  await context.addInitScript(instrument);
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  const origin = 'chrome-extension://' + new globalThis.URL(worker.url()).host;
  report.browserVersion = context.browser().version();
  const specs = ['uniform', 'noise'].flatMap(pattern => [1, 4, 10].map(images => ({ id: `${pattern}-${images}`, pattern, images, width: 400, height: 1600 })));
  specs.push({ id: 'near-32M-real', pattern: 'uniform', images: 4, width: 2000, height: 3990 });
  specs.push({ id: 'over-32M-preflight', pattern: 'uniform', images: 1, width: 4, height: 4, fault: 'pixels' });
  specs.push({ id: 'over-128MiB-controlled', pattern: 'uniform', images: 1, width: 400, height: 1600, fault: 'bytes' });
  specs.push({ id: 'encoder-error-cleanup', pattern: 'uniform', images: 1, width: 400, height: 1600, fault: 'encode' });
  for (const spec of specs) {
    const result = await runCase(context, origin, spec);
    report.cases.push(result);
    console.log(`${spec.id}: ${result.prepared.result.durationMs.toFixed(1)} ms; ${result.prepared.result.pagesProduced} pages; ${result.inspected.totalPngBytes} PNG bytes; ${result.status}`);
  }
  report.status = 'passed';
} catch (error) {
  report.status = 'failed'; report.error = error.stack || error.message; process.exitCode = 1;
} finally {
  try { if (context) { await context.close(); report.lifecycle.contextClosed = true; } }
  finally {
    // Only the exact mkdtemp directory owned by this run is removed, after close.
    if (!context || report.lifecycle.contextClosed) { await fs.rm(profile, { recursive: true, force: true }); report.lifecycle.profileRemoved = true; }
    await fs.mkdir(path.dirname(options.output), { recursive: true });
    await fs.writeFile(options.output, JSON.stringify(report, null, 2) + '\n');
    console.log('Synthetic PDF performance report: ' + options.output);
  }
}
