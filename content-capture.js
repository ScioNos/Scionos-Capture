// Capture workflows and their page interaction UI.
(function registerContentCaptureModule(globalScope) {
  function createContentCapture({ Utils, dom, transfer, text }) {
    const {
      extractDomTextBlocks,
      getDocumentScrollSurface,
      findScrollSurface,
      findScrollSurfaceAtPoint,
      assertSurfacePosition,
      stabilizePageDimensions,
      suspendPageMotion,
      createAnchoredElementManager,
      layoutChangedError,
      assertStableMetrics,
      getSurfaceCaptureCrop
    } = dom;
    const {
      captureVisibleTab,
      openEditor,
      prepareDataUrlForEditor,
      prepareCanvasForEditor,
      loadImage
    } = transfer;

    async function executeVisibleCapture() {
      try {
        const response = await captureVisibleTab();
        const prepared = await prepareDataUrlForEditor(response.dataUrl);
        const textBlocks = extractDomTextBlocks({
          left: window.scrollX, top: window.scrollY,
          width: window.innerWidth, height: window.innerHeight
        });
        await openEditor(prepared.blob, prepared.scale, textBlocks);
      } catch (error) {
        console.error('Visible capture failed:', error);
        alert(text('visibleError') + error.message);
      }
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
            const metrics = surface.getMetrics();
            const textBlocks = extractDomTextBlocks({
              left: 0, top: 0, width: metrics.fullWidth, height: metrics.fullHeight
            });
            await openEditor(prepared.blob, prepared.scale, textBlocks);
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

        let docStartX = 0;
        let docStartY = 0;
        let currentClientX = 0;
        let currentClientY = 0;
        let isDragging = false;
        let disposed = false;
        let autoScrollRaf = null;
        let hasScrolled = false;

        const stopAutoScroll = () => {
          if (autoScrollRaf) {
            cancelAnimationFrame(autoScrollRaf);
            autoScrollRaf = null;
          }
        };

        const dispose = () => {
          if (disposed) return;
          disposed = true;
          stopAutoScroll();
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

        const updateSelectionGeometry = () => {
          const docCurrentX = currentClientX + window.scrollX;
          const docCurrentY = currentClientY + window.scrollY;
          const docLeft = Math.min(docStartX, docCurrentX);
          const docTop = Math.min(docStartY, docCurrentY);
          const width = Math.abs(docCurrentX - docStartX);
          const height = Math.abs(docCurrentY - docStartY);

          const viewLeft = docLeft - window.scrollX;
          const viewTop = docTop - window.scrollY;

          Object.assign(selectionBox.style, {
            left: `${viewLeft}px`,
            top: `${viewTop}px`,
            width: `${width}px`,
            height: `${height}px`,
            display: 'block'
          });
          label.textContent = `${Math.round(width)} × ${Math.round(height)} px`;
        };

        const checkAutoScroll = () => {
          if (!isDragging || disposed) return;
          const SCROLL_MARGIN = 48;
          const MAX_SPEED = 24;
          let deltaY = 0;
          let deltaX = 0;

          if (currentClientY > window.innerHeight - SCROLL_MARGIN) {
            const ratio = (currentClientY - (window.innerHeight - SCROLL_MARGIN)) / SCROLL_MARGIN;
            deltaY = Math.min(MAX_SPEED, Math.max(2, Math.round(ratio * MAX_SPEED)));
          } else if (currentClientY < SCROLL_MARGIN && window.scrollY > 0) {
            const ratio = (SCROLL_MARGIN - currentClientY) / SCROLL_MARGIN;
            deltaY = -Math.min(MAX_SPEED, Math.max(2, Math.round(ratio * MAX_SPEED)));
          }

          if (currentClientX > window.innerWidth - SCROLL_MARGIN) {
            const ratio = (currentClientX - (window.innerWidth - SCROLL_MARGIN)) / SCROLL_MARGIN;
            deltaX = Math.min(MAX_SPEED, Math.max(2, Math.round(ratio * MAX_SPEED)));
          } else if (currentClientX < SCROLL_MARGIN && window.scrollX > 0) {
            const ratio = (SCROLL_MARGIN - currentClientX) / SCROLL_MARGIN;
            deltaX = -Math.min(MAX_SPEED, Math.max(2, Math.round(ratio * MAX_SPEED)));
          }

          if (deltaY !== 0 || deltaX !== 0) {
            const prevX = window.scrollX;
            const prevY = window.scrollY;
            window.scrollBy(deltaX, deltaY);
            if (window.scrollX !== prevX || window.scrollY !== prevY) {
              hasScrolled = true;
            }
            updateSelectionGeometry();
          }

          autoScrollRaf = requestAnimationFrame(checkAutoScroll);
        };

        overlay.addEventListener('pointerdown', event => {
          if (event.button !== 0) return;
          isDragging = true;
          hasScrolled = false;
          currentClientX = event.clientX;
          currentClientY = event.clientY;
          docStartX = event.clientX + window.scrollX;
          docStartY = event.clientY + window.scrollY;
          overlay.setPointerCapture(event.pointerId);
          updateSelectionGeometry();
          stopAutoScroll();
          autoScrollRaf = requestAnimationFrame(checkAutoScroll);
        });

        overlay.addEventListener('pointermove', event => {
          if (!isDragging) return;
          currentClientX = event.clientX;
          currentClientY = event.clientY;
          updateSelectionGeometry();
        });

        overlay.addEventListener('pointerup', async event => {
          if (!isDragging) return;
          isDragging = false;
          stopAutoScroll();
          currentClientX = event.clientX;
          currentClientY = event.clientY;

          const docEndX = currentClientX + window.scrollX;
          const docEndY = currentClientY + window.scrollY;
          const finalDocX = Math.min(docStartX, docEndX);
          const finalDocY = Math.min(docStartY, docEndY);
          const cropWidth = Math.abs(docEndX - docStartX);
          const cropHeight = Math.abs(docEndY - docStartY);

          overlay.style.visibility = 'hidden';
          if (cropWidth < 5 || cropHeight < 5) {
            dispose();
            return;
          }

          try {
            const region = {
              left: Math.round(finalDocX),
              top: Math.round(finalDocY),
              width: Math.round(cropWidth),
              height: Math.round(cropHeight),
              fullWidth: Math.round(cropWidth),
              fullHeight: Math.round(cropHeight)
            };
            const textBlocks = extractDomTextBlocks(region);

            if (hasScrolled || cropHeight > window.innerHeight) {
              const surface = getDocumentScrollSurface();
              const restoreMotion = suspendPageMotion();
              const progress = createProgressIndicator();
              try {
                const baseline = await stabilizePageDimensions(surface, region);
                const prepared = await captureScrollingRegionAttempt(surface, region, baseline, progress);
                await openEditor(prepared.blob, prepared.scale, textBlocks);
              } finally {
                restoreMotion();
                if (progress) progress.remove();
              }
            } else {
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
              const viewX = finalDocX - window.scrollX;
              const viewY = finalDocY - window.scrollY;
              canvas.getContext('2d').drawImage(
                image,
                Math.round(viewX * scaleX), Math.round(viewY * scaleY), canvas.width, canvas.height,
                0, 0, canvas.width, canvas.height
              );
              const prepared = await prepareCanvasForEditor(canvas);
              await openEditor(prepared.blob, prepared.scale, textBlocks);
            }
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
            const textBlocks = extractDomTextBlocks(selected.region);
            await openEditor(prepared.blob, prepared.scale, textBlocks);
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

    return Object.freeze({ executeVisibleCapture, executeFullPageCapture, executeZoneCapture, executeScrollingZoneCapture });
  }

  globalScope.ScionosContentCapture = Object.freeze({ create: createContentCapture });
})(typeof globalThis !== 'undefined' ? globalThis : this);