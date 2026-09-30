const path = require('node:path');
const frenchMessages = Object.fromEntries(Object.entries(require('../../../_locales/fr/messages.json'))
  .map(([key, value]) => [key, value.message]));

async function prepareFullPageHarness(page, html) {
  await page.setViewportSize({ width: 800, height: 600 });
  await page.setContent(html);
  await page.evaluate(() => {
    globalThis.__capturePositions = [];
    globalThis.__captureVisibility = [];
    globalThis.__openedCapture = null;
    globalThis.__transfer = { chunks: [], metadata: null };
    globalThis.__handleCaptureTransfer = (message, callback) => {
      if (message.action === 'BEGIN_CAPTURE_TRANSFER') {
        globalThis.__transfer = { chunks: [], metadata: message };
        callback({ success: true, transferId: 'e2e-transfer', chunkBytes: 524288 });
      } else if (message.action === 'APPEND_CAPTURE_CHUNK') {
        const binary = globalThis.atob(message.data);
        const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
        globalThis.__transfer.chunks[message.index] = bytes;
        callback({ success: true, nextIndex: message.index + 1 });
      } else if (message.action === 'COMPLETE_CAPTURE_TRANSFER') {
        const reader = new globalThis.FileReader();
        reader.onload = () => {
          globalThis.__openedCapture = Object.assign({}, globalThis.__transfer.metadata, { dataUrl: reader.result });
          callback({ success: true, captureId: 'e2e-capture' });
        };
        reader.readAsDataURL(new Blob(globalThis.__transfer.chunks, { type: 'image/png' }));
      } else if (message.action === 'ABORT_CAPTURE_TRANSFER') callback({ success: true });
    };
    globalThis.chrome = {
      runtime: {
        onMessage: { addListener(listener) { globalThis.__captureListener = listener; } },
        sendMessage(message, callback) {
          if (message.action === 'CAPTURE_VISIBLE_TAB') {
            const surface = document.querySelector('[data-scroll-surface]');
            globalThis.__capturePositions.push({
              windowX: Math.round(globalThis.scrollX), windowY: Math.round(globalThis.scrollY),
              surfaceX: surface ? Math.round(surface.scrollLeft) : null, surfaceY: surface ? Math.round(surface.scrollTop) : null
            });
            globalThis.__captureVisibility.push(document.querySelector('header')?.style.visibility || '');
            const canvas = document.createElement('canvas');
            canvas.width = globalThis.innerWidth; canvas.height = globalThis.innerHeight;
            const context2d = canvas.getContext('2d');
            const offset = surface ? surface.scrollLeft + surface.scrollTop : globalThis.scrollX + globalThis.scrollY;
            context2d.fillStyle = 'rgb(' + (offset % 255) + ', 180, 220)';
            context2d.fillRect(0, 0, canvas.width, canvas.height);
            callback({ success: true, dataUrl: canvas.toDataURL('image/png') });
          } else globalThis.__handleCaptureTransfer(message, callback);
        }
      }
    };
  });
  await page.addScriptTag({ path: path.resolve(__dirname, '../../../capture-utils.js') });
  await page.addScriptTag({ path: path.resolve(__dirname, '../../../capture-content-utils.js') });
  await page.addScriptTag({ path: path.resolve(__dirname, '../../../content-dom.js') });
  await page.addScriptTag({ path: path.resolve(__dirname, '../../../content-transfer.js') });
  await page.addScriptTag({ path: path.resolve(__dirname, '../../../content-capture.js') });
  await page.addScriptTag({ path: path.resolve(__dirname, '../../../content.js') });
}

async function startFullPageCapture(page) {
  return page.evaluate(localizedMessages => new Promise(resolve => {
    globalThis.__captureListener({
      action: 'START_FULL_PAGE_CAPTURE',
      language: 'fr',
      messages: localizedMessages
    }, {}, resolve);
  }), frenchMessages);
}

async function readOpenedCapture(page) {
  await page.waitForFunction(() => Boolean(globalThis.__openedCapture));
  return page.evaluate(() => new Promise((resolve, reject) => {
    const image = new globalThis.Image();
    image.onload = () => resolve({
      width: image.width,
      height: image.height,
      positions: globalThis.__capturePositions,
      visibility: globalThis.__captureVisibility
    });
    image.onerror = reject;
    image.src = globalThis.__openedCapture.dataUrl;
  }));
}

module.exports = { frenchMessages, prepareFullPageHarness, startFullPageCapture, readOpenedCapture };
