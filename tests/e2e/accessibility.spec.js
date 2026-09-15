const path = require('node:path');
const { test, expect, chromium } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

let context;
let extensionId;
const frenchMessages = Object.fromEntries(Object.entries(require('../../_locales/fr/messages.json'))
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
  await page.addScriptTag({ path: path.resolve(__dirname, '../../capture-utils.js') });
  await page.addScriptTag({ path: path.resolve(__dirname, '../../content.js') });
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

test.beforeAll(async () => {
  const extensionPath = path.resolve(__dirname, '../..');
  context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: true,
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`]
  });
  let worker = context.serviceWorkers()[0];
  if (!worker) worker = await context.waitForEvent('serviceworker');
  extensionId = new URL(worker.url()).host;
});

test.afterAll(async () => {
  await context.close();
});

test('popup has an accessible language menu and no serious axe violations', async () => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await expect(page.locator('#txt-full-title')).not.toBeEmpty();
  await expect(page.locator('#txt-scrolling-title')).not.toBeEmpty();
  await page.locator('#language-button').click();
  await expect(page.locator('#language-menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#language-menu')).toBeHidden();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter(item => ['serious', 'critical'].includes(item.impact))).toEqual([]);
});

test('full-page capture assembles a long document and restores its position', async () => {
  const page = await context.newPage();
  await prepareFullPageHarness(page, `<!doctype html><html lang="fr"><title>Longue page</title><style>
    html, body { margin: 0; }
    body { min-height: 2600px; background: linear-gradient(#fff, #dbeafe); }
    header { position: fixed; inset: 0 0 auto; height: 48px; background: #075985; }
  </style><header>En-tête fixe</header><main>Contenu long</main></html>`);
  await page.evaluate(() => globalThis.scrollTo(0, 180));
  await expect.poll(() => page.evaluate(() => Math.round(globalThis.scrollY))).toBe(180);

  expect(await startFullPageCapture(page)).toEqual({ status: 'started' });
  const result = await readOpenedCapture(page);
  expect({ width: result.width, height: result.height }).toEqual({ width: 800, height: 2600 });
  expect(result.positions.map(position => position.windowY)).toEqual([0, 600, 1200, 1800, 2000]);
  expect(result.visibility).toEqual(['', 'hidden', 'hidden', 'hidden', 'hidden']);
  expect(await page.evaluate(() => ({ scrollY: Math.round(globalThis.scrollY), fixed: document.querySelector('header').style.visibility })))
    .toEqual({ scrollY: 180, fixed: '' });
  await page.close();
});

test('full-page capture detects and crops an internal vertical scroll surface', async () => {
  const page = await context.newPage();
  await prepareFullPageHarness(page, `<!doctype html><html lang="fr"><style>
    html, body { width: 100%; height: 600px; margin: 0; overflow: hidden; }
    #app { width: 800px; height: 600px; overflow: auto; }
    #content { height: 2600px; background: linear-gradient(#fff, #dbeafe); }
  </style><div id="app" data-scroll-surface><div id="content"></div></div></html>`);
  await page.evaluate(() => { document.querySelector('#app').scrollTop = 200; });

  expect(await startFullPageCapture(page)).toEqual({ status: 'started' });
  const result = await readOpenedCapture(page);
  expect({ width: result.width, height: result.height }).toEqual({ width: 800, height: 2600 });
  expect(result.positions.map(position => position.surfaceY)).toEqual([0, 600, 1200, 1800, 2000]);
  expect(result.positions.every(position => position.windowY === 0)).toBe(true);
  expect(await page.evaluate(() => document.querySelector('#app').scrollTop)).toBe(200);
  await page.close();
});

test('full-page capture assembles a wide and tall internal scroll surface', async () => {
  const page = await context.newPage();
  await prepareFullPageHarness(page, `<!doctype html><html lang="fr"><style>
    html, body { width: 100%; height: 600px; margin: 0; overflow: hidden; }
    #app { width: 800px; height: 600px; overflow: auto; }
    #content { width: 1600px; height: 1400px; background: linear-gradient(90deg, #fff, #dbeafe); }
  </style><div id="app" data-scroll-surface><div id="content"></div></div></html>`);

  expect(await startFullPageCapture(page)).toEqual({ status: 'started' });
  const result = await readOpenedCapture(page);
  expect({ width: result.width, height: result.height }).toEqual({ width: 1600, height: 1400 });
  expect(result.positions.map(position => [position.surfaceX, position.surfaceY])).toEqual([
    [0, 0], [800, 0], [0, 600], [800, 600], [0, 800], [800, 800]
  ]);
  expect(await page.evaluate(() => {
    const app = document.querySelector('#app');
    return { scrollLeft: app.scrollLeft, scrollTop: app.scrollTop };
  })).toEqual({ scrollLeft: 0, scrollTop: 0 });
  await page.close();
});

test('full-page capture reports when the selected surface cannot scroll', async () => {
  const page = await context.newPage();
  await prepareFullPageHarness(page, `<!doctype html><html lang="fr"><style>
    html, body { width: 100%; height: 600px; margin: 0; overflow: hidden; }
    #app { width: 800px; height: 600px; overflow: auto; }
    #content { height: 1600px; }
  </style><div id="app" data-scroll-surface><div id="content"></div></div></html>`);
  await page.evaluate(() => {
    const app = document.querySelector('#app');
    Object.defineProperty(app, 'scrollTop', {
      configurable: true,
      get() { return 0; },
      set() {}
    });
  });

  const dialogPromise = page.waitForEvent('dialog');
  expect(await startFullPageCapture(page)).toEqual({ status: 'started' });
  const dialog = await dialogPromise;
  expect(dialog.message()).toContain(frenchMessages.fullScrollError);
  await dialog.dismiss();
  expect(await page.evaluate(() => Boolean(globalThis.__openedCapture))).toBe(false);
  await page.close();
});

test('@windows-scaling keeps fractional-DPR geometry and deduplicates sticky headers', async () => {
  const page = await context.newPage();
  await prepareFullPageHarness(page, `<!doctype html><html lang="en"><title>Scaled layout</title><style>
    html, body { margin: 0; }
    html { scrollbar-gutter: stable; }
    ::-webkit-scrollbar { width: 17px; height: 17px; }
    body { min-height: 1800px; font-size: 150%; background: linear-gradient(#fff, #bfdbfe); }
    header { position: sticky; top: 0; height: 64px; background: #111827; color: white; }
  </style><header>Sticky navigation</header><main>Scaled timeline</main></html>`);
  await page.evaluate(() => {
    const original = globalThis.chrome.runtime.sendMessage;
    globalThis.chrome.runtime.sendMessage = (message, callback) => {
      if (message.action !== 'CAPTURE_VISIBLE_TAB') { original(message, callback); return; }
      globalThis.__capturePositions.push({ windowX: Math.round(globalThis.scrollX), windowY: Math.round(globalThis.scrollY), surfaceX: null, surfaceY: null, innerWidth: globalThis.innerWidth, clientWidth: document.scrollingElement.clientWidth, scrollWidth: document.scrollingElement.scrollWidth });
      globalThis.__captureVisibility.push(document.querySelector('header').style.visibility || '');
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(globalThis.innerWidth * 1.25);
      canvas.height = Math.round(globalThis.innerHeight * 1.25);
      canvas.getContext('2d').fillRect(0, 0, canvas.width, canvas.height);
      callback({ success: true, dataUrl: canvas.toDataURL('image/png') });
    };
  });
  const expected = await page.evaluate(() => ({
    width: Math.ceil(Math.max(document.scrollingElement.scrollWidth, document.scrollingElement.clientWidth) * 1.25),
    height: Math.ceil(document.scrollingElement.scrollHeight * 1.25),
    clientWidth: document.documentElement.clientWidth,
    innerWidth: globalThis.innerWidth
  }));
  expect(await startFullPageCapture(page)).toEqual({ status: 'started' });
  const result = await readOpenedCapture(page);
  expect(result.width).toBe(expected.width);
  expect(result.height).toBe(expected.height);
  expect(expected.clientWidth).toBeLessThanOrEqual(expected.innerWidth);
  expect(result.visibility[0]).toBe('');
  expect(result.visibility.slice(1).every(value => value === 'hidden')).toBe(true);
  await page.close();
});

test('scrolling-area capture targets and restores an internal container', async () => {
  const page = await context.newPage();
  await prepareFullPageHarness(page, `<!doctype html><html><style>
    html, body { margin: 0; height: 100%; overflow: hidden; }
    [data-scroll-surface] { position: absolute; left: 40px; top: 80px; width: 300px; height: 300px; overflow: auto; border: 4px solid #111827; }
    .content { width: 300px; height: 1200px; background: linear-gradient(#fff, #60a5fa); }
  </style><div data-scroll-surface><div class="content">Internal timeline</div></div></html>`);
  const response = await page.evaluate(localizedMessages => new Promise(resolve => {
    globalThis.__captureListener({ action: 'START_SCROLLING_ZONE_CAPTURE', language: 'fr', messages: localizedMessages }, {}, resolve);
  }), frenchMessages);
  expect(response).toEqual({ status: 'started' });
  await page.locator('[data-scionos-capture="scrolling-selection"]').click({ position: { x: 100, y: 120 } });
  await page.locator('input[name="x"]').fill('20');
  await page.locator('input[name="y"]').fill('20');
  await page.locator('input[name="width"]').fill('200');
  await page.locator('input[name="height"]').fill('900');
  await page.locator('[data-scionos-capture="scrolling-controls"] button', { hasText: 'Capturer' }).click();
  const result = await readOpenedCapture(page);
  expect({ width: result.width, height: result.height }).toEqual({ width: 200, height: 900 });
  expect(result.positions.map(item => item.surfaceY)).toEqual([20, 320, 620]);
  await expect.poll(() => page.locator('[data-scroll-surface]').evaluate(element => element.scrollTop)).toBe(0);
  await page.close();
});

test('scrolling-area capture targets a chat dock container on a long scrollable page without scrolling background', async () => {
  const page = await context.newPage();
  await prepareFullPageHarness(page, `<!doctype html><html lang="fr"><style>
    html, body { margin: 0; min-height: 3500px; background: linear-gradient(#fff, #cbd5e1); }
    .chat-dock { position: fixed; left: 60px; bottom: 0; width: 320px; height: 460px; background: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: flex; flex-direction: column; }
    .chat-header { height: 48px; background: #0284c7; color: white; padding: 12px; font-weight: bold; flex-shrink: 0; }
    .chat-messages { flex: 1 1 auto; overflow-y: auto; height: 360px; }
    .chat-inner { height: 1600px; background: linear-gradient(#fff, #93c5fd); padding: 10px; }
    .chat-footer { height: 52px; background: #f1f5f9; flex-shrink: 0; }
  </style>
  <main><h1>Page Facebook avec fil d'actualité</h1></main>
  <div class="chat-dock" role="dialog">
    <div class="chat-header">Discussion avec Ami</div>
    <div class="chat-messages" data-scroll-surface><div class="chat-inner">Messages de la conversation...</div></div>
    <div class="chat-footer">Saisir un message...</div>
  </div></html>`);
  const response = await page.evaluate(localizedMessages => new Promise(resolve => {
    globalThis.__captureListener({ action: 'START_SCROLLING_ZONE_CAPTURE', language: 'fr', messages: localizedMessages }, {}, resolve);
  }), frenchMessages);
  expect(response).toEqual({ status: 'started' });

  // Click on the chat dock header (simulating user clicking the top corner of the chat window)
  // Chat dock is at left: 60px, bottom: 0 (viewport 800x600 -> left: 60, top: 140, right: 380, bottom: 600)
  await page.locator('[data-scionos-capture="scrolling-selection"]').click({ position: { x: 100, y: 160 } });
  await page.locator('input[name="x"]').fill('10');
  await page.locator('input[name="y"]').fill('20');
  await page.locator('input[name="width"]').fill('280');
  await page.locator('input[name="height"]').fill('1000');
  await page.locator('[data-scionos-capture="scrolling-controls"] button', { hasText: 'Capturer' }).click();

  const result = await readOpenedCapture(page);
  expect({ width: result.width, height: result.height }).toEqual({ width: 280, height: 1000 });
  // The internal surface was scrolled, NOT the background window!
  expect(result.positions.every(item => item.windowY === 0)).toBe(true);
  expect(result.positions.map(item => item.surfaceY)).toEqual([20, 356, 692]);
  await expect.poll(() => page.locator('[data-scroll-surface]').evaluate(element => element.scrollTop)).toBe(0);
  await page.close();
});

test('zone capture crops a static visible selection', async () => {
  const page = await context.newPage();
  await prepareFullPageHarness(page, `<!doctype html><html lang="fr"><style>
    html, body { margin: 0; min-height: 2000px; background: linear-gradient(#fff, #e2e8f0); }
  </style><main style="padding: 40px;"><h1>Page avec sélection</h1></main></html>`);
  const response = await page.evaluate(localizedMessages => new Promise(resolve => {
    globalThis.__captureListener({ action: 'START_ZONE_CAPTURE', language: 'fr', messages: localizedMessages }, {}, resolve);
  }), frenchMessages);
  expect(response).toEqual({ status: 'started' });

  const overlay = page.locator('[data-scionos-capture="selection"]');
  await expect(overlay).toBeVisible();

  // Drag from (100, 100) to (400, 350)
  await page.mouse.move(100, 100);
  await page.mouse.down();
  await page.mouse.move(400, 350);
  await page.mouse.up();

  const result = await readOpenedCapture(page);
  expect({ width: result.width, height: result.height }).toEqual({ width: 300, height: 250 });
  await page.close();
});

test('scrolling-area overlay supports pointer, keyboard and exact multi-screen capture', async () => {
  const page = await context.newPage();
  await page.setViewportSize({ width: 800, height: 600 });
  await page.setContent(`<!doctype html><html lang="fr"><title>Longue page</title><style>
    body { margin: 0; min-height: 2600px; background: linear-gradient(#fff, #dbeafe); }
    header { position: fixed; inset: 0 0 auto; height: 48px; background: #075985; color: white; }
  </style><header>En-tête fixe</header><main style="padding:80px 20px">Contenu long</main></html>`);
  await page.evaluate(() => {
    globalThis.__captureVisibility = [];
    globalThis.__openedCapture = null;
    globalThis.__transfer = { chunks: [], metadata: null };
    globalThis.__handleCaptureTransfer = (message, callback) => {
      if (message.action === 'BEGIN_CAPTURE_TRANSFER') {
        globalThis.__transfer = { chunks: [], metadata: message };
        callback({ success: true, transferId: 'scroll-transfer' });
      } else if (message.action === 'APPEND_CAPTURE_CHUNK') {
        const binary = globalThis.atob(message.data);
        globalThis.__transfer.chunks[message.index] = Uint8Array.from(binary, character => character.charCodeAt(0));
        callback({ success: true });
      } else if (message.action === 'COMPLETE_CAPTURE_TRANSFER') {
        const reader = new globalThis.FileReader();
        reader.onload = () => {
          globalThis.__openedCapture = Object.assign({}, globalThis.__transfer.metadata, { dataUrl: reader.result });
          callback({ success: true });
        };
        reader.readAsDataURL(new Blob(globalThis.__transfer.chunks, { type: 'image/png' }));
      } else callback({ success: true });
    };
    globalThis.chrome.runtime = {
      onMessage: { addListener(listener) { globalThis.__captureListener = listener; } },
      sendMessage(message, callback) {
        if (message.action === 'CAPTURE_VISIBLE_TAB') {
          globalThis.__captureVisibility.push(document.querySelector('header').style.visibility);
          const canvas = document.createElement('canvas');
          canvas.width = globalThis.innerWidth; canvas.height = globalThis.innerHeight;
          const context2d = canvas.getContext('2d'); context2d.fillStyle = '#ffffff'; context2d.fillRect(0, 0, canvas.width, canvas.height);
          callback({ success: true, dataUrl: canvas.toDataURL('image/png') });
        } else globalThis.__handleCaptureTransfer(message, callback);
      }
    };
  });
  await page.addScriptTag({ path: path.resolve(__dirname, '../../capture-utils.js') });
  await page.addScriptTag({ path: path.resolve(__dirname, '../../content.js') });
  const messages = Object.fromEntries(Object.entries(require('../../_locales/fr/messages.json'))
    .map(([key, value]) => [key, value.message]));
  await page.evaluate(localizedMessages => new Promise(resolve => {
    globalThis.__captureListener({
      action: 'START_SCROLLING_ZONE_CAPTURE',
      language: 'fr',
      messages: localizedMessages
    }, {}, resolve);
  }), messages);

  const overlay = page.locator('[data-scionos-capture="scrolling-selection"]');
  await expect(overlay).toBeVisible();
  const busyResponse = await page.evaluate(localizedMessages => new Promise(resolve => {
    globalThis.__captureListener({
      action: 'START_SCROLLING_ZONE_CAPTURE', messages: localizedMessages
    }, {}, resolve);
  }), messages);
  expect(busyResponse).toEqual({ status: 'busy' });
  await page.mouse.click(80, 300);
  await expect(page.locator('[data-scionos-capture="scrolling-controls"]')).toContainText('Premier point défini');
  await page.locator('[data-scionos-capture="scrolling-controls"] button', { hasText: 'Recommencer' }).click();
  await expect(page.locator('[data-scionos-capture="scrolling-controls"]')).toContainText('premier coin');
  await overlay.focus();
  await page.keyboard.press('PageDown');
  await expect.poll(() => page.evaluate(() => globalThis.scrollY)).toBeGreaterThan(0);
  const axeResults = await new AxeBuilder({ page }).analyze();
  expect(axeResults.violations.filter(item => ['serious', 'critical'].includes(item.impact))).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(overlay).toBeHidden();
  await expect.poll(() => page.evaluate(() => globalThis.scrollY)).toBe(0);

  const captureStart = await page.evaluate(localizedMessages => new Promise(resolve => {
    globalThis.__captureListener({
      action: 'START_SCROLLING_ZONE_CAPTURE', language: 'fr', messages: localizedMessages
    }, {}, resolve);
  }), messages);
  expect(captureStart).toEqual({ status: 'started' });
  await expect(overlay).toBeVisible();

  await page.locator('input[name="x"]').fill('20');
  await page.locator('input[name="y"]').fill('100');
  await page.locator('input[name="width"]').fill('240');
  await page.locator('input[name="height"]').fill('1600');
  await page.locator('[data-scionos-capture="scrolling-controls"] button', { hasText: 'Capturer' }).click();
  await page.waitForFunction(() => Boolean(globalThis.__openedCapture));
  const result = await page.evaluate(() => new Promise((resolve, reject) => {
    const image = new globalThis.Image();
    image.onload = () => resolve({
      width: image.width,
      height: image.height,
      visibility: globalThis.__captureVisibility
    });
    image.onerror = reject;
    image.src = globalThis.__openedCapture.dataUrl;
  }));
  expect(result.width).toBe(240);
  expect(result.height).toBe(1600);
  expect(result.visibility).toEqual(['', 'hidden', 'hidden']);

  await page.evaluate(() => {
    let captureCount = 0;
    globalThis.chrome.runtime.sendMessage = (message, callback) => {
      if (message.action === 'CAPTURE_VISIBLE_TAB') {
        captureCount += 1;
        if (captureCount === 2) {
          callback({ success: false, errorCode: 'TAB_CHANGED', error: 'forced tab change' });
          return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = globalThis.innerWidth;
        canvas.height = globalThis.innerHeight;
        callback({ success: true, dataUrl: canvas.toDataURL('image/png') });
      } else {
        callback({ success: true });
      }
    };
    globalThis.scrollTo(0, 200);
  });
  await expect.poll(() => page.evaluate(() => globalThis.scrollY)).toBe(200);
  const errorCaptureStart = await page.evaluate(localizedMessages => new Promise(resolve => {
    globalThis.__captureListener({
      action: 'START_SCROLLING_ZONE_CAPTURE', language: 'fr', messages: localizedMessages
    }, {}, resolve);
  }), messages);
  expect(errorCaptureStart).toEqual({ status: 'started' });
  await page.locator('input[name="x"]').fill('20');
  await page.locator('input[name="y"]').fill('200');
  await page.locator('input[name="width"]').fill('240');
  await page.locator('input[name="height"]').fill('1000');
  const dialogPromise = page.waitForEvent('dialog');
  await page.locator('[data-scionos-capture="scrolling-controls"] button', { hasText: 'Capturer' }).click();
  const dialog = await dialogPromise;
  expect(dialog.message()).toContain(messages.tabChangedError);
  await dialog.dismiss();
  await expect.poll(() => page.evaluate(() => globalThis.scrollY)).toBe(200);
  await expect(page.locator('header')).toHaveCSS('visibility', 'visible');
  await expect(page.locator('[data-scionos-capture="motion"]')).toHaveCount(0);
});

test('editor empty state remains accessible at a narrow viewport', async () => {
  const page = await context.newPage();
  await page.setViewportSize({ width: 760, height: 720 });
  await page.goto(`chrome-extension://${extensionId}/editor.html`);
  await expect(page.locator('#empty-state')).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter(item => ['serious', 'critical'].includes(item.impact))).toEqual([]);
});

test('editor zoom, crop, undo and redo keep the complete canvas reachable', async () => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/editor.html`);
  await page.evaluate(async () => {
    const source = document.createElement('canvas');
    source.width = 640;
    source.height = 480;
    const sourceContext = source.getContext('2d');
    sourceContext.fillStyle = '#ffffff';
    sourceContext.fillRect(0, 0, 640, 480);
    sourceContext.fillStyle = '#075985';
    sourceContext.fillRect(40, 40, 200, 120);
    const blob = await new Promise(resolve => source.toBlob(resolve, 'image/png'));
    await CaptureStore.putCapture({
      id: 'e2e-capture', blob, title: 'E2E', url: 'https://example.com',
      timestamp: new Date().toISOString(), scale: 1, createdAt: Date.now()
    });
  });
  await page.goto(`chrome-extension://${extensionId}/editor.html?capture=e2e-capture`);
  await expect(page.locator('#main-canvas')).toHaveAttribute('width', '640');
  await page.locator('#zoom-in').click();
  await expect(page.locator('#canvas-container')).toHaveCSS('width', '736px');
  await page.locator('#tool-crop').click();
  await page.locator('#geometry-x').fill('10');
  await page.locator('#geometry-y').fill('10');
  await page.locator('#geometry-width').fill('320');
  await page.locator('#geometry-height').fill('240');
  await page.locator('#geometry-apply').click();
  await expect(page.locator('#main-canvas')).toHaveAttribute('width', '320');
  await page.locator('#btn-undo').click();
  await expect(page.locator('#main-canvas')).toHaveAttribute('width', '640');
  await page.locator('#btn-redo').click();
  await expect(page.locator('#main-canvas')).toHaveAttribute('width', '320');
});
