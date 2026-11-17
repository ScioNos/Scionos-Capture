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
  normalizeSourcePolicy,
  sanitizeSourceUrl,
  readImageDimensions,
  sanitizeFilename,
  buildLocalTimestamp,
  buildHtmlReport,
  computeArrowPoints,
  filterTextBlocksOnCensor,
  shiftAndCropTextBlocks,
  buildTextLayerSpans,
  buildPrintSlicePlan
} = require('../capture-utils.js');
const { filterTextBlocksIntersectingBounds } = require('../capture-utils.js');

function pngHeader(width = 640, height = 480, depth = 8, color = 6) {
  const bytes = Buffer.alloc(33);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes);
  bytes.writeUInt32BE(13, 8);
  bytes.write('IHDR', 12);
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  bytes[24] = depth;
  bytes[25] = color;
  let crc = 0xffffffff;
  for (const byte of bytes.subarray(12, 29)) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  bytes.writeUInt32BE((crc ^ 0xffffffff) >>> 0, 29);
  return bytes;
}

function pngChunk(type, payload) {
  const bytes = Buffer.alloc(payload.length + 12);
  bytes.writeUInt32BE(payload.length, 0);
  bytes.write(type, 4);
  payload.copy(bytes, 8);
  let crc = 0xffffffff;
  for (const byte of bytes.subarray(4, -4)) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  bytes.writeUInt32BE((crc ^ 0xffffffff) >>> 0, bytes.length - 4);
  return bytes;
}

function jpegSegment(marker, payload) {
  const bytes = Buffer.alloc(payload.length + 4);
  bytes[0] = 0xff;
  bytes[1] = marker;
  bytes.writeUInt16BE(payload.length + 2, 2);
  payload.copy(bytes, 4);
  return bytes;
}

function tiffOrientation(orientation, little = true) {
  const bytes = Buffer.alloc(26);
  bytes.write(little ? 'II' : 'MM');
  const put16 = (value, offset) => little ? bytes.writeUInt16LE(value, offset) : bytes.writeUInt16BE(value, offset);
  const put32 = (value, offset) => little ? bytes.writeUInt32LE(value, offset) : bytes.writeUInt32BE(value, offset);
  put16(42, 2);
  put32(8, 4);
  put16(1, 8);
  put16(0x0112, 10);
  put16(3, 12);
  put32(1, 14);
  put16(orientation, 18);
  return bytes;
}

function jpegHeader(width = 640, height = 480, options = {}) {
  const frame = Buffer.from([8, height >> 8, height & 255, width >> 8, width & 255, 1, 1, 0x11, 0]);
  const segments = [Buffer.from([0xff, 0xd8]), ...(options.before || [])];
  if (options.orientation !== undefined) segments.push(jpegSegment(0xe1, Buffer.concat([
    Buffer.from('Exif\0\0', 'binary'), tiffOrientation(options.orientation, options.little !== false)
  ])));
  segments.push(jpegSegment(options.sof || 0xc0, frame), ...(options.after || []));
  segments.push(options.sos ? jpegSegment(0xda, Buffer.from([1, 1, 0, 0, 63, 0])) : Buffer.from([0xff, 0xd9]));
  return Buffer.concat(segments);
}

function webpChunk(type, payload) {
  const bytes = Buffer.alloc(8 + payload.length + (payload.length & 1));
  bytes.write(type);
  bytes.writeUInt32LE(payload.length, 4);
  payload.copy(bytes, 8);
  return bytes;
}

function webpHeader(width = 640, height = 480, options = {}) {
  const chunks = [];
  const put24 = (bytes, value, offset) => {
    bytes[offset] = value & 255; bytes[offset + 1] = (value >>> 8) & 255; bytes[offset + 2] = value >>> 16;
  };
  if (options.extended) {
    const payload = Buffer.alloc(10);
    payload[0] = options.flags || 0;
    put24(payload, width - 1, 4);
    put24(payload, height - 1, 7);
    chunks.push(webpChunk('VP8X', payload));
  }
  chunks.push(...(options.before || []));
  if (options.lossless) {
    const payload = Buffer.alloc(5);
    payload[0] = 0x2f;
    payload.writeUInt32LE(((width - 1) | ((height - 1) << 14)) >>> 0, 1);
    chunks.push(webpChunk('VP8L', payload));
  } else {
    const payload = Buffer.from([0x10, 0, 0, 0x9d, 1, 0x2a, 0, 0, 0, 0]);
    payload.writeUInt16LE(width, 6);
    payload.writeUInt16LE(height, 8);
    chunks.push(webpChunk('VP8 ', payload));
  }
  chunks.push(...(options.after || []));
  const bytes = Buffer.concat([Buffer.from('RIFF\0\0\0\0WEBP', 'binary'), ...chunks]);
  bytes.writeUInt32LE(bytes.length - 8, 4);
  return bytes;
}

function expectedDimensions(width, height, format, orientation = 1) {
  return { width, height, orientation, orientedWidth: orientation >= 5 ? height : width,
    orientedHeight: orientation >= 5 ? width : height, format };
}

test('normalizes only the explicit source policy enum', () => {
  assert.equal(normalizeSourcePolicy(undefined), 'sanitized');
  for (const policy of ['sanitized', 'none', 'full']) assert.equal(normalizeSourcePolicy(policy), policy);
  for (const policy of [null, '', 'FULL', ' sanitized ', false, 0, {}, ['full']]) {
    assert.throws(() => normalizeSourcePolicy(policy), TypeError);
    assert.throws(() => sanitizeSourceUrl('', policy), TypeError);
  }
});

test('source URL policies strip credentials always and retain historical full links', () => {
  const url = 'https://alice:secret@example.com:8443/a%20b?token=secret&x=1#private';
  assert.equal(sanitizeSourceUrl(url), 'https://example.com:8443/a%20b');
  assert.equal(sanitizeSourceUrl(url, 'sanitized'), 'https://example.com:8443/a%20b');
  assert.equal(sanitizeSourceUrl(url, 'none'), '');
  assert.equal(sanitizeSourceUrl(url, 'full'), 'https://example.com:8443/a%20b?token=secret&x=1#private');
  assert.equal(sanitizeUrl(url), sanitizeSourceUrl(url, 'full'));
  assert.equal(sanitizeSourceUrl('HTTP://user:pass@EXAMPLE.com:80/?#'), 'http://example.com/');
  for (const value of ['', null, undefined, {}, '/relative', 'not a url', 'file:///private',
    'javascript:alert(1)', 'data:text/html,bad', 'ftp://user:pass@example.com']) {
    for (const policy of ['sanitized', 'none', 'full']) assert.equal(sanitizeSourceUrl(value, policy), '');
  }
});

test('reads PNG IHDR synchronously without applying editor source budgets', () => {
  for (const [width, height] of [[1, 1], [16384, 16384], [0x7fffffff, 1]]) {
    assert.deepEqual(readImageDimensions(pngHeader(width, height), 'image/png'), expectedDimensions(width, height, 'png'));
  }
  const actual = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  assert.deepEqual(readImageDimensions(actual, 'image/png'), expectedDimensions(1, 1, 'png'));
  const bytes = pngHeader();
  const original = Buffer.from(bytes);
  const padded = Buffer.concat([Buffer.alloc(7), bytes, Buffer.alloc(5)]);
  for (const input of [bytes, new Uint8Array(bytes), Uint8Array.from(bytes).buffer,
    new DataView(padded.buffer, padded.byteOffset + 7, bytes.length)]) {
    assert.deepEqual(readImageDimensions(input, ' IMAGE/PNG '), expectedDimensions(640, 480, 'png'));
  }
  assert.deepEqual(bytes, original);
});

test('rejects PNG truncations, signatures, invalid IHDR fields and corrupted CRC', () => {
  const valid = pngHeader();
  for (let length = 0; length < valid.length; length += 1) assert.equal(readImageDimensions(valid.subarray(0, length), 'image/png'), null);
  for (const offset of [0, 8, 12, 16, 24, 25, 26, 27, 28, 29, 32]) {
    const bytes = Buffer.from(valid); bytes[offset] ^= 0xff;
    assert.equal(readImageDimensions(bytes, 'image/png'), null);
  }
  for (const bytes of [pngHeader(0, 1), pngHeader(1, 0), pngHeader(0x80000000, 1), pngHeader(1, 1, 4, 6), pngHeader(1, 1, 8, 1)]) {
    assert.equal(readImageDimensions(bytes, 'image/png'), null);
  }
  for (const [depth, color] of [[1, 0], [16, 2], [4, 3], [16, 4]]) {
    assert.ok(readImageDimensions(pngHeader(1, 1, depth, color), 'image/png'));
  }
});

test('reads PNG eXIf before IDAT in either byte order and ignores late orientation like Chromium', () => {
  for (let orientation = 1; orientation <= 8; orientation += 1) {
    for (const little of [false, true]) {
      const metadata = pngChunk('eXIf', tiffOrientation(orientation, little));
      const imageData = pngChunk('IDAT', Buffer.from([1, 2, 3]));
      const end = pngChunk('IEND', Buffer.alloc(0));
      const early = Buffer.concat([pngHeader(20, 10), metadata, imageData, end]);
      const late = Buffer.concat([pngHeader(20, 10), imageData, metadata, end]);
      assert.deepEqual(readImageDimensions(early, 'image/png'), expectedDimensions(20, 10, 'png', orientation));
      assert.deepEqual(readImageDimensions(late, 'image/png'), expectedDimensions(20, 10, 'png'));
    }
  }
});

test('rejects corrupt PNG eXIf and chunk lengths without reading compressed pixels', () => {
  const metadata = pngChunk('eXIf', tiffOrientation(6));
  const input = Buffer.concat([pngHeader(20, 10), metadata, pngChunk('IDAT', Buffer.alloc(1024 * 1024)), pngChunk('IEND', Buffer.alloc(0))]);
  assert.deepEqual(readImageDimensions(input, 'image/png'), expectedDimensions(20, 10, 'png', 6));
  for (const offset of [33, 37, 41, 65, 70]) {
    const corrupt = Buffer.from(input); corrupt[offset] ^= 255;
    assert.equal(readImageDimensions(corrupt, 'image/png'), null);
  }
  const duplicate = Buffer.concat([pngHeader(), metadata, metadata]);
  assert.equal(readImageDimensions(duplicate, 'image/png'), null);
  const badTiff = pngChunk('eXIf', tiffOrientation(9));
  assert.equal(readImageDimensions(Buffer.concat([pngHeader(), badTiff]), 'image/png'), null);
  for (let cut = 1; cut < metadata.length; cut++) {
    assert.equal(readImageDimensions(Buffer.concat([pngHeader(), metadata.subarray(0, cut)]), 'image/png'), null);
  }
});

test('reads JPEG SOF marker variants and both EXIF byte orders with oriented bitmap dimensions', () => {
  for (const sof of [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]) {
    assert.deepEqual(readImageDimensions(jpegHeader(65535, 1, { sof, sos: true }), 'image/jpeg'), expectedDimensions(65535, 1, 'jpeg'));
  }
  for (let orientation = 1; orientation <= 8; orientation += 1) {
    for (const little of [true, false]) {
      assert.deepEqual(readImageDimensions(jpegHeader(640, 480, { orientation, little }), 'image/jpeg'), expectedDimensions(640, 480, 'jpeg', orientation));
    }
  }
  const after = jpegSegment(0xe1, Buffer.concat([Buffer.from('Exif\0\0', 'binary'), tiffOrientation(6)]));
  assert.deepEqual(readImageDimensions(jpegHeader(640, 480, { after: [after], sos: true }), 'image/jpeg'), expectedDimensions(640, 480, 'jpeg', 6));
  const before = [jpegSegment(0xe0, Buffer.from('JFIF\0')), Buffer.from([0xff, 0xff, 0x01])];
  assert.deepEqual(readImageDimensions(jpegHeader(640, 480, { before }), 'image/jpeg'), expectedDimensions(640, 480, 'jpeg'));
});

test('rejects corrupt JPEG segment lengths, incomplete frames and malformed EXIF', () => {
  const valid = jpegHeader();
  for (let length = 0; length < valid.length; length += 1) assert.equal(readImageDimensions(valid.subarray(0, length), 'image/jpeg'), null);
  for (const bytes of [jpegHeader(0, 1), jpegHeader(1, 0), Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 1]),
    Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0xff, 0xff]), Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
    Buffer.from([0xff, 0xd8, 0xff, 0x00]), Buffer.from([0xff, 0xd8, 0xff, 0xd0]),
    jpegHeader(1, 1, { orientation: 0 }), jpegHeader(1, 1, { orientation: 9 })]) {
    assert.equal(readImageDimensions(bytes, 'image/jpeg'), null);
  }
  for (const [offset, value] of [[0, 0], [2, 43], [4, 0xff], [8, 0xff], [12, 4], [14, 2], [18, 9]]) {
    const exif = tiffOrientation(6); exif[offset] = value;
    assert.equal(readImageDimensions(jpegHeader(1, 1, { before: [jpegSegment(0xe1, Buffer.concat([Buffer.from('Exif\0\0', 'binary'), exif]))] }), 'image/jpeg'), null);
  }
  const conflicting = jpegSegment(0xe1, Buffer.concat([Buffer.from('Exif\0\0', 'binary'), tiffOrientation(8)]));
  assert.equal(readImageDimensions(jpegHeader(1, 1, { orientation: 6, after: [conflicting] }), 'image/jpeg'), null);
});

test('skips large JPEG APP/ICC segments by length and ignores compressed bytes after SOS', () => {
  const filler = jpegSegment(0xe2, Buffer.alloc(65533));
  assert.deepEqual(readImageDimensions(jpegHeader(1, 1, { before: Array(32).fill(filler) }), 'image/jpeg'), expectedDimensions(1, 1, 'jpeg'));
  assert.deepEqual(readImageDimensions(jpegHeader(1, 1, { before: Array(16384).fill(Buffer.from([0xff, 0x01])) }), 'image/jpeg'), expectedDimensions(1, 1, 'jpeg'));
  assert.deepEqual(readImageDimensions(Buffer.concat([jpegHeader(2, 3, { sos: true }), Buffer.from([1, 2, 3, 0xff, 0])]), 'image/jpeg'), expectedDimensions(2, 3, 'jpeg'));
});

test('reads WebP VP8, VP8L and VP8X dimensions including boundary values', () => {
  for (const lossless of [false, true]) {
    for (const [width, height] of [[1, 1], [640, 480], [16383, 16383]]) {
      for (const extended of [false, true]) {
        assert.deepEqual(readImageDimensions(webpHeader(width, height, { lossless, extended }), 'image/webp'), expectedDimensions(width, height, 'webp'));
      }
    }
  }
  assert.deepEqual(readImageDimensions(webpHeader(16384, 16384, { lossless: true }), 'image/webp'), expectedDimensions(16384, 16384, 'webp'));
  for (let orientation = 1; orientation <= 8; orientation += 1) {
    const exif = webpChunk('EXIF', tiffOrientation(orientation, false));
    assert.deepEqual(readImageDimensions(webpHeader(640, 480, { extended: true, flags: 8, after: [exif] }), 'image/webp'), expectedDimensions(640, 480, 'webp', orientation));
  }
  const unknown = webpChunk('TEST', Buffer.from([1, 2, 3]));
  assert.deepEqual(readImageDimensions(webpHeader(640, 480, { before: [unknown] }), 'image/webp'), expectedDimensions(640, 480, 'webp'));
});

test('reads animated WebP canvas dimensions and validates bounded nested frame chunks', () => {
  const frameHeader = Buffer.alloc(16);
  frameHeader[6] = 1; frameHeader[9] = 2; // a 2 by 3 frame at (0, 0).
  const frame = webpChunk('ANMF', Buffer.concat([frameHeader, webpHeader(2, 3).subarray(12)]));
  const canvas = webpHeader(640, 480, { extended: true, flags: 2 }).subarray(0, 30);
  const animated = Buffer.concat([canvas, webpChunk('ANIM', Buffer.alloc(6)), frame, frame]);
  animated.writeUInt32LE(animated.length - 8, 4);
  assert.deepEqual(readImageDimensions(animated, 'image/webp'), expectedDimensions(640, 480, 'webp'));
  for (const offset of [48, 53, 56, 58, 61, 67, 72]) {
    const corrupt = Buffer.from(animated); corrupt[offset] ^= 0xff;
    assert.equal(readImageDimensions(corrupt, 'image/webp'), null, `animation offset ${offset}`);
  }
});

test('rejects WebP truncations, RIFF/chunk length errors, unsupported types and bad frame headers', () => {
  for (const valid of [webpHeader(), webpHeader(640, 480, { lossless: true }), webpHeader(640, 480, { extended: true })]) {
    for (let length = 0; length < valid.length; length += 1) assert.equal(readImageDimensions(valid.subarray(0, length), 'image/webp'), null);
  }
  for (const offset of [0, 4, 8, 12, 16, 20, 23, 24, 25]) {
    const bytes = webpHeader(); bytes[offset] ^= 0xff;
    assert.equal(readImageDimensions(bytes, 'image/webp'), null, `VP8 offset ${offset}`);
  }
  const vp8Zero = webpHeader(0, 1);
  assert.equal(readImageDimensions(vp8Zero, 'image/webp'), null);
  const vp8lVersion = webpHeader(1, 1, { lossless: true }); vp8lVersion[24] |= 0xe0;
  assert.equal(readImageDimensions(vp8lVersion, 'image/webp'), null);
  for (const flags of [1, 2, 0x40, 0x80]) assert.equal(readImageDimensions(webpHeader(1, 1, { extended: true, flags }), 'image/webp'), null);
  const mismatch = webpHeader(640, 480, { extended: true }); mismatch[24] += 1;
  assert.equal(readImageDimensions(mismatch, 'image/webp'), null);
  const noFrame = webpHeader(); noFrame.write('VP8Z', 12);
  assert.equal(readImageDimensions(noFrame, 'image/webp'), null);
  const unpadded = webpHeader(1, 1, { before: [webpChunk('TEST', Buffer.from([1]))] }); unpadded[21] = 1;
  assert.equal(readImageDimensions(unpadded, 'image/webp'), null);
  const trailing = Buffer.concat([webpHeader(), Buffer.from([0])]);
  assert.equal(readImageDimensions(trailing, 'image/webp'), null);
  const duplicate = webpHeader(1, 1, { after: [webpHeader(1, 1).subarray(12)] });
  assert.equal(readImageDimensions(duplicate, 'image/webp'), null);
  const hugeChunk = webpHeader(); hugeChunk.writeUInt32LE(0xffffffff, 16);
  assert.equal(readImageDimensions(hugeChunk, 'image/webp'), null);
  const reserved = webpHeader(1, 1, { extended: true }); reserved[21] = 1;
  assert.equal(readImageDimensions(reserved, 'image/webp'), null);
  const malformedExif = webpHeader(1, 1, { extended: true, flags: 8, after: [webpChunk('EXIF', Buffer.alloc(3))] });
  assert.equal(readImageDimensions(malformedExif, 'image/webp'), null);
});

test('requires matching supported MIME and byte input and exposes identical global/CommonJS helpers', () => {
  for (const value of [null, undefined, '', [], {}, 42]) assert.equal(readImageDimensions(value, 'image/png'), null);
  for (const mime of [undefined, null, '', 'image/gif', 'image/jpg', 'image/png; charset=utf-8']) {
    assert.equal(readImageDimensions(pngHeader(), mime), null);
  }
  assert.equal(readImageDimensions(pngHeader(), 'image/jpeg'), null);
  assert.equal(readImageDimensions(jpegHeader(), 'image/webp'), null);
  for (const name of ['readImageDimensions', 'normalizeSourcePolicy', 'sanitizeSourceUrl']) {
    assert.equal(globalThis.ScionosCaptureUtils[name], require('../capture-utils.js')[name]);
  }
});

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
  assert.equal(sanitizeUrl('https://alice:secret@example.com/private'), 'https://example.com/private');
  assert.equal(sanitizeUrl('http://localhost:3000'), 'http://localhost:3000/');
  assert.equal(sanitizeUrl('javascript:alert(1)'), '');
  assert.equal(sanitizeUrl('data:text/html,bad'), '');
  assert.equal(sanitizeUrl('vbscript:bad'), '');
  assert.equal(sanitizeUrl(''), '');
});

test('HTML report applies source policy consistently to link text and title', () => {
  const url = 'https://alice:secret@example.com/private?token=PRIVATE_TOKEN#PRIVATE_FRAGMENT';
  for (const [policy, expected, excluded] of [
    ['sanitized', 'https://example.com/private', ['alice', 'secret', 'PRIVATE_TOKEN', 'PRIVATE_FRAGMENT']],
    ['full', 'https://example.com/private?token=PRIVATE_TOKEN#PRIVATE_FRAGMENT', ['alice', 'secret']],
    ['none', '', ['alice', 'secret', 'PRIVATE_TOKEN', 'PRIVATE_FRAGMENT']]
  ]) {
    const html = buildHtmlReport({ url, sourcePolicy: policy, width: 1, height: 1, dataUrl: 'data:image/png;base64,AA==' });
    if (expected) assert.ok(html.includes(expected));
    else assert.ok(!html.includes('class="meta-link"'));
    for (const value of excluded) assert.ok(!html.includes(value), `${policy} report exposed ${value}`);
  }
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
  assert.ok(!html.includes('javascript:'));
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

test('maps tile destinations from written CSS bounds and reaches the output edges at fractional DPR', () => {
  for (const dpr of [1.25, 1.5]) {
    const dimensions = computeOutputDimensions(1703, 1109, dpr, dpr);
    const firstColumn = computeTileDestination(
      { x: 0, y: 0, width: 800, height: 600 }, 1703, 1109, dimensions.width, dimensions.height
    );
    const secondColumn = computeTileDestination(
      { x: 800, y: 0, width: 800, height: 600 }, 1703, 1109, dimensions.width, dimensions.height
    );
    const lastColumn = computeTileDestination(
      { x: 1600, y: 0, width: 103, height: 600 }, 1703, 1109, dimensions.width, dimensions.height
    );
    const lastRow = computeTileDestination(
      { x: 0, y: 600, width: 1703, height: 509 }, 1703, 1109, dimensions.width, dimensions.height
    );

    assert.equal(secondColumn.x, firstColumn.x + firstColumn.width);
    assert.equal(lastColumn.x, secondColumn.x + secondColumn.width);
    assert.equal(lastColumn.x + lastColumn.width, dimensions.width);
    assert.equal(lastRow.y + lastRow.height, dimensions.height);
  }
});

test('filters searchable blocks intersecting opaque annotation bounds', () => {
  const blocks = [
    { x: 60, y: 60, width: 240, height: 30, text: 'SECRET' },
    { x: 60, y: 150, width: 240, height: 30, text: 'PUBLIC' }
  ];
  const filtered = filterTextBlocksIntersectingBounds(blocks, { x: 50, y: 50, width: 300, height: 80 });
  assert.deepEqual(filtered.map(block => block.text), ['PUBLIC']);
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

test('renders linked text blocks as anchors in the searchable layer', () => {
  const spans = buildTextLayerSpans([
    { x: 10, y: 20, width: 100, height: 15, text: 'Link', fontSize: 14, url: 'https://example.com/page' },
    { x: 10, y: 40, width: 80, height: 15, text: 'Plain', fontSize: 14, url: null }
  ], 200, 100);
  assert.ok(spans.includes('<a href="https://example.com/page"'));
  assert.ok(spans.includes('<span'));
  assert.ok(!spans.includes('<a href="">'));
});

test('escapes text and drops unsafe protocols in the searchable layer', () => {
  const spans = buildTextLayerSpans([
    { x: 0, y: 0, width: 50, height: 10, text: '<img src=x onerror=alert(1)>', fontSize: 12, url: 'javascript:alert(1)' }
  ], 200, 100);
  assert.ok(!spans.includes('<img'));
  assert.ok(spans.includes('&lt;img'));
  assert.ok(!spans.includes('javascript:'));
});

test('returns an empty layer without dimensions or blocks', () => {
  assert.equal(buildTextLayerSpans([], 200, 100), '');
  assert.equal(buildTextLayerSpans(null, 200, 100), '');
  assert.equal(buildTextLayerSpans([{ x: 0, y: 0, width: 1, height: 1, text: 'x' }], 0, 100), '');
});

test('builds a filesystem-safe local timestamp with minute precision', () => {
  const stamp = buildLocalTimestamp(new Date(2026, 8, 27, 14, 5, 9));
  assert.equal(stamp, '2026-09-27_14-05');
  assert.ok(!/[<>:"/\\|?*]/.test(stamp));
  assert.ok(stamp.length <= 45);
});

test('truncates filenames on code-point boundaries without lone surrogates', () => {
  const name = sanitizeFilename('A'.repeat(44) + '😀 test');
  assert.ok(!/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(name));
  assert.ok(!/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(name));
  assert.ok([...name].length <= 45);
});

test('keeps short captures on a single print page', () => {
  assert.deepEqual(buildPrintSlicePlan(800, 600), [{ top: 0, height: 600, single: true }]);
});

test('slices tall captures into contiguous portrait pages', () => {
  const slices = buildPrintSlicePlan(800, 3000);
  assert.ok(slices.length > 1);
  assert.ok(slices.every(slice => slice.single === false));
  assert.equal(slices[0].top, 0);
  assert.equal(slices[slices.length - 1].top + slices[slices.length - 1].height, 3000);
  slices.forEach((slice, index) => {
    if (index > 0) assert.equal(slice.top, slices[index - 1].top + slices[index - 1].height);
  });
});

test('falls back to a single print page beyond the page cap', () => {
  assert.deepEqual(buildPrintSlicePlan(800, 100000), [{ top: 0, height: 100000, single: true }]);
});


test('discards partially cropped words rather than retaining their hidden characters', () => {
  const blocks = [
    { text: 'SECRET_LEFT', x: 90, y: 10, width: 30, height: 10 },
    { text: 'SECRET_RIGHT', x: 190, y: 10, width: 30, height: 10 },
    { text: 'PUBLIC', x: 110, y: 10, width: 30, height: 10 }
  ];
  assert.deepEqual(shiftAndCropTextBlocks(blocks, { x: 100, y: 0, width: 100, height: 50 }).map(b => b.text), ['PUBLIC']);
});

test('keeps censor bounds and text aligned after DPR conversion and reduction', () => {
  const { scaleTextBlocks } = require('../capture-utils.js');
  const css = [{ text: 'SECRET', x: 100, y: 100, width: 100, height: 20, fontSize: 14 }];
  for (const dpr of [1, 1.25, 1.5, 2]) {
    for (const reduction of [1, 0.6]) {
      const scale = dpr * reduction;
      const blocks = scaleTextBlocks(css, scale);
      assert.equal(filterTextBlocksOnCensor(blocks, { x: 100 * scale, y: 100 * scale, width: 100 * scale, height: 20 * scale }).length, 0);
    }
  }
});
