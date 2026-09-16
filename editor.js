// Accessible local screenshot editor - Scionos Capture
document.addEventListener('DOMContentLoaded', async () => {
  const canvas = document.getElementById('main-canvas');
  const context = canvas.getContext('2d');
  const container = document.getElementById('canvas-container');
  const workspace = document.getElementById('workspace');
  const emptyState = document.getElementById('empty-state');
  const pageTitle = document.getElementById('page-title');
  const pageMeta = document.getElementById('page-meta');
  const notice = document.getElementById('capture-notice');
  const toast = document.getElementById('toast');
  const toolButtons = Array.from(document.querySelectorAll('[data-tool]'));
  const drawControls = document.getElementById('draw-controls');
  const censorControls = document.getElementById('censor-controls');
  const censorType = document.getElementById('censor-type');
  const censorShape = document.getElementById('censor-shape');
  const censorSize = document.getElementById('censor-size');
  const censorSizeField = document.getElementById('censor-size-field');
  const censorColor = document.getElementById('censor-color');
  const censorColorField = document.getElementById('censor-color-field');
  const blurIntensity = document.getElementById('blur-intensity');
  const blurIntensityValue = document.getElementById('blur-intensity-val');
  const blurField = document.getElementById('blur-field');
  const blurWarning = document.getElementById('blur-warning');
  const drawColor = document.getElementById('draw-color');
  const drawSize = document.getElementById('draw-size');
  const undoButton = document.getElementById('btn-undo');
  const redoButton = document.getElementById('btn-redo');
  const downloadButton = document.getElementById('btn-download');
  const htmlButton = document.getElementById('btn-html');
  const printButton = document.getElementById('btn-pdf');
  const copyButton = document.getElementById('btn-copy');
  const zoomInButton = document.getElementById('zoom-in');
  const zoomOutButton = document.getElementById('zoom-out');
  const zoomResetButton = document.getElementById('zoom-reset');
  const zoomText = document.getElementById('zoom-text');
  const geometryPanel = document.getElementById('geometry-panel');
  const geometryApply = document.getElementById('geometry-apply');
  const geometryCancel = document.getElementById('geometry-cancel');
  const geometryInputs = {
    x: document.getElementById('geometry-x'),
    y: document.getElementById('geometry-y'),
    width: document.getElementById('geometry-width'),
    height: document.getElementById('geometry-height')
  };

  const MAX_OPERATIONS = 100;
  const MIN_ZOOM = 0.2;
  const MAX_ZOOM = 3;
  let currentTool = 'select';
  let currentZoom = 1;
  let baseImage = null;
  let committedSurface = null;
  let operations = [];
  let redoOperations = [];
  let draftOperation = null;
  let activePointerId = null;
  let renderScheduled = false;
  let captureRecord = null;
  let toastTimer = null;

  function updateTexts() {
    document.title = getI18nText('editorTitle');
    const textMap = {
      'txt-tool-select': 'toolCursor', 'txt-tool-draw': 'toolDraw',
      'txt-tool-censor': 'toolCensor', 'txt-tool-crop': 'toolCrop',
      'txt-undo': 'toolUndo', 'txt-redo': 'toolRedo',
      'txt-copy': 'btnCopy', 'txt-pdf': 'btnPrint', 'txt-html': 'btnHtml', 'txt-png': 'btnPng',
      'label-draw-size': 'labelDrawSize', 'label-draw-color': 'labelDrawColor',
      'label-mode': 'labelMode', 'label-shape': 'labelShape',
      'label-censor-size': 'labelDrawSize',
      'label-censor-color': 'labelColor', 'label-blur': 'labelBlurIntensity',
      'blur-warning': 'blurWarning', 'geometry-title': 'geometryTitle',
      'label-x': 'coordinateX', 'label-y': 'coordinateY',
      'label-width': 'coordinateWidth', 'label-height': 'coordinateHeight',
      'geometry-apply': 'applyCrop', 'geometry-cancel': 'cancelCrop'
    };
    Object.entries(textMap).forEach(([id, key]) => {
      document.getElementById(id).textContent = getI18nText(key);
    });
    document.querySelector('[data-i18n="languageAuto"]').textContent = getI18nText('languageAuto');

    const drawSizeKeys = ['sizeFine', 'sizeMedium', 'sizeThick', 'sizeVeryThick'];
    Array.from(drawSize.options).forEach((option, index) => { option.textContent = getI18nText(drawSizeKeys[index]); });
    Array.from(censorSize.options).forEach((option, index) => { option.textContent = getI18nText(drawSizeKeys[index]); });
    censorType.options[0].textContent = getI18nText('modeColor');
    censorType.options[1].textContent = getI18nText('modeBlur');
    censorShape.options[0].textContent = getI18nText('shapeRect');
    censorShape.options[1].textContent = getI18nText('shapeCircle');
    censorShape.options[2].textContent = getI18nText('shapeFree');

    canvas.setAttribute('aria-label', getI18nText('canvasLabel'));
    copyButton.setAttribute('aria-label', getI18nText('btnCopy'));
    printButton.setAttribute('aria-label', getI18nText('btnPrint'));
    htmlButton.setAttribute('aria-label', getI18nText('btnHtml'));
    downloadButton.setAttribute('aria-label', getI18nText('btnPng'));
    document.getElementById('primary-tool-group').setAttribute('aria-label', getI18nText('toolsToolbar'));
    zoomOutButton.setAttribute('aria-label', getI18nText('zoomOut'));
    zoomInButton.setAttribute('aria-label', getI18nText('zoomIn'));
    zoomResetButton.setAttribute('aria-label', getI18nText('zoomFit'));

    const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
    const ctrlKey = isMac ? '⌘' : 'Ctrl';
    const toolSelect = document.getElementById('tool-select');
    const toolDraw = document.getElementById('tool-draw');
    const toolCensor = document.getElementById('tool-censor');
    const toolCrop = document.getElementById('tool-crop');

    if (toolSelect) toolSelect.title = `${getI18nText('toolCursor')} (V)`;
    if (toolDraw) toolDraw.title = `${getI18nText('toolDraw')} (D)`;
    if (toolCensor) toolCensor.title = `${getI18nText('toolCensor')} (M)`;
    if (toolCrop) toolCrop.title = `${getI18nText('toolCrop')} (C)`;
    if (undoButton) undoButton.title = `${getI18nText('toolUndo')} (${ctrlKey}+Z)`;
    if (redoButton) redoButton.title = `${getI18nText('toolRedo')} (${ctrlKey}+Y)`;
    if (zoomInButton) zoomInButton.title = `${getI18nText('zoomIn')} (+)`;
    if (zoomOutButton) zoomOutButton.title = `${getI18nText('zoomOut')} (-)`;
    if (zoomResetButton) zoomResetButton.title = `${getI18nText('zoomFit')} (0)`;
    if (copyButton) copyButton.title = getI18nText('btnCopy');
    if (printButton) printButton.title = getI18nText('btnPrint');
    if (htmlButton) htmlButton.title = getI18nText('btnHtml');
    if (downloadButton) downloadButton.title = getI18nText('btnPng');

    if (!captureRecord) emptyState.textContent = getI18nText('loadingCapture');
    updateRecordMetadata();
    updateControlVisibility();
  }

  function updateRecordMetadata() {
    if (!captureRecord) return;
    pageTitle.textContent = captureRecord.title || getI18nText('captureTitle');
    const formattedDate = new Date(captureRecord.timestamp).toLocaleString(ScionosI18n.language);
    pageMeta.textContent = `${captureRecord.url || ''} — ${formattedDate}`;
    pageMeta.title = captureRecord.url || '';
  }

  function showToast(message, isError = false) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.toggle('error', isError);
    toast.setAttribute('role', isError ? 'alert' : 'status');
    toast.classList.add('visible');
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 3500);
  }

  function setEditorReady(ready) {
    document.body.setAttribute('aria-busy', String(!ready));
    [downloadButton, htmlButton, printButton, copyButton].forEach(button => { button.disabled = !ready; });
    toolButtons.forEach(button => { button.disabled = !ready; });
    zoomInButton.disabled = !ready;
    zoomOutButton.disabled = !ready;
    zoomResetButton.disabled = !ready;
  }

  function createSurface(width, height) {
    const surface = document.createElement('canvas');
    surface.width = Math.max(1, Math.round(width));
    surface.height = Math.max(1, Math.round(height));
    return surface;
  }

  function normalizeBounds(start, end) {
    return {
      x: Math.min(start.x, end.x),
      y: Math.min(start.y, end.y),
      width: Math.abs(end.x - start.x),
      height: Math.abs(end.y - start.y)
    };
  }

  function normalizeCrop(operation, sourceWidth, sourceHeight) {
    const bounds = normalizeBounds(operation.start, operation.end);
    const x = Math.max(0, Math.min(sourceWidth - 1, Math.floor(bounds.x)));
    const y = Math.max(0, Math.min(sourceHeight - 1, Math.floor(bounds.y)));
    const width = Math.max(1, Math.min(sourceWidth - x, Math.floor(bounds.width)));
    const height = Math.max(1, Math.min(sourceHeight - y, Math.floor(bounds.height)));
    return { x, y, width, height };
  }

  function operationBounds(operation, sourceWidth, sourceHeight) {
    let bounds;
    if (operation.shape === 'free') {
      const xs = operation.points.map(point => point.x);
      const ys = operation.points.map(point => point.y);
      bounds = {
        x: Math.min(...xs) - operation.radius,
        y: Math.min(...ys) - operation.radius,
        width: Math.max(...xs) - Math.min(...xs) + operation.radius * 2,
        height: Math.max(...ys) - Math.min(...ys) + operation.radius * 2
      };
    } else {
      bounds = normalizeBounds(operation.start, operation.end);
    }
    const padding = operation.type === 'blur' ? operation.blur * 2 : 0;
    const x = Math.max(0, Math.floor(bounds.x - padding));
    const y = Math.max(0, Math.floor(bounds.y - padding));
    return {
      x,
      y,
      width: Math.max(1, Math.min(sourceWidth - x, Math.ceil(bounds.width + padding * 2))),
      height: Math.max(1, Math.min(sourceHeight - y, Math.ceil(bounds.height + padding * 2)))
    };
  }

  function drawPath(targetContext, operation) {
    if (!operation.points.length) return;
    targetContext.save();
    targetContext.strokeStyle = operation.color;
    targetContext.fillStyle = operation.color;
    targetContext.lineWidth = operation.width;
    targetContext.lineCap = 'round';
    targetContext.lineJoin = 'round';
    if (operation.points.length === 1) {
      targetContext.beginPath();
      targetContext.arc(operation.points[0].x, operation.points[0].y, operation.width / 2, 0, Math.PI * 2);
      targetContext.fill();
    } else {
      targetContext.beginPath();
      targetContext.moveTo(operation.points[0].x, operation.points[0].y);
      operation.points.slice(1).forEach(point => targetContext.lineTo(point.x, point.y));
      targetContext.stroke();
    }
    targetContext.restore();
  }

  function createCensorPath(targetContext, operation) {
    if (operation.shape === 'free') {
      operation.points.forEach(point => {
        targetContext.moveTo(point.x + operation.radius, point.y);
        targetContext.arc(point.x, point.y, operation.radius, 0, Math.PI * 2);
      });
      return;
    }
    const bounds = normalizeBounds(operation.start, operation.end);
    if (operation.shape === 'circle') {
      targetContext.ellipse(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, bounds.width / 2, bounds.height / 2, 0, 0, Math.PI * 2);
    } else {
      targetContext.rect(bounds.x, bounds.y, bounds.width, bounds.height);
    }
  }

  function drawCensorShape(targetContext, operation) {
    targetContext.beginPath();
    createCensorPath(targetContext, operation);
    targetContext.fill();
  }

  function applyCensor(surface, operation) {
    const targetContext = surface.getContext('2d');
    if (operation.type === 'color') {
      targetContext.save();
      targetContext.fillStyle = operation.color;
      drawCensorShape(targetContext, operation);
      targetContext.restore();
      return;
    }

    const bounds = operationBounds(operation, surface.width, surface.height);
    const source = createSurface(bounds.width, bounds.height);
    source.getContext('2d').drawImage(
      surface, bounds.x, bounds.y, bounds.width, bounds.height,
      0, 0, bounds.width, bounds.height
    );
    targetContext.save();
    targetContext.beginPath();
    createCensorPath(targetContext, operation);
    targetContext.clip();
    targetContext.filter = `blur(${operation.blur}px)`;
    targetContext.drawImage(source, bounds.x, bounds.y);
    targetContext.restore();
  }

  function applyOperation(surface, operation) {
    if (operation.kind === 'crop') {
      const crop = normalizeCrop(operation, surface.width, surface.height);
      const cropped = createSurface(crop.width, crop.height);
      cropped.getContext('2d').drawImage(
        surface, crop.x, crop.y, crop.width, crop.height,
        0, 0, crop.width, crop.height
      );
      return cropped;
    }
    if (operation.kind === 'draw') drawPath(surface.getContext('2d'), operation);
    if (operation.kind === 'censor') applyCensor(surface, operation);
    return surface;
  }

  function drawCropPreview(targetContext, operation, width, height) {
    const crop = normalizeCrop(operation, width, height);
    targetContext.save();
    targetContext.fillStyle = 'rgba(3, 10, 20, .48)';
    targetContext.beginPath();
    targetContext.rect(0, 0, width, height);
    targetContext.rect(crop.x, crop.y, crop.width, crop.height);
    targetContext.fill('evenodd');
    targetContext.strokeStyle = '#38bdf8';
    targetContext.lineWidth = 2;
    targetContext.setLineDash([7, 5]);
    targetContext.strokeRect(crop.x, crop.y, crop.width, crop.height);
    targetContext.restore();
  }

  function rebuildCommittedSurface() {
    if (!baseImage) return;
    let surface = createSurface(baseImage.width, baseImage.height);
    surface.getContext('2d').drawImage(baseImage, 0, 0);
    operations.forEach(operation => { surface = applyOperation(surface, operation); });
    committedSurface = surface;
    renderCanvas();
  }

  function renderCanvas() {
    if (!committedSurface) return;
    canvas.width = committedSurface.width;
    canvas.height = committedSurface.height;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(committedSurface, 0, 0);
    if (draftOperation) {
      if (draftOperation.kind === 'crop') drawCropPreview(context, draftOperation, canvas.width, canvas.height);
      else applyOperation(canvas, draftOperation);
    }
    applyZoom(currentZoom);
    updateHistoryButtons();
  }

  function scheduleRender() {
    if (renderScheduled) return;
    renderScheduled = true;
    requestAnimationFrame(() => {
      renderScheduled = false;
      renderCanvas();
    });
  }

  function meaningful(operation) {
    if (!operation) return false;
    if (operation.kind === 'draw' || operation.shape === 'free') return operation.points.length > 1;
    const bounds = normalizeBounds(operation.start, operation.end);
    return bounds.width >= 2 && bounds.height >= 2;
  }

  async function commitOperation(operation) {
    if (!meaningful(operation)) {
      cancelDraft();
      return;
    }
    operations.push(operation);
    redoOperations = [];
    draftOperation = null;
    geometryPanel.hidden = true;
    rebuildCommittedSurface();

    if (operations.length >= MAX_OPERATIONS) {
      try {
        const replacement = await createImageBitmap(committedSurface);
        if (baseImage && typeof baseImage.close === 'function') baseImage.close();
        baseImage = replacement;
        operations = [];
        redoOperations = [];
        rebuildCommittedSurface();
        showToast(getI18nText('historyFlattened'));
      } catch (error) {
        showToast(getI18nText('exportError') + error.message, true);
      }
    }
  }

  function updateHistoryButtons() {
    undoButton.disabled = operations.length === 0;
    redoButton.disabled = redoOperations.length === 0;
  }

  function applyZoom(value) {
    currentZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
    const width = Math.max(1, Math.round(canvas.width * currentZoom));
    const height = Math.max(1, Math.round(canvas.height * currentZoom));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    container.style.width = `${width}px`;
    container.style.height = `${height}px`;
    zoomText.textContent = `${Math.round(currentZoom * 100)}%`;
    zoomOutButton.disabled = !baseImage || currentZoom <= MIN_ZOOM;
    zoomInButton.disabled = !baseImage || currentZoom >= MAX_ZOOM;
  }

  function fitToScreen() {
    if (!canvas.width) return;
    const availableWidth = Math.max(100, workspace.clientWidth - 60);
    applyZoom(Math.min(1, availableWidth / canvas.width));
  }

  function getCanvasCoords(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(canvas.width, (event.clientX - rect.left) * (canvas.width / rect.width))),
      y: Math.max(0, Math.min(canvas.height, (event.clientY - rect.top) * (canvas.height / rect.height)))
    };
  }

  function createCensorOperation(start, end, shape = censorShape.value) {
    return {
      kind: 'censor', type: censorType.value, shape, color: censorColor.value,
      blur: Number(blurIntensity.value), radius: Number(censorSize.value) * 1.5,
      points: shape === 'free' ? [start] : [], start, end
    };
  }

  function syncGeometry(operation) {
    if (!operation || operation.shape === 'free') return;
    const bounds = normalizeBounds(operation.start, operation.end);
    geometryInputs.x.value = Math.round(bounds.x);
    geometryInputs.y.value = Math.round(bounds.y);
    geometryInputs.width.value = Math.max(1, Math.round(bounds.width));
    geometryInputs.height.value = Math.max(1, Math.round(bounds.height));
  }

  function operationFromGeometry() {
    const x = Math.max(0, Number(geometryInputs.x.value) || 0);
    const y = Math.max(0, Number(geometryInputs.y.value) || 0);
    const width = Math.max(1, Number(geometryInputs.width.value) || 1);
    const height = Math.max(1, Number(geometryInputs.height.value) || 1);
    const start = { x, y };
    const end = { x: x + width, y: y + height };
    return currentTool === 'crop' ? { kind: 'crop', start, end } : createCensorOperation(start, end);
  }

  function showGeometry(operation) {
    draftOperation = operation;
    syncGeometry(operation);
    geometryPanel.hidden = false;
    scheduleRender();
  }

  function prepareKeyboardGeometry() {
    if (!baseImage || !['crop', 'censor'].includes(currentTool) || censorShape.value === 'free') return;
    const width = Math.max(20, Math.min(320, canvas.width * 0.45));
    const height = Math.max(20, Math.min(180, canvas.height * 0.35));
    const x = Math.max(0, (canvas.width - width) / 2);
    const y = Math.max(0, (canvas.height - height) / 2);
    const start = { x, y };
    const end = { x: x + width, y: y + height };
    showGeometry(currentTool === 'crop' ? { kind: 'crop', start, end } : createCensorOperation(start, end));
  }

  function cancelDraft() {
    draftOperation = null;
    activePointerId = null;
    geometryPanel.hidden = true;
    renderCanvas();
  }

  function setActiveTool(tool) {
    currentTool = tool;
    toolButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.tool === tool)));
    canvas.style.cursor = tool === 'select' ? 'default' : 'crosshair';
    cancelDraft();
    updateControlVisibility();
  }

  function updateControlVisibility() {
    drawControls.hidden = currentTool !== 'draw';
    censorControls.hidden = currentTool !== 'censor';
    const isBlur = currentTool === 'censor' && censorType.value === 'blur';
    blurField.hidden = !isBlur;
    blurWarning.hidden = !isBlur;
    censorColorField.hidden = currentTool !== 'censor' || censorType.value !== 'color';
    censorSizeField.hidden = currentTool !== 'censor' || censorShape.value !== 'free';
  }

  async function loadCapture() {
    const captureId = new URLSearchParams(location.search).get('capture');
    if (!captureId) {
      showLoadError(getI18nText('captureLoadError'));
      return;
    }
    try {
      const record = await CaptureStore.getCapture(captureId);
      if (!record || !record.blob) throw new Error(getI18nText('captureLoadError'));
      captureRecord = record;
      baseImage = await createImageBitmap(record.blob);
      chrome.runtime.sendMessage({ action: 'ACK_CAPTURE_LOADED', captureId }, () => {
        if (chrome.runtime.lastError) console.warn('Capture cleanup acknowledgement failed:', chrome.runtime.lastError.message);
      });
      rebuildCommittedSurface();
      container.hidden = false;
      emptyState.hidden = true;
      updateRecordMetadata();
      setEditorReady(true);
      fitToScreen();
      notice.textContent = record.scale < 0.9999
        ? getI18nText('captureReducedNotice', { percent: Math.round(record.scale * 100) })
        : '';
      showToast(getI18nText('captureReady'));
    } catch (error) {
      console.error('Capture loading failed:', error);
      showLoadError(error.message);
    }
  }

  function showLoadError(message) {
    pageTitle.textContent = getI18nText('captureLoadError');
    pageMeta.textContent = '';
    emptyState.hidden = false;
    emptyState.textContent = message;
    container.hidden = true;
    setEditorReady(false);
    document.body.setAttribute('aria-busy', 'false');
  }

  canvas.addEventListener('pointerdown', event => {
    if (!baseImage || currentTool === 'select' || event.button !== 0) return;
    const point = getCanvasCoords(event);
    activePointerId = event.pointerId;
    canvas.setPointerCapture(activePointerId);
    geometryPanel.hidden = true;
    if (currentTool === 'draw') {
      draftOperation = { kind: 'draw', color: drawColor.value, width: Number(drawSize.value), points: [point] };
    } else if (currentTool === 'censor') {
      draftOperation = createCensorOperation(point, point);
    } else {
      draftOperation = { kind: 'crop', start: point, end: point };
    }
  });

  canvas.addEventListener('pointermove', event => {
    if (!draftOperation || event.pointerId !== activePointerId) return;
    const point = getCanvasCoords(event);
    if (draftOperation.kind === 'draw' || draftOperation.shape === 'free') {
      const previous = draftOperation.points[draftOperation.points.length - 1];
      if (!previous || Math.hypot(point.x - previous.x, point.y - previous.y) >= 0.75) draftOperation.points.push(point);
    } else {
      draftOperation.end = point;
    }
    scheduleRender();
  });

  canvas.addEventListener('pointerup', async event => {
    if (!draftOperation || event.pointerId !== activePointerId) return;
    const operation = draftOperation;
    const point = getCanvasCoords(event);
    if (operation.kind !== 'draw' && operation.shape !== 'free') operation.end = point;
    else if (operation.points.length === 1) operation.points.push(point);
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    activePointerId = null;
    if (operation.kind === 'crop' || (operation.kind === 'censor' && operation.shape !== 'free')) showGeometry(operation);
    else await commitOperation(operation);
  });
  canvas.addEventListener('pointercancel', cancelDraft);

  canvas.addEventListener('keydown', event => {
    if (!['crop', 'censor'].includes(currentTool) || censorShape.value === 'free') return;
    if (!draftOperation) prepareKeyboardGeometry();
    if (!draftOperation) return;
    const step = event.ctrlKey ? 10 : 1;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
      const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
      if (event.shiftKey) draftOperation.end = { x: draftOperation.end.x + dx, y: draftOperation.end.y + dy };
      else {
        draftOperation.start = { x: draftOperation.start.x + dx, y: draftOperation.start.y + dy };
        draftOperation.end = { x: draftOperation.end.x + dx, y: draftOperation.end.y + dy };
      }
      syncGeometry(draftOperation);
      scheduleRender();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      commitOperation(draftOperation);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelDraft();
    }
  });

  geometryPanel.addEventListener('input', event => {
    if (!Object.values(geometryInputs).includes(event.target)) return;
    draftOperation = operationFromGeometry();
    scheduleRender();
  });
  geometryApply.addEventListener('click', () => commitOperation(draftOperation || operationFromGeometry()));
  geometryCancel.addEventListener('click', cancelDraft);

  toolButtons.forEach(button => button.addEventListener('click', () => {
    const wasActive = currentTool === button.dataset.tool;
    setActiveTool(button.dataset.tool);
    if (wasActive || ['crop', 'censor'].includes(currentTool)) prepareKeyboardGeometry();
  }));

  document.getElementById('editor-toolbar').addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key) || !toolButtons.includes(document.activeElement)) return;
    event.preventDefault();
    const index = toolButtons.indexOf(document.activeElement);
    toolButtons[(index + (event.key === 'ArrowRight' ? 1 : -1) + toolButtons.length) % toolButtons.length].focus();
  });

  undoButton.addEventListener('click', () => {
    const operation = operations.pop();
    if (!operation) return;
    redoOperations.push(operation);
    cancelDraft();
    rebuildCommittedSurface();
  });
  redoButton.addEventListener('click', () => {
    const operation = redoOperations.pop();
    if (!operation) return;
    operations.push(operation);
    cancelDraft();
    rebuildCommittedSurface();
  });

  censorType.addEventListener('change', () => {
    updateControlVisibility();
    if (draftOperation && draftOperation.kind === 'censor') {
      draftOperation.type = censorType.value;
      draftOperation.color = censorColor.value;
      draftOperation.blur = Number(blurIntensity.value);
      scheduleRender();
    }
  });
  censorShape.addEventListener('change', () => {
    cancelDraft();
    updateControlVisibility();
    if (censorShape.value !== 'free') prepareKeyboardGeometry();
  });
  censorColor.addEventListener('input', () => {
    if (draftOperation && draftOperation.kind === 'censor') {
      draftOperation.color = censorColor.value;
      scheduleRender();
    }
  });
  blurIntensity.addEventListener('input', () => {
    blurIntensityValue.textContent = `${blurIntensity.value}px`;
    blurIntensity.setAttribute('aria-valuetext', `${blurIntensity.value}px`);
    if (draftOperation && draftOperation.kind === 'censor') {
      draftOperation.blur = Number(blurIntensity.value);
      scheduleRender();
    }
  });

  zoomInButton.addEventListener('click', () => applyZoom(currentZoom + 0.15));
  zoomOutButton.addEventListener('click', () => applyZoom(currentZoom - 0.15));
  zoomResetButton.addEventListener('click', fitToScreen);

  function canvasToBlob() {
    return new Promise((resolve, reject) => {
      committedSurface.toBlob(blob => blob ? resolve(blob) : reject(new Error('Image preparation failed.')), 'image/png');
    });
  }

  downloadButton.addEventListener('click', async () => {
    try {
      const blob = await canvasToBlob();
      const link = document.createElement('a');
      const title = captureRecord && captureRecord.title ? captureRecord.title : '';
      const baseName = ScionosCaptureUtils.sanitizeFilename(title, 'Scionos_Capture');
      const dateStr = new Date().toISOString().slice(0, 10);
      link.download = `${baseName}_${dateStr}.png`;
      link.href = URL.createObjectURL(blob);
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 5000);
      showToast(getI18nText('savedPng'));
    } catch (error) {
      showToast(getI18nText('exportError') + error.message, true);
    }
  });
  htmlButton.addEventListener('click', () => {
    try {
      if (!committedSurface) return;
      const dataUrl = committedSurface.toDataURL('image/png');
      const htmlContent = ScionosCaptureUtils.buildHtmlReport({
        title: captureRecord && captureRecord.title ? captureRecord.title : getI18nText('captureTitle'),
        url: captureRecord && captureRecord.url ? captureRecord.url : '',
        timestamp: captureRecord && captureRecord.timestamp ? captureRecord.timestamp : Date.now(),
        width: committedSurface.width,
        height: committedSurface.height,
        dataUrl,
        lang: ScionosI18n.language,
        texts: {
          appName: getI18nText('appName'),
          reportSource: getI18nText('reportSource'),
          reportDate: getI18nText('reportDate'),
          reportDimensions: getI18nText('reportDimensions'),
          reportZoomFit: getI18nText('reportZoomFit'),
          reportZoomReset: getI18nText('reportZoomReset'),
          reportCopied: getI18nText('reportCopied'),
          btnPng: getI18nText('btnPng'),
          btnCopy: getI18nText('btnCopy'),
          btnPrint: getI18nText('btnPrint')
        }
      });

      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const link = document.createElement('a');
      const title = captureRecord && captureRecord.title ? captureRecord.title : '';
      const baseName = ScionosCaptureUtils.sanitizeFilename(title, 'Scionos_Capture');
      const dateStr = new Date().toISOString().slice(0, 10);
      link.download = `${baseName}_${dateStr}.html`;
      link.href = URL.createObjectURL(blob);
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 5000);
      showToast(getI18nText('savedHtml'));
    } catch (error) {
      showToast(getI18nText('exportError') + error.message, true);
    }
  });
  printButton.addEventListener('click', () => {
    cancelDraft();
    if (!committedSurface) return;
    const printArea = document.getElementById('print-area');
    if (printArea) {
      const title = captureRecord && captureRecord.title ? captureRecord.title : getI18nText('captureTitle');
      const safeUrl = ScionosCaptureUtils.sanitizeUrl(captureRecord && captureRecord.url ? captureRecord.url : '');
      const rawUrl = captureRecord && captureRecord.url ? captureRecord.url : '';
      const dateFormatted = captureRecord && captureRecord.timestamp
        ? new Date(captureRecord.timestamp).toLocaleString(ScionosI18n.language)
        : new Date().toLocaleString(ScionosI18n.language);
      const dataUrl = committedSurface.toDataURL('image/png');

      printArea.innerHTML = `
        <div class="print-header">
          <h1>${ScionosCaptureUtils.escapeHtml(title)}</h1>
          <div class="print-meta">
            ${rawUrl ? `<span><strong>${ScionosCaptureUtils.escapeHtml(getI18nText('reportSource'))} :</strong> <a href="${ScionosCaptureUtils.escapeHtml(safeUrl)}">${ScionosCaptureUtils.escapeHtml(rawUrl)}</a></span>` : ''}
            <span><strong>${ScionosCaptureUtils.escapeHtml(getI18nText('reportDate'))} :</strong> ${ScionosCaptureUtils.escapeHtml(dateFormatted)}</span>
            <span><strong>${ScionosCaptureUtils.escapeHtml(getI18nText('reportDimensions'))} :</strong> ${committedSurface.width} × ${committedSurface.height} px</span>
          </div>
        </div>
        <div class="print-image-wrap">
          <img src="${dataUrl}" alt="${ScionosCaptureUtils.escapeHtml(title)}">
        </div>
      `;
    }
    showToast(getI18nText('printOpened'));
    window.print();
  });
  copyButton.addEventListener('click', async () => {
    try {
      const blob = await canvasToBlob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      showToast(getI18nText('copySuccess'));
    } catch (error) {
      showToast(getI18nText('copyError') + error.message, true);
    }
  });

  document.addEventListener('keydown', event => {
    const typing = /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName);
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      (event.shiftKey ? redoButton : undoButton).click();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      redoButton.click();
      return;
    }
    if (typing || event.ctrlKey || event.metaKey || event.altKey) return;
    const shortcuts = { v: 'select', d: 'draw', m: 'censor', c: 'crop' };
    if (shortcuts[event.key.toLowerCase()]) setActiveTool(shortcuts[event.key.toLowerCase()]);
    if (event.key === '+') applyZoom(currentZoom + 0.15);
    if (event.key === '-') applyZoom(currentZoom - 0.15);
    if (event.key === '0') fitToScreen();
  });

  await initI18n();
  const languageMenu = ScionosI18n.setupLanguageMenu({
    button: document.getElementById('language-button'),
    menu: document.getElementById('language-menu'),
    flag: document.getElementById('language-flag'),
    code: document.getElementById('language-code')
  });
  updateTexts();
  updateControlVisibility();
  setEditorReady(false);
  await loadCapture();

  window.addEventListener('scionos-language-change', () => {
    updateTexts();
    languageMenu.update();
  });
  window.addEventListener('beforeunload', () => {
    if (baseImage && typeof baseImage.close === 'function') baseImage.close();
  });
});
