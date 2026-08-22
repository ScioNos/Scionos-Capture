const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MAX_OUTPUT_PIXELS,
  MAX_CANVAS_DIMENSION,
  buildScrollPositions,
  buildCaptureGrid,
  normalizeScrollingRegion,
  buildRegionCapturePlan,
  computeOutputDimensions,
  isRestrictedUrl,
  escapeHtml,
  sanitizeUrl,
  buildHtmlReport
} = require('../capture-utils.js');

test('includes the exact final scroll position without skipping the bottom of a page', () => {
  assert.deepEqual(buildScrollPositions(2500, 1000), [0, 1000, 1500]);
});

test('uses one screenshot position when the page fits the viewport', () => {
  assert.deepEqual(buildScrollPositions(800, 1000), [0]);
});

test('builds a two-dimensional grid including exact right and bottom edges', () => {
  assert.deepEqual(buildCaptureGrid(2500, 1800, 1000, 1000), [
    { x: 0, y: 0 }, { x: 1000, y: 0 }, { x: 1500, y: 0 },
    { x: 0, y: 800 }, { x: 1000, y: 800 }, { x: 1500, y: 800 }
  ]);
});

test('normalizes a scrolling region inside the locked viewport and document', () => {
  assert.deepEqual(
    normalizeScrollingRegion(
      { x: 700, y: 2200 },
      { x: 100, y: 200 },
      { x: 50, width: 600 },
      2100
    ),
    { x: 100, y: 200, width: 550, height: 1900 }
  );
});

test('plans exact partial first and last slices for a long scrolling area', () => {
  assert.deepEqual(buildRegionCapturePlan(150, 2500, 1000, 3000), [
    { scrollY: 150, sourceTop: 0, sourceHeight: 1000, destinationTop: 0 },
    { scrollY: 1150, sourceTop: 0, sourceHeight: 1000, destinationTop: 1000 },
    { scrollY: 2000, sourceTop: 150, sourceHeight: 500, destinationTop: 2000 }
  ]);
});

test('uses one partial screenshot when a scrolling area fits the viewport', () => {
  assert.deepEqual(buildRegionCapturePlan(2400, 300, 1000, 3000), [
    { scrollY: 2000, sourceTop: 400, sourceHeight: 300, destinationTop: 0 }
  ]);
});

test('keeps normal output dimensions and supports asymmetric capture scales', () => {
  const dimensions = computeOutputDimensions(800, 600, 2, 1.5);
  assert.equal(dimensions.naturalWidth, 1600);
  assert.equal(dimensions.naturalHeight, 900);
  assert.equal(dimensions.reduced, false);
});

test('preserves a scrolling region at DPR 2 when it stays within Canvas limits', () => {
  const dimensions = computeOutputDimensions(240, 1600, 2, 2);
  assert.equal(dimensions.width, 480);
  assert.equal(dimensions.height, 3200);
  assert.equal(dimensions.reduced, false);
});

test('caps output images to the configured pixel budget', () => {
  const dimensions = computeOutputDimensions(8000, 4000, 1, 1);
  assert.ok(dimensions.reduced);
  assert.ok(dimensions.width * dimensions.height <= MAX_OUTPUT_PIXELS);
});

test('caps an extremely wide canvas below the browser-safe dimension', () => {
  const dimensions = computeOutputDimensions(40000, 1000, 1, 1);
  assert.ok(dimensions.width <= MAX_CANVAS_DIMENSION);
  assert.ok(dimensions.height <= MAX_CANVAS_DIMENSION);
});

test('rejects browser internal pages before injecting the content script', () => {
  assert.equal(isRestrictedUrl('chrome://extensions'), true);
  assert.equal(isRestrictedUrl('edge://settings'), true);
  assert.equal(isRestrictedUrl('devtools://devtools'), true);
  assert.equal(isRestrictedUrl('data:text/html,hello'), true);
  assert.equal(isRestrictedUrl('https://chromewebstore.google.com/detail/test'), true);
  assert.equal(isRestrictedUrl('not a url'), true);
  assert.equal(isRestrictedUrl('https://example.com'), false);
  assert.equal(isRestrictedUrl('file:///C:/capture.html'), false);
});

test('escapes HTML special characters correctly', () => {
  assert.equal(escapeHtml('<script>alert("XSS & \'test\'")</script>'), '&lt;script&gt;alert(&quot;XSS &amp; &#39;test&#39;&quot;)&lt;/script&gt;');
  assert.equal(escapeHtml(''), '');
  assert.equal(escapeHtml(null), '');
});

test('sanitizes URLs safely to prevent javascript: or malicious protocol injection', () => {
  assert.equal(sanitizeUrl('https://example.com/page?test=1'), 'https://example.com/page?test=1');
  assert.equal(sanitizeUrl('http://localhost:3000'), 'http://localhost:3000/');
  assert.equal(sanitizeUrl('javascript:alert(1)'), '');
  assert.equal(sanitizeUrl('data:text/html,bad'), '');
  assert.equal(sanitizeUrl('vbscript:bad'), '');
  assert.equal(sanitizeUrl(''), '');
});

test('builds a standalone HTML report with embedded image and safe metadata', () => {
  const html = buildHtmlReport({
    title: 'Test <Page> & More',
    url: 'https://example.com/path',
    timestamp: 1700000000000,
    width: 1920,
    height: 1080,
    dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    lang: 'fr',
    texts: {
      reportSource: 'Source',
      reportDate: 'Date',
      reportDimensions: 'Dimensions',
      btnPng: 'Télécharger PNG',
      btnCopy: 'Copier',
      btnPrint: 'Imprimer'
    }
  });

  assert.ok(html.startsWith('<!DOCTYPE html>'));
  assert.ok(html.includes('<html lang="fr">'));
  assert.ok(html.includes('Test &lt;Page&gt; &amp; More'));
  assert.ok(html.includes('https://example.com/path'));
  assert.ok(html.includes('1920 × 1080 px'));
  assert.ok(html.includes('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='));
  assert.ok(html.includes('id="btn-zoom-in"'));
  assert.ok(html.includes('id="btn-download"'));
  assert.ok(html.includes('id="btn-copy"'));
  assert.ok(html.includes('id="btn-print"'));
});

