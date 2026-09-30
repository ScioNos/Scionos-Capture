const path = require('node:path');
const { test, expect, chromium } = require('@playwright/test');
const { frenchMessages, prepareFullPageHarness, startFullPageCapture, readOpenedCapture } = require('./helpers/capture');

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
async function inspectSolidCapture(page, expectedColor) {
  return page.evaluate(async color => {
    const image = new globalThis.Image(); image.src = globalThis.__openedCapture.dataUrl; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let mismatches = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index] !== color[0] || pixels[index + 1] !== color[1]
          || pixels[index + 2] !== color[2] || pixels[index + 3] !== 255) mismatches += 1;
    }
    return { width: image.width, height: image.height, mismatches };
  }, expectedColor);
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

test('scrolling region deduplicates a header that becomes fixed after scrolling', async () => {
  const page = await context.newPage();
  await prepareFullPageHarness(page, '<style>html,body{margin:0}body{height:2600px;background:white}header{position:absolute;top:0;height:60px;width:100%;background:red}</style><header></header><script>addEventListener("scroll",()=>document.querySelector("header").style.position=scrollY>200?"fixed":"absolute")</script>');
  await useRealPixels(page);
  await startCapture(page, 'START_SCROLLING_ZONE_CAPTURE');
  for (const [key, value] of Object.entries({ x: 0, y: 0, width: 400, height: 2000 })) await page.locator('input[name="' + key + '"]').fill(String(value));
  await page.locator('[data-scionos-capture="scrolling-controls"] button', { hasText: 'Capturer' }).click();
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
  await page.mouse.up();
  const result = await readOpenedCapture(page);
  expect(result.width).toBe(300); expect(result.height).toBeGreaterThan(598);
  await expect.poll(() => page.evaluate(() => globalThis.scrollY)).toBe(0);
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
      await page.mouse.move(100, 100); await page.mouse.down(); await page.mouse.move(400, 300); await page.mouse.up();
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
      await page.locator('[data-scionos-capture="scrolling-controls"] button', { hasText: 'Capturer' }).click();
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
