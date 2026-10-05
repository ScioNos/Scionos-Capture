// Capture workflows and their page interaction UI.
(function registerContentCaptureModule(globalScope) {
  function createContentCapture({ Utils, dom, transfer, text }) {
    const {
      extractDomTextBlocks,
      getDocumentScrollSurface,
      findScrollSurface,
      findScrollSurfaceAtPoint,
      assertSurfacePosition,
      suspendPageMotion,
      createAnchoredElementManager,
      layoutChangedError,
      assertStableMetrics,
      getSurfaceCaptureCrop
    } = dom;
    let activeSession = null;
    let sessionId = 0;
    function checkpoint() {
      if (activeSession?.cancelled) {
        const error = new Error('Capture cancelled.');
        error.name = 'AbortError';
        throw error;
      }
    }
    async function checked(operation) {
      checkpoint();
      const result = await operation();
      checkpoint();
      return result;
    }
    const captureVisibleTab = () => checked(() => transfer.captureVisibleTab(checkpoint));
    const loadImage = src => checked(() => transfer.loadImage(src));
    const prepareDataUrlForEditor = (...args) => checked(() => transfer.prepareDataUrlForEditor(...args));
    const prepareCanvasForEditor = (...args) => checked(() => transfer.prepareCanvasForEditor(...args));
    const stabilizePageDimensions = (surface, range) => checked(() => dom.stabilizePageDimensions(surface, range, checkpoint));
    const waitForPaint = () => checked(() => Utils.waitForPaint());
    const delay = ms => checked(() => Utils.delay(ms));

    async function runSession(operation) {
      if (activeSession) return;
      const session = { id: ++sessionId, cancelled: false, onCancel: null, committing: false };
      activeSession = session;
      const previousFocus = document.activeElement;
      const cancel = event => {
        if (event.key !== 'Escape' || session.committing) return;
        event.preventDefault();
        session.cancelled = true;
        session.onCancel?.();
      };
      window.addEventListener('keydown', cancel, true);
      try { await operation(); }
      finally {
        window.removeEventListener('keydown', cancel, true);
        if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
        activeSession = null;
      }
    }

    function createSelectionOverlay(kind, label) {
      const overlay = document.createElement('dialog');
      overlay.dataset.scionosCapture = kind;
      overlay.setAttribute('aria-label', text(label));
      Object.assign(overlay.style, { position: 'fixed', inset: '0', width: '100vw', height: '100vh',
        maxWidth: 'none', maxHeight: 'none', margin: '0', padding: '0', border: '0', boxSizing: 'border-box',
        zIndex: '2147483647', cursor: 'crosshair', userSelect: 'none', touchAction: 'none', overflow: 'hidden' });
      (document.fullscreenElement || document.documentElement).appendChild(overlay);
      overlay.addEventListener('cancel', event => { event.preventDefault(); if (activeSession && !activeSession.committing) { activeSession.cancelled = true; activeSession.onCancel?.(); } });
      return overlay;
    }

    function surfaceUnderOverlay(overlay, x, y) {
      const focus = document.activeElement;
      overlay.close();
      try { return findScrollSurfaceAtPoint(x, y); }
      finally { overlay.showModal(); if (focus?.isConnected) focus.focus({ preventScroll: true }); }
    }

    async function executeVisibleCapture() {
      try {
        const response = await captureVisibleTab();
        const origin = dom.clientPointToSurface(getDocumentScrollSurface(), 0, 0);
        const textBlocks = extractDomTextBlocks({
          x: origin.x, y: origin.y,
          width: window.innerWidth, height: window.innerHeight
        });
        const prepared = await prepareDataUrlForEditor(response.dataUrl, textBlocks);
        await openPreparedCapture(prepared);
      } catch (error) {
        if (error.name === 'AbortError') return;
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
          await waitForPaint();
          try {
            const prepared = await captureFullPageAttempt(surface, baseline, progress);
            await openPreparedCapture(prepared);
            return;
          } catch (error) {
            if (error.code !== 'LAYOUT_CHANGED' || attempt > 0) throw error;
          }
        }
      } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('Full-page capture failed:', error);
        alert(text('fullError') + error.message);
      } finally {
        if (surface) surface.scrollTo(originalPosition.x, originalPosition.y);
        restoreMotion();
        ScionosContentUtils.restoreInlineStyle(originalScrollBehavior);
        removeProgressIndicator(progress);
      }
    }

    async function openPreparedCapture(prepared) {
      checkpoint();
      await transfer.openEditor(prepared.blob, prepared.scale, prepared.textBlocks, prepared.textLayerLimited, checkpoint,
        () => { checkpoint(); activeSession.committing = true; });
    }

    function collectTileText(blocks, surface, region, written) {
      if (blocks.items.length >= 1500) { blocks.limited = true; return; }
      const tileBlocks = extractDomTextBlocks(written, surface);
      blocks.limited = blocks.limited || tileBlocks.limited;
      // Only disjoint written strips contribute text, including the final overlapping tile.
      for (const block of tileBlocks) {
        const adjusted = { ...block, x: block.x + written.x - region.x, y: block.y + written.y - region.y };
        const key = [adjusted.text, adjusted.x.toFixed(2), adjusted.y.toFixed(2)].join(':');
        if (blocks.keys.has(key)) continue;
        if (blocks.items.length >= 1500) { blocks.limited = true; break; }
        blocks.keys.add(key);
        blocks.items.push(adjusted);
      }
    }

    function captureFullPageAttempt(surface, baseline, progress) {
      return captureRegionAttempt(surface, { x: 0, y: 0, width: baseline.fullWidth, height: baseline.fullHeight }, baseline, progress);
    }

    async function captureRegionAttempt(surface, region, baseline, progress) {
      const xs = Utils.buildRegionCapturePlan(region.x, region.width, baseline.viewportWidth, baseline.fullWidth);
      const ys = Utils.buildRegionCapturePlan(region.y, region.height, baseline.viewportHeight, baseline.fullHeight);
      const initial = surface.getPosition();
      if (xs.length === 1 && region.x >= initial.x && region.x + region.width <= initial.x + baseline.viewportWidth) xs[0].scrollY = initial.x;
      if (ys.length === 1 && region.y >= initial.y && region.y + region.height <= initial.y + baseline.viewportHeight) ys[0].scrollY = initial.y;
      if (!xs.length || !ys.length) throw new Error(text('scrollingInvalidRegion'));
      const anchored = createAnchoredElementManager(surface);
      const blocks = { items: [], keys: new Set(), limited: false };
      const patches = [];
      let canvas, context, bitmapSize;
      let outputScale = 1;
      const geometry = surface.getCaptureRect();
      for (let row = 0; row < ys.length; row += 1) {
        for (let column = 0; column < xs.length; column += 1) {
          checkpoint();
          const xTile = xs[column], yTile = ys[row];
          surface.scrollTo(xTile.scrollY, yTile.scrollY);
          await waitForPaint();
          await delay(140);
          assertStableMetrics(surface, baseline);
          const actual = assertSurfacePosition(surface, { x: xTile.scrollY, y: yTile.scrollY });
          const currentGeometry = surface.getCaptureRect();
          if (Math.abs(currentGeometry.width - geometry.width) > 0.5 || Math.abs(currentGeometry.height - geometry.height) > 0.5) throw layoutChangedError();
          const index = row * xs.length + column;
          const percent = Math.round((index + 1) / (xs.length * ys.length) * 100);
          const written = { x: region.x + xTile.destinationTop, y: region.y + yTile.destinationTop,
            width: xTile.sourceHeight, height: yTile.sourceHeight };
          updateProgress(progress, percent, outputScale < 0.9999);
          anchored.prepare(index, xs.length * ys.length, dom.surfaceRectToClient(surface, written), row === ys.length - 1);
          progress.style.visibility = 'hidden';
          let image, bottomPatches;
          try {
            await waitForPaint();
            const response = await captureVisibleTab();
            image = await loadImage(response.dataUrl);
            collectTileText(blocks, surface, region, written);
            bottomPatches = anchored.getBottomPatches();
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
            canvas.width = dimensions.width; canvas.height = dimensions.height;
            context = canvas.getContext('2d', { alpha: false });
            context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
            outputScale = dimensions.scale;
          }
          const draw = (local, targetContext = context) => {
            const sourceLeft = capture.crop.x + Math.round((local.x - actual.x) * capture.scaleX);
            const sourceTop = capture.crop.y + Math.round((local.y - actual.y) * capture.scaleY);
            const sourceRight = Math.min(capture.crop.x + capture.crop.width, capture.crop.x + Math.round((local.x + local.width - actual.x) * capture.scaleX));
            const sourceBottom = Math.min(capture.crop.y + capture.crop.height, capture.crop.y + Math.round((local.y + local.height - actual.y) * capture.scaleY));
            if (sourceLeft < capture.crop.x || sourceTop < capture.crop.y || sourceRight <= sourceLeft || sourceBottom <= sourceTop) throw new Error(text('fullScrollError'));
            const destination = Utils.computeTileDestination({ ...local, x: local.x - region.x, y: local.y - region.y },
              region.width, region.height, canvas.width, canvas.height);
            targetContext.drawImage(image, sourceLeft, sourceTop, sourceRight - sourceLeft, sourceBottom - sourceTop,
              destination.x, destination.y, destination.width, destination.height);
            return destination;
          };
          draw(written);
          for (const rect of bottomPatches) {
            const start = dom.clientPointToSurface(surface, rect.left, rect.top);
            const end = dom.clientPointToSurface(surface, rect.right, rect.bottom);
            const left = Math.max(region.x, written.x, start.x), right = Math.min(region.x + region.width, written.x + written.width, end.x);
            const top = Math.max(region.y, start.y), bottom = Math.min(region.y + region.height, end.y);
            if (right <= left || bottom <= top) continue;
            const local = { x: left, y: top, width: right - left, height: bottom - top };
            // Keep just the patch, not a full screenshot/canvas for every tile.
            const destination = Utils.computeTileDestination({ ...local, x: left - region.x, y: top - region.y }, region.width, region.height, canvas.width, canvas.height);
            const patch = document.createElement('canvas'); patch.width = destination.width; patch.height = destination.height;
            const viewportRect = dom.surfaceRectToClient(surface, local);
            const sx = image.width / window.innerWidth, sy = image.height / window.innerHeight;
            const sourceLeft = Math.round(viewportRect.left * sx), sourceTop = Math.round(viewportRect.top * sy);
            const sourceRight = Math.round(viewportRect.right * sx), sourceBottom = Math.round(viewportRect.bottom * sy);
            patch.getContext('2d').drawImage(image, sourceLeft, sourceTop, sourceRight - sourceLeft, sourceBottom - sourceTop, 0, 0, patch.width, patch.height);
            patches.push({ patch, destination, bounds: { x: left - region.x, y: top - region.y, width: local.width, height: local.height } });
          }
        }
      }
      for (const { patch, destination, bounds } of patches) {
        context.drawImage(patch, destination.x, destination.y);
        blocks.items = Utils.filterTextBlocksIntersectingBounds(blocks.items, bounds);
      }
      return prepareCanvasForEditor(canvas, outputScale,
        Utils.scaleTextBlocks(blocks.items, canvas.width / region.width, canvas.height / region.height), blocks.limited);
    }

    function executeZoneCapture() {
      return new Promise(resolve => {
        const scrollState = ScionosContentUtils.createScrollSurfaceStateTracker();
        scrollState.remember(getDocumentScrollSurface());
        const overlay = createSelectionOverlay('selection', 'statusZone');
        overlay.style.background = 'rgba(3, 10, 20, 0.48)';
        const selectionBox = document.createElement('div');
        Object.assign(selectionBox.style, { position: 'fixed', border: '2px solid #38bdf8',
          boxShadow: '0 0 0 9999px rgba(3,10,20,.25)', display: 'none', pointerEvents: 'none', boxSizing: 'border-box' });
        const label = document.createElement('div');
        Object.assign(label.style, { position: 'absolute', bottom: '-30px', right: '0', background: '#101d2f', color: '#fff',
          padding: '4px 7px', font: '12px system-ui, sans-serif', borderRadius: '5px' });
        selectionBox.append(label); overlay.append(selectionBox); overlay.showModal();
        let surface, start;
        let pointer = { x: 0, y: 0 };
        let dragging = false, processing = false, settled = false, hasScrolled = false, raf = null;
        const stop = () => { if (raf !== null) cancelAnimationFrame(raf); raf = null; };
        const hide = () => { if (overlay.open) overlay.close(); overlay.remove(); };
        const finish = () => {
          if (settled) return;
          settled = true; dragging = false; stop(); hide(); scrollState.restore(); activeSession.onCancel = null; resolve();
        };
        activeSession.onCancel = () => { dragging = false; stop(); hide(); if (!processing) finish(); };
        const fail = error => {
          if (error.name !== 'AbortError') { console.error('Selection capture failed:', error); alert(text('zoneError') + error.message); }
        };
        const regionForPointer = () => {
          const end = dom.clientPointToSurface(surface, pointer.x, pointer.y, true);
          const metrics = surface.getMetrics();
          const x = Math.max(0, Math.floor(Math.min(start.x, end.x)));
          const y = Math.max(0, Math.floor(Math.min(start.y, end.y)));
          return { x, y, width: Math.min(metrics.fullWidth, Math.ceil(Math.max(start.x, end.x))) - x,
            height: Math.min(metrics.fullHeight, Math.ceil(Math.max(start.y, end.y))) - y };
        };
        const preview = () => {
          const region = regionForPointer(), rect = dom.surfaceRectToClient(surface, region);
          Object.assign(selectionBox.style, { left: rect.left + 'px', top: rect.top + 'px',
            width: (rect.right - rect.left) + 'px', height: (rect.bottom - rect.top) + 'px', display: 'block' });
          label.textContent = Math.round(region.width) + ' × ' + Math.round(region.height) + ' px';
        };
        const autoScroll = () => {
          if (!dragging || settled) return;
          try {
            const rect = surface.getCaptureRect(), before = surface.getPosition(), metrics = surface.getMetrics();
            const speed = (point, left, size) => {
              const margin = Math.min(48, size / 3);
              if (point < left + margin) return -Math.min(24, Math.max(2, Math.round((left + margin - point) / margin * 24)));
              if (point > left + size - margin) return Math.min(24, Math.max(2, Math.round((point - left - size + margin) / margin * 24)));
              return 0;
            };
            const x = Math.max(0, Math.min(metrics.fullWidth - metrics.viewportWidth, before.x + speed(pointer.x, rect.left, rect.width) / (rect.scaleX || 1)));
            const y = Math.max(0, Math.min(metrics.fullHeight - metrics.viewportHeight, before.y + speed(pointer.y, rect.top, rect.height) / (rect.scaleY || 1)));
            surface.scrollTo(x, y);
            const after = surface.getPosition();
            if (after.x !== before.x || after.y !== before.y) { hasScrolled = true; preview(); }
            raf = requestAnimationFrame(autoScroll);
          } catch (error) { fail(error); finish(); }
        };
        overlay.addEventListener('pointerdown', event => {
          if (event.button !== 0 || processing) return;
          try {
            checkpoint();
            surface = surfaceUnderOverlay(overlay, event.clientX, event.clientY);
            scrollState.remember(surface);
            start = dom.clientPointToSurface(surface, event.clientX, event.clientY, true);
            pointer = { x: event.clientX, y: event.clientY }; dragging = true; hasScrolled = false;
            overlay.setPointerCapture(event.pointerId); preview(); stop(); raf = requestAnimationFrame(autoScroll);
          } catch (error) { fail(error); finish(); }
        });
        overlay.addEventListener('pointermove', event => {
          if (!dragging) return;
          pointer = { x: event.clientX, y: event.clientY };
          try { preview(); } catch (error) { fail(error); finish(); }
        });
        overlay.addEventListener('pointerup', async event => {
          if (!dragging) return;
          dragging = false; processing = true; stop(); pointer = { x: event.clientX, y: event.clientY };
          let restoreMotion = () => {}, progress;
          hide();
          try {
            checkpoint();
            const region = regionForPointer();
            if (region.width < 5 || region.height < 5) return;
            restoreMotion = suspendPageMotion(); progress = createProgressIndicator();
            const baseline = hasScrolled ? await stabilizePageDimensions(surface, region) : surface.getMetrics();
            const prepared = await captureRegionAttempt(surface, region, baseline, progress);
            await openPreparedCapture(prepared);
          } catch (error) { fail(error); }
          finally { restoreMotion(); removeProgressIndicator(progress); finish(); }
        });
        overlay.addEventListener('pointercancel', () => { activeSession.cancelled = true; activeSession.onCancel?.(); });
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
            await openPreparedCapture(prepared);
            return;
          } catch (error) {
            if (error.code !== 'LAYOUT_CHANGED' || attempt > 0) throw error;
          }
        }
      } catch (error) {
        if (error.name === 'AbortError') return;
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

    function captureScrollingRegionAttempt(surface, region, baseline, progress) {
      return captureRegionAttempt(surface, region, baseline, progress);
    }

    function selectScrollingRegion(lockedScrollX) {
      return new Promise(resolve => {
        const overlay = createSelectionOverlay('scrolling-selection', 'scrollingDialogLabel');
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
        overlay.showModal();

        let firstPoint = null;
        let selectedSurface = findScrollSurface();
        let horizontalViewport = { x: selectedSurface.isDocument ? lockedScrollX : selectedSurface.getPosition().x,
          width: selectedSurface.getMetrics().viewportWidth };
        const initializeFields = () => {
          const position = selectedSurface.getPosition(), metrics = selectedSurface.getMetrics();
          for (const [name, value] of Object.entries({ x: position.x, y: position.y,
            width: Math.max(5, metrics.viewportWidth / 2), height: metrics.viewportHeight })) inputs[name].value = String(Math.round(value));
        };
        initializeFields();
        const scrollState = ScionosContentUtils.createScrollSurfaceStateTracker();
        scrollState.remember(selectedSurface);
        let lastPointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        let settled = false;

        const surfacePoint = (surface, clientX, clientY) => dom.clientPointToSurface(surface, clientX, clientY, true);
        const lockHorizontal = () => { horizontalViewport = { x: selectedSurface.getPosition().x, width: selectedSurface.getMetrics().viewportWidth }; };
        const normalize = (first, second) => {
          const metrics = selectedSurface.getMetrics();
          return Utils.normalizeScrollingRegion(first, second, horizontalViewport, metrics.fullHeight);
        };
        const cleanup = () => {
          overlay.close();
          overlay.remove();
          activeSession.onCancel = null;
          window.removeEventListener('keydown', guardedKeyDown, true);
          window.removeEventListener('scroll', guardedScroll, true);
        };
        const settle = value => {
          if (settled) return;
          settled = true;
          if (!value) scrollState.restore();
          cleanup();
          resolve(value);
        };
        activeSession.onCancel = () => settle(null);
        const finish = region => {
          if (!region || region.width < 5 || region.height < 5) { status.textContent = text('scrollingInvalidRegion'); status.setAttribute('role', 'alert'); return; }
          settle({ region, surface: selectedSurface, scrollState });
        };
        const reset = () => {
          firstPoint = null;
          selectedSurface = findScrollSurface();
          lockHorizontal();
          scrollState.reset(selectedSurface);
          initializeFields();
          selectionBox.style.display = 'none'; instructions.textContent = text('scrollingInstructionStart');
          status.textContent = ''; restartButton.disabled = true; overlay.focus();
        };
        function extendToBottom() {
          const metrics = selectedSurface.getMetrics();
          const position = selectedSurface.getPosition();
          if (!firstPoint) {
            lockHorizontal();
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
          const rect = dom.surfaceRectToClient(selectedSurface, region);
          Object.assign(selectionBox.style, {
            display: 'block', left: rect.left + 'px', top: rect.top + 'px',
            width: (rect.right - rect.left) + 'px', height: (rect.bottom - rect.top) + 'px'
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
        const guard = handler => event => {
          try { handler(event); }
          catch (error) {
            if (error.name !== 'AbortError') alert(text('scrollingError') + error.message);
            settle(null);
          }
        };
        const guardedKeyDown = guard(onKeyDown), guardedScroll = guard(updatePreview);
        let pointerDownPos = null;
        let isDragging = false;
        let dragSettled = false;

        overlay.addEventListener('pointerdown', event => {
          if (panel.contains(event.target) || event.button !== 0) return;
          pointerDownPos = { x: event.clientX, y: event.clientY };
          isDragging = false;
          dragSettled = false;
        });
        overlay.addEventListener('pointermove', guard(event => {
          if (!panel.contains(event.target)) {
            lastPointer = { x: event.clientX, y: event.clientY };
            if (pointerDownPos && !firstPoint) {
              const distance = Math.hypot(event.clientX - pointerDownPos.x, event.clientY - pointerDownPos.y);
              if (distance > 6) {
                isDragging = true;
                selectedSurface = surfaceUnderOverlay(overlay, pointerDownPos.x, pointerDownPos.y);
                lockHorizontal();
                scrollState.remember(selectedSurface);
                firstPoint = surfacePoint(selectedSurface, pointerDownPos.x, pointerDownPos.y);
                instructions.textContent = text('scrollingInstructionEnd');
                status.textContent = text('scrollingPointSet');
                restartButton.disabled = false;
              }
            }
            updatePreview();
          }
        }));
        overlay.addEventListener('pointerup', guard(event => {
          if (panel.contains(event.target)) return;
          if (isDragging && firstPoint && pointerDownPos) {
            const deltaX = Math.abs(event.clientX - pointerDownPos.x);
            const deltaY = Math.abs(event.clientY - pointerDownPos.y);
            if (deltaX > 10 || deltaY > 10) {
              dragSettled = true;
              finish(normalize(firstPoint, surfacePoint(selectedSurface, event.clientX, event.clientY)));
              pointerDownPos = null;
              isDragging = false;
              return;
            }
          }
          pointerDownPos = null;
          isDragging = false;
        }));
        overlay.addEventListener('click', guard(event => {
          if (panel.contains(event.target) || dragSettled || settled) return;
          lastPointer = { x: event.clientX, y: event.clientY };
          if (!firstPoint) {
            selectedSurface = surfaceUnderOverlay(overlay, event.clientX, event.clientY);
            lockHorizontal();
            scrollState.remember(selectedSurface);
            firstPoint = surfacePoint(selectedSurface, event.clientX, event.clientY);
            instructions.textContent = text('scrollingInstructionEnd'); status.textContent = text('scrollingPointSet'); restartButton.disabled = false; updatePreview(); return;
          }
          finish(normalize(firstPoint, surfacePoint(selectedSurface, event.clientX, event.clientY)));
        }));
        overlay.addEventListener('wheel', guard(event => {
          if (!firstPoint) {
            const hoverSurface = surfaceUnderOverlay(overlay, event.clientX, event.clientY);
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
          selectedSurface.scrollTo(horizontalViewport.x, position.y + event.deltaY);
          updatePreview();
        }), { passive: false });
        panel.addEventListener('click', event => event.stopPropagation());
        panel.addEventListener('submit', event => {
          event.preventDefault();
          const x = Number(inputs.x.value), y = Number(inputs.y.value), width = Number(inputs.width.value), height = Number(inputs.height.value);
          finish(normalize({ x, y }, { x: x + width, y: y + height }));
        });
        toBottomButton.addEventListener('click', extendToBottom);
        restartButton.addEventListener('click', reset);
        cancelButton.addEventListener('click', () => settle(null));
        window.addEventListener('keydown', guardedKeyDown, true);
        window.addEventListener('scroll', guardedScroll, true);
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

    return Object.freeze({
      executeVisibleCapture: () => runSession(executeVisibleCapture),
      executeFullPageCapture: () => runSession(executeFullPageCapture),
      executeZoneCapture: () => runSession(executeZoneCapture),
      executeScrollingZoneCapture: () => runSession(executeScrollingZoneCapture)
    });
  }

  globalScope.ScionosContentCapture = Object.freeze({ create: createContentCapture });
})(typeof globalThis !== 'undefined' ? globalThis : this);
