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
  computeCaptureViewportMetrics,
  computeTileDestination,
  computePayloadReductionScale,
  MAX_TRANSFER_BYTES,
  isRestrictedUrl,
  escapeHtml,
  sanitizeUrl,
  sanitizeFilename,
  buildHtmlReport,
  computeArrowPoints,
  filterTextBlocksOnCensor,
  shiftAndCropTextBlocks
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


test('excludes classic Windows scrollbars while preserving fractional DPR scaling', () => {
  const metrics = computeCaptureViewportMetrics({
    bitmapWidth: 2400, bitmapHeight: 1500, innerWidth: 1920, innerHeight: 1200,
    contentWidth: 1903, contentHeight: 1183
  });
  assert.equal(metrics.scaleX, 1.25);
  assert.equal(metrics.scaleY, 1.25);
  assert.equal(metrics.scrollbarWidth, 17);
  assert.equal(metrics.scrollbarHeight, 17);
  assert.deepEqual(metrics.crop, { x: 0, y: 0, width: 2379, height: 1479 });
});

test('rounds tile edges without accumulating fractional-DPR seams', () => {
  const first = computeTileDestination(0, 0, 1001, 751, 1.25, 1.25, 0.8);
  const second = computeTileDestination(800.8, 600.8, 1001, 751, 1.25, 1.25, 0.8);
  assert.equal(first.width, 801);
  assert.equal(second.x, first.width);
  assert.equal(second.y, first.height);
});

test('computes a bounded adaptive reduction for oversized PNG payloads', () => {
  assert.equal(computePayloadReductionScale(MAX_TRANSFER_BYTES), 1);
  const scale = computePayloadReductionScale(MAX_TRANSFER_BYTES * 2);
  assert.ok(scale >= 0.1 && scale < 1);
});

test('sanitizes titles into safe and valid filenames', () => {
  assert.equal(sanitizeFilename('Article: L\'avenir du Web ?'), 'Article_Lavenir_du_Web');
  assert.equal(sanitizeFilename('Test / Slash \\ Backslash * Asterisk : Colon'), 'Test_Slash_Backslash_Asterisk_Colon');
  assert.equal(sanitizeFilename(''), 'Scionos_Capture');
  assert.equal(sanitizeFilename(null), 'Scionos_Capture');
  assert.equal(sanitizeFilename('   '), 'Scionos_Capture');
  assert.equal(sanitizeFilename('Screenshot'), 'Scionos_Capture');
  assert.equal(sanitizeFilename('Capture'), 'Scionos_Capture');
  assert.equal(sanitizeFilename('A'.repeat(100)).length <= 45, true);
  assert.equal(sanitizeFilename('   __Titre  avec   espaces__   '), 'Titre_avec_espaces');
});

test('computes arrow points accurately for vector arrows', () => {
  const arrow = computeArrowPoints({ x: 0, y: 0 }, { x: 100, y: 0 }, 20, Math.PI / 6);
  assert.equal(arrow.start.x, 0);
  assert.equal(arrow.end.x, 100);
  assert.ok(arrow.left.x < 100 && arrow.left.x > 80);
  assert.ok(arrow.right.x < 100 && arrow.right.x > 80);
  assert.ok(arrow.left.y > 0);
  assert.ok(arrow.right.y < 0);

  // zero length edge case
  const zeroArrow = computeArrowPoints({ x: 50, y: 50 }, { x: 50, y: 50 }, 20);
  assert.deepEqual(zeroArrow.start, { x: 50, y: 50 });
  assert.deepEqual(zeroArrow.end, { x: 50, y: 50 });
});

test('filters text blocks intersecting censored bounds to preserve privacy', () => {
  const blocks = [
    { x: 10, y: 10, width: 40, height: 15, text: 'Secret' },
    { x: 200, y: 200, width: 60, height: 20, text: 'Public' }
  ];
  const censored = { x: 0, y: 0, width: 100, height: 50 };
  const filtered = filterTextBlocksOnCensor(blocks, censored);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].text, 'Public');
});

test('shifts and crops text blocks during image cropping', () => {
  const blocks = [
    { x: 50, y: 50, width: 40, height: 20, text: 'Inside' },
    { x: 500, y: 500, width: 40, height: 20, text: 'Outside' }
  ];
  const cropRect = { x: 40, y: 40, width: 100, height: 100 };
  const cropped = shiftAndCropTextBlocks(blocks, cropRect);
  assert.equal(cropped.length, 1);
  assert.equal(cropped[0].text, 'Inside');
  assert.equal(cropped[0].x, 10);
  assert.equal(cropped[0].y, 10);
});
