// Page capture controller. Injected on demand into the active tab.
(function registerContentCapture() {
  if (window.hasScionosCaptureLoaded) return;
  window.hasScionosCaptureLoaded = true;

  const Utils = ScionosCaptureUtils;
  const ACTIONS = new Set([
    'START_FULL_PAGE_CAPTURE',
    'START_VISIBLE_CAPTURE',
    'START_ZONE_CAPTURE',
    'START_SCROLLING_ZONE_CAPTURE'
  ]);
  let captureRunning = false;
  let activeMessages = {};

  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (!request || !ACTIONS.has(request.action)) return;
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
      await openEditor(prepared.dataUrl, prepared.scale);
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
        return {
          fullWidth: Math.max(element.scrollWidth, element.clientWidth),
          fullHeight: Math.max(element.scrollHeight, element.clientHeight),
          viewportWidth: Math.max(1, window.innerWidth),
          viewportHeight: Math.max(1, window.innerHeight)
        };
      },
      getPosition() {
        return { x: window.scrollX, y: window.scrollY };
      },
      scrollTo(x, y) {
        window.scrollTo(x, y);
      },
      getCaptureRect() {
        return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
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
      && rect.left >= -1
      && rect.top >= -1
      && rect.right <= window.innerWidth + 1
      && rect.bottom <= window.innerHeight + 1;
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

  async function stabilizePageDimensions(surface) {
    let previousHeight = 0;
    let previousWidth = 0;
    let stablePasses = 0;
    for (let pass = 0; pass < 3 && stablePasses < 2; pass += 1) {
      const metrics = surface.getMetrics();
      const positions = Utils.buildScrollPositions(metrics.fullHeight, metrics.viewportHeight);
      const originalX = surface.getPosition().x;
      for (const y of positions) {
        surface.scrollTo(originalX, y);
        await Utils.waitForPaint();
        await Utils.delay(70);
        assertSurfacePosition(surface, { x: originalX, y });
      }
      const nextMetrics = surface.getMetrics();
      stablePasses = Math.abs(nextMetrics.fullHeight - previousHeight) <= 2
        && Math.abs(nextMetrics.fullWidth - previousWidth) <= 2
        ? stablePasses + 1
        : 0;
      previousHeight = nextMetrics.fullHeight;
      previousWidth = nextMetrics.fullWidth;
    }
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

  function collectFixedElements() {
    return Array.from(document.querySelectorAll('body *'))
      .filter(element => !element.dataset.scionosCapture && getComputedStyle(element).position === 'fixed')
      .map(element => ({ element, visibility: element.style.visibility }));
  }

  async function executeFullPageCapture() {
    const root = document.documentElement;
    const originalScrollBehavior = root.style.scrollBehavior;
    let progress;
    let restoreMotion = () => {};
    let fixedElements = [];
    let outputScale = 1;
    let surface;
    let originalPosition = { x: 0, y: 0 };

    try {
      root.style.scrollBehavior = 'auto';
      restoreMotion = suspendPageMotion();
      progress = createProgressIndicator();
      surface = findScrollSurface();
      originalPosition = surface.getPosition();
      await stabilizePageDimensions(surface);

      const metrics = surface.getMetrics();
      const { fullWidth, fullHeight, viewportWidth, viewportHeight } = metrics;
      const grid = Utils.buildCaptureGrid(fullWidth, fullHeight, viewportWidth, viewportHeight);
      fixedElements = collectFixedElements();

      let canvas;
      let context;
      for (let index = 0; index < grid.length; index += 1) {
        const target = grid[index];
        surface.scrollTo(target.x, target.y);
        await Utils.waitForPaint();
        await Utils.delay(120);

        const actual = assertSurfacePosition(surface, target);
        const percent = Math.round(((index + 1) / grid.length) * 100);
        updateProgress(progress, percent, outputScale < 0.9999);

        progress.style.visibility = 'hidden';
        if (index > 0) fixedElements.forEach(item => { item.element.style.visibility = 'hidden'; });
        await Utils.waitForPaint();
        const response = await captureVisibleTab();
        progress.style.visibility = 'visible';

        const image = await loadImage(response.dataUrl);
        const captureScaleX = image.width / Math.max(1, window.innerWidth);
        const captureScaleY = image.height / Math.max(1, window.innerHeight);
        const crop = getSurfaceCaptureCrop(surface, image, captureScaleX, captureScaleY);

        if (!canvas) {
          const dimensions = Utils.computeOutputDimensions(fullWidth, fullHeight, captureScaleX, captureScaleY);
          canvas = document.createElement('canvas');
          canvas.width = dimensions.width;
          canvas.height = dimensions.height;
          context = canvas.getContext('2d', { alpha: false });
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, canvas.width, canvas.height);
          outputScale = dimensions.scale;
          updateProgress(progress, percent, dimensions.reduced);
        }

        const drawX = Math.round(actual.x * captureScaleX * outputScale);
        const drawY = Math.round(actual.y * captureScaleY * outputScale);
        context.drawImage(
          image,
          crop.x,
          crop.y,
          crop.width,
          crop.height,
          drawX,
          drawY,
          Math.round(crop.width * outputScale),
          Math.round(crop.height * outputScale)
        );
      }

      const finalDataUrl = await canvasToDataUrl(canvas);
      await openEditor(finalDataUrl, outputScale);
    } catch (error) {
      console.error('Full-page capture failed:', error);
      alert(text('fullError') + error.message);
    } finally {
      fixedElements.forEach(item => { item.element.style.visibility = item.visibility; });
      restoreMotion();
      root.style.scrollBehavior = originalScrollBehavior;
      if (surface) surface.scrollTo(originalPosition.x, originalPosition.y);
      removeProgressIndicator(progress);
    }
  }

  function getSurfaceCaptureCrop(surface, image, captureScaleX, captureScaleY) {
    if (surface.isDocument) {
      return { x: 0, y: 0, width: image.width, height: image.height };
    }

    const rect = surface.getCaptureRect();
    const x = Math.max(0, Math.round(rect.left * captureScaleX));
    const y = Math.max(0, Math.round(rect.top * captureScaleY));
    const width = Math.min(
      Math.round(rect.width * captureScaleX),
      image.width - x
    );
    const height = Math.min(
      Math.round(rect.height * captureScaleY),
      image.height - y
    );
    if (width < 1 || height < 1) throw new Error(text('fullScrollError'));
    return { x, y, width, height };
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
      document.body.appendChild(overlay);
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
          const scaleX = image.width / Math.max(1, window.innerWidth);
          const scaleY = image.height / Math.max(1, window.innerHeight);
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(cropWidth * scaleX);
          canvas.height = Math.round(cropHeight * scaleY);
          canvas.getContext('2d').drawImage(
            image,
            Math.round(cropX * scaleX), Math.round(cropY * scaleY), canvas.width, canvas.height,
            0, 0, canvas.width, canvas.height
          );
          const prepared = await prepareCanvasForEditor(canvas);
          await openEditor(await canvasToDataUrl(prepared.canvas), prepared.scale);
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
    const original = {
      x: window.scrollX,
      y: window.scrollY,
      scrollBehavior: root.style.scrollBehavior
    };
    let progress;
    let restoreMotion = () => {};
    let fixedElements = [];

    try {
      root.style.scrollBehavior = 'auto';
      const region = await selectScrollingRegion(original.x);
      if (!region) return;

      restoreMotion = suspendPageMotion();
      progress = createProgressIndicator();
      fixedElements = collectFixedElements();
      const documentHeight = getDocumentHeight();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const plan = Utils.buildRegionCapturePlan(region.y, region.height, viewportHeight, documentHeight);
      let canvas;
      let context;
      let outputScale = 1;

      for (let index = 0; index < plan.length; index += 1) {
        const tile = plan[index];
        window.scrollTo(original.x, tile.scrollY);
        await Utils.waitForPaint();
        await Utils.delay(140);

        const actualX = Math.round(window.scrollX);
        const actualY = Math.round(window.scrollY);
        const percent = Math.round(((index + 1) / plan.length) * 100);
        updateProgress(progress, percent, outputScale < 0.9999);
        progress.style.visibility = 'hidden';
        if (index > 0) fixedElements.forEach(item => { item.element.style.visibility = 'hidden'; });
        await Utils.waitForPaint();

        const response = await captureVisibleTab();
        progress.style.visibility = 'visible';
        const image = await loadImage(response.dataUrl);
        const captureScaleX = image.width / Math.max(1, viewportWidth);
        const captureScaleY = image.height / Math.max(1, viewportHeight);

        if (!canvas) {
          const dimensions = Utils.computeOutputDimensions(
            region.width,
            region.height,
            captureScaleX,
            captureScaleY
          );
          canvas = document.createElement('canvas');
          canvas.width = dimensions.width;
          canvas.height = dimensions.height;
          context = canvas.getContext('2d', { alpha: false });
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, canvas.width, canvas.height);
          outputScale = dimensions.scale;
          updateProgress(progress, percent, dimensions.reduced);
        }

        const sourceX = Math.round((region.x - actualX) * captureScaleX);
        const sourceY = Math.round((region.y + tile.destinationTop - actualY) * captureScaleY);
        const sourceWidth = Math.round(region.width * captureScaleX);
        const sourceHeight = Math.round(tile.sourceHeight * captureScaleY);
        const destinationY = Math.round(tile.destinationTop * captureScaleY * outputScale);
        const destinationWidth = Math.round(region.width * captureScaleX * outputScale);
        const destinationHeight = Math.round(tile.sourceHeight * captureScaleY * outputScale);
        context.drawImage(
          image,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          destinationY,
          destinationWidth,
          destinationHeight
        );
      }

      const finalDataUrl = await canvasToDataUrl(canvas);
      await openEditor(finalDataUrl, outputScale);
    } catch (error) {
      console.error('Scrolling-area capture failed:', error);
      alert(text('scrollingError') + error.message);
    } finally {
      fixedElements.forEach(item => { item.element.style.visibility = item.visibility; });
      restoreMotion();
      root.style.scrollBehavior = original.scrollBehavior;
      window.scrollTo(original.x, original.y);
      removeProgressIndicator(progress);
      if (previousFocus && typeof previousFocus.focus === 'function' && previousFocus.isConnected) {
        previousFocus.focus();
      }
    }
  }

  function getDocumentHeight() {
    return Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
      document.documentElement.clientHeight
    );
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
        background: 'rgba(3, 10, 20, 0.18)', userSelect: 'none', touchAction: 'pan-y'
      });

      const selectionBox = document.createElement('div');
      selectionBox.dataset.scionosCapture = 'scrolling-box';
      Object.assign(selectionBox.style, {
        position: 'fixed', display: 'none', border: '2px solid #38bdf8',
        background: 'rgba(56, 189, 248, 0.08)', boxShadow: '0 0 0 9999px rgba(3, 10, 20, 0.24)',
        pointerEvents: 'none'
      });

      const measure = document.createElement('div');
      Object.assign(measure.style, {
        position: 'fixed', display: 'none', zIndex: '2', padding: '5px 8px',
        border: '1px solid #38bdf8', borderRadius: '6px', background: '#07111f',
        color: '#e0f2fe', font: '700 12px/1.2 ui-monospace, monospace', pointerEvents: 'none'
      });

      const panel = document.createElement('form');
      panel.dataset.scionosCapture = 'scrolling-controls';
      panel.setAttribute('aria-label', text('scrollingGeometry'));
      Object.assign(panel.style, {
        position: 'fixed', top: '16px', right: '16px', width: '292px', zIndex: '3',
        padding: '14px', border: '1px solid #38bdf8', borderRadius: '10px',
        background: '#07111f', color: '#f8fafc', boxShadow: '0 18px 42px rgba(0,0,0,.5)',
        cursor: 'default', font: '13px/1.35 system-ui, sans-serif', userSelect: 'text'
      });

      const focusStyles = document.createElement('style');
      focusStyles.textContent = `
        [data-scionos-capture="scrolling-controls"] button:focus-visible,
        [data-scionos-capture="scrolling-controls"] input:focus-visible,
        [data-scionos-capture="scrolling-selection"]:focus-visible {
          outline: 3px solid #fbbf24 !important;
          outline-offset: 2px !important;
        }
      `;

      const title = document.createElement('strong');
      title.textContent = text('btnScrollingTitle');
      Object.assign(title.style, { display: 'block', marginBottom: '5px', fontSize: '15px' });
      const instructions = document.createElement('p');
      instructions.textContent = text('scrollingInstructionStart');
      Object.assign(instructions.style, { margin: '0 0 10px', color: '#bae6fd' });
      const status = document.createElement('div');
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      Object.assign(status.style, { minHeight: '18px', marginBottom: '10px', color: '#fbbf24' });

      const fields = document.createElement('div');
      Object.assign(fields.style, {
        display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px'
      });
      const inputs = {};
      const fieldDefinitions = [
        ['x', 'coordinateX', Math.round(lockedScrollX)],
        ['y', 'coordinateY', Math.round(window.scrollY)],
        ['width', 'coordinateWidth', Math.max(5, Math.round(window.innerWidth / 2))],
        ['height', 'coordinateHeight', Math.max(5, Math.round(window.innerHeight))]
      ];

      fieldDefinitions.forEach(([name, labelKey, value]) => {
        const label = document.createElement('label');
        Object.assign(label.style, { display: 'grid', gap: '3px', color: '#a9bad0', fontSize: '11px' });
        label.textContent = text(labelKey);
        const input = document.createElement('input');
        input.type = 'number';
        input.name = name;
        input.min = '0';
        input.step = '1';
        input.value = String(value);
        Object.assign(input.style, {
          width: '100%', height: '34px', padding: '0 7px', border: '1px solid #31435b',
          borderRadius: '6px', background: '#101d2f', color: '#f8fafc', font: 'inherit'
        });
        label.appendChild(input);
        fields.appendChild(label);
        inputs[name] = input;
      });

      const actions = document.createElement('div');
      Object.assign(actions.style, { display: 'flex', flexWrap: 'wrap', gap: '7px', marginTop: '11px' });
      const makeButton = (labelKey, type = 'button') => {
        const button = document.createElement('button');
        button.type = type;
        button.textContent = text(labelKey);
        Object.assign(button.style, {
          minHeight: '36px', padding: '6px 10px', border: '1px solid #31435b',
          borderRadius: '7px', background: '#101d2f', color: '#f8fafc', cursor: 'pointer', font: 'inherit'
        });
        return button;
      };
      const captureButton = makeButton('scrollingCapture', 'submit');
      captureButton.style.borderColor = '#38bdf8';
      const restartButton = makeButton('scrollingRestart');
      const cancelButton = makeButton('scrollingCancel');
      restartButton.disabled = true;
      actions.append(captureButton, restartButton, cancelButton);
      panel.append(title, instructions, status, fields, actions);
      overlay.append(focusStyles, selectionBox, measure, panel);
      document.body.appendChild(overlay);

      let firstPoint = null;
      let lastPointer = { x: Math.round(window.innerWidth / 2), y: Math.round(window.innerHeight / 2) };
      let settled = false;
      let lockingHorizontalScroll = false;

      const cleanup = () => {
        overlay.remove();
        window.removeEventListener('keydown', onKeyDown, true);
        window.removeEventListener('scroll', onScroll, true);
      };
      const settle = region => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(region);
      };
      const showError = message => {
        status.textContent = message;
        status.setAttribute('role', 'alert');
      };
      const finish = region => {
        if (!region || region.width < 5 || region.height < 5) {
          showError(text('scrollingInvalidRegion'));
          return;
        }
        settle(region);
      };
      const reset = () => {
        firstPoint = null;
        selectionBox.style.display = 'none';
        measure.style.display = 'none';
        instructions.textContent = text('scrollingInstructionStart');
        status.textContent = '';
        status.setAttribute('role', 'status');
        restartButton.disabled = true;
        overlay.focus();
      };
      const currentDocumentPoint = () => ({
        x: lockedScrollX + lastPointer.x,
        y: window.scrollY + lastPointer.y
      });
      const updatePreview = () => {
        if (!firstPoint) return;
        const current = currentDocumentPoint();
        const region = Utils.normalizeScrollingRegion(
          firstPoint,
          current,
          { x: lockedScrollX, width: window.innerWidth },
          getDocumentHeight()
        );
        const firstClientY = firstPoint.y - window.scrollY;
        const top = Math.min(firstClientY, lastPointer.y);
        const left = region.x - lockedScrollX;
        Object.assign(selectionBox.style, {
          display: 'block', left: `${left}px`, top: `${top}px`,
          width: `${region.width}px`, height: `${Math.abs(lastPointer.y - firstClientY)}px`
        });
        Object.assign(measure.style, {
          display: 'block', left: `${Math.min(window.innerWidth - 150, Math.max(8, lastPointer.x + 12))}px`,
          top: `${Math.min(window.innerHeight - 34, Math.max(8, lastPointer.y + 12))}px`
        });
        measure.textContent = `${region.width} × ${region.height} px`;
        inputs.x.value = String(region.x);
        inputs.y.value = String(region.y);
        inputs.width.value = String(region.width);
        inputs.height.value = String(region.height);
      };
      const onScroll = () => {
        if (!lockingHorizontalScroll && Math.abs(window.scrollX - lockedScrollX) > 0.5) {
          lockingHorizontalScroll = true;
          window.scrollTo(lockedScrollX, window.scrollY);
          lockingHorizontalScroll = false;
        }
        updatePreview();
      };
      const onKeyDown = event => {
        if (event.key === 'Escape') {
          event.preventDefault();
          settle(null);
          return;
        }
        const targetIsInput = event.target && typeof event.target.closest === 'function'
          && Boolean(event.target.closest('input'));
        if (event.key === 'Backspace' && firstPoint && !targetIsInput) {
          event.preventDefault();
          reset();
          return;
        }
        if (event.target && typeof event.target.closest === 'function'
          && event.target.closest('input, button')) return;
        const scrollAmounts = {
          ArrowDown: 48,
          ArrowUp: -48,
          PageDown: Math.round(window.innerHeight * 0.8),
          PageUp: -Math.round(window.innerHeight * 0.8)
        };
        if (event.key in scrollAmounts) {
          event.preventDefault();
          window.scrollBy(0, scrollAmounts[event.key]);
        } else if (event.key === 'Home') {
          event.preventDefault();
          window.scrollTo(lockedScrollX, 0);
        } else if (event.key === 'End') {
          event.preventDefault();
          window.scrollTo(lockedScrollX, getDocumentHeight());
        }
      };

      overlay.addEventListener('pointermove', event => {
        if (panel.contains(event.target)) return;
        lastPointer = { x: event.clientX, y: event.clientY };
        updatePreview();
      });
      overlay.addEventListener('click', event => {
        if (panel.contains(event.target)) return;
        lastPointer = { x: event.clientX, y: event.clientY };
        const point = currentDocumentPoint();
        if (!firstPoint) {
          firstPoint = point;
          instructions.textContent = text('scrollingInstructionEnd');
          status.textContent = text('scrollingPointSet');
          restartButton.disabled = false;
          updatePreview();
          return;
        }
        finish(Utils.normalizeScrollingRegion(
          firstPoint,
          point,
          { x: lockedScrollX, width: window.innerWidth },
          getDocumentHeight()
        ));
      });
      panel.addEventListener('click', event => event.stopPropagation());
      panel.addEventListener('pointerdown', event => event.stopPropagation());
      panel.addEventListener('submit', event => {
        event.preventDefault();
        const x = Number(inputs.x.value);
        const y = Number(inputs.y.value);
        const width = Number(inputs.width.value);
        const height = Number(inputs.height.value);
        finish(Utils.normalizeScrollingRegion(
          { x, y },
          { x: x + width, y: y + height },
          { x: lockedScrollX, width: window.innerWidth },
          getDocumentHeight()
        ));
      });
      restartButton.addEventListener('click', reset);
      cancelButton.addEventListener('click', () => settle(null));
      window.addEventListener('keydown', onKeyDown, true);
      window.addEventListener('scroll', onScroll, true);
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

  async function openEditor(dataUrl, scale) {
    const response = await sendMessage({
      action: 'OPEN_EDITOR', dataUrl, title: document.title, url: location.href, scale
    });
    if (!response || !response.success) throw new Error(response && response.error ? response.error : 'Editor unavailable.');
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
    if (!dimensions.reduced) return { dataUrl, scale: 1 };
    const canvas = document.createElement('canvas');
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    canvas.getContext('2d').drawImage(image, 0, 0, dimensions.width, dimensions.height);
    return { dataUrl: await canvasToDataUrl(canvas), scale: dimensions.scale };
  }

  async function prepareCanvasForEditor(sourceCanvas) {
    const dimensions = Utils.computeOutputDimensions(sourceCanvas.width, sourceCanvas.height, 1, 1);
    if (!dimensions.reduced) return { canvas: sourceCanvas, scale: 1 };
    const canvas = document.createElement('canvas');
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    canvas.getContext('2d').drawImage(sourceCanvas, 0, 0, dimensions.width, dimensions.height);
    return { canvas, scale: dimensions.scale };
  }

  function canvasToDataUrl(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (!blob) {
          reject(new Error('Image preparation failed.'));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error || new Error('Image reading failed.'));
        reader.readAsDataURL(blob);
      }, 'image/png');
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
