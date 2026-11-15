// Dependency-free composition, pagination and local STORE ZIP/project helpers.
(function registerCompositionUtils(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ScionosCompositionUtils = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';
  const MiB = 1024 * 1024;
  const LIMITS = Object.freeze({ zipBytes: 128 * MiB, uncompressedBytes: 256 * MiB, images: 30, imageBytes: 48 * MiB, totalImageBytes: 128 * MiB, pages: 200, entries: 4096, manifestBytes: MiB, imageDimension: 16384, imagePixels: 16000000, annotationsPerItem: 1000, annotationsPerDocument: 5000, pointsPerAnnotation: 10000, pointsPerDocument: 100000, textBlocksPerItem: 1500, textBlockText: 4096, textBlocksBytes: 4 * MiB });
  const encoder = new globalThis.TextEncoder();
  const decoder = new globalThis.TextDecoder('utf-8', { fatal: true });
  const crcTable = Uint32Array.from({ length: 256 }, (_, n) => {
    for (let k = 0; k < 8; k++) n = (n & 1) ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
    return n >>> 0;
  });
  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }
  function fail(message) { throw new Error(message); }
  function object(value, name) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`Invalid ${name}`);
    return value;
  }
  function number(value, fallback, min, max, name) {
    const n = value === undefined ? fallback : value;
    if (typeof n !== 'number' || !Number.isFinite(n) || n < min || n > max) fail(`Invalid ${name}`);
    return n;
  }
  function hasControl(value, allowWhitespace = false) {
    return Array.from(value).some(char => {
      const code = char.codePointAt(0);
      return code === 127 || code < 32 && !(allowWhitespace && [9, 10, 13].includes(code));
    });
  }
  function text(value, max = 10000, name = 'text') {
    if (value === undefined) return '';
    if (typeof value !== 'string' || value.length > max || hasControl(value, true)) fail(`Invalid ${name}`);
    return value;
  }
  function boolean(value, fallback, name) {
    if (value === undefined) return fallback;
    if (typeof value !== 'boolean') fail(`Invalid ${name}`);
    return value;
  }
  function normalizeSettings(value = {}) {
    object(value, 'settings');
    const direction = value.direction === undefined ? 'vertical' : value.direction;
    if (!['vertical', 'horizontal'].includes(direction)) fail('Invalid direction');
    const background = value.background === undefined ? '#ffffff' : value.background;
    if (typeof background !== 'string' || !/^(?:#[0-9a-f]{3,8}|transparent)$/iu.test(background) || (background !== 'transparent' && ![4,5,7,9].includes(background.length))) fail('Invalid background');
    return { direction, gap: number(value.gap, 24, 0, 4096, 'gap'), padding: number(value.padding, 24, 0, 4096, 'padding'), background, title: text(value.title, 1000, 'title'), numbered: boolean(value.numbered, false, 'numbered') };
  }
  // Deterministic conservative text estimate; renderers should use these same lines.
  // Width uses 0.6em per Unicode code point, including long words and explicit newlines.
  function estimateTextLines(value, width, fontSize) {
    text(value, 10000);
    number(width, undefined, 0, 1000000000, 'text width');
    number(fontSize, undefined, 1, 1000, 'font size');
    if (!value) return [];
    const capacity = Math.max(1, Math.floor(width / (fontSize * 0.6)));
    const lines = [];
    for (const paragraph of value.replace(/\r\n?/gu, '\n').split('\n')) {
      const chars = Array.from(paragraph);
      if (!chars.length) { lines.push(''); continue; }
      while (chars.length) {
        let end = Math.min(capacity, chars.length);
        if (end < chars.length) {
          const space = chars.slice(0, end + 1).lastIndexOf(' ');
          if (space > 0) end = space;
        }
        lines.push(chars.splice(0, end).join(''));
        if (chars[0] === ' ') chars.shift();
      }
    }
    return lines;
  }
  function computeLayout(items, settings = {}) {
    if (!Array.isArray(items) || items.length > LIMITS.images) fail('Invalid items count');
    const s = normalizeSettings(settings);
    const ids = new Set();
    const source = items.map(item => {
      object(item, 'item');
      const id = text(item.id, 128, 'id');
      if (!id || ids.has(id)) fail('Missing or duplicate item id');
      ids.add(id);
      return { id, width: number(item.width, undefined, 1, 1000000, 'width'), height: number(item.height, undefined, 1, 1000000, 'height'), title: text(item.title, 1000), caption: text(item.caption) };
    });
    const vertical = s.direction === 'vertical';
    const common = source.length ? Math.min(...source.map(item => vertical ? item.width : item.height)) : 1;
    const scaled = source.map(item => {
      const scale = common / (vertical ? item.width : item.height);
      return { ...item, imageWidth: item.width * scale, imageHeight: item.height * scale, scale, originalWidth: item.width, originalHeight: item.height };
    });
    const contentWidth = vertical ? common : scaled.reduce((sum, item) => sum + item.imageWidth, 0) + Math.max(0, scaled.length - 1) * s.gap;
    const titleLines = estimateTextLines(s.title, contentWidth, 24);
    const titleHeight = titleLines.length ? titleLines.length * 30 + 16 : 0;
    let cursor = s.padding;
    const output = scaled.map((item, index) => {
      const heading = `${s.numbered ? `${index + 1}.` : ''}${s.numbered && item.title ? ' ' : ''}${item.title}`;
      const headingLines = estimateTextLines(heading, item.imageWidth, 18);
      const captionLines = estimateTextLines(item.caption, item.imageWidth, 14);
      const headingHeight = headingLines.length ? headingLines.length * 24 + 8 : 0;
      const captionHeight = captionLines.length ? captionLines.length * 20 + 8 : 0;
      const x = vertical ? s.padding : cursor;
      const y = vertical ? cursor + titleHeight : s.padding + titleHeight;
      const height = headingHeight + item.imageHeight + captionHeight;
      cursor += (vertical ? height : item.imageWidth) + s.gap;
      return { ...item, x, y, width: item.imageWidth, height, heading, headingHeight, captionHeight, headingLines, captionLines, imageX: x, imageY: y + headingHeight };
    });
    const contentHeight = vertical ? output.reduce((sum, item) => sum + item.height, 0) + Math.max(0, output.length - 1) * s.gap : Math.max(0, ...output.map(item => item.height));
    return { width: contentWidth + 2 * s.padding, height: contentHeight + titleHeight + 2 * s.padding, items: output, titleHeight, titleLines, background: s.background, settings: s };
  }
  function sourcePolicy(value = 'sanitized') {
    if (!['sanitized', 'none', 'full'].includes(value)) fail('Invalid source policy');
    return value;
  }
  function normalizeExportSettings(value = {}) {
    object(value, 'export settings');
    const format = value.format === undefined ? 'A4' : value.format;
    const orientation = value.orientation === undefined ? 'portrait' : value.orientation;
    if (!['A4', 'Letter'].includes(format)) fail('Invalid page format');
    if (!['portrait', 'landscape'].includes(orientation)) fail('Invalid orientation');
    let m = value.marginsMm === undefined ? 12 : value.marginsMm;
    if (typeof m === 'number') m = { top: m, right: m, bottom: m, left: m };
    object(m, 'margins');
    const marginsMm = Object.fromEntries(['top','right','bottom','left'].map(key => [key, number(m[key], 12, 0, 150, 'margin')]));
    const scale = value.scale === undefined ? 'fit' : value.scale;
    if (scale !== 'fit') number(scale, undefined, 1, 1000, 'scale percentage');
    const band = (v, name) => {
      if (v === undefined || v === false) return { enabled: false, heightMm: 0, title: false, source: false, date: false, pagination: false };
      if (v === true) v = { enabled: true };
      object(v, name);
      const enabled = boolean(v.enabled, true, name);
      return { enabled, heightMm: enabled ? number(v.heightMm, 8, 0, 50, `${name} height`) : 0, ...Object.fromEntries(['title','source','date','pagination'].map(key => [key, boolean(v[key], key === 'pagination', `${name} ${key}`)])) };
    };
    return { format, orientation, marginsMm, scale, header: band(value.header, 'header'), footer: band(value.footer, 'footer'), sourcePolicy: sourcePolicy(value.sourcePolicy) };
  }
  // scale:'fit' fits the width and paginates vertically; percentages use CSS 96dpi.
  // Numeric percentages may tile in both axes. Source rectangles share exact edges.
  function buildPagePlan(width, height, settings = {}) {
    number(width, undefined, 1, 1000000000, 'width');
    number(height, undefined, 1, 1000000000, 'height');
    const s = normalizeExportSettings(settings);
    let [pageWidthMm, pageHeightMm] = s.format === 'A4' ? [210, 297] : [215.9, 279.4];
    if (s.orientation === 'landscape') [pageWidthMm, pageHeightMm] = [pageHeightMm, pageWidthMm];
    const contentWidthMm = pageWidthMm - s.marginsMm.left - s.marginsMm.right;
    const contentHeightMm = pageHeightMm - s.marginsMm.top - s.marginsMm.bottom - s.header.heightMm - s.footer.heightMm;
    if (contentWidthMm <= 0 || contentHeightMm <= 0) fail('Margins/header/footer leave no printable area');
    const mmPerPixel = s.scale === 'fit' ? contentWidthMm / width : (25.4 / 96) * s.scale / 100;
    const sliceWidth = contentWidthMm / mmPerPixel;
    const sliceHeight = contentHeightMm / mmPerPixel;
    const columns = s.scale === 'fit' ? 1 : Math.ceil(width / sliceWidth);
    const rows = Math.ceil(height / sliceHeight);
    if (columns * rows > LIMITS.pages) fail('Page limit exceeded (200)');
    const pages = [];
    for (let row = 0; row < rows; row++) {
      const y = row * sliceHeight;
      const bottom = Math.min(height, (row + 1) * sliceHeight);
      for (let column = 0; column < columns; column++) {
        const x = column * sliceWidth;
        const right = Math.min(width, (column + 1) * sliceWidth);
        pages.push({ page: pages.length + 1, row, column, sourceX: x, sourceY: y, sourceWidth: right - x, sourceHeight: bottom - y, xMm: s.marginsMm.left, yMm: s.marginsMm.top + s.header.heightMm, widthMm: (right - x) * mmPerPixel, heightMm: (bottom - y) * mmPerPixel });
      }
    }
    return { width, height, pageWidthMm, pageHeightMm, contentWidthMm, contentHeightMm, mmPerPixel, columns, rows, pages, settings: s };
  }
  function safeName(name) {
    if (typeof name !== 'string' || !name || name.length > 1024 || name !== name.normalize('NFC') || hasControl(name) || /[\\:<>"|?*]/u.test(name) || name.startsWith('/') || name.endsWith('/')) fail('Unsafe ZIP name');
    const parts = name.split('/');
    if (parts.some(part => !part || part === '.' || part === '..' || /[. ]$/u.test(part) || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(part))) fail('Unsafe ZIP path');
    const bytes = encoder.encode(name);
    if (decoder.decode(bytes) !== name) fail('Invalid Unicode ZIP name');
    if (bytes.length > 4096) fail('ZIP name too long');
    return bytes;
  }
  function bytesOf(value) {
    if (!(value instanceof Uint8Array)) fail('Expected Uint8Array');
    return value;
  }
  function encodeZip(entries) {
    if (!Array.isArray(entries) || entries.length > LIMITS.entries) fail('ZIP entry count exceeded');
    const seen = new Set();
    let total = 22;
    let uncompressed = 0;
    const records = entries.map(entry => {
      object(entry, 'ZIP entry');
      const name = safeName(entry.name);
      const key = entry.name.toLowerCase();
      if (seen.has(key)) fail('Duplicate ZIP entry');
      seen.add(key);
      const data = bytesOf(entry.data);
      uncompressed += data.length;
      total += 30 + 46 + 2 * name.length + data.length;
      if (total > LIMITS.zipBytes || uncompressed > LIMITS.uncompressedBytes) fail('ZIP size limit exceeded');
      return { name, data, crc: crc32(data) };
    });
    const result = new Uint8Array(total);
    const view = new DataView(result.buffer);
    const u16 = (p, n) => view.setUint16(p, n, true);
    const u32 = (p, n) => view.setUint32(p, n, true);
    let offset = 0;
    for (const entry of records) {
      entry.offset = offset;
      u32(offset, 0x04034b50); u16(offset + 4, 20); u16(offset + 6, 0x800);
      u32(offset + 14, entry.crc); u32(offset + 18, entry.data.length); u32(offset + 22, entry.data.length); u16(offset + 26, entry.name.length);
      result.set(entry.name, offset + 30); result.set(entry.data, offset + 30 + entry.name.length);
      offset += 30 + entry.name.length + entry.data.length;
    }
    const directoryOffset = offset;
    for (const entry of records) {
      u32(offset, 0x02014b50); u16(offset + 4, 20); u16(offset + 6, 20); u16(offset + 8, 0x800);
      u32(offset + 16, entry.crc); u32(offset + 20, entry.data.length); u32(offset + 24, entry.data.length); u16(offset + 28, entry.name.length); u32(offset + 42, entry.offset);
      result.set(entry.name, offset + 46); offset += 46 + entry.name.length;
    }
    u32(offset, 0x06054b50); u16(offset + 8, records.length); u16(offset + 10, records.length); u32(offset + 12, offset - directoryOffset); u32(offset + 16, directoryOffset);
    return result;
  }
  function decodeZip(input) {
    const bytes = bytesOf(input);
    if (bytes.length > LIMITS.zipBytes || bytes.length < 22) fail('Invalid ZIP size');
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const u16 = p => view.getUint16(p, true);
    const u32 = p => view.getUint32(p, true);
    let end = -1;
    for (let p = bytes.length - 22; p >= Math.max(0, bytes.length - 65557); p--) {
      if (u32(p) === 0x06054b50 && p + 22 + u16(p + 20) === bytes.length) { end = p; break; }
    }
    if (end < 0 || u16(end + 4) || u16(end + 6) || u16(end + 8) !== u16(end + 10)) fail('Invalid ZIP directory');
    const count = u16(end + 10), directorySize = u32(end + 12), directoryOffset = u32(end + 16);
    if (count > LIMITS.entries || directoryOffset + directorySize !== end) fail('Invalid ZIP directory bounds');
    let p = directoryOffset, total = 0;
    const entries = [], ranges = [], seen = new Set();
    for (let i = 0; i < count; i++) {
      if (p + 46 > end || u32(p) !== 0x02014b50) fail('Invalid ZIP central entry');
      const flags = u16(p + 8), method = u16(p + 10), crc = u32(p + 16), compressed = u32(p + 20), size = u32(p + 24);
      const nameLength = u16(p + 28), extraLength = u16(p + 30), commentLength = u16(p + 32), local = u32(p + 42);
      if ((flags & ~0x800) || method !== 0 || compressed !== size || u16(p + 34) || u16(p + 6) > 20 || (u32(p + 38) >>> 16 & 0xf000) === 0xa000) fail('Unsupported ZIP encryption/compression/features');
      const next = p + 46 + nameLength + extraLength + commentLength;
      if (next > end || extraLength) fail('Invalid or unsupported ZIP extra field');
      const nameBytes = bytes.subarray(p + 46, p + 46 + nameLength);
      if (!(flags & 0x800) && nameBytes.some(byte => byte > 127)) fail('ZIP names must be UTF-8');
      let name;
      try { name = decoder.decode(nameBytes); } catch { fail('Invalid UTF-8 ZIP name'); }
      safeName(name);
      if (seen.has(name.toLowerCase())) fail('Duplicate ZIP entry');
      seen.add(name.toLowerCase());
      total += size;
      if (total > LIMITS.uncompressedBytes) fail('ZIP uncompressed limit exceeded');
      if (local + 30 > directoryOffset || u32(local) !== 0x04034b50) fail('Invalid ZIP local entry');
      const ln = u16(local + 26), le = u16(local + 28), start = local + 30 + ln + le, finish = start + size;
      if (le || finish > directoryOffset || u16(local + 4) > 20 || u16(local + 6) !== flags || u16(local + 8) !== method || u32(local + 14) !== crc || u32(local + 18) !== compressed || u32(local + 22) !== size || ln !== nameLength || !nameBytes.every((byte, index) => byte === bytes[local + 30 + index])) fail('ZIP local/central mismatch');
      const data = bytes.subarray(start, finish);
      if (crc32(data) !== crc) fail('ZIP CRC mismatch');
      entries.push({ name, data: data.slice() }); ranges.push([local, finish]); p = next;
    }
    if (p !== end) fail('Unexpected ZIP directory data');
    ranges.sort((a, b) => a[0] - b[0]);
    let covered = 0;
    for (const [start, finish] of ranges) { if (start !== covered) fail('ZIP overlapping or unreferenced data'); covered = finish; }
    if (covered !== directoryOffset) fail('Unexpected ZIP local data');
    return entries;
  }
  // Validate PNG structure, chunk CRCs and the complete decompressed scanline stream.
  // Only rendering chunks survive export; text, EXIF, thumbnails and other metadata do not.
  async function cleanPng(bytes) {
    if (bytes.length > LIMITS.imageBytes || bytes.length < 57 || ![137,80,78,71,13,10,26,10].every((byte, i) => bytes[i] === byte)) fail('Invalid PNG image');
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const chunks = [bytes.subarray(0, 8)], idat = [];
    let p = 8, width, height, depth, color, interlace, ended = false, seenData = false, closedData = false, palette = false, transparent = false;
    while (p < bytes.length) {
      if (p + 12 > bytes.length) fail('Truncated PNG');
      const size = view.getUint32(p), finish = p + 12 + size;
      if (finish > bytes.length) fail('Invalid PNG chunk size');
      const kindBytes = bytes.subarray(p + 4, p + 8);
      if (!kindBytes.every(byte => byte >= 65 && byte <= 90 || byte >= 97 && byte <= 122) || (kindBytes[2] & 32)) fail('Invalid PNG chunk type');
      const kind = String.fromCharCode(...kindBytes);
      if (crc32(bytes.subarray(p + 4, finish - 4)) !== view.getUint32(finish - 4)) fail('PNG CRC mismatch');
      if (p === 8 && kind !== 'IHDR') fail('Missing PNG IHDR');
      if (kind === 'IHDR') {
        if (p !== 8 || size !== 13) fail('Invalid PNG IHDR');
        width = view.getUint32(p + 8); height = view.getUint32(p + 12); depth = bytes[p + 16]; color = bytes[p + 17]; interlace = bytes[p + 20];
        if (!width || !height || width > LIMITS.imageDimension || height > LIMITS.imageDimension || width * height > LIMITS.imagePixels || !({ 0:[1,2,4,8,16], 2:[8,16], 3:[1,2,4,8], 4:[8,16], 6:[8,16] }[color] || []).includes(depth) || bytes[p + 18] || bytes[p + 19] || interlace > 1) fail('Invalid PNG dimensions/encoding');
      } else if (kind === 'PLTE') {
        if (palette || seenData || !size || size % 3 || size > 768 || [0,4].includes(color) || color === 3 && size / 3 > 2 ** depth) fail('Invalid PNG palette');
        palette = true;
      } else if (kind === 'tRNS') {
        if (transparent || seenData || ![0,2,3].includes(color) || color === 0 && size !== 2 || color === 2 && size !== 6 || color === 3 && (!palette || !size || size > 256)) fail('Invalid PNG transparency');
        transparent = true;
      } else if (kind === 'IDAT') {
        if (closedData || color === 3 && !palette) fail('Invalid PNG IDAT order');
        seenData = true; idat.push(bytes.subarray(p + 8, finish - 4));
      } else if (kind === 'IEND') {
        if (size || !seenData || finish !== bytes.length) fail('Invalid PNG IEND');
        ended = true;
      } else if (!(kindBytes[0] & 32)) fail('Unknown critical PNG chunk');
      if (seenData && kind !== 'IDAT') closedData = true;
      if (['IHDR','PLTE','tRNS','IDAT','IEND'].includes(kind)) chunks.push(bytes.subarray(p, finish));
      p = finish;
    }
    if (!ended) fail('Missing PNG IEND');
    const channels = { 0:1, 2:3, 3:1, 4:2, 6:4 }[color];
    const passes = interlace ? [[0,0,8,8],[4,0,8,8],[0,4,4,8],[2,0,4,4],[0,2,2,4],[1,0,2,2],[0,1,1,2]] : [[0,0,1,1]];
    const rows = [];
    let expected = 0;
    for (const [x,y,dx,dy] of passes) {
      const w = Math.max(0, Math.ceil((width - x) / dx)), h = Math.max(0, Math.ceil((height - y) / dy));
      if (!w || !h) continue;
      const stride = Math.ceil(w * channels * depth / 8) + 1;
      expected += stride * h; rows.push({ stride, count: h });
    }
    if (expected > LIMITS.uncompressedBytes) fail('PNG decompressed limit exceeded');
    if (typeof globalThis.DecompressionStream === 'undefined') fail('PNG validation requires DecompressionStream');
    const reader = new Blob(idat).stream().pipeThrough(new globalThis.DecompressionStream('deflate')).getReader();
    let received = 0, passIndex = 0, rowIndex = 0, column = 0;
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        if (received + value.length > expected) fail('PNG decompressed size mismatch');
        for (const byte of value) {
          if (column === 0 && byte > 4) fail('Invalid PNG scanline filter');
          column++;
          if (column === rows[passIndex].stride) { column = 0; rowIndex++; if (rowIndex === rows[passIndex].count) { passIndex++; rowIndex = 0; } }
        }
        received += value.length;
      }
      if (received !== expected) fail('PNG decompressed size mismatch');
    } finally { await reader.cancel().catch(() => {}); }
    return { bytes: new Uint8Array(await new Blob(chunks).arrayBuffer()), width, height };
  }
  function sourceUrl(value, policy = 'full') {
    const url = text(value, 8192, 'url');
    if (!url) return '';
    let parsed;
    try { parsed = new URL(url); } catch { fail('Invalid source URL'); }
    if (!['http:', 'https:'].includes(parsed.protocol)) fail('Invalid source URL');
    parsed.username = ''; parsed.password = '';
    if (policy === 'none') return '';
    if (policy === 'sanitized') { parsed.search = ''; parsed.hash = ''; }
    return parsed.href;
  }
  function metadata(item) {
    object(item, 'project item');
    const id = text(item.id, 128, 'id');
    if (!id) fail('Missing item id');
    const url = sourceUrl(item.url);
    const timestamp = item.timestamp === undefined ? null : item.timestamp;
    if (timestamp !== null && !(typeof timestamp === 'number' && Number.isFinite(timestamp) && timestamp >= 0 && timestamp <= 8640000000000000) && !(typeof timestamp === 'string' && timestamp.length <= 64 && Number.isFinite(Date.parse(timestamp)))) fail('Invalid timestamp');
    return { id, title: text(item.title, 1000), caption: text(item.caption), url, timestamp };
  }
  // Annotation validation preserves only renderer-supported fields. This validates
  // structure, not whether the PNG pixels conceal sensitive content: callers must
  // permanently apply all masks and crops to the base before saving it.
  function annotationColor(value, allowTransparent = false) {
    if (allowTransparent && value === 'transparent') return value;
    if (typeof value !== 'string') fail('Invalid annotation color');
    if (/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/iu.test(value)) return value;
    const match = /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*((?:0(?:\.\d+)?|1(?:\.0+)?|\.\d+))\s*\)$/iu.exec(value);
    if (!match || match.slice(1, 4).some(component => Number(component) > 255) || Number(match[4]) > 1) fail('Invalid annotation color');
    return value;
  }
  function annotationPoint(value, width, height) {
    object(value, 'annotation point');
    // Editable annotations may cross the image edges; canvas clips their rendering.
    // Preserve their geometry rather than clamping individual points, while bounding
    // imported/save coordinates to one maximum image dimension beyond each edge.
    const margin = LIMITS.imageDimension;
    return { x: number(value.x, undefined, -margin, width + margin, 'annotation x'), y: number(value.y, undefined, -margin, height + margin, 'annotation y') };
  }
  function normalizeAnnotations(value, width, height, budget) {
    if (value === undefined) value = [];
    if (!Array.isArray(value) || value.length > LIMITS.annotationsPerItem) fail('Annotation item limit exceeded or invalid annotations');
    budget.annotations += value.length;
    if (budget.annotations > LIMITS.annotationsPerDocument) fail('Annotation document limit exceeded');
    const ids = new Set();
    return value.map(operation => {
      object(operation, 'annotation');
      const kind = operation.kind;
      if (!['draw', 'highlight', 'arrow', 'shape', 'step', 'text'].includes(kind)) fail('Unsupported annotation kind');
      const color = annotationColor(operation.color);
      const result = { kind, color };
      if (operation.id !== undefined) {
        if (typeof operation.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(operation.id)) fail('Invalid annotation id');
        const key = operation.id.toLowerCase();
        if (ids.has(key)) fail('Duplicate annotation id');
        ids.add(key);
        result.id = operation.id;
      }
      if (kind === 'draw' || kind === 'highlight') {
        if (!Array.isArray(operation.points) || !operation.points.length || operation.points.length > LIMITS.pointsPerAnnotation) fail('Invalid annotation points');
        budget.points += operation.points.length;
        if (budget.points > LIMITS.pointsPerDocument) fail('Annotation point document limit exceeded');
        result.width = number(operation.width, undefined, 0.1, LIMITS.imageDimension, 'annotation width');
        result.points = operation.points.map(point => annotationPoint(point, width, height));
      } else if (kind === 'arrow' || kind === 'shape') {
        result.start = annotationPoint(operation.start, width, height);
        result.end = annotationPoint(operation.end, width, height);
        result.width = number(operation.width, undefined, 0.1, LIMITS.imageDimension, 'annotation width');
        if (kind === 'shape') {
          if (!['rect', 'circle'].includes(operation.shape) || !['stroke', 'fill'].includes(operation.mode)) fail('Invalid annotation shape or mode');
          result.shape = operation.shape;
          result.mode = operation.mode;
        }
      } else if (kind === 'step') {
        Object.assign(result, annotationPoint(operation, width, height));
        result.number = number(operation.number, undefined, 1, 1000000, 'step number');
        if (!Number.isSafeInteger(result.number)) fail('Invalid step number');
        result.radius = number(operation.radius, undefined, 0.1, LIMITS.imageDimension, 'step radius');
      } else {
        Object.assign(result, annotationPoint(operation, width, height));
        result.text = text(operation.text, 10000, 'annotation text');
        if (!result.text.trim()) fail('Invalid annotation text');
        result.fontSize = number(operation.fontSize, undefined, 1, LIMITS.imageDimension, 'font size');
        result.bgColor = annotationColor(operation.bgColor, true);
      }
      return result;
    });
  }
  async function encodeProject(document) {
    object(document, 'project');
    if (!Array.isArray(document.items) || !document.items.length || document.items.length > LIMITS.images) fail('Project requires 1–30 images');
    const settings = normalizeSettings(document.settings);
    const exportSettings = normalizeExportSettings(document.exportSettings);
    const title = text(document.title, 1000, 'project title');
    const items = [], ids = new Set();
    const annotationBudget = { annotations: 0, points: 0 };
    let total = 0;
    for (const item of document.items) {
      object(item, 'project item');
      if (!(item.blob instanceof Blob) || !item.blob.size || item.blob.size > LIMITS.imageBytes) fail('Invalid image blob size');
      total += item.blob.size;
      if (total > LIMITS.totalImageBytes) fail('Project images limit exceeded');
    }
    for (let i = 0; i < document.items.length; i++) {
      const item = document.items[i], meta = metadata(item);
      if (ids.has(meta.id)) fail('Duplicate item id');
      ids.add(meta.id);
      const png = await cleanPng(new Uint8Array(await item.blob.arrayBuffer()));
      if ((item.width !== undefined && item.width !== png.width) || (item.height !== undefined && item.height !== png.height)) fail('PNG/item dimensions mismatch');
      const annotations = normalizeAnnotations(item.annotations, png.width, png.height, annotationBudget);
      items.push({ ...meta, width: png.width, height: png.height, bytes: png.bytes, annotations });
    }
    return serializeProject({ title, settings, exportSettings, items });
  }
  // Only private normalization paths produce this model: every PNG has already
  // been validated and cleaned once. Never accept caller-supplied validation flags.
  function serializeProject(document) {
    const entries = [], items = document.items.map((item, i) => {
      const { bytes, ...meta } = item;
      const path = `images/${String(i + 1).padStart(3, '0')}.png`;
      entries.push({ name: path, data: bytes });
      return { ...meta, url: sourceUrl(meta.url, document.exportSettings.sourcePolicy), path };
    });
    const manifest = { schemaVersion: 2, title: document.title, settings: document.settings, exportSettings: document.exportSettings, items };
    const manifestBytes = encoder.encode(JSON.stringify(manifest));
    if (manifestBytes.length > LIMITS.manifestBytes) fail('Manifest size limit exceeded');
    return new Blob([encodeZip([{ name: 'manifest.json', data: manifestBytes }, ...entries])], { type: 'application/x-scionos-project' });
  }
  async function readProject(blob) {
    if (!(blob instanceof Blob) || blob.size > LIMITS.zipBytes) fail('Invalid project blob');
    const entries = decodeZip(new Uint8Array(await blob.arrayBuffer()));
    const files = new Map(entries.map(entry => [entry.name, entry.data]));
    const manifestBytes = files.get('manifest.json');
    if (!manifestBytes || manifestBytes.length > LIMITS.manifestBytes) fail('Missing or oversized manifest');
    let manifest;
    try { manifest = JSON.parse(decoder.decode(manifestBytes)); } catch { fail('Invalid manifest JSON/UTF-8'); }
    object(manifest, 'manifest');
    if (![1, 2].includes(manifest.schemaVersion)) fail('Unsupported project schemaVersion');
    if (!Array.isArray(manifest.items) || !manifest.items.length || manifest.items.length > LIMITS.images || entries.length !== manifest.items.length + 1) fail('Invalid project images count');
    const settings = normalizeSettings(manifest.settings), exportSettings = normalizeExportSettings(manifest.exportSettings), title = text(manifest.title, 1000, 'project title');
    const ids = new Set(), paths = new Set(), items = [];
    const annotationBudget = { annotations: 0, points: 0 };
    let total = 0;
    for (const item of manifest.items) {
      const meta = metadata(item);
      if (ids.has(meta.id)) fail('Duplicate item id');
      ids.add(meta.id);
      if (typeof item.path !== 'string' || !/^images\/[a-zA-Z0-9_-]+\.png$/u.test(item.path) || paths.has(item.path)) fail('Invalid project image path');
      paths.add(item.path);
      const bytes = files.get(item.path);
      if (!bytes || !bytes.length || bytes.length > LIMITS.imageBytes) fail('Missing or oversized image');
      total += bytes.length;
      if (total > LIMITS.totalImageBytes) fail('Project images limit exceeded');
      const png = await cleanPng(bytes);
      if (item.width !== png.width || item.height !== png.height) fail('PNG/manifest dimensions mismatch');
      const annotations = manifest.schemaVersion === 1 ? [] : normalizeAnnotations(item.annotations, png.width, png.height, annotationBudget);
      items.push({ ...meta, width: png.width, height: png.height, bytes: png.bytes, annotations });
    }
    return { title, settings, exportSettings, items };
  }
  async function decodeProject(blob) {
    const document = await readProject(blob);
    // Return a fresh allowlisted model. No text layer, history, originals, or unknown fields.
    return { ...document, items: document.items.map(({ bytes, ...item }) => ({ ...item, blob: new Blob([bytes], { type: 'image/png' }) })) };
  }
  async function rewriteProjectMetadata(blob, changes) {
    object(changes, 'metadata changes');
    if (Reflect.ownKeys(changes).some(key => key !== 'title' && key !== 'sourcePolicy')) fail('Unsupported metadata change');
    const hasTitle = Object.hasOwn(changes, 'title');
    const title = hasTitle ? text(changes.title, 1000, 'project title') : undefined;
    const hasPolicy = Object.hasOwn(changes, 'sourcePolicy');
    const policy = hasPolicy ? sourcePolicy(changes.sourcePolicy) : undefined;
    const document = await readProject(blob);
    if (hasTitle) { document.title = title; document.settings.title = title; }
    if (hasPolicy) document.exportSettings.sourcePolicy = policy;
    return serializeProject(document);
  }
  return Object.freeze({ LIMITS, crc32, cleanPng, estimateTextLines, computeLayout, buildPagePlan, encodeZip, decodeZip, encodeProject, decodeProject, rewriteProjectMetadata });
});
