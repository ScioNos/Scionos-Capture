const path = require('node:path');
const { test, expect, chromium } = require('@playwright/test');
const { frenchMessages, prepareFullPageHarness, startFullPageCapture, readOpenedCapture } = require('./helpers/capture');

async function confirmSelection(page) {
  const adjustment = page.locator('[data-scionos-capture="adjustment"]');
  await expect(adjustment).toBeVisible();
  await adjustment.locator('[data-selection-action="capture"]').click();
}

let context;
let editorUrl;
async function launchExtension(deviceScaleFactor = 1) {
  const extensionPath = path.resolve(__dirname, '../..');
  return chromium.launchPersistentContext('', { channel: 'chromium', headless: true,
    viewport: { width: 800, height: 600 }, deviceScaleFactor,
    args: ['--disable-extensions-except=' + extensionPath, '--load-extension=' + extensionPath] });
}
test.beforeAll(async () => {
  context = await launchExtension();
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  editorUrl = 'chrome-extension://' + new URL(worker.url()).host + '/editor.html';
});
test.afterAll(async () => context.close());

async function useRealPixels(page) {
  await page.exposeFunction('__realCapture', async () => (await page.screenshot({ type: 'png' })).toString('base64'));
  await page.evaluate(() => {
    const previous = globalThis.chrome.runtime.sendMessage;
    globalThis.chrome.runtime.sendMessage = (message, callback) => {
      if (message.action !== 'CAPTURE_VISIBLE_TAB') return previous(message, callback);
      globalThis.__realCapture().then(base64 => {
        globalThis.__lastBitmap = 'data:image/png;base64,' + base64;
        callback({ success: true, dataUrl: globalThis.__lastBitmap });
      }).catch(error => callback({ success: false, error: error.message }));
    };
  });
}
async function startCapture(page, action) {
  return page.evaluate(({ messages, action }) => new Promise(resolve => {
    globalThis.__captureListener({ action, messages, language: 'fr' }, {}, resolve);
  }), { messages: frenchMessages, action });
}
async function redRuns(page, x = 30) {
  return page.evaluate(async x => {
    const image = new globalThis.Image(); image.src = globalThis.__openedCapture.dataUrl; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(x, 0, 1, image.height).data;
    const runs = []; let run = null;
    for (let y = 0; y < image.height; y++) {
      const red = pixels[y * 4] > 240 && pixels[y * 4 + 1] < 10 && pixels[y * 4 + 2] < 10;
      if (red && !run) { run = { y, height: 0 }; runs.push(run); }
      if (red) run.height++; else run = null;
    }
    return runs;
  }, x);
}
async function inspectSolidCapture(page, expectedColor, inset = 0) {
  return page.evaluate(async ({ color, inset }) => {
    const image = new globalThis.Image(); image.src = globalThis.__openedCapture.dataUrl; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let mismatches = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      const x = index / 4 % canvas.width, y = Math.floor(index / 4 / canvas.width);
      if (x < inset || y < inset || x >= canvas.width - inset || y >= canvas.height - inset) continue;
      if (pixels[index] !== color[0] || pixels[index + 1] !== color[1]
          || pixels[index + 2] !== color[2] || pixels[index + 3] !== 255) mismatches += 1;
    }
    return { width: image.width, height: image.height, mismatches };
  }, { color: expectedColor, inset });
}

for (const mode of ['fixed', 'sticky', 'dynamic', 'below-fold']) {
  test('real pixels retain one ' + mode + ' header and the last content band', async () => {
    const page = await context.newPage();
    await prepareFullPageHarness(page, '<!doctype html><style>html,body{margin:0}body{height:2600px;background:#fff}header{height:60px;background:red;position:'
      + (mode === 'dynamic' ? 'absolute' : mode === 'fixed' ? 'fixed' : 'sticky') + ';top:0;width:100%}.spacer{height:'
      + (mode === 'below-fold' ? '800' : '0') + 'px}.end{position:absolute;top:2450px;width:100%;height:50px;background:blue}</style>'
      + '<div class="spacer"></div><header></header><div class="end"></div>'
      + (mode === 'dynamic' ? '<script>addEventListener("scroll",()=>document.querySelector("header").style.position=scrollY>200?"fixed":"absolute")</script>' : ''));
    await useRealPixels(page);
    await startFullPageCapture(page);
    expect(await readOpenedCapture(page)).toMatchObject({ width: 800, height: 2600 });
    expect(await redRuns(page)).toEqual([{ y: mode === 'below-fold' ? 800 : 0, height: 60 }]);
    expect(await page.evaluate(async () => {
      const image = new globalThis.Image(); image.src = globalThis.__openedCapture.dataUrl; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
      return [...ctx.getImageData(30, 2470, 1, 1).data];
    })).toEqual([0, 0, 255, 255]);
    await page.close();
  });
}

test('zero-height fixed portal retains its cookie banner once at the bottom', async () => {
  const page = await context.newPage();
  await prepareFullPageHarness(page, '<style>html,body{margin:0}body{height:2600px;background:white}.portal{position:fixed;bottom:0;width:100%;height:0}.banner{position:absolute;bottom:0;width:100%;height:152px;background:red}</style><div class="portal"><div class="banner"><button>Accepter tous les cookies</button></div></div>');
  await useRealPixels(page);
  await startFullPageCapture(page); await readOpenedCapture(page);
  expect(await redRuns(page, 300)).toEqual([{ y:2448, height:152 }]);
  expect(await page.locator('.banner').evaluate(element => element.style.visibility)).toBe('');
  await page.close();
});

test('scrolling region deduplicates a header that becomes fixed after scrolling', async () => {
  const page = await context.newPage();
  await prepareFullPageHarness(page, '<style>html,body{margin:0}body{height:2600px;background:white}header{position:absolute;top:0;height:60px;width:100%;background:red}</style><header></header><script>addEventListener("scroll",()=>document.querySelector("header").style.position=scrollY>200?"fixed":"absolute")</script>');
  await useRealPixels(page);
  await startCapture(page, 'START_SCROLLING_ZONE_CAPTURE');
  for (const [key, value] of Object.entries({ x: 0, y: 0, width: 400, height: 2000 })) await page.locator('input[name="' + key + '"]').fill(String(value));
  await page.locator('[data-scionos-capture="scrolling-controls"] button', { hasText: 'Capturer' }).click(); await confirmSelection(page);
  await readOpenedCapture(page);
  expect(await redRuns(page)).toEqual([{ y: 0, height: 60 }]);
  await page.close();
});

test('document auto-scroll selection completes and restores its starting position', async () => {
  const page = await context.newPage();
  await prepareFullPageHarness(page, '<style>html,body{margin:0}body{height:2600px;background:white}</style>');
  await startCapture(page, 'START_ZONE_CAPTURE');
  await page.mouse.move(100, 100); await page.mouse.down(); await page.mouse.move(400, 598);
  await expect.poll(() => page.evaluate(() => globalThis.scrollY)).toBeGreaterThan(100);
  await page.mouse.up(); await confirmSelection(page);
  const result = await readOpenedCapture(page);
  expect(result.width).toBe(300); expect(result.height).toBeGreaterThan(598);
  await expect.poll(() => page.evaluate(() => globalThis.scrollY)).toBe(0);
  await page.close();
});

test('selected capture retains real pixels when a feed appends content during capture', async () => {
  const page = await context.newPage();
  await prepareFullPageHarness(page, '<style>html,body{margin:0}body{height:2600px;background:rgb(20,80,160)}</style>');
  await useRealPixels(page);
  await page.evaluate(() => {
    const previous = globalThis.chrome.runtime.sendMessage;
    globalThis.chrome.runtime.sendMessage = (message, callback) => {
      if (message.action === 'CAPTURE_VISIBLE_TAB') document.body.style.height = '5200px';
      return previous(message, callback);
    };
  });
  await startCapture(page, 'START_ZONE_CAPTURE');
  await page.mouse.move(100, 100); await page.mouse.down(); await page.mouse.move(400, 598);
  await expect.poll(() => page.evaluate(() => globalThis.scrollY)).toBeGreaterThan(100);
  await page.mouse.up(); await confirmSelection(page);
  await readOpenedCapture(page);
  const result = await inspectSolidCapture(page, [20, 80, 160]);
  expect(result.width).toBe(300);
  expect(result.height).toBeGreaterThan(598);
  expect(result.mismatches).toBe(0);
  await expect.poll(() => page.evaluate(() => globalThis.scrollY)).toBe(0);
  await page.close();
});

test('element capture picks a block and waits for adjustment confirmation before capturing real pixels', async () => {
  const page = await context.newPage();
  await prepareFullPageHarness(page, '<style>html,body{margin:0;height:600px;background:white}#card{position:absolute;left:100px;top:100px;width:240px;height:180px;background:rgb(20,80,160)}</style><div id="card"></div>');
  await useRealPixels(page);
  expect(await startCapture(page, 'START_ELEMENT_CAPTURE')).toEqual({ status: 'started' });
  await expect(page.locator('[data-scionos-capture="element-selection"]')).toBeVisible();
  await page.mouse.move(180, 180); await page.mouse.click(180, 180);
  const adjustment = page.locator('[data-scionos-capture="adjustment"]');
  await expect(adjustment).toBeVisible();
  await expect(adjustment.locator('input[name="width"]')).toHaveValue('240');
  await expect(adjustment.locator('input[name="height"]')).toHaveValue('180');
  expect(await page.evaluate(() => globalThis.__openedCapture)).toBeNull();
  await confirmSelection(page); await readOpenedCapture(page);
  expect(await inspectSolidCapture(page, [20, 80, 160])).toEqual({ width: 240, height: 180, mismatches: 0 });
  await page.close();
});

test('element capture includes the whole chosen scrolling container', async () => {
  const page = await context.newPage();
  await prepareFullPageHarness(page, '<style>html,body{margin:0;height:600px;background:white}#card{position:absolute;left:100px;top:100px;width:240px;height:180px;overflow:auto}.inside{height:700px;background:rgb(20,80,160)}</style><div id="card" data-scroll-surface><div class="inside"></div></div>');
  await useRealPixels(page);
  await startCapture(page, 'START_ELEMENT_CAPTURE');
  await page.mouse.move(180,180);
  await page.locator('[data-scionos-capture="element-selection"] button', { hasText: frenchMessages.selectionParent }).click();
  await page.locator('[data-scionos-capture="element-selection"] select').selectOption('full');
  await page.locator('[data-scionos-capture="element-selection"] button', { hasText: frenchMessages.selectionCapture }).click();
  await confirmSelection(page); await readOpenedCapture(page);
  const result = await inspectSolidCapture(page, [20,80,160]);
  expect(result.height).toBe(700); expect(result.mismatches).toBe(0);
  await page.close();
});

test('element parent choice survives returning the pointer to its child', async () => {
  const page = await context.newPage();
  await prepareFullPageHarness(page, '<style>html,body{margin:0;height:600px}#card{position:absolute;left:100px;top:100px;width:240px;height:220px}a{display:block;width:80px;height:40px}</style><div id="card"><a href="https://example.com/">Link</a></div>');
  await startCapture(page, 'START_ELEMENT_CAPTURE');
  await page.mouse.move(120,120);
  await page.locator('[data-scionos-capture="element-selection"] button', { hasText:frenchMessages.selectionParent }).click();
  await page.mouse.move(120,120); await page.mouse.click(120,120);
  await expect(page.locator('[data-scionos-capture="adjustment"] input[name="width"]')).toHaveValue('240');
  expect(page.url()).toBe('about:blank');
  await page.keyboard.press('Escape'); await page.close();
});

test('element moved during countdown fails without capturing stale coordinates', async () => {
  const page = await context.newPage();
  await prepareFullPageHarness(page, '<style>html,body{margin:0;height:600px}#card{position:absolute;left:100px;top:100px;width:240px;height:220px}</style><div id="card"></div>');
  await page.evaluate(messages => globalThis.__captureListener({action:'START_ELEMENT_CAPTURE',delaySeconds:3,messages}, {}, () => {}), frenchMessages);
  await page.mouse.move(120,120); await page.mouse.click(120,120); await confirmSelection(page);
  await page.evaluate(()=>{ document.querySelector('#card').style.left='200px'; });
  const alert = page.waitForEvent('dialog');
  const dialog = await alert; expect(dialog.message()).toContain(frenchMessages.elementUnavailable); await dialog.dismiss();
  expect(await page.evaluate(()=>globalThis.__capturePositions.length)).toBe(0);
  await page.close();
});

test('element parent keeps its header when it contains a scrolling descendant', async () => {
  const page = await context.newPage();
  await prepareFullPageHarness(page, '<style>html,body{margin:0;height:600px;background:white}#card{position:absolute;left:100px;top:100px;width:240px;height:220px;background:rgb(20,80,160)}header{height:40px}.list{height:180px;overflow:auto}.inside{height:700px}</style><div id="card"><header></header><div class="list"><div class="inside"></div></div></div>');
  await useRealPixels(page); await startCapture(page, 'START_ELEMENT_CAPTURE');
  await page.mouse.move(150,120);
  await page.locator('[data-scionos-capture="element-selection"] button', { hasText: frenchMessages.selectionParent }).click();
  await page.locator('[data-scionos-capture="element-selection"] button', { hasText: frenchMessages.selectionCapture }).click();
  await expect(page.locator('[data-scionos-capture="adjustment"] input[name="height"]')).toHaveValue('220');
  await confirmSelection(page); await readOpenedCapture(page);
  expect(await inspectSolidCapture(page, [20,80,160])).toEqual({width:240,height:220,mismatches:0});
  await page.close();
});

test('scrolling adjustment locks horizontal geometry while retaining vertical editing', async () => {
  const page = await context.newPage();
  await prepareFullPageHarness(page, '<style>html,body{margin:0}body{height:2000px;background:white}</style>');
  await startCapture(page, 'START_SCROLLING_ZONE_CAPTURE');
  for (const [name,value] of Object.entries({x:100,y:100,width:250,height:900})) await page.locator('[data-scionos-capture="scrolling-controls"] input[name="'+name+'"]').fill(String(value));
  await page.locator('[data-scionos-capture="scrolling-controls"] button[type="submit"]').click();
  const adjustment=page.locator('[data-scionos-capture="adjustment"]');
  await expect(adjustment.locator('input[name="x"]')).toBeDisabled();
  await expect(adjustment.locator('input[name="width"]')).toBeDisabled();
  await expect(adjustment.locator('[data-handle="e"]')).toBeHidden();
  await adjustment.locator('input[name="height"]').fill('800');
  await confirmSelection(page);
  expect(await readOpenedCapture(page)).toMatchObject({width:250,height:800});
  await page.close();
});

test('adjustment dragging accumulates fractional deltas on scaled surfaces', async () => {
  const page = await context.newPage();
  await prepareFullPageHarness(page, '<style>html,body{margin:0;height:600px;background:white}.surface{position:absolute;left:20px;top:20px;width:200px;height:150px;overflow:auto;transform:scale(3);transform-origin:0 0}.inside{height:500px}</style><div class="surface"><div class="inside"></div></div>');
  await page.evaluate(() => {
    globalThis.__adjustment = globalThis.ScionosContentSelection.create({dom:globalThis.ScionosContentDom.create({Utils:globalThis.ScionosCaptureUtils,text:key=>key}),text:key=>key})
      .adjust(globalThis.ScionosContentDom.create({Utils:globalThis.ScionosCaptureUtils,text:key=>key}).getElementScrollSurface(document.querySelector('.surface')), {x:20,y:20,width:50,height:50});
  });
  await page.mouse.move(120,120); await page.mouse.down();
  for(let dx=1;dx<=9;dx++) await page.mouse.move(120+dx,120);
  await page.mouse.up();
  await expect(page.locator('[data-scionos-capture="adjustment"] input[name="x"]')).toHaveValue('23');
  await page.locator('[data-selection-action="cancel"]').click();
  await page.close();
});

test('delayed visible capture waits before acquisition and rejects unsupported delays', async () => {
  const page = await context.newPage();
  await prepareFullPageHarness(page, '<style>body{background:white}</style>');
  const started = Date.now();
  await page.evaluate(messages => globalThis.__captureListener({action:'START_VISIBLE_CAPTURE',delaySeconds:3,messages}, {}, () => {}), frenchMessages);
  expect(await page.evaluate(() => globalThis.__capturePositions.length)).toBe(0);
  await readOpenedCapture(page);
  expect(Date.now()-started).toBeGreaterThanOrEqual(2900);
  await page.evaluate(messages => { globalThis.__openedCapture=null; globalThis.__captureListener({action:'START_VISIBLE_CAPTURE',delaySeconds:999,messages}, {}, () => {}); }, frenchMessages);
  await readOpenedCapture(page);
  await expect(page.locator('[data-scionos-capture="progress"]')).toHaveCount(0);
  await page.close();
});

test('inner-surface text is collected in surface coordinates and covered text is omitted', async () => {
  const page = await context.newPage();
  await prepareFullPageHarness(page, '<style>html,body{margin:0;height:600px;overflow:hidden}.app{position:absolute;left:100px;top:80px;width:300px;height:300px;overflow:auto}.content{height:1200px;position:relative}p{position:absolute;margin:0;left:10px}.cover{position:absolute;top:110px;left:10px;width:200px;height:30px;background:white;z-index:5;pointer-events:none}</style><div class="app" data-scroll-surface><div class="content"><p style="top:10px">FIRST_PUBLIC</p><p style="top:110px">OCCLUDED_SECRET</p><div class="cover"></div><p style="top:1010px">LAST_PUBLIC</p></div></div>');
  await startFullPageCapture(page); await readOpenedCapture(page);
  const capture = await page.evaluate(() => globalThis.__openedCapture);
  expect(capture.textCoordinateSpace).toBe('bitmap');
  expect(capture.textLayerLimited).toBe(true);
  expect(capture.textBlocks.map(block => block.text)).toEqual(['FIRST_PUBLIC', 'LAST_PUBLIC']);
  expect(capture.textBlocks[0].x).toBeCloseTo(10); expect(capture.textBlocks[1].y).toBeGreaterThan(1000);
  await page.close();
});

for (const dpr of [1, 1.25, 1.5, 2]) {
  test('@windows-scaling real visible and selected pixels keep text aligned at DPR ' + dpr, async () => {
    const scaled = await launchExtension(dpr);
    const page = await scaled.newPage();
    try {
      await prepareFullPageHarness(page, '<style>html,body{margin:0;background:white}p{position:absolute;left:150px;top:130px;margin:0}</style><p>PUBLIC_DPR</p>');
      await useRealPixels(page);
      await startCapture(page, 'START_VISIBLE_CAPTURE'); await readOpenedCapture(page);
      const visible = await page.evaluate(() => globalThis.__openedCapture);
      expect(visible.textBlocks[0].x).toBeCloseTo(150 * dpr);
      expect(await page.evaluate(async () => {
        const pixels = async src => {
          const image = new globalThis.Image(); image.src = src; await image.decode();
          const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
          const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0); return ctx.getImageData(0, 0, image.width, image.height).data;
        };
        const a = await pixels(globalThis.__lastBitmap), b = await pixels(globalThis.__openedCapture.dataUrl);
        return a.length === b.length && a.every((value, i) => value === b[i]);
      })).toBe(true);
      await page.evaluate(() => { globalThis.__openedCapture = null; });
      await startCapture(page, 'START_ZONE_CAPTURE');
      await page.mouse.move(100, 100); await page.mouse.down(); await page.mouse.move(400, 300); await page.mouse.up(); await confirmSelection(page);
      expect(await readOpenedCapture(page)).toMatchObject({ width: Math.round(300 * dpr), height: Math.round(200 * dpr) });
      const selected = await page.evaluate(() => globalThis.__openedCapture);
      expect(selected.textBlocks[0].x).toBeCloseTo(50 * dpr);
    } finally { await scaled.close(); }
  });
}

async function seedEditor(page, { id = 'reliability-' + require('node:crypto').randomUUID(), width = 1000, height = 400, url = 'https://example.com', textBlocks = [], textCoordinateSpace = 'bitmap', textLayerLimited = false } = {}) {
  await page.goto(editorUrl);
  await page.evaluate(async data => {
    const canvas = document.createElement('canvas'); canvas.width = data.width; canvas.height = data.height;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = 'white'; ctx.fillRect(0, 0, data.width, data.height);
    ctx.fillStyle = 'black'; ctx.font = '18px sans-serif';
    for (const block of data.textBlocks) ctx.fillText(block.text, block.x, block.y + 18);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const createdAt = Date.now();
    await CaptureStore.putCapture({ ...data, blob, createdAt, expiresAt: createdAt + 5 * 60_000,
      timestamp: new Date(createdAt).toISOString(), title: 'Regression', scale: 1 });
  }, { id, width, height, url, textBlocks, textCoordinateSpace, textLayerLimited });
  await page.goto(editorUrl + '?capture=' + id);
  await expect(page.locator('#main-canvas')).toHaveAttribute('width', String(width));
  await expect(page.locator('#tool-text')).toBeEnabled();
  return id;
}
async function applyRectangle(page, tool, rect) {
  await page.locator('#tool-' + tool).click();
  if (tool === 'censor') {
    await page.locator('#censor-type').selectOption('color');
    await page.locator('#censor-color').evaluate(input => { input.value = '#000000'; input.dispatchEvent(new globalThis.Event('input', { bubbles: true })); });
  }
  for (const [key, value] of Object.entries(rect)) await page.locator('#geometry-' + key).fill(String(value));
  await page.locator('#geometry-apply').click();
}
async function printText(page) {
  await page.evaluate(() => { globalThis.print = () => {}; document.getElementById('print-area').innerHTML = ''; });
  await page.locator('#btn-pdf').click();
  await expect(page.locator('#print-area img').first()).toHaveAttribute('src', /^blob:/);
  await page.evaluate(async () => { await Promise.all([...document.querySelectorAll('#print-area img')].map(image => image.decode())); });
  const pdf = await page.pdf({ format: 'A4', printBackground: true });
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({ data: new Uint8Array(pdf), isEvalSupported: false, useSystemFonts: true });
  const document = await task.promise;
  try {
    let text = '';
    for (let i = 1; i <= document.numPages; i++) text += (await (await document.getPage(i)).getTextContent()).items.map(item => item.str || '').join(' ') + '\n';
    return text;
  } finally { await task.destroy(); }
}
async function drawFilledRectangle(page, rect) {
  await page.locator('#tool-shape').click();
  await page.locator('#shape-type').selectOption('rect');
  await page.locator('#shape-fill-mode').selectOption('fill');
  await page.locator('#shape-color').evaluate(input => {
    input.value = '#000000';
    input.dispatchEvent(new globalThis.Event('input', { bubbles: true }));
  });
  const canvas = page.locator('#main-canvas');
  const box = await canvas.boundingBox();
  const size = await canvas.evaluate(element => ({ width: element.width, height: element.height }));
  const start = { x: box.x + rect.x / size.width * box.width, y: box.y + rect.y / size.height * box.height };
  const end = { x: box.x + rect.right / size.width * box.width, y: box.y + rect.bottom / size.height * box.height };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y);
  await page.mouse.up();
  await expect(page.locator('#btn-undo')).toBeEnabled();
}

test('long source URLs cannot expand the editor grid or move the image offscreen', async () => {
  const page = await context.newPage(); await page.setViewportSize({ width: 1907, height: 891 });
  await seedEditor(page, { width: 1871, height: 2622, url: 'https://example.com/?tracking=' + 'x'.repeat(1800) });
  const bounds = await page.locator('#main-canvas').boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(1907);
  expect(await page.locator('#workspace').evaluate(element => element.clientWidth)).toBe(1907);
  await page.close();
});

test('text entry stays focused, native undo preserves image history, and redo advances steps', async () => {
  const page = await context.newPage(); await seedEditor(page);
  await page.locator('#tool-text').click(); await page.locator('#main-canvas').click({ position: { x: 100, y: 100 } });
  await expect(page.locator('#text-input-overlay')).toBeVisible(); await expect(page.locator('#text-input-overlay')).toBeFocused();
  await page.keyboard.type('ANNOTATION'); await page.keyboard.press('Enter');
  await expect(page.locator('#btn-undo')).toBeEnabled();
  await applyRectangle(page, 'crop', { x: 100, y: 0, width: 300, height: 200 });
  await page.locator('#tool-text').click(); await page.locator('#main-canvas').click({ position: { x: 50, y: 50 } });
  await page.keyboard.type('EDIT_ME'); await page.keyboard.press('Control+z');
  await expect(page.locator('#main-canvas')).toHaveAttribute('width', '300');
  await expect(page.locator('#text-input-overlay')).toHaveValue(''); await page.keyboard.press('Escape');
  await page.locator('#tool-step').click(); await page.locator('#main-canvas').click({ position: { x: 50, y: 50 } });
  await page.locator('#btn-undo').click(); await page.locator('#btn-redo').click();
  await expect(page.locator('#step-counter-badge')).toContainText('2');
  await page.locator('#main-canvas').click({ position: { x: 100, y: 50 } });
  await expect(page.locator('#step-counter-badge')).toContainText('3');
  await page.close();
});

test('a delayed history consolidation cannot restore an undone operation', async () => {
  const page = await context.newPage(); await seedEditor(page, { width: 400, height: 300 });
  await page.evaluate(() => {
    const original = globalThis.createImageBitmap;
    globalThis.createImageBitmap = async (...args) => {
      const bitmap = await original(...args);
      if (args[0] instanceof globalThis.HTMLCanvasElement) {
        globalThis.__flattenPending = true;
        await new Promise(resolve => { globalThis.__releaseFlatten = resolve; });
      }
      return bitmap;
    };
  });
  await page.locator('#tool-step').click();
  await page.locator('#main-canvas').evaluate(canvas => {
    for (let i = 0; i < 100; i++) canvas.dispatchEvent(new globalThis.PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: canvas.getBoundingClientRect().left + 50, clientY: canvas.getBoundingClientRect().top + 50 }));
  });
  await page.waitForFunction(() => globalThis.__flattenPending);
  await page.locator('#btn-undo').click();
  await page.evaluate(() => globalThis.__releaseFlatten());
  await expect(page.locator('#btn-redo')).toBeEnabled();
  await expect(page.locator('#btn-undo')).toBeEnabled();
  await expect(page.locator('#step-counter-badge')).toContainText('100');
  // Finish one valid consolidation and verify the buttons reflect the empty history.
  await page.locator('#btn-redo').click();
  await page.waitForFunction(() => globalThis.__flattenPending);
  await page.evaluate(() => globalThis.__releaseFlatten());
  await expect(page.locator('#btn-undo')).toBeDisabled(); await expect(page.locator('#btn-redo')).toBeDisabled();
  await page.close();
});

for (const dpr of [1, 1.25, 1.5, 2]) {
  test('generated PDF excludes masked text after crop and undo/redo at scale ' + dpr, async () => {
    const page = await context.newPage();
    const blocks = [
      { text: 'SECRET_MASK', x: 100 * dpr, y: 100 * dpr, width: 150 * dpr, height: 24 * dpr, fontSize: 18 * dpr },
      { text: 'PUBLIC_KEEP', x: 300 * dpr, y: 100 * dpr, width: 140 * dpr, height: 24 * dpr, fontSize: 18 * dpr }
    ];
    await seedEditor(page, { width: 1000 * dpr, height: 400 * dpr, textBlocks: blocks });
    await applyRectangle(page, 'censor', { x: 90 * dpr, y: 90 * dpr, width: 170 * dpr, height: 50 * dpr });
    await page.locator('#btn-undo').click(); await page.locator('#btn-redo').click();
    await applyRectangle(page, 'crop', { x: 80 * dpr, y: 80 * dpr, width: 400 * dpr, height: 150 * dpr });
    expect(await page.locator('#main-canvas').evaluate((canvas, dpr) => [...canvas.getContext('2d').getImageData(Math.round(50 * dpr), Math.round(30 * dpr), 1, 1).data], dpr)).toEqual([0, 0, 0, 255]);
    const text = await printText(page);
    expect(text).toContain('PUBLIC_KEEP'); expect(text).not.toContain('SECRET_MASK');
    await page.close();
  });
}

test('generated PDF excludes outside and partially cropped words through repeated crops', async () => {
  const page = await context.newPage();
  await seedEditor(page, { textBlocks: [
    { text: 'OUTSIDE_SECRET', x: 100, y: 20, width: 160, height: 24, fontSize: 18 },
    { text: 'PARTIAL_SECRET', x: 680, y: 20, width: 160, height: 24, fontSize: 18 },
    { text: 'PUBLIC_KEEP', x: 740, y: 100, width: 140, height: 24, fontSize: 18 }
  ] });
  await applyRectangle(page, 'crop', { x: 700, y: 0, width: 200, height: 200 });
  await page.locator('#btn-undo').click(); await page.locator('#btn-redo').click();
  await applyRectangle(page, 'crop', { x: 20, y: 80, width: 180, height: 100 });
  const text = await printText(page);
  expect(text).toContain('PUBLIC_KEEP'); expect(text).not.toContain('OUTSIDE_SECRET'); expect(text).not.toContain('PARTIAL_SECRET');
  await page.close();
});

test('legacy captures with unverified text coordinates export an image-only PDF', async () => {
  const page = await context.newPage();
  await seedEditor(page, { textCoordinateSpace: null, textBlocks: [{ text: 'LEGACY_SECRET', x: 100, y: 100, width: 140, height: 24 }] });
  await expect(page.locator('#capture-notice')).not.toBeEmpty();
  expect(await printText(page)).not.toContain('LEGACY_SECRET');
  await page.close();
});


test('real two-dimensional assembly preserves every color band across final overlapping tiles', async () => {
  const page = await context.newPage();
  let html = '<style>html,body{margin:0;width:1600px;height:1400px}div{position:absolute;width:100px;height:100px}</style>';
  for (let y = 0; y < 14; y++) for (let x = 0; x < 16; x++) html += '<div style="left:' + x * 100 + 'px;top:' + y * 100 + 'px;background:rgb(' + x * 13 + ',' + y * 17 + ',90)"></div>';
  await prepareFullPageHarness(page, html); await useRealPixels(page); await startFullPageCapture(page); await readOpenedCapture(page);
  const colors = await page.evaluate(async () => {
    const image = new globalThis.Image(); image.src = globalThis.__openedCapture.dataUrl; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0); const colors = [];
    for (let y = 0; y < 14; y++) for (let x = 0; x < 16; x++) colors.push([...ctx.getImageData(x * 100 + 50, y * 100 + 50, 1, 1).data]);
    return colors;
  });
  const expected = [];
  for (let y = 0; y < 14; y++) for (let x = 0; x < 16; x++) expected.push([x * 13, y * 17, 90, 255]);
  expect(colors).toEqual(expected); await page.close();
});

test('text metadata follows an actual canvas dimension reduction', async () => {
  const page = await context.newPage(); await prepareFullPageHarness(page, '<p>Preparation</p>');
  const result = await page.evaluate(async () => {
    const source = document.createElement('canvas'); source.width = 20000; source.height = 10;
    const transfer = globalThis.ScionosContentTransfer.create({ Utils: globalThis.ScionosCaptureUtils, text: key => key });
    const prepared = await transfer.prepareCanvasForEditor(source, 1, [{ text: 'PUBLIC', x: 19000, y: 2, width: 100, height: 4, fontSize: 4 }]);
    const image = await globalThis.createImageBitmap(prepared.blob);
    return { width: image.width, height: image.height, block: prepared.textBlocks[0] };
  });
  expect(result.width).toBe(16384); expect(result.block.x).toBeCloseTo(19000 * result.width / 20000);
  expect(result.block.height).toBeCloseTo(4 * result.height / 10); await page.close();
});

test('covered and transparent DOM secrets are absent from the generated PDF', async () => {
  const page = await context.newPage();
  await prepareFullPageHarness(page, '<style>html,body{margin:0;background:white}p{position:absolute;left:50px;margin:0}.cover{position:absolute;left:50px;top:100px;width:250px;height:30px;background:white;pointer-events:none}</style><p style="top:40px">PUBLIC_VISIBLE</p><p style="top:100px">SECRET_OCCLUDED</p><div class="cover"></div><p style="top:180px;color:transparent">SECRET_TRANSPARENT</p>');
  await useRealPixels(page); await startCapture(page, 'START_VISIBLE_CAPTURE'); await readOpenedCapture(page);
  const capture = await page.evaluate(() => globalThis.__openedCapture);
  expect(capture.textBlocks.map(b => b.text)).toEqual(['PUBLIC_VISIBLE']);
  await seedEditor(page, { width: 800, height: 600, textBlocks: capture.textBlocks, textLayerLimited: capture.textLayerLimited });
  const text = await printText(page);
  expect(text).toContain('PUBLIC_VISIBLE'); expect(text).not.toContain('SECRET_OCCLUDED'); expect(text).not.toContain('SECRET_TRANSPARENT');
  await page.close();
});

test('filled opaque shapes remove covered text from searchable PDFs across undo and redo', async () => {
  const page = await context.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });
  const secret = 'SECRET_SHAPE_PDF_7319';
  const visible = 'PUBLIC_SHAPE_PDF';
  await seedEditor(page, { width: 800, height: 600, textBlocks: [
    { x: 60, y: 60, width: 240, height: 30, text: secret, fontSize: 18 },
    { x: 60, y: 150, width: 240, height: 30, text: visible, fontSize: 18 }
  ] });
  await drawFilledRectangle(page, { x: 50, y: 50, right: 350, bottom: 110 });
  const coveredPixel = await page.locator('#main-canvas').evaluate(canvas =>
    [...canvas.getContext('2d').getImageData(100, 80, 1, 1).data].slice(0, 3));
  expect(coveredPixel).toEqual([0, 0, 0]);
  const maskedText = await printText(page);
  expect(maskedText).not.toContain(secret);
  expect(maskedText).toContain(visible);

  await page.locator('#btn-undo').click();
  const undoneText = await printText(page);
  expect(undoneText).toContain(secret);
  expect(undoneText).toContain(visible);

  await page.locator('#btn-redo').click();
  const redoneText = await printText(page);
  expect(redoneText).not.toContain(secret);
  expect(redoneText).toContain(visible);
  await page.close();
});

for (const dpr of [1.25, 1.5]) {
  test('full-page and scrolling captures have no uncovered edge pixels at DPR ' + dpr, async () => {
    const scaled = await launchExtension(dpr);
    const page = await scaled.newPage();
    const color = [30, 120, 210];
    try {
      await prepareFullPageHarness(page, '<style>html,body{margin:0;width:1703px;height:1109px;background:rgb(30,120,210)}</style>');
      await useRealPixels(page);
      await startFullPageCapture(page);
      const fullPage = await readOpenedCapture(page);
      expect(fullPage).toMatchObject({ width: Math.ceil(1703 * dpr), height: Math.ceil(1109 * dpr) });
      expect(await inspectSolidCapture(page, color)).toMatchObject({ mismatches: 0 });

      await page.evaluate(() => { globalThis.__openedCapture = null; });
      await startCapture(page, 'START_SCROLLING_ZONE_CAPTURE');
      for (const [key, value] of Object.entries({ x: 0, y: 0, width: 800, height: 1109 })) {
        await page.locator('input[name="' + key + '"]').fill(String(value));
      }
      await page.locator('[data-scionos-capture="scrolling-controls"] button', { hasText: 'Capturer' }).click(); await confirmSelection(page);
      const scrolling = await readOpenedCapture(page);
      expect(scrolling).toMatchObject({ width: Math.ceil(800 * dpr), height: Math.ceil(1109 * dpr) });
      expect(await inspectSolidCapture(page, color)).toMatchObject({ mismatches: 0 });
    } finally { await scaled.close(); }
  });
}

test('an open capture remains mapped and loadable after its service worker restarts', async () => {
  const page = await context.newPage();
  const captureId = await seedEditor(page, { id: 'worker-restart-' + require('node:crypto').randomUUID(), width: 240, height: 120 });
  const tabId = await page.evaluate(() => new Promise(resolve => globalThis.chrome.tabs.getCurrent(tab => resolve(tab.id))));
  expect(Number.isInteger(tabId)).toBe(true);
  const initialContextId = await page.evaluate(async () =>
    (await globalThis.chrome.runtime.getContexts({ contextTypes: ['BACKGROUND'] }))[0]?.contextId);
  expect(initialContextId).toBeTruthy();
  const initialWorker = context.serviceWorkers()[0];
  expect(initialWorker).toBeTruthy();
  await initialWorker.evaluate(async ({ id, tab }) => {
    await globalThis.chrome.storage.session.set({ ['capture-tab:' + tab]: id });
    await globalThis.chrome.alarms.create('capture-expiry:' + id, { when: Date.now() + 60_000 });
  }, { id: captureId, tab: tabId });

  const browserCDP = await context.browser().newBrowserCDPSession();
  const { targetInfos } = await browserCDP.send('Target.getTargets');
  const workerTarget = targetInfos.find(target => target.type === 'service_worker' && target.url === initialWorker.url());
  expect(workerTarget).toBeTruthy();
  const closeResult = await browserCDP.send('Target.closeTarget', { targetId: workerTarget.targetId });
  expect(closeResult.success).toBe(true);
  const acknowledgement = await page.evaluate(id => new Promise(resolve => {
    globalThis.chrome.runtime.sendMessage({ action: 'ACK_CAPTURE_LOADED', captureId: id }, resolve);
  }), captureId);
  expect(acknowledgement).toEqual({ success: true });
  const state = await page.evaluate(async ({ id, tab }) => {
    const mapping = await globalThis.chrome.storage.session.get('capture-tab:' + tab);
    const alarm = await globalThis.chrome.alarms.get('capture-expiry:' + id);
    return { captureId: mapping['capture-tab:' + tab], expiryScheduled: Boolean(alarm), recordExists: Boolean(await CaptureStore.getCapture(id)) };
  }, { id: captureId, tab: tabId });
  expect(state).toEqual({ captureId, expiryScheduled: false, recordExists: true });
  const restartedContextId = await page.evaluate(async () =>
    (await globalThis.chrome.runtime.getContexts({ contextTypes: ['BACKGROUND'] }))[0]?.contextId);
  expect(restartedContextId).not.toBe(initialContextId);

  await page.reload();
  await expect(page.locator('#main-canvas')).toHaveAttribute('width', '240');
  await expect(page.locator('#tool-text')).toBeEnabled();
  await browserCDP.detach();
  await page.close();
});


test('wide sticky headers retain both columns and appear only on the first row', async () => {
  const page = await context.newPage();
  await prepareFullPageHarness(page, '<style>html,body{margin:0;width:1600px;height:1400px;background:white}header{position:sticky;top:0;width:1600px;height:60px;background:linear-gradient(to right,red 0%,red 50%,blue 50%,blue 100%)}</style><header></header>');
  await useRealPixels(page); await startFullPageCapture(page); await readOpenedCapture(page);
  expect(await redRuns(page, 30)).toEqual([{ y: 0, height: 60 }]);
  const pixels = await page.evaluate(async () => {
    const image = new globalThis.Image(); image.src = globalThis.__openedCapture.dataUrl; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
    return [20, 620, 820].map(y => [...ctx.getImageData(1200, y, 1, 1).data]);
  });
  expect(pixels).toEqual([[0, 0, 255, 255], [255, 255, 255, 255], [255, 255, 255, 255]]);
  await page.close();
});


test('PDF text remains censored after a successful history consolidation', async () => {
  const page = await context.newPage();
  await seedEditor(page, { width: 400, height: 300, textBlocks: [
    { text: 'SECRET_FLATTEN', x: 100, y: 100, width: 150, height: 24, fontSize: 18 },
    { text: 'PUBLIC_KEEP', x: 20, y: 200, width: 140, height: 24, fontSize: 18 }
  ] });
  await applyRectangle(page, 'censor', { x: 90, y: 90, width: 170, height: 50 });
  await page.locator('#tool-step').click();
  await page.locator('#main-canvas').evaluate(canvas => {
    const rect = canvas.getBoundingClientRect();
    for (let i = 0; i < 99; i++) canvas.dispatchEvent(new globalThis.PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: rect.left + 300, clientY: rect.top + 250 }));
  });
  await expect(page.locator('#btn-undo')).toBeDisabled();
  const text = await printText(page);
  expect(text).toContain('PUBLIC_KEEP'); expect(text).not.toContain('SECRET_FLATTEN');
  await page.close();
});

test('undo during asynchronous PDF encoding cannot mix masked pixels with original text', async () => {
  const page = await context.newPage();
  await seedEditor(page, { textBlocks: [
    { text: 'SECRET_ASYNC', x: 100, y: 100, width: 150, height: 24, fontSize: 18 },
    { text: 'PUBLIC_KEEP', x: 300, y: 100, width: 140, height: 24, fontSize: 18 }
  ] });
  await applyRectangle(page, 'censor', { x: 90, y: 90, width: 170, height: 50 });
  await page.evaluate(() => {
    globalThis.print = () => {};
    const original = globalThis.HTMLCanvasElement.prototype.toBlob;
    globalThis.HTMLCanvasElement.prototype.toBlob = function (callback, ...args) {
      original.call(this, blob => { globalThis.__releasePdfEncoding = () => callback(blob); }, ...args);
    };
  });
  await page.locator('#btn-pdf').evaluate(button => button.click());
  await page.waitForFunction(() => globalThis.__releasePdfEncoding);
  await page.locator('#btn-undo').click();
  await page.evaluate(() => globalThis.__releasePdfEncoding());
  await expect(page.locator('#print-area img').first()).toHaveAttribute('src', /^blob:/);
  expect(await page.locator('.searchable-text-layer').textContent()).toContain('PUBLIC_KEEP');
  expect(await page.locator('.searchable-text-layer').textContent()).not.toContain('SECRET_ASYNC');
  await page.close();
});

test('descendant covers cannot leak text into a generated PDF', async () => {
  const page = await context.newPage();
  await prepareFullPageHarness(page, '<style>html,body{margin:0;background:white}p{position:absolute;left:50px;margin:0}.cover{position:absolute;inset:0;background:white}</style><p style="top:40px">PUBLIC_DESCENDANT</p><p style="top:100px">SECRET_CHILD_NONE<span class="cover" style="pointer-events:none"></span></p><p style="top:180px">SECRET_CHILD_AUTO<span class="cover"></span></p>');
  await useRealPixels(page); await startCapture(page, 'START_VISIBLE_CAPTURE'); await readOpenedCapture(page);
  const capture = await page.evaluate(() => globalThis.__openedCapture);
  expect(capture.textBlocks.map(block => block.text)).toEqual(['PUBLIC_DESCENDANT']);
  await seedEditor(page, { width:800, height:600, textBlocks:capture.textBlocks });
  const text = await printText(page);
  expect(text).toContain('PUBLIC_DESCENDANT'); expect(text).not.toContain('SECRET_CHILD');
  await page.close();
});

test('fast freehand masks cover every segment and single clicks across undo and redo', async () => {
  const page = await context.newPage(); await page.setViewportSize({width:1400,height:900});
  await seedEditor(page, {width:400,height:250,textBlocks:[{text:'SECRET_FREE_SEGMENT',x:100,y:90,width:170,height:24,fontSize:18}]});
  await page.locator('#tool-censor').click(); await page.locator('#censor-type').selectOption('color'); await page.locator('#censor-shape').selectOption('free');
  const canvas = page.locator('#main-canvas'); const box = await canvas.boundingBox();
  const point = (x,y) => ({x:box.x+x/400*box.width,y:box.y+y/250*box.height});
  const start = point(30,100), end = point(330,100);
  await page.mouse.move(start.x,start.y); await page.mouse.down(); await page.mouse.move(end.x,end.y); await page.mouse.up();
  const pixel = () => canvas.evaluate(c => [...c.getContext('2d').getImageData(180,100,1,1).data]);
  expect(await pixel()).toEqual([0,0,0,255]); expect(await printText(page)).not.toContain('SECRET_FREE_SEGMENT');
  await page.locator('#btn-undo').click(); expect(await printText(page)).toContain('SECRET_FREE_SEGMENT');
  await page.locator('#btn-redo').click(); expect(await pixel()).toEqual([0,0,0,255]);
  const click=point(30,200); await page.mouse.click(click.x,click.y);
  expect(await canvas.evaluate(c => [...c.getContext('2d').getImageData(30,200,1,1).data])).toEqual([0,0,0,255]);
  await page.close();
});

test('all exports reject a pending mask without cancelling the preview', async () => {
  const page = await context.newPage(); await seedEditor(page);
  await page.locator('#tool-censor').click(); await page.locator('#geometry-x').fill('30');
  await page.evaluate(() => {
    globalThis.__exportCalls=0;
    const original=globalThis.HTMLCanvasElement.prototype.toBlob;
    globalThis.HTMLCanvasElement.prototype.toBlob=function(...args){globalThis.__exportCalls++;return original.apply(this,args);};
    globalThis.print=()=>{globalThis.__exportCalls++;};
  });
  for(const id of ['btn-download','btn-html','btn-copy','btn-pdf']) {
    await page.locator('#'+id).click();
    await expect(page.locator('#toast')).toContainText(/Appliquez ou annulez|Apply or cancel/);
    await expect(page.locator('#geometry-panel')).toBeVisible();
  }
  expect(await page.evaluate(()=>globalThis.__exportCalls)).toBe(0);
  await page.locator('#geometry-cancel').click();
  await page.locator('#btn-pdf').click();
  await expect(page.locator('#print-area img')).toHaveAttribute('src',/^blob:/);
  await page.close();
});

test('horizontal selected capture retains its last color band without stretching', async () => {
  const page = await context.newPage();
  await prepareFullPageHarness(page,'<style>html,body{margin:0;width:1600px;height:600px;background:linear-gradient(to right,red 0px,red 400px,lime 400px,lime 800px,blue 800px,blue 1200px,yellow 1200px)}</style>');
  await useRealPixels(page); await startCapture(page,'START_ZONE_CAPTURE');
  await page.mouse.move(50,100); await page.mouse.down(); await page.mouse.move(798,300);
  await expect.poll(()=>page.evaluate(()=>globalThis.scrollX)).toBeGreaterThan(500); await page.mouse.up(); await confirmSelection(page);
  const capture=await readOpenedCapture(page); expect(capture.width).toBeGreaterThan(1200); expect(capture.height).toBe(200);
  const pixels=await page.evaluate(async()=>{
    const image=new globalThis.Image();image.src=globalThis.__openedCapture.dataUrl;await image.decode();
    const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
    return [100,500,900,1200].map(x=>[...ctx.getImageData(x,100,1,1).data]);
  });
  expect(pixels).toEqual([[255,0,0,255],[0,255,0,255],[0,0,255,255],[255,255,0,255]]);
  await expect.poll(()=>page.evaluate(()=>globalThis.scrollX)).toBe(0); await page.close();
});

test('inner auto-scroll moves up and down at its own edges without scrolling the page',async()=>{
  const page=await context.newPage();
  await prepareFullPageHarness(page,'<style>html,body{margin:0;height:1000px}.app{position:absolute;left:100px;top:100px;width:400px;height:250px;overflow:auto}.inner{height:1000px}</style><div class="app" data-scroll-surface><div class="inner"></div></div>');
  await page.evaluate(()=>{document.querySelector('.app').scrollTop=300;});
  await startCapture(page,'START_ZONE_CAPTURE');await page.mouse.move(200,200);await page.mouse.down();await page.mouse.move(300,103);
  await expect.poll(()=>page.evaluate(()=>document.querySelector('.app').scrollTop)).toBeLessThan(200);
  await page.mouse.move(300,348);await expect.poll(()=>page.evaluate(()=>document.querySelector('.app').scrollTop)).toBeGreaterThan(500);
  expect(await page.evaluate(()=>globalThis.scrollY)).toBe(0);await page.mouse.up(); await confirmSelection(page);await readOpenedCapture(page);
  await expect.poll(()=>page.evaluate(()=>document.querySelector('.app').scrollTop)).toBe(300);await page.close();
});

test('vertical scrolling selection freezes its horizontal origin after the first point',async()=>{
  const page=await context.newPage();await prepareFullPageHarness(page,'<style>html,body{margin:0;width:1600px;height:1200px}</style>');
  await startCapture(page,'START_SCROLLING_ZONE_CAPTURE');await page.mouse.click(100,200);await page.mouse.move(200,400);await page.mouse.wheel(300,0);
  expect(await page.evaluate(()=>globalThis.scrollX)).toBe(0);
  await expect(page.locator('input[name="x"]')).toHaveValue('100');await expect(page.locator('input[name="width"]')).toHaveValue('100');
  await page.keyboard.press('Escape');await page.close();
});

test('a footer taller than the final strip is fully retained once',async()=>{
  const page=await context.newPage();await prepareFullPageHarness(page,'<style>html,body{margin:0;height:650px;background:white}footer{position:fixed;bottom:0;width:100%;height:100px;background:red}</style><footer></footer>');
  await useRealPixels(page);await startFullPageCapture(page);await readOpenedCapture(page);
  expect(await redRuns(page)).toEqual([{y:550,height:100}]);await page.close();
});

for(const action of ['START_ZONE_CAPTURE','START_SCROLLING_ZONE_CAPTURE']) {
 test('selection works over an existing modal: '+action,async()=>{
  const page=await context.newPage();await prepareFullPageHarness(page,'<dialog id="original"><div style="width:400px;height:300px;background:red"></div></dialog>');
  await page.evaluate(()=>document.getElementById('original').showModal());await startCapture(page,action);
  await page.mouse.move(250,200);await page.mouse.down();await page.mouse.move(400,300);await page.mouse.up(); await confirmSelection(page);
  expect(await readOpenedCapture(page)).toMatchObject({width:150,height:100});
  expect(await page.locator('#original').evaluate(dialog=>dialog.matches(':modal'))).toBe(true);await page.close();
 });
}

test('cancellation keeps the lock until a delayed capture finishes and ignores its pixels',async()=>{
 const page=await context.newPage();await prepareFullPageHarness(page,'<style>html,body{margin:0;height:1000px}</style>');
 await page.evaluate(()=>{
  const previous=globalThis.chrome.runtime.sendMessage;
  globalThis.chrome.runtime.sendMessage=(message,callback)=>{
   if(message.action==='CAPTURE_VISIBLE_TAB'){globalThis.__releaseCapture=()=>previous(message,callback);}else previous(message,callback);
  };
 });
 await startCapture(page,'START_ZONE_CAPTURE');await page.mouse.move(100,100);await page.mouse.down();await page.mouse.move(300,300);await page.mouse.up(); await confirmSelection(page);
 await page.waitForFunction(()=>globalThis.__releaseCapture);await page.keyboard.press('Escape');
 expect(await startCapture(page,'START_VISIBLE_CAPTURE')).toEqual({status:'busy'});await page.evaluate(()=>globalThis.__releaseCapture());
 await expect.poll(()=>startCapture(page,'START_ZONE_CAPTURE')).toEqual({status:'started'});
 expect(await page.evaluate(()=>globalThis.__openedCapture)).toBeNull();await page.keyboard.press('Escape');await page.close();
});

for(const dpr of [1,1.25,1.5,2]) {
 test('@windows-scaling transformed internal surface retains dimensions and interior pixels at DPR '+dpr,async()=>{
  const scaled=await launchExtension(dpr);const page=await scaled.newPage();
  try {
   await prepareFullPageHarness(page,'<style>html,body{margin:0;height:600px;overflow:hidden;background:lime}.wrapper{position:absolute;left:100px;top:100px;transform:translate(20px,10px) scale(.5);transform-origin:0 0}.app{width:400px;height:200px;border:4px solid black;overflow:auto}.inner{height:600px;background:rgb(30,120,210)}</style><div class="wrapper"><div class="app" data-scroll-surface><div class="inner"></div></div></div>');
   await useRealPixels(page);await startFullPageCapture(page);await readOpenedCapture(page);
   expect(await inspectSolidCapture(page,[30,120,210],1)).toEqual({width:Math.ceil(200*dpr),height:Math.ceil(300*dpr),mismatches:0});
   await page.evaluate(()=>{globalThis.__openedCapture=null;});await startCapture(page,'START_SCROLLING_ZONE_CAPTURE');
   for(const [key,value] of Object.entries({x:40,y:40,width:200,height:500})) await page.locator('input[name="'+key+'"]').fill(String(value));
   await page.locator('[data-scionos-capture="scrolling-controls"] button[type="submit"]').click(); await confirmSelection(page);await readOpenedCapture(page);
   expect(await inspectSolidCapture(page,[30,120,210],1)).toEqual({width:Math.ceil(100*dpr),height:Math.ceil(250*dpr),mismatches:0});
   await page.evaluate(()=>{globalThis.__openedCapture=null;});await startCapture(page,'START_ZONE_CAPTURE');
   await page.mouse.move(152,150);await page.mouse.down();await page.mouse.move(252,170);await page.mouse.up(); await confirmSelection(page);await readOpenedCapture(page);
   expect(await inspectSolidCapture(page,[30,120,210],1)).toEqual({width:Math.ceil(100*dpr),height:Math.ceil(20*dpr),mismatches:0});

  }finally{await scaled.close();}
 });
}

test('HTML report embeds one image and exposes correct zoom and the bottom edge',async()=>{
 const page=await context.newPage();await prepareFullPageHarness(page,'<p>Report fixture</p>');
 const html=await page.evaluate(()=>{
  const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=4000;
  return globalThis.ScionosCaptureUtils.buildHtmlReport({width:1600,height:4000,dataUrl:canvas.toDataURL('image/png'),title:'Long report'});
 });
 expect(html.match(/data:image\/png;base64,/g)).toHaveLength(1);
 await page.setContent(html);await page.locator('#btn-zoom-reset').click();
 expect(await page.locator('#capture-img').evaluate(img=>img.getBoundingClientRect().width)).toBe(1600);
 const dimensions=await page.locator('#viewer').evaluate(viewer=>{viewer.scrollTop=viewer.scrollHeight;viewer.scrollLeft=viewer.scrollWidth;return {top:viewer.scrollTop,left:viewer.scrollLeft,height:viewer.clientHeight};});
 expect(dimensions.top).toBeGreaterThan(3000);expect(dimensions.left).toBeGreaterThan(800);expect(dimensions.height).toBeLessThan(600);
 await page.locator('#btn-zoom-fit').click();expect(await page.locator('#capture-img').evaluate(img=>img.getBoundingClientRect().width)).toBeCloseTo(752);
 await page.setViewportSize({width:1000,height:600});await expect.poll(()=>page.locator('#capture-img').evaluate(img=>img.getBoundingClientRect().width)).toBeCloseTo(952);
 expect(await page.locator('#btn-download').evaluate(link=>link.href===document.getElementById('capture-img').src)).toBe(true);await page.close();
});

test('blurred freehand paths include the segment between distant points',async()=>{
 const page=await context.newPage();await seedEditor(page,{width:400,height:200});
 const result=await page.evaluate(()=>{
  const canvas=document.createElement('canvas');canvas.width=400;canvas.height=200;const ctx=canvas.getContext('2d');
  ctx.fillStyle='black';ctx.fillRect(0,0,400,200);ctx.fillStyle='white';for(let x=0;x<400;x+=20)ctx.fillRect(x,0,10,200);
  const original=[...ctx.getImageData(180,100,1,1).data];
  globalThis.ScionosEditorOperations.create({captureUtils:globalThis.ScionosCaptureUtils}).applyOperation(canvas,{kind:'censor',type:'blur',shape:'free',radius:12,blur:14,points:[{x:30,y:100},{x:330,y:100}]});
  return {original,middle:[...ctx.getImageData(180,100,1,1).data],outside:[...ctx.getImageData(180,20,1,1).data]};
 });
 expect(result.middle[0]).toBeGreaterThan(50);expect(result.middle[0]).toBeLessThan(200);expect(result.outside).toEqual(result.original);await page.close();
});

test('text extraction stops after the global block cap while pixels still complete',async()=>{
 const page=await context.newPage();await prepareFullPageHarness(page,'<style>html,body{margin:0;height:2400px}</style>');
 const result=await page.evaluate(async()=>{
  const utils=globalThis.ScionosCaptureUtils;const text=key=>key;const dom=globalThis.ScionosContentDom.create({Utils:utils,text});let calls=0;
  const capture=globalThis.ScionosContentCapture.create({Utils:utils,text,dom:{...dom,extractDomTextBlocks:()=>{calls++;return Array.from({length:1500},(_,i)=>({text:'word'+i,x:i/10,y:0,width:1,height:1}));}},transfer:globalThis.ScionosContentTransfer.create({Utils:utils,text})});
  await capture.executeFullPageCapture();return {calls,blocks:globalThis.__openedCapture.textBlocks.length,limited:globalThis.__openedCapture.textLayerLimited};
 });
 expect(result).toEqual({calls:1,blocks:1500,limited:true});expect(await readOpenedCapture(page)).toMatchObject({height:2400});await page.close();
});

test('HTML final size uses encoded bytes rather than string length',async()=>{
 const page=await context.newPage();await seedEditor(page,{width:100,height:100});
 await page.evaluate(()=>{
  globalThis.ScionosCaptureUtils={...globalThis.ScionosCaptureUtils,MAX_HTML_EXPORT_BYTES:30000,buildHtmlReport:()=> 'é'.repeat(20000)};
  globalThis.__downloaded=false;globalThis.HTMLAnchorElement.prototype.click=function(){globalThis.__downloaded=true;};
 });
 await page.locator('#btn-html').click();await expect(page.locator('#toast')).toContainText('size limit');
 expect(await page.evaluate(()=>globalThis.__downloaded)).toBe(false);await page.close();
});

for(const action of ['START_FULL_PAGE_CAPTURE','START_ZONE_CAPTURE','START_SCROLLING_ZONE_CAPTURE']) {
 test('unsupported rotations fail explicitly and release the capture session: '+action,async()=>{
  const page=await context.newPage();const alerts=[];page.on('dialog',async dialog=>{alerts.push(dialog.message());await dialog.dismiss();});
  await prepareFullPageHarness(page,'<style>html,body{margin:0;height:600px;overflow:hidden}.app{position:absolute;left:200px;top:100px;width:300px;height:200px;overflow:auto;transform:rotate(5deg)}.inner{height:600px}</style><div class="app" data-scroll-surface><div class="inner"></div></div>');
  await startCapture(page,action);
  if(action!=='START_FULL_PAGE_CAPTURE'){await page.mouse.move(250,160);await page.mouse.down();await page.mouse.move(350,250);await page.mouse.up();}
  await expect.poll(()=>alerts.length).toBe(1);expect(alerts[0]).toContain('transformation non prise en charge');
  expect(await page.evaluate(()=>globalThis.__openedCapture)).toBeNull();
  await page.evaluate(()=>{document.querySelector('.app').style.transform='none';});
  await expect.poll(()=>startCapture(page,'START_VISIBLE_CAPTURE')).toEqual({status:'started'});await readOpenedCapture(page);await page.close();
 });
}

test('left scrollbar gutters share the same viewport origin for selection and visible text',async()=>{
 const page=await context.newPage();await prepareFullPageHarness(page,'<style>html{scrollbar-gutter:stable both-edges}html,body{margin:0}body{height:1200px;background:red}.stripe{position:absolute;left:110px;top:0;width:40px;height:1200px;background:blue}p{position:absolute;left:250px;top:400px;margin:0;color:black}</style><div class="stripe"></div><p>GUTTER_PUBLIC</p>');
 await useRealPixels(page);await startCapture(page,'START_VISIBLE_CAPTURE');await readOpenedCapture(page);
 const text=await page.evaluate(()=>({block:globalThis.__openedCapture.textBlocks.find(b=>b.text==='GUTTER_PUBLIC'),left:document.querySelector('p').getBoundingClientRect().left}));
 expect(text.block.x).toBeCloseTo(text.left);
 await page.evaluate(()=>{globalThis.__openedCapture=null;});await startCapture(page,'START_ZONE_CAPTURE');
 await page.mouse.move(100,100);await page.mouse.down();await page.mouse.move(400,300);await page.mouse.up(); await confirmSelection(page);await readOpenedCapture(page);
 const pixels=await page.evaluate(async()=>{
  const image=new globalThis.Image();image.src=globalThis.__openedCapture.dataUrl;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);const edge=document.querySelector(".stripe").getBoundingClientRect().left-100;return [edge-5,edge+5].map(x=>[...ctx.getImageData(x,50,1,1).data]);
 });expect(pixels).toEqual([[255,0,0,255],[0,0,255,255]]);await page.close();
});
