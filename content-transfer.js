// Image preparation and background transfer services for page capture.
(function registerContentTransfer(globalScope) {
  function createContentTransfer({ Utils, text }) {

    async function captureVisibleTab() {
      const response = await sendMessage({ action: 'CAPTURE_VISIBLE_TAB' });
      if (!response || !response.success) {
        if (response && response.errorCode === 'TAB_CHANGED') throw new Error(text('tabChangedError'));
        throw new Error(response && response.error ? response.error : 'Capture failed.');
      }
      return response;
    }

    async function openEditor(blob, scale, textBlocks = []) {
      if (!(blob instanceof Blob) || blob.size < 1) throw new Error('Invalid capture image.');
      const expectedChunks = Math.ceil(blob.size / Utils.TRANSFER_CHUNK_BYTES);
      const begin = await sendMessage({
        action: 'BEGIN_CAPTURE_TRANSFER', expectedBytes: blob.size, expectedChunks,
        title: document.title, url: location.href, scale,
        textBlocks: Array.isArray(textBlocks) ? textBlocks : []
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

    return Object.freeze({ captureVisibleTab, openEditor, prepareDataUrlForEditor, prepareCanvasForEditor, loadImage });
  }

  globalScope.ScionosContentTransfer = Object.freeze({ create: createContentTransfer });
})(typeof globalThis !== 'undefined' ? globalThis : this);