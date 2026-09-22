// Page capture controller. Injected on demand into the active tab.
(function registerContentCapture() {
  if (window.hasScionosCaptureLoaded) return;
  window.hasScionosCaptureLoaded = true;

  const Utils = ScionosCaptureUtils;
  const ACTIONS = new Set([
    'PING',
    'START_FULL_PAGE_CAPTURE',
    'START_VISIBLE_CAPTURE',
    'START_ZONE_CAPTURE',
    'START_SCROLLING_ZONE_CAPTURE'
  ]);
  let captureRunning = false;
  let activeMessages = {};

  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (!request || !ACTIONS.has(request.action)) return;
    if (request.action === 'PING') {
      sendResponse({ loaded: true });
      return;
    }
    if (captureRunning) {
      sendResponse({ status: 'busy' });
      return;
    }

    captureRunning = true;
    activeMessages = request.messages && typeof request.messages === 'object' ? request.messages : {};
    const operation = request.action === 'START_FULL_PAGE_CAPTURE'
      ? executeFullPageCapture()
      : request.action === 'START_ZONE_CAPTURE'
        ? executeZoneCapture()
        : request.action === 'START_SCROLLING_ZONE_CAPTURE'
          ? executeScrollingZoneCapture()
          : executeVisibleCapture();

    Promise.resolve(operation).finally(() => { captureRunning = false; });
    sendResponse({ status: 'started' });
  });

  function text(key, params = {}) {
    const value = typeof activeMessages[key] === 'string' ? activeMessages[key] : key;
    return Object.entries(params).reduce(
      (result, [name, replacement]) => result.replaceAll(`{${name}}`, String(replacement)),
      value
    );
  }

  async function executeVisibleCapture() {
    try {
      const response = await captureVisibleTab();
      const prepared = await prepareDataUrlForEditor(response.dataUrl);
      await openEditor(prepared.blob, prepared.scale);
    } catch (error) {
      console.error('Visible capture failed:', error);
      alert(text('visibleError') + error.message);
    }
  }

  const SCROLLABLE_OVERFLOW_VALUES = new Set(['auto', 'overlay', 'scroll']);

  function getDocumentScrollSurface() {
    const element = document.scrollingElement || document.documentElement;
    return {
      element,
      isDocument: true,
      getMetrics() {
        const viewportWidth = Math.max(1, element.clientWidth);
        const viewportHeight = Math.max(1, element.clientHeight);
        const scrollbarWidth = Math.max(0, window.innerWidth - viewportWidth);
        const scrollbarHeight = Math.max(0, window.innerHeight - viewportHeight);
        const measuredWidth = Math.max(element.scrollWidth, viewportWidth);
        const measuredHeight = Math.max(element.scrollHeight, viewportHeight);
        return {
          fullWidth: measuredWidth - viewportWidth <= scrollbarWidth + 2 ? viewportWidth : measuredWidth,
          fullHeight: measuredHeight - viewportHeight <= scrollbarHeight + 2 ? viewportHeight : measuredHeight,
          viewportWidth, viewportHeight
        };
      },
      getPosition() {
        return { x: window.scrollX, y: window.scrollY };
      },
      scrollTo(x, y) {
        window.scrollTo(x, y);
      },
      getCaptureRect() {
        return { left: 0, top: 0, width: element.clientWidth, height: element.clientHeight };
      }
    };
  }

  function getElementScrollSurface(element) {
    return {
      element,
      isDocument: false,
      getMetrics() {
        return {
          fullWidth: Math.max(element.scrollWidth, element.clientWidth),
          fullHeight: Math.max(element.scrollHeight, element.clientHeight),
          viewportWidth: Math.max(1, element.clientWidth),
          viewportHeight: Math.max(1, element.clientHeight)
        };
      },
      getPosition() {
        return { x: element.scrollLeft, y: element.scrollTop };
      },
      scrollTo(x, y) {
        element.scrollLeft = x;
        element.scrollTop = y;
        if (typeof element.scrollTo === 'function') {
          try {
            element.scrollTo({ left: x, top: y, behavior: 'instant' });
          } catch (_error) { void _error; }
        }
      },
      getCaptureRect() {
        const rect = element.getBoundingClientRect();
        return {
          left: rect.left + element.clientLeft,
          top: rect.top + element.clientTop,
          width: element.clientWidth,
          height: element.clientHeight
        };
      }
    };
  }

  function hasScrollRange(metrics) {
    return metrics.fullWidth > metrics.viewportWidth + 2
      || metrics.fullHeight > metrics.viewportHeight + 2;
  }

  function isVisibleScrollCandidate(element) {
    if (!element || element === document.documentElement || element.closest('[data-scionos-capture]')) return false;
    const styles = getComputedStyle(element);
    const canScrollX = element.scrollWidth > element.clientWidth + 2
      && SCROLLABLE_OVERFLOW_VALUES.has(styles.overflowX);
    const canScrollY = element.scrollHeight > element.clientHeight + 2
      && SCROLLABLE_OVERFLOW_VALUES.has(styles.overflowY);
    if (!canScrollX && !canScrollY) return false;

    const rect = element.getBoundingClientRect();
    return rect.width > 0
      && rect.height > 0
      && rect.left >= -8
      && rect.top >= -8
      && rect.right <= window.innerWidth + 8
      && rect.bottom <= window.innerHeight + 8;
  }

  function isScrollableElement(element) {
    if (!element || element === document.documentElement || element === document.body) return false;
    if (element.closest && element.closest('[data-scionos-capture]')) return false;
    const styles = getComputedStyle(element);
    if (styles.display === 'none' || styles.visibility === 'hidden') return false;
    const canScrollX = element.scrollWidth > element.clientWidth + 2
      && SCROLLABLE_OVERFLOW_VALUES.has(styles.overflowX);
    const canScrollY = element.scrollHeight > element.clientHeight + 2
      && SCROLLABLE_OVERFLOW_VALUES.has(styles.overflowY);
    if (!canScrollX && !canScrollY) return false;

    const rect = element.getBoundingClientRect();
    return rect.width > 0
      && rect.height > 0
      && rect.bottom > 0
      && rect.top < window.innerHeight
      && rect.right > 0
      && rect.left < window.innerWidth;
  }

  function findScrollSurface() {
    const documentSurface = getDocumentScrollSurface();
    if (hasScrollRange(documentSurface.getMetrics())) return documentSurface;

    const candidates = [document.body, ...document.querySelectorAll('body *')]
      .filter(isVisibleScrollCandidate)
      .map(element => ({
        surface: getElementScrollSurface(element),
        score: Math.max(1, element.scrollWidth) * Math.max(1, element.scrollHeight)
      }))
      .sort((first, second) => second.score - first.score);

    return candidates[0] ? candidates[0].surface : documentSurface;
  }

  function findScrollSurfaceAtPoint(clientX, clientY) {
    const rawElements = document.elementsFromPoint(clientX, clientY);
    const elements = rawElements.filter(el => !el.closest || !el.closest('[data-scionos-capture]'));

    // Strategy 1: Check elements under cursor and their ancestor chain
    for (const element of elements) {
      let candidate = element;
      while (candidate && candidate !== document.body && candidate !== document.documentElement) {
        if (isScrollableElement(candidate)) return getElementScrollSurface(candidate);
        candidate = candidate.parentElement;
      }
    }

    // Strategy 2: If clicked on a header, border or non-scrollable wrapper (e.g. Messenger chat header/dock),
    // inspect enclosing container cards/dialogs under the point for scrollable descendants
    for (const element of elements) {
      let container = element;
      while (container && container !== document.body && container !== document.documentElement) {
        const scrollableChildren = Array.from(container.querySelectorAll('*')).filter(isScrollableElement);
        if (scrollableChildren.length > 0) {
          scrollableChildren.sort((first, second) => {
            const scoreFirst = (first.scrollHeight - first.clientHeight) * Math.max(1, first.clientWidth);
            const scoreSecond = (second.scrollHeight - second.clientHeight) * Math.max(1, second.clientWidth);
            return scoreSecond - scoreFirst;
          });
          return getElementScrollSurface(scrollableChildren[0]);
        }
        container = container.parentElement;
      }
    }

    // Strategy 3: Probe downward in case a top header was clicked
    for (const offset of [35, 70]) {
      const probeY = Math.min(window.innerHeight - 10, clientY + offset);
      if (probeY !== clientY) {
        const probeElements = document.elementsFromPoint(clientX, probeY)
          .filter(el => !el.closest || !el.closest('[data-scionos-capture]'));
        for (const element of probeElements) {
          let candidate = element;
          while (candidate && candidate !== document.body && candidate !== document.documentElement) {
            if (isScrollableElement(candidate)) return getElementScrollSurface(candidate);
            candidate = candidate.parentElement;
          }
        }
      }
    }

    return getDocumentScrollSurface();
  }

  function getSurfaceMaxScroll(surface) {
    return {
      x: Math.max(0, surface.element.scrollWidth - surface.element.clientWidth),
      y: Math.max(0, surface.element.scrollHeight - surface.element.clientHeight)
    };
  }

  function assertSurfacePosition(surface, target) {
    const actual = surface.getPosition();
    const maxScroll = getSurfaceMaxScroll(surface);
    const expectedX = Math.min(Math.max(0, target.x), maxScroll.x);
    const expectedY = Math.min(Math.max(0, target.y), maxScroll.y);
    if ((expectedX > 2 && actual.x < expectedX - 2) || (expectedY > 2 && actual.y < expectedY - 2)) {
      throw new Error(text('fullScrollError'));
    }
    return { x: Math.round(actual.x), y: Math.round(actual.y) };
  }

  async function settleVisibleResources() {
    if (document.fonts && document.fonts.ready) {
      await Promise.race([document.fonts.ready, Utils.delay(2000)]).catch(() => undefined);
    }
    const images = Array.from(document.images).filter(image => {
      const rect = image.getBoundingClientRect();
      return rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
    });
    await Promise.race([
      Promise.all(images.map(image => image.complete ? Promise.resolve() : image.decode().catch(() => undefined))),
      Utils.delay(2000)
    ]);
  }

  async function stabilizePageDimensions(surface, range) {
    await settleVisibleResources();
    const startedAt = Date.now();
    let previous = surface.getMetrics();
    let stablePasses = 0;
    for (let pass = 0; pass < 4 && stablePasses < 2 && Date.now() - startedAt < 5000; pass += 1) {
      let positions = Utils.buildScrollPositions(previous.fullHeight, previous.viewportHeight);
      if (range) {
        const rangeTop = typeof range.top === 'number' ? range.top : (Number(range.y) || 0);
        const rangeBottom = typeof range.bottom === 'number'
          ? range.bottom
          : (rangeTop + (Number(range.height) || previous.viewportHeight));
        const scoped = positions.filter(y => y + previous.viewportHeight > rangeTop && y < rangeBottom);
        if (scoped.length) positions = scoped;
      }
      const originalX = surface.getPosition().x;
      for (const y of positions) {
        surface.scrollTo(originalX, y);
        await Utils.waitForPaint();
        await Utils.delay(120);
        assertSurfacePosition(surface, { x: originalX, y });
      }
      const next = surface.getMetrics();
      stablePasses = Math.abs(next.fullHeight - previous.fullHeight) <= 2
        && Math.abs(next.fullWidth - previous.fullWidth) <= 2
        ? stablePasses + 1 : 0;
      previous = next;
    }
    return previous;
  }

  function suspendPageMotion() {
    const style = document.createElement('style');
    style.dataset.scionosCapture = 'motion';
    style.textContent = `
      *, *::before, *::after {
        animation-play-state: paused !important;
        transition-property: none !important;
        caret-color: transparent !important;
        scroll-behavior: auto !important;
      }
    `;
    document.documentElement.appendChild(style);
    return () => style.remove();
  }

  function createAnchoredElementManager(surface, captureBounds) {
    let hidden = [];
    const bounds = captureBounds || (surface.isDocument
      ? { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight }
      : surface.getCaptureRect());

    const classifyElement = element => {
      if (!element.isConnected || element.closest('[data-scionos-capture]')) return null;
      if (!surface.isDocument && (element === surface.element || element.contains(surface.element))) return null;

      const styles = getComputedStyle(element);
      const isFixedOrSticky = ['fixed', 'sticky'].includes(styles.position);
      const isExternalAbsolute = !surface.isDocument
        && styles.position === 'absolute'
        && !surface.element.contains(element);

      if (!isFixedOrSticky && !isExternalAbsolute) return null;

      const rect = element.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1 || rect.bottom <= 0 || rect.right <= 0) return null;

      const overlapsHorizontally = rect.right > bounds.left && rect.left < bounds.right;
      const overlapsVertically = rect.bottom > bounds.top && rect.top < bounds.bottom;
      if (!overlapsHorizontally || !overlapsVertically) return null;

      if (surface.isDocument && styles.position === 'fixed') {
        const viewportCenter = window.innerHeight / 2;
        const isBottom = rect.top > viewportCenter || (Number.parseFloat(styles.bottom) <= 10 && rect.bottom >= window.innerHeight - 15);
        return isBottom ? 'bottom' : 'top';
      }

      const surfaceRect = surface.isDocument
        ? { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight }
        : surface.getCaptureRect();

      const top = Number.parseFloat(styles.top);
      const bottom = Number.parseFloat(styles.bottom);
      const isAnchoredTop = Number.isFinite(top) && Math.abs(rect.top - (surfaceRect.top + top)) <= 4;
      const isAnchoredBottom = Number.isFinite(bottom) && Math.abs(rect.bottom - (surfaceRect.bottom - bottom)) <= 4;

      if (isAnchoredTop) return 'top';
      if (isAnchoredBottom) return 'bottom';

      const midY = (bounds.top + bounds.bottom) / 2;
      return rect.top >= midY ? 'bottom' : 'top';
    };

    return {
      prepare(tileIndex = 0, totalTiles = 1) {
        hidden = [];
        for (const element of document.querySelectorAll('body *')) {
          const anchorType = classifyElement(element);
          if (!anchorType) continue;

          const shouldHide = (anchorType === 'top' && tileIndex > 0)
            || (anchorType === 'bottom' && tileIndex < totalTiles - 1 && totalTiles > 1);

          if (shouldHide) {
            hidden.push({
              element,
              value: element.style.getPropertyValue('visibility'),
              priority: element.style.getPropertyPriority('visibility')
            });
            element.style.setProperty('visibility', 'hidden', 'important');
          }
        }
      },
      restore() {
        hidden.forEach(({ element, value, priority }) => {
          if (!element.isConnected) return;
          if (value) element.style.setProperty('visibility', value, priority);
          else element.style.removeProperty('visibility');
        });
        hidden = [];
      }
    };
  }

  function layoutChangedError() {
    const error = new Error(text('layoutChangedError'));
    error.code = 'LAYOUT_CHANGED';
    return error;
  }

  function assertStableMetrics(surface, baseline) {
    const current = surface.getMetrics();
    if (Math.abs(current.fullWidth - baseline.fullWidth) > 2
        || Math.abs(current.fullHeight - baseline.fullHeight) > 2
        || Math.abs(current.viewportWidth - baseline.viewportWidth) > 2
        || Math.abs(current.viewportHeight - baseline.viewportHeight) > 2) {
      throw layoutChangedError();
    }
    return current;
  }

  async function executeFullPageCapture() {
    const root = document.documentElement;
    const originalScrollBehavior = ScionosContentUtils.snapshotInlineStyle(root, 'scroll-behavior');
    let progress;
    let restoreMotion = () => {};
    let surface;
    let originalPosition = { x: 0, y: 0 };

    try {
      root.style.setProperty('scroll-behavior', 'auto');
      restoreMotion = suspendPageMotion();
      progress = createProgressIndicator();
      surface = findScrollSurface();
      originalPosition = surface.getPosition();

      for (let attempt = 0; attempt < 2; attempt += 1) {
        const baseline = await stabilizePageDimensions(surface);
        surface.scrollTo(0, 0);
        await Utils.waitForPaint();
        try {
          const prepared = await captureFullPageAttempt(surface, baseline, progress);
          await openEditor(prepared.blob, prepared.scale);
          return;
        } catch (error) {
          if (error.code !== 'LAYOUT_CHANGED' || attempt > 0) throw error;
        }
      }
    } catch (error) {
      console.error('Full-page capture failed:', error);
      alert(text('fullError') + error.message);
    } finally {
      if (surface) surface.scrollTo(originalPosition.x, originalPosition.y);
      restoreMotion();
      ScionosContentUtils.restoreInlineStyle(originalScrollBehavior);
      removeProgressIndicator(progress);
    }
  }

  async function captureFullPageAttempt(surface, baseline, progress) {
    const { fullWidth, fullHeight, viewportWidth, viewportHeight } = baseline;
    const grid = Utils.buildCaptureGrid(fullWidth, fullHeight, viewportWidth, viewportHeight);
    const anchored = createAnchoredElementManager(surface);
    let canvas;
    let context;
    let outputScale = 1;
    let bitmapSize;

    for (let index = 0; index < grid.length; index += 1) {
      const target = grid[index];
      surface.scrollTo(target.x, target.y);
      await Utils.waitForPaint();
      await Utils.delay(120);
      assertStableMetrics(surface, baseline);
      const actual = assertSurfacePosition(surface, target);
      const percent = Math.round(((index + 1) / grid.length) * 100);
      updateProgress(progress, percent, outputScale < 0.9999);

      anchored.prepare(index, grid.length);
      progress.style.visibility = 'hidden';
      let image;
      try {
        await Utils.waitForPaint();
        const response = await captureVisibleTab();
        image = await loadImage(response.dataUrl);
      } finally {
        progress.style.visibility = 'visible';
        anchored.restore();
      }
      if (bitmapSize && (bitmapSize.width !== image.width || bitmapSize.height !== image.height)) throw layoutChangedError();
      bitmapSize = { width: image.width, height: image.height };
      const capture = getSurfaceCaptureCrop(surface, image);

      if (!canvas) {
        const dimensions = Utils.computeOutputDimensions(fullWidth, fullHeight, capture.scaleX, capture.scaleY);
        canvas = document.createElement('canvas');
        canvas.width = dimensions.width;
        canvas.height = dimensions.height;
        context = canvas.getContext('2d', { alpha: false });
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        outputScale = dimensions.scale;
        updateProgress(progress, percent, dimensions.reduced);
      }

      const destination = Utils.computeTileDestination(
        actual.x, actual.y, capture.crop.width, capture.crop.height,
        capture.scaleX, capture.scaleY, outputScale
      );
      context.drawImage(
        image, capture.crop.x, capture.crop.y, capture.crop.width, capture.crop.height,
        destination.x, destination.y, destination.width, destination.height
      );
    }

    return prepareCanvasForEditor(canvas, outputScale);
  }

  function getSurfaceCaptureCrop(surface, image) {
    if (surface.isDocument) {
      const element = surface.element;
      const scrollbarWidth = Math.max(0, window.innerWidth - element.clientWidth);
      const rootLeft = document.documentElement.getBoundingClientRect().left;
      const contentLeft = rootLeft > 0 && rootLeft <= scrollbarWidth + 1 ? rootLeft : 0;
      return Utils.computeCaptureViewportMetrics({
        bitmapWidth: image.width, bitmapHeight: image.height,
        innerWidth: window.innerWidth, innerHeight: window.innerHeight,
        contentWidth: element.clientWidth, contentHeight: element.clientHeight, contentLeft
      });
    }

    const rect = surface.getCaptureRect();
    const metrics = Utils.computeCaptureViewportMetrics({
      bitmapWidth: image.width, bitmapHeight: image.height,
      innerWidth: window.innerWidth, innerHeight: window.innerHeight
    });
    const left = Math.max(0, Math.round(rect.left * metrics.scaleX));
    const top = Math.max(0, Math.round(rect.top * metrics.scaleY));
    const right = Math.max(left + 1, Math.min(image.width, Math.round((rect.left + rect.width) * metrics.scaleX)));
    const bottom = Math.max(top + 1, Math.min(image.height, Math.round((rect.top + rect.height) * metrics.scaleY)));
    return { ...metrics, crop: { x: left, y: top, width: right - left, height: bottom - top } };
  }

  function executeZoneCapture() {
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.dataset.scionosCapture = 'selection';
      Object.assign(overlay.style, {
        position: 'fixed', inset: '0', backgroundColor: 'rgba(3, 10, 20, 0.48)',
        zIndex: '2147483647', cursor: 'crosshair', userSelect: 'none', touchAction: 'none'
      });
      overlay.tabIndex = 0;
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-label', text('statusZone'));

      const selectionBox = document.createElement('div');
      Object.assign(selectionBox.style, {
        position: 'absolute', border: '2px solid #38bdf8',
        boxShadow: '0 0 0 9999px rgba(3, 10, 20, 0.25)', display: 'none', pointerEvents: 'none'
      });
      const label = document.createElement('div');
      Object.assign(label.style, {
        position: 'absolute', bottom: '-30px', right: '0', background: '#101d2f', color: '#fff',
        padding: '4px 7px', fontSize: '12px', borderRadius: '5px', fontFamily: 'system-ui, sans-serif'
      });
      selectionBox.appendChild(label);
      overlay.appendChild(selectionBox);
      (document.fullscreenElement || document.documentElement).appendChild(overlay);
      overlay.focus();

      let startX = 0;
      let startY = 0;
      let isDragging = false;
      let disposed = false;

      const dispose = () => {
        if (disposed) return;
        disposed = true;
        overlay.remove();
        window.removeEventListener('keydown', onKeyDown, true);
        resolve();
      };
      const onKeyDown = event => {
        if (event.key === 'Escape') {
          event.preventDefault();
          dispose();
        }
      };

      overlay.addEventListener('pointerdown', event => {
        if (event.button !== 0) return;
        isDragging = true;
        startX = event.clientX;
        startY = event.clientY;
        overlay.setPointerCapture(event.pointerId);
        Object.assign(selectionBox.style, {
          left: `${startX}px`, top: `${startY}px`, width: '0px', height: '0px', display: 'block'
        });
      });
      overlay.addEventListener('pointermove', event => {
        if (!isDragging) return;
        const left = Math.min(startX, event.clientX);
        const top = Math.min(startY, event.clientY);
        const width = Math.abs(event.clientX - startX);
        const height = Math.abs(event.clientY - startY);
        Object.assign(selectionBox.style, {
          left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px`
        });
        label.textContent = `${Math.round(width)} × ${Math.round(height)} px`;
      });
      overlay.addEventListener('pointerup', async event => {
        if (!isDragging) return;
        isDragging = false;
        const cropX = Math.min(startX, event.clientX);
        const cropY = Math.min(startY, event.clientY);
        const cropWidth = Math.abs(event.clientX - startX);
        const cropHeight = Math.abs(event.clientY - startY);
        overlay.style.visibility = 'hidden';
        if (cropWidth < 5 || cropHeight < 5) {
          dispose();
          return;
        }

        try {
          await Utils.waitForPaint();
          const response = await captureVisibleTab();
          const image = await loadImage(response.dataUrl);
          const metrics = Utils.computeCaptureViewportMetrics({
            bitmapWidth: image.width,
            bitmapHeight: image.height,
            innerWidth: window.innerWidth,
            innerHeight: window.innerHeight
          });
          const scaleX = metrics.scaleX;
          const scaleY = metrics.scaleY;
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(cropWidth * scaleX);
          canvas.height = Math.round(cropHeight * scaleY);
          canvas.getContext('2d').drawImage(
            image,
            Math.round(cropX * scaleX), Math.round(cropY * scaleY), canvas.width, canvas.height,
            0, 0, canvas.width, canvas.height
          );
          const prepared = await prepareCanvasForEditor(canvas);
          await openEditor(prepared.blob, prepared.scale);
        } catch (error) {
          console.error('Selection capture failed:', error);
          alert(text('zoneError') + error.message);
        } finally {
          dispose();
        }
      });
      overlay.addEventListener('pointercancel', dispose);
      window.addEventListener('keydown', onKeyDown, true);
    });
  }

  async function executeScrollingZoneCapture() {
    const root = document.documentElement;
    const previousFocus = document.activeElement;
    const originalDocument = {
      x: window.scrollX,
      y: window.scrollY,
      scrollBehavior: ScionosContentUtils.snapshotInlineStyle(root, 'scroll-behavior')
    };
    let progress;
    let restoreMotion = () => {};
    let selected;

    try {
      root.style.setProperty('scroll-behavior', 'auto');
      selected = await selectScrollingRegion(originalDocument.x);
      if (!selected) return;
      if (selected.surface && !selected.surface.isDocument && selected.surface.element) {
        selected.surface.element.style.setProperty('scroll-behavior', 'auto');
      }
      restoreMotion = suspendPageMotion();
      progress = createProgressIndicator();

      for (let attempt = 0; attempt < 2; attempt += 1) {
        const baseline = await stabilizePageDimensions(selected.surface, selected.region);
        try {
          const prepared = await captureScrollingRegionAttempt(selected.surface, selected.region, baseline, progress);
          await openEditor(prepared.blob, prepared.scale);
          return;
        } catch (error) {
          if (error.code !== 'LAYOUT_CHANGED' || attempt > 0) throw error;
        }
      }
    } catch (error) {
      console.error('Scrolling-area capture failed:', error);
      alert(text('scrollingError') + error.message);
    } finally {
      if (selected && selected.scrollState) selected.scrollState.restore();
      window.scrollTo(originalDocument.x, originalDocument.y);
      restoreMotion();
      ScionosContentUtils.restoreInlineStyle(originalDocument.scrollBehavior);
      removeProgressIndicator(progress);
      if (previousFocus && typeof previousFocus.focus === 'function' && previousFocus.isConnected) previousFocus.focus();
    }
  }

  async function captureScrollingRegionAttempt(surface, region, baseline, progress) {
    const plan = Utils.buildRegionCapturePlan(region.y, region.height, baseline.viewportHeight, baseline.fullHeight);
    if (!plan.length) throw new Error(text('scrollingInvalidRegion'));
    const anchored = createAnchoredElementManager(surface);
    let canvas;
    let context;
    let outputScale = 1;
    let bitmapSize;

    for (let index = 0; index < plan.length; index += 1) {
      const tile = plan[index];
      surface.scrollTo(region.x, tile.scrollY);
      await Utils.waitForPaint();
      await Utils.delay(140);
      assertStableMetrics(surface, baseline);
      const actual = assertSurfacePosition(surface, { x: region.x, y: tile.scrollY });
      const percent = Math.round(((index + 1) / plan.length) * 100);
      updateProgress(progress, percent, outputScale < 0.9999);

      anchored.prepare(index, plan.length);
      progress.style.visibility = 'hidden';
      let image;
      try {
        await Utils.waitForPaint();
        const response = await captureVisibleTab();
        image = await loadImage(response.dataUrl);
      } finally {
        progress.style.visibility = 'visible';
        anchored.restore();
      }
      if (bitmapSize && (bitmapSize.width !== image.width || bitmapSize.height !== image.height)) throw layoutChangedError();
      bitmapSize = { width: image.width, height: image.height };
      const capture = getSurfaceCaptureCrop(surface, image);

      if (!canvas) {
        const dimensions = Utils.computeOutputDimensions(region.width, region.height, capture.scaleX, capture.scaleY);
        canvas = document.createElement('canvas');
        canvas.width = dimensions.width;
        canvas.height = dimensions.height;
        context = canvas.getContext('2d', { alpha: false });
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        outputScale = dimensions.scale;
        updateProgress(progress, percent, dimensions.reduced);
      }

      const sourceLeft = capture.crop.x + Math.round((region.x - actual.x) * capture.scaleX);
      const sourceTop = capture.crop.y + Math.round((region.y + tile.destinationTop - actual.y) * capture.scaleY);
      const sourceRight = Math.min(capture.crop.x + capture.crop.width, sourceLeft + Math.round(region.width * capture.scaleX));
      const sourceBottom = Math.min(capture.crop.y + capture.crop.height, sourceTop + Math.round(tile.sourceHeight * capture.scaleY));
      const sourceWidth = sourceRight - sourceLeft;
      const sourceHeight = sourceBottom - sourceTop;
      if (sourceLeft < capture.crop.x || sourceTop < capture.crop.y || sourceWidth < 1 || sourceHeight < 1) throw new Error(text('fullScrollError'));
      const destinationTop = Math.round(tile.destinationTop * capture.scaleY * outputScale);
      const destinationBottom = Math.round((tile.destinationTop + sourceHeight / capture.scaleY) * capture.scaleY * outputScale);
      const destinationWidth = Math.round(sourceWidth * outputScale);
      context.drawImage(
        image, sourceLeft, sourceTop, sourceWidth, sourceHeight,
        0, destinationTop, destinationWidth, Math.max(1, destinationBottom - destinationTop)
      );
    }
    return prepareCanvasForEditor(canvas, outputScale);
  }

  function selectScrollingRegion(lockedScrollX) {
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.dataset.scionosCapture = 'scrolling-selection';
      overlay.tabIndex = 0;
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', text('scrollingDialogLabel'));
      Object.assign(overlay.style, {
        position: 'fixed', inset: '0', zIndex: '2147483647', cursor: 'crosshair',
        background: 'rgba(3, 10, 20, 0.18)', userSelect: 'none', touchAction: 'none'
      });

      const selectionBox = document.createElement('div');
      selectionBox.dataset.scionosCapture = 'scrolling-box';
      Object.assign(selectionBox.style, {
        position: 'fixed', display: 'none', border: '2px solid #38bdf8',
        background: 'rgba(56, 189, 248, 0.08)', boxShadow: '0 0 0 9999px rgba(3, 10, 20, 0.24)', pointerEvents: 'none'
      });
      const panel = document.createElement('form');
      panel.dataset.scionosCapture = 'scrolling-controls';
      panel.setAttribute('aria-label', text('scrollingGeometry'));
      Object.assign(panel.style, {
        position: 'fixed', top: '16px', right: '16px', width: '292px', zIndex: '3', padding: '14px',
        border: '1px solid #38bdf8', borderRadius: '10px', background: '#07111f', color: '#f8fafc',
        boxShadow: '0 18px 42px rgba(0,0,0,.5)', cursor: 'default', font: '13px/1.35 system-ui, sans-serif'
      });
      const title = document.createElement('strong');
      title.textContent = text('btnScrollingTitle');
      const instructions = document.createElement('p');
      instructions.textContent = text('scrollingInstructionStart');
      const status = document.createElement('div');
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      Object.assign(status.style, { minHeight: '18px', color: '#fbbf24' });
      const fields = document.createElement('div');
      Object.assign(fields.style, { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', marginTop: '8px' });
      const inputs = {};
      [['x', 'coordinateX', lockedScrollX], ['y', 'coordinateY', window.scrollY],
        ['width', 'coordinateWidth', Math.max(5, document.documentElement.clientWidth / 2)],
        ['height', 'coordinateHeight', Math.max(5, document.documentElement.clientHeight)]].forEach(([name, key, value]) => {
        const label = document.createElement('label');
        label.textContent = text(key);
        Object.assign(label.style, { display: 'grid', gap: '3px', color: '#a9bad0', fontSize: '11px' });
        const input = document.createElement('input');
        input.type = 'number'; input.name = name; input.min = '0'; input.step = '1'; input.value = String(Math.round(value));
        Object.assign(input.style, { width: '100%', height: '34px', padding: '0 7px', border: '1px solid #31435b', borderRadius: '6px', background: '#101d2f', color: '#f8fafc' });
        label.appendChild(input); fields.appendChild(label); inputs[name] = input;
      });
      const actions = document.createElement('div');
      Object.assign(actions.style, { display: 'flex', flexWrap: 'wrap', gap: '7px', marginTop: '11px' });
      const makeButton = (key, type = 'button') => {
        const button = document.createElement('button'); button.type = type; button.textContent = text(key);
        Object.assign(button.style, { minHeight: '36px', padding: '6px 10px', border: '1px solid #31435b', borderRadius: '7px', background: '#101d2f', color: '#f8fafc' });
        return button;
      };
      const captureButton = makeButton('scrollingCapture', 'submit');
      const toBottomButton = makeButton('scrollingToBottom');
      const restartButton = makeButton('scrollingRestart');
      const cancelButton = makeButton('scrollingCancel');
      restartButton.disabled = true;
      actions.append(captureButton, toBottomButton, restartButton, cancelButton);
      panel.append(title, instructions, status, fields, actions);
      overlay.append(selectionBox, panel);
      (document.fullscreenElement || document.documentElement).appendChild(overlay);

      let firstPoint = null;
      let selectedSurface = getDocumentScrollSurface();
      const scrollState = ScionosContentUtils.createScrollSurfaceStateTracker();
      scrollState.remember(selectedSurface);
      let lastPointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      let settled = false;

      const surfacePoint = (surface, clientX, clientY) => {
        const position = surface.getPosition();
        if (surface.isDocument) return { x: position.x + clientX, y: position.y + clientY };
        const rect = surface.getCaptureRect();
        return { x: position.x + clientX - rect.left, y: position.y + clientY - rect.top };
      };
      const pointToClient = (surface, point) => {
        const position = surface.getPosition();
        if (surface.isDocument) return { x: point.x - position.x, y: point.y - position.y };
        const rect = surface.getCaptureRect();
        return { x: rect.left + point.x - position.x, y: rect.top + point.y - position.y };
      };
      const normalize = (first, second) => {
        const metrics = selectedSurface.getMetrics();
        const position = selectedSurface.getPosition();
        return Utils.normalizeScrollingRegion(first, second, { x: position.x, width: metrics.viewportWidth }, metrics.fullHeight);
      };
      const cleanup = () => {
        overlay.remove();
        window.removeEventListener('keydown', onKeyDown, true);
        window.removeEventListener('scroll', updatePreview, true);
      };
      const settle = value => {
        if (settled) return;
        settled = true;
        if (!value) scrollState.restore();
        cleanup();
        resolve(value);
      };
      const finish = region => {
        if (!region || region.width < 5 || region.height < 5) { status.textContent = text('scrollingInvalidRegion'); status.setAttribute('role', 'alert'); return; }
        settle({ region, surface: selectedSurface, scrollState });
      };
      const reset = () => {
        firstPoint = null;
        selectedSurface = getDocumentScrollSurface();
        scrollState.reset(selectedSurface);
        selectionBox.style.display = 'none'; instructions.textContent = text('scrollingInstructionStart');
        status.textContent = ''; restartButton.disabled = true; overlay.focus();
      };
      function extendToBottom() {
        const metrics = selectedSurface.getMetrics();
        const position = selectedSurface.getPosition();
        if (!firstPoint) {
          firstPoint = { x: position.x, y: position.y };
          restartButton.disabled = false;
          instructions.textContent = text('scrollingInstructionEnd');
          status.textContent = text('scrollingPointSet');
        }
        const width = Number(inputs.width.value) || metrics.viewportWidth;
        const bottomPoint = {
          x: firstPoint.x + width,
          y: metrics.fullHeight
        };
        const region = normalize(firstPoint, bottomPoint);
        inputs.x.value = String(region.x);
        inputs.y.value = String(region.y);
        inputs.width.value = String(region.width);
        inputs.height.value = String(region.height);
        finish(region);
      }
      function updatePreview() {
        if (!firstPoint) return;
        const current = surfacePoint(selectedSurface, lastPointer.x, lastPointer.y);
        const region = normalize(firstPoint, current);
        const firstClient = pointToClient(selectedSurface, firstPoint);
        Object.assign(selectionBox.style, {
          display: 'block', left: Math.min(firstClient.x, lastPointer.x) + 'px', top: Math.min(firstClient.y, lastPointer.y) + 'px',
          width: Math.abs(lastPointer.x - firstClient.x) + 'px', height: Math.abs(lastPointer.y - firstClient.y) + 'px'
        });
        inputs.x.value = String(region.x); inputs.y.value = String(region.y);
        inputs.width.value = String(region.width); inputs.height.value = String(region.height);
      }
      function onKeyDown(event) {
        if (event.key === 'Escape') { event.preventDefault(); settle(null); return; }
        if (event.key === 'Backspace' && firstPoint && !event.target.closest('input')) { event.preventDefault(); reset(); return; }
        if ((event.key.toLowerCase() === 'b' || event.key === 'End') && !event.target.closest('input')) {
          event.preventDefault();
          extendToBottom();
          return;
        }
        if (event.target.closest('input, button')) return;
        const amounts = { ArrowDown: 48, ArrowUp: -48, PageDown: Math.round(window.innerHeight * 0.8), PageUp: -Math.round(window.innerHeight * 0.8) };
        if (event.key in amounts) {
          event.preventDefault();
          scrollState.remember(selectedSurface);
          const position = selectedSurface.getPosition();
          selectedSurface.scrollTo(position.x, position.y + amounts[event.key]);
          updatePreview();
        }
      }
      let pointerDownPos = null;
      let isDragging = false;
      let dragSettled = false;

      overlay.addEventListener('pointerdown', event => {
        if (panel.contains(event.target) || event.button !== 0) return;
        pointerDownPos = { x: event.clientX, y: event.clientY };
        isDragging = false;
        dragSettled = false;
      });
      overlay.addEventListener('pointermove', event => {
        if (!panel.contains(event.target)) {
          lastPointer = { x: event.clientX, y: event.clientY };
          if (pointerDownPos && !firstPoint) {
            const distance = Math.hypot(event.clientX - pointerDownPos.x, event.clientY - pointerDownPos.y);
            if (distance > 6) {
              isDragging = true;
              selectedSurface = findScrollSurfaceAtPoint(pointerDownPos.x, pointerDownPos.y);
              scrollState.remember(selectedSurface);
              firstPoint = surfacePoint(selectedSurface, pointerDownPos.x, pointerDownPos.y);
              instructions.textContent = text('scrollingInstructionEnd');
              status.textContent = text('scrollingPointSet');
              restartButton.disabled = false;
            }
          }
          updatePreview();
        }
      });
      overlay.addEventListener('pointerup', event => {
        if (panel.contains(event.target)) return;
        if (isDragging && firstPoint && pointerDownPos) {
          const deltaX = Math.abs(event.clientX - pointerDownPos.x);
          const deltaY = Math.abs(event.clientY - pointerDownPos.y);
          if (deltaX > 10 && deltaY > 10) {
            dragSettled = true;
            finish(normalize(firstPoint, surfacePoint(selectedSurface, event.clientX, event.clientY)));
            pointerDownPos = null;
            isDragging = false;
            return;
          }
        }
        pointerDownPos = null;
        isDragging = false;
      });
      overlay.addEventListener('click', event => {
        if (panel.contains(event.target) || dragSettled || settled) return;
        lastPointer = { x: event.clientX, y: event.clientY };
        if (!firstPoint) {
          selectedSurface = findScrollSurfaceAtPoint(event.clientX, event.clientY);
          scrollState.remember(selectedSurface);
          firstPoint = surfacePoint(selectedSurface, event.clientX, event.clientY);
          instructions.textContent = text('scrollingInstructionEnd'); status.textContent = text('scrollingPointSet'); restartButton.disabled = false; updatePreview(); return;
        }
        finish(normalize(firstPoint, surfacePoint(selectedSurface, event.clientX, event.clientY)));
      });
      overlay.addEventListener('wheel', event => {
        if (!firstPoint) {
          const hoverSurface = findScrollSurfaceAtPoint(event.clientX, event.clientY);
          if (hoverSurface && !hoverSurface.isDocument) {
            event.preventDefault();
            scrollState.remember(hoverSurface);
            const position = hoverSurface.getPosition();
            hoverSurface.scrollTo(position.x + event.deltaX, position.y + event.deltaY);
          }
          return;
        }
        event.preventDefault();
        scrollState.remember(selectedSurface);
        const position = selectedSurface.getPosition();
        selectedSurface.scrollTo(position.x + event.deltaX, position.y + event.deltaY);
        updatePreview();
      }, { passive: false });
      panel.addEventListener('click', event => event.stopPropagation());
      panel.addEventListener('submit', event => {
        event.preventDefault();
        const x = Number(inputs.x.value), y = Number(inputs.y.value), width = Number(inputs.width.value), height = Number(inputs.height.value);
        finish(normalize({ x, y }, { x: x + width, y: y + height }));
      });
      toBottomButton.addEventListener('click', extendToBottom);
      restartButton.addEventListener('click', reset);
      cancelButton.addEventListener('click', () => settle(null));
      window.addEventListener('keydown', onKeyDown, true);
      window.addEventListener('scroll', updatePreview, true);
      overlay.focus();
    });
  }

  async function captureVisibleTab() {
    const response = await sendMessage({ action: 'CAPTURE_VISIBLE_TAB' });
    if (!response || !response.success) {
      if (response && response.errorCode === 'TAB_CHANGED') throw new Error(text('tabChangedError'));
      throw new Error(response && response.error ? response.error : 'Capture failed.');
    }
    return response;
  }

  async function openEditor(blob, scale) {
    if (!(blob instanceof Blob) || blob.size < 1) throw new Error('Invalid capture image.');
    const expectedChunks = Math.ceil(blob.size / Utils.TRANSFER_CHUNK_BYTES);
    const begin = await sendMessage({
      action: 'BEGIN_CAPTURE_TRANSFER', expectedBytes: blob.size, expectedChunks,
      title: document.title, url: location.href, scale
    });
    if (!begin || !begin.success || !begin.transferId) {
      throw new Error(begin && begin.error ? begin.error : 'Editor unavailable.');
    }
    const transferId = begin.transferId;
    try {
      for (let index = 0; index < expectedChunks; index += 1) {
        const chunk = blob.slice(index * Utils.TRANSFER_CHUNK_BYTES, (index + 1) * Utils.TRANSFER_CHUNK_BYTES);
        const data = await blobToBase64(chunk);
        let response;
        let lastError;
        for (const retryDelay of [0, 250, 500]) {
          if (retryDelay) await Utils.delay(retryDelay);
          try {
            response = await sendMessage({ action: 'APPEND_CAPTURE_CHUNK', transferId, index, data });
            if (response && response.success) break;
            lastError = new Error(response && response.error ? response.error : 'Capture chunk rejected.');
          } catch (error) { lastError = error; }
        }
        if (!response || !response.success) throw lastError || new Error('Capture chunk failed.');
      }
      const completed = await sendMessage({ action: 'COMPLETE_CAPTURE_TRANSFER', transferId });
      if (!completed || !completed.success) throw new Error(completed && completed.error ? completed.error : 'Editor unavailable.');
    } catch (error) {
      await sendMessage({ action: 'ABORT_CAPTURE_TRANSFER', transferId }).catch(() => undefined);
      throw error;
    }
  }

  function sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, response => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(response);
      });
    });
  }

  async function prepareDataUrlForEditor(dataUrl) {
    const image = await loadImage(dataUrl);
    const dimensions = Utils.computeOutputDimensions(image.width, image.height, 1, 1);
    const canvas = document.createElement('canvas');
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    canvas.getContext('2d').drawImage(image, 0, 0, dimensions.width, dimensions.height);
    return prepareCanvasForEditor(canvas, dimensions.scale);
  }

  async function prepareCanvasForEditor(sourceCanvas, baseScale = 1) {
    const dimensions = Utils.computeOutputDimensions(sourceCanvas.width, sourceCanvas.height, 1, 1);
    let canvas = sourceCanvas;
    let scale = Math.max(0.01, Number(baseScale) || 1);
    if (dimensions.reduced) {
      canvas = document.createElement('canvas');
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
      canvas.getContext('2d').drawImage(sourceCanvas, 0, 0, dimensions.width, dimensions.height);
      scale *= dimensions.scale;
    }

    let blob = await canvasToBlob(canvas);
    for (let pass = 0; blob.size > Utils.MAX_TRANSFER_BYTES && pass < 4; pass += 1) {
      const factor = Utils.computePayloadReductionScale(blob.size);
      if (factor >= 0.999 || scale * factor < 0.1) break;
      const reduced = document.createElement('canvas');
      reduced.width = Math.max(1, Math.floor(canvas.width * factor));
      reduced.height = Math.max(1, Math.floor(canvas.height * factor));
      reduced.getContext('2d').drawImage(canvas, 0, 0, reduced.width, reduced.height);
      canvas = reduced;
      scale *= factor;
      blob = await canvasToBlob(canvas);
    }
    if (blob.size > Utils.MAX_TRANSFER_BYTES) throw new Error(text('captureTooLargeError'));
    return { blob, scale };
  }

  function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Image preparation failed.')), 'image/png');
    });
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).slice(String(reader.result).indexOf(',') + 1));
      reader.onerror = () => reject(reader.error || new Error('Image reading failed.'));
      reader.readAsDataURL(blob);
    });
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Captured image could not be loaded.'));
      image.src = src;
    });
  }

  function createProgressIndicator() {
    const element = document.createElement('div');
    element.dataset.scionosCapture = 'progress';
    Object.assign(element.style, {
      position: 'fixed', top: '20px', right: '20px', zIndex: '2147483647',
      padding: '11px 16px', border: '1px solid #38bdf8', borderRadius: '8px',
      background: '#07111f', color: '#7dd3fc', boxShadow: '0 12px 30px rgba(0,0,0,.45)',
      font: '600 13px system-ui, sans-serif'
    });
    element.setAttribute('role', 'status');
    document.body.appendChild(element);
    return element;
  }

  function updateProgress(element, percent, reduced) {
    if (!element) return;
    element.textContent = text('progress', { percent }) + (reduced ? ` — ${text('reduced')}` : '');
  }

  function removeProgressIndicator(element) {
    if (element) element.remove();
  }
})();
