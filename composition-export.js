// Composition-only exports. The caller owns downloads, error UI and snapshot creation.
(function registerCompositionExport(root) {
  'use strict';
  const HTML_LIMIT = 64 * 1024 * 1024;
  const IMAGE_LIMIT = 48 * 1024 * 1024;
  const TOTAL_LIMIT = 128 * 1024 * 1024;
  const MAX_PAGES = 200;
  const FONT = 'monospace';
  const printJobs = new WeakMap();
  const printRequests = new WeakMap();
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/gu, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const markdownEscape = value => String(value || '').replace(/\r\n?/gu, '\n').replace(/[\\`*_{}[\]()#+.!|>~<>-]/gu, '\\$&');
  function dependencies() {
    const utils = root.ScionosCompositionUtils;
    const capture = root.ScionosCaptureUtils;
    if (!utils || !capture || typeof utils.computeLayout !== 'function' || typeof capture.computeOutputDimensions !== 'function') throw new Error('Composition export utilities are unavailable.');
    return { utils, capture };
  }
  function safeUrl(value) {
    try {
      const url = new URL(String(value || ''));
      if (!['http:', 'https:'].includes(url.protocol)) return '';
      url.username = '';
      url.password = '';
      return url.href;
    } catch { return ''; }
  }
  function finite(value) { return typeof value === 'number' && Number.isFinite(value); }
  function verifiedBlocks(value, width, height) {
    const limits = dependencies().utils.LIMITS;
    if (!Array.isArray(value) || value.length > limits.textBlocksPerItem) return [];
    const blocks = value.filter(block => block && typeof block.text === 'string' && block.text.length && block.text.length <= limits.textBlockText &&
      [block.x, block.y, block.width, block.height].every(finite) && block.x >= 0 && block.y >= 0 && block.width > 0 && block.height > 0 &&
      block.x + block.width <= width && block.y + block.height <= height).map(block => ({ text: block.text, x: block.x, y: block.y, width: block.width, height: block.height,
      fontSize: finite(block.fontSize) && block.fontSize > 0 ? block.fontSize : 12, url: safeUrl(block.url) }));
    const bytes = blocks.reduce((total, block) => total + block.text.length * 2 + (block.url || '').length * 2 + 64, 0);
    return bytes <= limits.textBlocksBytes ? blocks : [];
  }
  async function prepare(snapshot) {
    const { utils } = dependencies();
    const maxDimension = utils.LIMITS && utils.LIMITS.imageDimension || 16384;
    const maxPixels = utils.LIMITS && utils.LIMITS.imagePixels || 16000000;
    if (!snapshot || !Array.isArray(snapshot.items) || !snapshot.items.length || snapshot.items.length > 30) throw new Error('A composition requires between 1 and 30 images.');
    // Copy geometry/metadata before the first await. Do not retain caller-owned mutable arrays.
    const settings = { ...(snapshot.settings || {}) };
    if (settings.title === undefined) settings.title = typeof snapshot.title === 'string' ? snapshot.title : '';
    const items = snapshot.items.map(item => {
      if (!item || !(item.blob instanceof Blob) || !Number.isSafeInteger(item.width) || !Number.isSafeInteger(item.height) || item.width < 1 || item.height < 1 ||
          item.width > maxDimension || item.height > maxDimension || item.width * item.height > maxPixels) throw new Error('Invalid composition image (maximum 16384 px per side and 16 million pixels).');
      return { id: item.id, blob: item.blob, width: item.width, height: item.height, title: item.title || '', caption: item.caption || '', url: safeUrl(item.url), timestamp: item.timestamp,
        textBlocks: verifiedBlocks(item.textBlocks, item.width, item.height), annotations: Array.isArray(item.annotations) ? item.annotations.filter(annotation => annotation && annotation.kind === 'text' && typeof annotation.text === 'string' && Number.isFinite(annotation.x) && Number.isFinite(annotation.y) && Number.isFinite(annotation.fontSize) && annotation.fontSize > 0).map(annotation => ({ ...annotation })) : [] };
    });
    const layout = utils.computeLayout(items, settings);
    if (!finite(layout.width) || !finite(layout.height) || layout.width < 1 || layout.height < 1) throw new Error('Invalid composition dimensions.');
    const exportSettings = { ...(snapshot.exportSettings || {}) };
    for (const key of ['marginsMm', 'header', 'footer']) {
      if (exportSettings[key] && typeof exportSettings[key] === 'object') exportSettings[key] = { ...exportSettings[key] };
    }
    const result = { items, layout, title: settings.title || snapshot.title || 'Scionos Capture', exportSettings };
    if (items.reduce((sum, item) => sum + item.blob.size, 0) > TOTAL_LIMIT) throw new Error('Composition image data exceeds 128 MiB.');
    for (const item of items) {
      if (!item.blob.size || item.blob.size > IMAGE_LIMIT || (item.blob.type && item.blob.type !== 'image/png')) throw new Error('Each composition image must be a PNG of at most 48 MiB.');
      const cleaned = await utils.cleanPng(new Uint8Array(await item.blob.arrayBuffer()));
      if (cleaned.width !== item.width || cleaned.height !== item.height) throw new Error('PNG dimensions do not match the composition snapshot.');
    }
    return result;
  }
  function canvasBlob(canvas, type = 'image/png', quality = 0.9) {
    return new Promise((resolve, reject) => canvas.toBlob(blob => {
      if (!blob || blob.type !== type) reject(new Error(`The browser cannot encode ${type}.`));
      else resolve(blob);
    }, type, quality));
  }
  async function openImage(item) {
    if (typeof root.createImageBitmap === 'function') {
      const bitmap = await root.createImageBitmap(item.blob);
      if (bitmap.width !== item.width || bitmap.height !== item.height) { bitmap.close(); throw new Error('Decoded PNG dimensions do not match the snapshot.'); }
      return { image: bitmap, close: () => bitmap.close() };
    }
    const image = new Image();
    const url = URL.createObjectURL(item.blob);
    try {
      image.src = url;
      await waitForImage(image);
      if (image.naturalWidth !== item.width || image.naturalHeight !== item.height) throw new Error('Decoded PNG dimensions do not match the snapshot.');
      return { image, close: () => URL.revokeObjectURL(url) };
    } catch (error) { URL.revokeObjectURL(url); throw error; }
  }
  async function waitForImage(image) {
    if (typeof image.decode === 'function') await image.decode();
    else if (!image.complete) await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('Image decoding failed.')); });
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('Image decoding failed.');
  }
  function intersects(a, b) { return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y; }
  function textRuns(layout) {
    const runs = [];
    const add = (lines, x, y, width, size, lineHeight, weight) => lines.forEach((text, index) => runs.push({ text, x, y: y + index * lineHeight, width, height: lineHeight, fontSize: size, weight }));
    add(layout.titleLines, layout.settings.padding, layout.settings.padding, layout.width - 2 * layout.settings.padding, 24, 30, 700);
    for (const item of layout.items) {
      add(item.headingLines, item.x, item.y, item.imageWidth, 18, 24, 700);
      add(item.captionLines, item.x, item.imageY + item.imageHeight + 8, item.imageWidth, 14, 20, 400);
    }
    return runs;
  }
  async function renderPrepared(prepared, rect, scale = 1, opaque = false) {
    if (!rect || ![rect.x, rect.y, rect.width, rect.height, scale].every(finite) || rect.x < 0 || rect.y < 0 || rect.width <= 0 || rect.height <= 0 || scale <= 0 ||
        rect.x + rect.width > prepared.layout.width + 0.00001 || rect.y + rect.height > prepared.layout.height + 0.00001) throw new Error('Invalid composition render rectangle or scale.');
    const { capture } = dependencies();
    const dimensions = capture.computeOutputDimensions(rect.width, rect.height, scale);
    const canvas = document.createElement('canvas');
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas rendering is unavailable.');
    if (opaque) { context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height); }
    context.scale(canvas.width / rect.width, canvas.height / rect.height);
    context.translate(-rect.x, -rect.y);
    context.fillStyle = prepared.layout.background;
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    for (let index = 0; index < prepared.layout.items.length; index++) {
      const geometry = prepared.layout.items[index];
      if (!intersects(rect, { x: geometry.imageX, y: geometry.imageY, width: geometry.imageWidth, height: geometry.imageHeight })) continue;
      const decoded = await openImage(prepared.items[index]);
      try { context.drawImage(decoded.image, geometry.imageX, geometry.imageY, geometry.imageWidth, geometry.imageHeight); }
      finally { decoded.close(); }
    }
    context.fillStyle = '#111827';
    context.textBaseline = 'top';
    for (const run of textRuns(prepared.layout)) {
      if (!intersects(rect, run)) continue;
      context.font = `${run.weight} ${run.fontSize}px ${FONT}`;
      context.fillText(run.text, run.x, run.y, run.width);
    }
    return canvas;
  }
  async function render(snapshot, rect, scale = 1) { return renderPrepared(await prepare(snapshot), rect, scale); }
  async function image(snapshot, format = 'png', quality = 0.9) {
    format = String(format).toLowerCase();
    if (format === 'jpg') format = 'jpeg';
    if (!['png', 'jpeg', 'webp'].includes(format)) throw new Error('Supported image formats are PNG, JPEG and WebP.');
    if (!finite(quality) || quality < 0 || quality > 1) throw new Error('Image quality must be between 0 and 1.');
    const prepared = await prepare(snapshot);
    const rect = { x: 0, y: 0, width: prepared.layout.width, height: prepared.layout.height };
    const dimensions = dependencies().capture.computeOutputDimensions(rect.width, rect.height, 1);
    const canvas = await renderPrepared(prepared, rect, 1, format === 'jpeg');
    try { return { blob: await canvasBlob(canvas, `image/${format}`, quality), width: canvas.width, height: canvas.height, reduced: dimensions.reduced }; }
    finally { canvas.width = 1; canvas.height = 1; }
  }
  function lineMarkup(layout) {
    return textRuns(layout).map(run => `<div class="composition-text" style="left:${run.x}px;top:${run.y}px;width:${run.width}px;height:${run.height}px;font-size:${run.fontSize}px;line-height:${run.height}px;font-weight:${run.weight}">${esc(run.text)}</div>`).join('');
  }
  function blobDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('PNG data could not be read.'));
      reader.readAsDataURL(blob);
    });
  }
  async function html(snapshot, lang = 'fr') {
    const prepared = await prepare(snapshot);
    const { layout } = prepared;
    if (prepared.items.reduce((sum, item) => sum + Math.ceil(item.blob.size / 3) * 4 + 64, 0) > HTML_LIMIT) throw new Error('The HTML export exceeds 64 MiB.');
    const images = [];
    for (let index = 0; index < prepared.items.length; index++) {
      const item = prepared.items[index];
      const geometry = layout.items[index];
      const tag = `<img alt="${esc(geometry.heading || item.title)}" src="${esc(await blobDataUrl(item.blob))}" style="left:${geometry.imageX}px;top:${geometry.imageY}px;width:${geometry.imageWidth}px;height:${geometry.imageHeight}px">`;
      images.push(item.url ? `<a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${tag}</a>` : tag);
    }
    const language = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/iu.test(lang || '') ? lang : 'fr';
    const content = `<!doctype html><html lang="${esc(language)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${esc(prepared.title)}</title><style>html,body{margin:0;padding:0}body{overflow:auto;background:#e5e7eb}.composition{position:relative;width:${layout.width}px;height:${layout.height}px;background:${layout.background};isolation:isolate}.composition img{position:absolute;display:block;max-width:none}.composition-text{position:absolute;box-sizing:border-box;margin:0;padding:0;font-family:${FONT};color:#111827;white-space:pre;overflow:hidden}a:focus-visible img{outline:3px solid #075985}</style></head><body><main class="composition" aria-label="${esc(prepared.title)}">${images.join('')}${lineMarkup(layout)}</main></body></html>`;
    const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
    if (blob.size > HTML_LIMIT) throw new Error('The HTML export exceeds 64 MiB.');
    return blob;
  }
  async function markdown(snapshot) {
    const prepared = await prepare(snapshot);
    const entries = [];
    const parts = [`# ${markdownEscape(prepared.title)}\n`];
    for (let index = 0; index < prepared.items.length; index++) {
      const item = prepared.items[index];
      // Numeric paths stay unique even for duplicate titles, reserved names and Unicode.
      const name = `images/capture-${String(index + 1).padStart(3, '0')}.png`;
      const heading = prepared.layout.items[index].heading;
      if (heading) parts.push(`## ${markdownEscape(heading)}\n`);
      parts.push(`![${markdownEscape(item.title || `Capture ${index + 1}`)}](${name})\n`);
      if (item.caption) parts.push(`${markdownEscape(item.caption)}\n`);
      if (item.url) parts.push(`[Source](<${item.url.replace(/[<>\r\n]/gu, c => encodeURIComponent(c))}>)\n`);
      entries.push({ name, data: new Uint8Array(await item.blob.arrayBuffer()) });
    }
    const encoder = new root.TextEncoder();
    entries.unshift({ name: 'document.md', data: encoder.encode(parts.join('\n')) });
    return new Blob([dependencies().utils.encodeZip(entries)], { type: 'application/zip' });
  }
  function pdfSettings(value) {
    const options = { ...value };
    const margin = options.marginsMm === undefined ? 12 : options.marginsMm;
    const margins = typeof margin === 'number' ? { top: margin, right: margin, bottom: margin, left: margin } : margin;
    if (!margins || !['top', 'right', 'bottom', 'left'].every(key => margins[key] === undefined || (finite(margins[key]) && margins[key] >= 5 && margins[key] <= 30))) throw new Error('PDF margins must be between 5 and 30 mm.');
    options.marginsMm = { top: 12, right: 12, bottom: 12, left: 12, ...margins };
    if (options.scale !== undefined && options.scale !== 'fit' && (!finite(options.scale) || options.scale < 25 || options.scale > 100)) throw new Error('PDF scale must be fit or between 25 and 100 percent.');
    for (const key of ['header', 'footer']) {
      if (options[key] && typeof options[key] === 'object') {
        options[key] = { ...options[key] };
        if (options[key].page !== undefined && options[key].pagination === undefined) options[key].pagination = options[key].page;
      }
    }
    return options;
  }
  function compositionBlocks(prepared) {
    const result = [];
    prepared.layout.items.forEach((geometry, index) => {
      for (const block of prepared.items[index].textBlocks) result.push({ ...block, x: geometry.imageX + block.x * geometry.scale, y: geometry.imageY + block.y * geometry.scale,
        width: block.width * geometry.scale, height: block.height * geometry.scale, fontSize: block.fontSize * geometry.scale });
    });
    // Authored composition headings/captions are already in the page raster and searchable too.
    return result.concat(textRuns(prepared.layout));
  }
  function avoidTextCuts(plan, blocks) {
    const cuts = (length, capacity, axis, extent) => {
      const result = [0];
      let start = 0;
      while (start < length) {
        let end = Math.min(length, start + capacity);
        if (end < length) {
          // Move a boundary backwards, never forwards beyond the physical page.
          // Oversize blocks cannot fit intact and keep raster coverage; their text
          // layer is excluded on any slice that does not contain the whole block.
          const relevant = blocks.filter(block => block[extent] <= capacity && block[axis] >= start);
          let changed = true;
          while (changed) {
            changed = false;
            for (const block of relevant) {
              if (block[axis] < end && block[axis] + block[extent] > end) {
                end = block[axis];
                changed = true;
              }
            }
          }
          if (end <= start + 0.00001) end = Math.min(length, start + capacity);
        }
        result.push(end);
        if (result.length > MAX_PAGES + 1) throw new Error('PDF page limit exceeded (200 pages).');
        start = end;
      }
      return result;
    };
    const xs = plan.settings.scale === 'fit' ? [0, plan.width] : cuts(plan.width, plan.contentWidthMm / plan.mmPerPixel, 'x', 'width');
    const ys = cuts(plan.height, plan.contentHeightMm / plan.mmPerPixel, 'y', 'height');
    if ((xs.length - 1) * (ys.length - 1) > MAX_PAGES) throw new Error('PDF page limit exceeded (200 pages).');
    const pages = [];
    for (let row = 0; row < ys.length - 1; row++) {
      for (let column = 0; column < xs.length - 1; column++) {
        const sourceWidth = xs[column + 1] - xs[column];
        const sourceHeight = ys[row + 1] - ys[row];
        pages.push({ page: pages.length + 1, row, column, sourceX: xs[column], sourceY: ys[row], sourceWidth, sourceHeight,
          xMm: plan.settings.marginsMm.left, yMm: plan.settings.marginsMm.top + plan.settings.header.heightMm,
          widthMm: sourceWidth * plan.mmPerPixel, heightMm: sourceHeight * plan.mmPerPixel });
      }
    }
    return { ...plan, pages, columns: xs.length - 1, rows: ys.length - 1 };
  }
  function textLayer(blocks, page, mmPerPixel) {
    const right = page.sourceX + page.sourceWidth;
    const bottom = page.sourceY + page.sourceHeight;
    const measure = document.createElement('canvas').getContext('2d');
    return blocks.filter(block => block.x >= page.sourceX && block.y >= page.sourceY && block.x + block.width <= right && block.y + block.height <= bottom).map(block => {
      // Keep a whole verified block or omit it. Never split/guess its words at page edges.
      const lines = block.text.replace(/\r\n?/gu, '\n').split('\n');
      const lineHeight = block.height / lines.length;
      measure.font = `${block.fontSize}px Arial, sans-serif`;
      const measuredWidth = Math.max(1, ...lines.map(line => measure.measureText(line).width));
      // Captured bounds/font metrics can be estimates. Fit the complete verified
      // string into its own box rather than clipping trailing searchable words.
      const fontSize = Math.min(block.fontSize, lineHeight * 0.8, block.fontSize * block.width / measuredWidth * 0.97);
      const style = `left:${(block.x - page.sourceX) * mmPerPixel}mm;top:${(block.y - page.sourceY) * mmPerPixel}mm;width:${block.width * mmPerPixel}mm;height:${block.height * mmPerPixel}mm;font-size:${fontSize * mmPerPixel}mm;line-height:${lineHeight * mmPerPixel}mm`;
      return block.url ? `<a class="composition-search-text" href="${esc(block.url)}" style="${style}">${esc(block.text)}</a>` : `<span class="composition-search-text" style="${style}">${esc(block.text)}</span>`;
    }).join('');
  }
  function bandMarkup(config, prepared, page, total, lang) {
    if (!config.enabled) return '';
    const pieces = [];
    if (config.title) pieces.push(prepared.title);
    if (config.source) pieces.push(...new Set(prepared.items.map(item => item.url).filter(Boolean)));
    if (config.date) {
      const stamp = prepared.items.find(item => item.timestamp !== undefined && item.timestamp !== null);
      const date = stamp ? new Date(stamp.timestamp) : null;
      if (date && Number.isFinite(date.getTime())) {
        try { pieces.push(date.toLocaleString(lang)); } catch { pieces.push(date.toISOString()); }
      }
    }
    if (config.pagination) pieces.push(`${page} / ${total}`);
    return pieces.map(esc).join(' · ');
  }
  async function print(snapshot, options = {}, printArea, lang = 'fr') {
    if (!printArea || typeof printArea.replaceChildren !== 'function' || !printArea.ownerDocument) throw new Error('A print container is required.');
    const request = {};
    printRequests.set(printArea, request);
    const assertCurrent = () => {
      if (printRequests.get(printArea) !== request) throw new Error('Composition print was superseded by a newer request.');
    };
    const prepared = await prepare(snapshot);
    assertCurrent();
    const blocks = compositionBlocks(prepared);
    const plan = avoidTextCuts(dependencies().utils.buildPagePlan(prepared.layout.width, prepared.layout.height, pdfSettings({ ...prepared.exportSettings, ...options })), blocks);
    if (!plan.pages.length || plan.pages.length > MAX_PAGES) throw new Error('PDF page limit exceeded (200 pages).');
    const previous = printJobs.get(printArea);
    if (previous) previous();
    const urls = [];
    const owner = printArea.ownerDocument;
    const printWindow = owner.defaultView || window;
    const oldHidden = printArea.hidden;
    const oldMarker = printArea.getAttribute('data-composition-print');
    let timer;
    const cleanup = () => {
      urls.splice(0).forEach(url => URL.revokeObjectURL(url));
      printWindow.removeEventListener('afterprint', cleanup);
      if (timer) clearTimeout(timer);
      if (printJobs.get(printArea) === cleanup) {
        printJobs.delete(printArea);
        printArea.replaceChildren();
        printArea.hidden = oldHidden;
        if (oldMarker === null) printArea.removeAttribute('data-composition-print');
        else printArea.setAttribute('data-composition-print', oldMarker);
      }
    };
    printJobs.set(printArea, cleanup);
    try {
      const pages = [];
      for (const page of plan.pages) {
        const canvas = await renderPrepared(prepared, { x: page.sourceX, y: page.sourceY, width: page.sourceWidth, height: page.sourceHeight });
        let blob;
        try { assertCurrent(); blob = await canvasBlob(canvas); } finally { canvas.width = 1; canvas.height = 1; }
        assertCurrent();
        const url = URL.createObjectURL(blob);
        urls.push(url);
        const s = plan.settings;
        const bandStyle = `left:${s.marginsMm.left}mm;width:${plan.contentWidthMm}mm;`;
        pages.push(`<section class="composition-print-page" style="width:${plan.pageWidthMm}mm;height:${plan.pageHeightMm}mm"><div class="composition-print-band" style="${bandStyle}top:${s.marginsMm.top}mm;height:${s.header.heightMm}mm">${bandMarkup(s.header, prepared, page.page, plan.pages.length, lang)}</div><div class="composition-print-slice" style="left:${page.xMm}mm;top:${page.yMm}mm;width:${page.widthMm}mm;height:${page.heightMm}mm"><img src="${esc(url)}" alt="${esc(prepared.title)}" style="width:${page.widthMm}mm;height:${page.heightMm}mm">${textLayer(blocks, page, plan.mmPerPixel)}</div><div class="composition-print-band" style="${bandStyle}bottom:${s.marginsMm.bottom}mm;height:${s.footer.heightMm}mm">${bandMarkup(s.footer, prepared, page.page, plan.pages.length, lang)}</div></section>`);
      }
      const style = owner.createElement('style');
      style.textContent = `@page{size:${plan.pageWidthMm}mm ${plan.pageHeightMm}mm;margin:0}@media screen{[data-composition-print]{display:none!important}}@media print{html,body{height:auto!important;min-height:0!important;margin:0!important;padding:0!important;overflow:visible!important}body{display:block!important}body>*:not([data-composition-print]):not(:has([data-composition-print])){display:none!important}[data-composition-print]{display:block!important;margin:0!important;padding:0!important;background:#fff!important;color:#111!important}[data-composition-print] .composition-print-page{position:relative!important;box-sizing:border-box!important;margin:0!important;padding:0!important;overflow:hidden!important;break-inside:avoid!important;break-after:page!important;page-break-after:always!important;print-color-adjust:exact;-webkit-print-color-adjust:exact}[data-composition-print] .composition-print-page:last-child{break-after:auto!important;page-break-after:auto!important}[data-composition-print] .composition-print-slice{position:absolute!important;overflow:hidden!important}[data-composition-print] .composition-print-slice>img{display:block!important;max-width:none!important;margin:0!important;padding:0!important;position:absolute!important;left:0;top:0}[data-composition-print] .composition-search-text{position:absolute!important;color:transparent!important;text-decoration:none!important;white-space:pre!important;overflow:hidden!important;font-family:Arial,sans-serif!important;margin:0!important;padding:0!important}[data-composition-print] .composition-print-band{position:absolute!important;box-sizing:border-box!important;margin:0!important;padding:0!important;font:9pt/1.2 Arial,sans-serif!important;overflow:hidden!important;overflow-wrap:anywhere!important;color:#334155!important}}`;
      const holder = owner.createElement('div');
      holder.innerHTML = pages.join('');
      assertCurrent();
      printArea.replaceChildren(style, ...holder.childNodes);
      printArea.hidden = false;
      printArea.setAttribute('data-composition-print', '');
      await Promise.all(Array.from(printArea.querySelectorAll('img')).map(waitForImage));
      assertCurrent();
      if (owner.fonts && owner.fonts.ready) await owner.fonts.ready;
      assertCurrent();
      printWindow.addEventListener('afterprint', cleanup, { once: true });
      // Fallback for browser implementations that never deliver afterprint (also on cancellation).
      timer = setTimeout(cleanup, 300000);
      printWindow.print();
    } catch (error) { cleanup(); throw error; }
  }
  const api = Object.freeze({ image, html, markdown, print, render });
  root.ScionosCompositionExport = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
