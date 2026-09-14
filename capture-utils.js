// Shared pure helpers for capture assembly. Kept dependency-free so they can
// also be exercised with `node --test`.
(function registerCaptureUtils(globalScope, factory) {
  const api = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  globalScope.ScionosCaptureUtils = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const MAX_OUTPUT_PIXELS = 16_000_000;
  const MAX_CANVAS_DIMENSION = 16_384;
  const MAX_SINGLE_MESSAGE_BYTES = 8 * 1024 * 1024;
  const MAX_TRANSFER_BYTES = 48 * 1024 * 1024;
  const TARGET_TRANSFER_BYTES = 40 * 1024 * 1024;
  const TRANSFER_CHUNK_BYTES = 512 * 1024;

  function buildScrollPositions(fullHeight, viewportHeight) {
    const safeViewportHeight = Math.max(1, Math.floor(viewportHeight));
    const maxScrollY = Math.max(0, Math.ceil(fullHeight - safeViewportHeight));
    const positions = [];

    for (let y = 0; y < maxScrollY; y += safeViewportHeight) {
      positions.push(y);
    }

    if (positions.length === 0 || positions[positions.length - 1] !== maxScrollY) {
      positions.push(maxScrollY);
    }

    return positions;
  }

  function buildCaptureGrid(fullWidth, fullHeight, viewportWidth, viewportHeight) {
    const xPositions = buildScrollPositions(fullWidth, viewportWidth);
    const yPositions = buildScrollPositions(fullHeight, viewportHeight);
    return yPositions.flatMap(y => xPositions.map(x => ({ x, y })));
  }

  function normalizeScrollingRegion(firstPoint, secondPoint, viewport, documentHeight) {
    const viewportLeft = Math.max(0, Number(viewport.x) || 0);
    const viewportWidth = Math.max(1, Number(viewport.width) || 1);
    const maxDocumentHeight = Math.max(1, Number(documentHeight) || 1);
    const firstX = Number(firstPoint.x) || 0;
    const firstY = Number(firstPoint.y) || 0;
    const secondX = Number(secondPoint.x) || 0;
    const secondY = Number(secondPoint.y) || 0;
    const left = Math.max(viewportLeft, Math.min(firstX, secondX));
    const right = Math.min(viewportLeft + viewportWidth, Math.max(firstX, secondX));
    const top = Math.max(0, Math.min(firstY, secondY));
    const bottom = Math.min(maxDocumentHeight, Math.max(firstY, secondY));

    return {
      x: Math.round(left),
      y: Math.round(top),
      width: Math.max(0, Math.round(right - left)),
      height: Math.max(0, Math.round(bottom - top))
    };
  }

  function buildRegionCapturePlan(regionTop, regionHeight, viewportHeight, documentHeight) {
    const safeViewportHeight = Math.max(1, Math.floor(viewportHeight));
    const safeDocumentHeight = Math.max(1, Math.ceil(documentHeight));
    const top = Math.max(0, Math.min(Math.floor(regionTop), safeDocumentHeight - 1));
    const bottom = Math.max(top + 1, Math.min(safeDocumentHeight, Math.ceil(top + regionHeight)));
    const maxScrollY = Math.max(0, safeDocumentHeight - safeViewportHeight);
    const plan = [];
    let coveredUntil = top;

    while (coveredUntil < bottom) {
      const scrollY = Math.min(coveredUntil, maxScrollY);
      const visibleStart = Math.max(top, coveredUntil, scrollY);
      const visibleEnd = Math.min(bottom, scrollY + safeViewportHeight);
      if (visibleEnd <= visibleStart) break;

      plan.push({
        scrollY,
        sourceTop: visibleStart - scrollY,
        sourceHeight: visibleEnd - visibleStart,
        destinationTop: visibleStart - top
      });
      coveredUntil = visibleEnd;
    }

    return plan;
  }

  function computeOutputDimensions(fullWidth, fullHeight, captureScaleX, captureScaleY = captureScaleX) {
    const safeCaptureScaleX = Math.max(0.01, Number(captureScaleX) || 1);
    const safeCaptureScaleY = Math.max(0.01, Number(captureScaleY) || safeCaptureScaleX);
    const naturalWidth = Math.max(1, Math.ceil(fullWidth * safeCaptureScaleX));
    const naturalHeight = Math.max(1, Math.ceil(fullHeight * safeCaptureScaleY));
    const pixelScale = Math.sqrt(MAX_OUTPUT_PIXELS / (naturalWidth * naturalHeight));
    const dimensionScale = Math.min(
      MAX_CANVAS_DIMENSION / naturalWidth,
      MAX_CANVAS_DIMENSION / naturalHeight
    );
    const scale = Math.min(1, pixelScale, dimensionScale);

    return {
      naturalWidth,
      naturalHeight,
      scale,
      width: Math.max(1, Math.floor(naturalWidth * scale)),
      height: Math.max(1, Math.floor(naturalHeight * scale)),
      reduced: scale < 0.9999
    };
  }

  function computeCaptureViewportMetrics(options = {}) {
    const bitmapWidth = Math.max(1, Number(options.bitmapWidth) || 1);
    const bitmapHeight = Math.max(1, Number(options.bitmapHeight) || 1);
    const innerWidth = Math.max(1, Number(options.innerWidth) || 1);
    const innerHeight = Math.max(1, Number(options.innerHeight) || 1);
    const contentWidth = Math.max(1, Math.min(innerWidth, Number(options.contentWidth) || innerWidth));
    const contentHeight = Math.max(1, Math.min(innerHeight, Number(options.contentHeight) || innerHeight));
    const contentLeft = Math.max(0, Number(options.contentLeft) || 0);
    const contentTop = Math.max(0, Number(options.contentTop) || 0);
    const scaleX = bitmapWidth / innerWidth;
    const scaleY = bitmapHeight / innerHeight;
    const sourceLeft = Math.max(0, Math.min(bitmapWidth - 1, Math.round(contentLeft * scaleX)));
    const sourceTop = Math.max(0, Math.min(bitmapHeight - 1, Math.round(contentTop * scaleY)));
    const sourceRight = Math.max(sourceLeft + 1, Math.min(bitmapWidth, Math.round((contentLeft + contentWidth) * scaleX)));
    const sourceBottom = Math.max(sourceTop + 1, Math.min(bitmapHeight, Math.round((contentTop + contentHeight) * scaleY)));
    return {
      bitmapWidth, bitmapHeight, innerWidth, innerHeight, contentWidth, contentHeight,
      scrollbarWidth: Math.max(0, innerWidth - contentWidth),
      scrollbarHeight: Math.max(0, innerHeight - contentHeight),
      scaleX, scaleY,
      crop: { x: sourceLeft, y: sourceTop, width: sourceRight - sourceLeft, height: sourceBottom - sourceTop }
    };
  }

  function computeTileDestination(actualX, actualY, cropWidth, cropHeight, captureScaleX, captureScaleY, outputScale) {
    const safeScaleX = Math.max(0.01, Number(captureScaleX) || 1);
    const safeScaleY = Math.max(0.01, Number(captureScaleY) || safeScaleX);
    const safeOutputScale = Math.max(0.01, Number(outputScale) || 1);
    const x = Math.max(0, Number(actualX) || 0);
    const y = Math.max(0, Number(actualY) || 0);
    const cssWidth = Math.max(0, Number(cropWidth) || 0) / safeScaleX;
    const cssHeight = Math.max(0, Number(cropHeight) || 0) / safeScaleY;
    const left = Math.round(x * safeScaleX * safeOutputScale);
    const top = Math.round(y * safeScaleY * safeOutputScale);
    const right = Math.round((x + cssWidth) * safeScaleX * safeOutputScale);
    const bottom = Math.round((y + cssHeight) * safeScaleY * safeOutputScale);
    return { x: left, y: top, width: Math.max(1, right - left), height: Math.max(1, bottom - top) };
  }

  function computePayloadReductionScale(size, maximumBytes = MAX_TRANSFER_BYTES, targetBytes = TARGET_TRANSFER_BYTES) {
    const safeSize = Math.max(0, Number(size) || 0);
    const safeMaximum = Math.max(1, Number(maximumBytes) || MAX_TRANSFER_BYTES);
    const safeTarget = Math.max(1, Math.min(safeMaximum, Number(targetBytes) || safeMaximum));
    if (safeSize <= safeMaximum) return 1;
    return Math.max(0.1, Math.min(0.95, Math.sqrt(safeTarget / safeSize) * 0.95));
  }

  function isRestrictedUrl(url) {
    if (!url) return true;
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:', 'file:'].includes(parsed.protocol)) return true;
      return /^(?:chromewebstore\.google\.com|chrome\.google\.com|microsoftedge\.microsoft\.com)$/i.test(parsed.hostname);
    } catch {
      return true;
    }
  }

  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function sanitizeUrl(url) {
    if (!url || typeof url !== 'string') return '';
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return parsed.href;
      }
    } catch {
      // Ignore invalid URL
    }
    return '';
  }

  function buildHtmlReport(options = {}) {
    const title = options.title || 'Scionos Capture';
    const rawUrl = options.url || '';
    const safeUrl = sanitizeUrl(rawUrl);
    const timestamp = options.timestamp ? new Date(options.timestamp).toLocaleString(options.lang || 'fr') : new Date().toLocaleString();
    const width = Number(options.width) || 0;
    const height = Number(options.height) || 0;
    const dataUrl = options.dataUrl || '';
    const lang = options.lang || 'fr';
    const texts = options.texts || {};

    const txtSource = texts.reportSource || 'Source';
    const txtDate = texts.reportDate || 'Date';
    const txtDimensions = texts.reportDimensions || 'Dimensions';
    const txtZoomFit = texts.reportZoomFit || 'Adapter';
    const txtZoomReset = texts.reportZoomReset || '100 %';
    const txtDownload = texts.btnPng || 'Télécharger PNG';
    const txtCopy = texts.btnCopy || 'Copier';
    const txtPrint = texts.btnPrint || 'Imprimer';
    const txtCopied = texts.reportCopied || 'Image copiée dans le presse-papiers.';
    const txtAppName = texts.appName || 'Scionos Capture';

    const escapedTitle = escapeHtml(title);
    const escapedRawUrl = escapeHtml(rawUrl);
    const escapedSafeUrl = escapeHtml(safeUrl);
    const escapedTimestamp = escapeHtml(timestamp);
    const escapedLang = escapeHtml(lang);

    return `<!DOCTYPE html>
<html lang="${escapedLang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%233B82F6'/%3E%3Cstop offset='100%25' stop-color='%23A855F7'/%3E%3C/linearGradient%3E%3ClinearGradient id='sg' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%2360A5FA'/%3E%3Cstop offset='100%25' stop-color='%233B82F6'/%3E%3C/linearGradient%3E%3ClinearGradient id='ng' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23818CF8'/%3E%3Cstop offset='100%25' stop-color='%23C084FC'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='128' height='128' rx='28' fill='%2308111e'/%3E%3Crect x='1.5' y='1.5' width='125' height='125' rx='26.5' fill='none' stroke='url(%23g)' stroke-width='2' stroke-opacity='0.6'/%3E%3Cpath d='M16 34V22A6 6 0 0 1 22 16H34' fill='none' stroke='%233B82F6' stroke-width='4' stroke-linecap='round'/%3E%3Cpath d='M94 16H106A6 6 0 0 1 112 22V34' fill='none' stroke='%2360A5FA' stroke-width='4' stroke-linecap='round'/%3E%3Cpath d='M16 94V106A6 6 0 0 0 22 112H34' fill='none' stroke='%23818CF8' stroke-width='4' stroke-linecap='round'/%3E%3Cpath d='M94 112H106A6 6 0 0 0 112 106V94' fill='none' stroke='%23A855F7' stroke-width='4' stroke-linecap='round'/%3E%3Cpath d='M54 44C47 38 35 38 31 44C27 50 30 56 37 60L46 64C54 68 56 75 52 82C47 89 35 90 28 84' fill='none' stroke='url(%23sg)' stroke-width='9.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M72 86V42L98 86V42' fill='none' stroke='url(%23ng)' stroke-width='9.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E">
  <title>${escapedTitle} — ${escapeHtml(txtAppName)}</title>
  <style>
    :root {
      --bg: #08111e;
      --panel: #0c1828;
      --panel-2: #13233a;
      --line: #1e293b;
      --text: #e2e8f0;
      --muted: #94a3b8;
      --cyan: #06b6d4;
      --cyan-dark: #075985;
      --radius: 8px;
    }
    @media (prefers-color-scheme: light) {
      :root {
        --bg: #f8fafc;
        --panel: #ffffff;
        --panel-2: #f1f5f9;
        --line: #cbd5e1;
        --text: #0f172a;
        --muted: #64748b;
        --cyan: #0284c7;
        --cyan-dark: #0369a1;
      }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    header {
      background: var(--panel);
      border-bottom: 1px solid var(--line);
      padding: 10px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      z-index: 10;
      flex-wrap: wrap;
    }
    .brand-header {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
      flex: 1 1 300px;
    }
    .brand-logo {
      flex: 0 0 auto;
      border-radius: 6px;
    }
    .meta-group {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      flex: 1 1 auto;
    }
    .title {
      font-size: 15px;
      font-weight: 700;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .meta-details {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 12px;
      color: var(--muted);
      flex-wrap: wrap;
    }
    .meta-item { display: inline-flex; align-items: center; gap: 4px; }
    .meta-link {
      color: var(--cyan);
      text-decoration: none;
      max-width: 260px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .meta-link:hover { text-decoration: underline; }
    .badge {
      background: var(--panel-2);
      border: 1px solid var(--line);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: ui-monospace, monospace;
      font-size: 11px;
    }
    .actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 12px;
      font-size: 12px;
      font-weight: 600;
      border-radius: var(--radius);
      border: 1px solid var(--line);
      background: var(--panel-2);
      color: var(--text);
      cursor: pointer;
      text-decoration: none;
      transition: background 0.15s, border-color 0.15s;
    }
    .btn:hover { border-color: var(--cyan); }
    .btn-primary {
      background: var(--cyan-dark);
      border-color: var(--cyan);
      color: #ffffff;
    }
    .btn-primary:hover { background: #0369a1; }
    .zoom-group {
      display: flex;
      align-items: center;
      background: var(--panel-2);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 2px;
    }
    .zoom-btn {
      padding: 5px 9px;
      background: transparent;
      border: none;
      color: var(--text);
      font-weight: bold;
      cursor: pointer;
      border-radius: 4px;
    }
    .zoom-btn:hover { background: var(--line); }
    .zoom-val {
      min-width: 48px;
      text-align: center;
      font-size: 11px;
      font-family: ui-monospace, monospace;
      color: var(--muted);
    }
    .viewer {
      flex: 1;
      overflow: auto;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 24px;
      position: relative;
      cursor: grab;
      user-select: none;
    }
    .viewer.grabbing { cursor: grabbing; }
    .img-wrap {
      transform-origin: top center;
      transition: transform 0.08s ease-out;
      box-shadow: 0 10px 40px rgba(0,0,0,0.4);
      display: inline-block;
      line-height: 0;
      background: #ffffff;
    }
    .img-wrap img {
      display: block;
      width: 100%;
      height: auto;
    }
    .toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: var(--panel);
      border: 1px solid var(--cyan);
      color: var(--text);
      padding: 10px 18px;
      border-radius: var(--radius);
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s, transform 0.2s;
      z-index: 100;
    }
    .toast.visible {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    @media print {
      header, .toast { display: none !important; }
      body, .viewer { overflow: visible !important; display: block !important; padding: 0 !important; background: #fff !important; }
      .img-wrap { box-shadow: none !important; transform: none !important; width: 100% !important; }
      .img-wrap img { width: 100% !important; }
    }
  </style>
</head>
<body>
  <header>
    <div class="brand-header">
      <svg class="brand-logo" viewBox="0 0 128 128" width="32" height="32" aria-hidden="true">
        <defs>
          <linearGradient id="scioLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#3B82F6"/>
            <stop offset="50%" stop-color="#6366F1"/>
            <stop offset="100%" stop-color="#A855F7"/>
          </linearGradient>
          <linearGradient id="scioSGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#60A5FA"/>
            <stop offset="100%" stop-color="#3B82F6"/>
          </linearGradient>
          <linearGradient id="scioNGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#818CF8"/>
            <stop offset="100%" stop-color="#C084FC"/>
          </linearGradient>
        </defs>
        <rect width="128" height="128" rx="28" fill="#0b1328"/>
        <rect x="1.5" y="1.5" width="125" height="125" rx="26.5" fill="none" stroke="url(#scioLogoGrad)" stroke-width="2" stroke-opacity="0.6"/>
        <path d="M16 34 V22 A6 6 0 0 1 22 16 H34" fill="none" stroke="#3B82F6" stroke-width="4" stroke-linecap="round"/>
        <path d="M94 16 H106 A6 6 0 0 1 112 22 V34" fill="none" stroke="#60A5FA" stroke-width="4" stroke-linecap="round"/>
        <path d="M16 94 V106 A6 6 0 0 0 22 112 H34" fill="none" stroke="#818CF8" stroke-width="4" stroke-linecap="round"/>
        <path d="M94 112 H106 A6 6 0 0 0 112 106 V94" fill="none" stroke="#A855F7" stroke-width="4" stroke-linecap="round"/>
        <path d="M 54 44 C 47 38 35 38 31 44 C 27 50 30 56 37 60 L 46 64 C 54 68 56 75 52 82 C 47 89 35 90 28 84" fill="none" stroke="url(#scioSGrad)" stroke-width="9.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M 72 86 V 42 L 98 86 V 42" fill="none" stroke="url(#scioNGrad)" stroke-width="9.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <div class="meta-group">
        <div class="title" title="${escapedTitle}">${escapedTitle}</div>
        <div class="meta-details">
          ${safeUrl ? `<span class="meta-item"><strong>${escapeHtml(txtSource)}:</strong> <a class="meta-link" href="${escapedSafeUrl}" target="_blank" rel="noopener noreferrer" title="${escapedRawUrl}">${escapedRawUrl}</a></span>` : (rawUrl ? `<span class="meta-item"><strong>${escapeHtml(txtSource)}:</strong> <span class="meta-link" title="${escapedRawUrl}">${escapedRawUrl}</span></span>` : '')}
          <span class="meta-item"><strong>${escapeHtml(txtDate)}:</strong> ${escapedTimestamp}</span>
          ${width && height ? `<span class="badge" title="${escapeHtml(txtDimensions)}">${width} × ${height} px</span>` : ''}
        </div>
      </div>
    </div>
    <div class="actions">
      <div class="zoom-group">
        <button class="zoom-btn" id="btn-zoom-out" type="button" title="Zoom -">−</button>
        <span class="zoom-val" id="zoom-val">100%</span>
        <button class="zoom-btn" id="btn-zoom-in" type="button" title="Zoom +">+</button>
        <button class="zoom-btn" id="btn-zoom-fit" type="button" title="${escapeHtml(txtZoomFit)}">${escapeHtml(txtZoomFit)}</button>
        <button class="zoom-btn" id="btn-zoom-reset" type="button" title="${escapeHtml(txtZoomReset)}">${escapeHtml(txtZoomReset)}</button>
      </div>
      <button class="btn" id="btn-copy" type="button"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>${escapeHtml(txtCopy)}</button>
      <button class="btn" id="btn-print" type="button"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6z"/></svg>${escapeHtml(txtPrint)}</button>
      <a class="btn btn-primary" id="btn-download" href="${dataUrl}" download="Scionos_Capture.png"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 19h16"/></svg>${escapeHtml(txtDownload)}</a>
    </div>
  </header>

  <main class="viewer" id="viewer">
    <div class="img-wrap" id="img-wrap">
      <img id="capture-img" src="${dataUrl}" alt="${escapedTitle}">
    </div>
  </main>

  <div class="toast" id="toast" role="status" aria-live="polite"></div>

  <script>
    (function() {
      var viewer = document.getElementById('viewer');
      var imgWrap = document.getElementById('img-wrap');
      var captureImg = document.getElementById('capture-img');
      var zoomVal = document.getElementById('zoom-val');
      var btnZoomIn = document.getElementById('btn-zoom-in');
      var btnZoomOut = document.getElementById('btn-zoom-out');
      var btnZoomFit = document.getElementById('btn-zoom-fit');
      var btnZoomReset = document.getElementById('btn-zoom-reset');
      var btnCopy = document.getElementById('btn-copy');
      var btnPrint = document.getElementById('btn-print');
      var toast = document.getElementById('toast');

      var zoom = 1;
      var minZoom = 0.1;
      var maxZoom = 4;

      function setZoom(newZoom) {
        zoom = Math.max(minZoom, Math.min(maxZoom, newZoom));
        imgWrap.style.transform = 'scale(' + zoom + ')';
        zoomVal.textContent = Math.round(zoom * 100) + '%';
      }

      function fitToWidth() {
        if (!captureImg.naturalWidth) return;
        var availableWidth = viewer.clientWidth - 48;
        var scale = availableWidth / captureImg.naturalWidth;
        setZoom(scale > 1 ? 1 : scale);
      }

      btnZoomIn.addEventListener('click', function() { setZoom(zoom + 0.15); });
      btnZoomOut.addEventListener('click', function() { setZoom(zoom - 0.15); });
      btnZoomReset.addEventListener('click', function() { setZoom(1); });
      btnZoomFit.addEventListener('click', fitToWidth);

      viewer.addEventListener('wheel', function(e) {
        if (e.ctrlKey || e.metaKey || e.altKey) {
          e.preventDefault();
          var delta = e.deltaY < 0 ? 0.1 : -0.1;
          setZoom(zoom + delta);
        }
      }, { passive: false });

      var isDragging = false;
      var startX = 0, startY = 0;
      var scrollLeft = 0, scrollTop = 0;

      viewer.addEventListener('mousedown', function(e) {
        if (e.target.closest('button, a, input')) return;
        isDragging = true;
        viewer.classList.add('grabbing');
        startX = e.pageX - viewer.offsetLeft;
        startY = e.pageY - viewer.offsetTop;
        scrollLeft = viewer.scrollLeft;
        scrollTop = viewer.scrollTop;
      });

      window.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        e.preventDefault();
        var x = e.pageX - viewer.offsetLeft;
        var y = e.pageY - viewer.offsetTop;
        viewer.scrollLeft = scrollLeft - (x - startX);
        viewer.scrollTop = scrollTop - (y - startY);
      });

      window.addEventListener('mouseup', function() {
        isDragging = false;
        viewer.classList.remove('grabbing');
      });

      function showToast(msg) {
        toast.textContent = msg;
        toast.classList.add('visible');
        setTimeout(function() { toast.classList.remove('visible'); }, 2500);
      }

      btnCopy.addEventListener('click', async function() {
        try {
          var res = await fetch(captureImg.src);
          var blob = await res.blob();
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          showToast(${JSON.stringify(txtCopied)});
        } catch (err) {
          showToast('Erreur: ' + err.message);
        }
      });

      btnPrint.addEventListener('click', function() {
        window.print();
      });

      document.addEventListener('keydown', function(e) {
        if (e.key === '+' || e.key === '=') setZoom(zoom + 0.15);
        if (e.key === '-') setZoom(zoom - 0.15);
        if (e.key === '0') fitToWidth();
      });

      if (captureImg.complete) {
        fitToWidth();
      } else {
        captureImg.onload = fitToWidth;
      }
    })();
  </script>
</body>
</html>`;
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function waitForPaint() {
    return new Promise(resolve => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
  }

  return {
    MAX_OUTPUT_PIXELS,
    MAX_CANVAS_DIMENSION,
    MAX_SINGLE_MESSAGE_BYTES,
    MAX_TRANSFER_BYTES,
    TARGET_TRANSFER_BYTES,
    TRANSFER_CHUNK_BYTES,
    buildScrollPositions,
    buildCaptureGrid,
    normalizeScrollingRegion,
    buildRegionCapturePlan,
    computeOutputDimensions,
    computeCaptureViewportMetrics,
    computeTileDestination,
    computePayloadReductionScale,
    isRestrictedUrl,
    escapeHtml,
    sanitizeUrl,
    buildHtmlReport,
    delay,
    waitForPaint
  };
});
