const { test, expect, chromium } = require('@playwright/test');
const { frenchMessages, prepareFullPageHarness, startFullPageCapture, readOpenedCapture } = require('./helpers/capture');
let browser;
test.beforeAll(async () => { browser = await chromium.launch({ channel: 'chromium', headless: true }); });
test.afterAll(async () => { await browser?.close(); });

async function fixture(html = '<title>Source A</title><p>PUBLIC_A</p>') {
  const page = await browser.newPage();
  await page.route('https://capture.test/**', route => route.fulfill({ body: '<title>Local fixture</title>', contentType: 'text/html' }));
  await page.goto('https://capture.test/a');
  await prepareFullPageHarness(page, html);
  await page.evaluate(() => { globalThis.__alerts = []; globalThis.alert = value => globalThis.__alerts.push(value); });
  return page;
}
async function startVisible(page) {
  await page.evaluate(messages => globalThis.__captureListener({ action: 'START_VISIBLE_CAPTURE', messages }, {}, () => {}), frenchMessages);
}
async function changeAfterPixels(page, change) {
  await page.evaluate(change => {
    const previous = globalThis.chrome.runtime.sendMessage;
    globalThis.chrome.runtime.sendMessage = (message, callback) => previous(message, response => {
      if (message.action === 'CAPTURE_VISIBLE_TAB') {
        if (change === 'text') document.querySelector('p').textContent = 'SECRET_B';
        if (change === 'title') document.title = 'Title B';
        if (change === 'scroll') globalThis.scrollTo(0, globalThis.scrollY + 100);
        if (change === 'navigation') globalThis.history.pushState({}, '', '/b');
      }
      callback(response);
    });
  }, change);
}

test('post-acquisition DOM mutation removes searchable text from visible capture', async () => {
  const page = await fixture();
  try {
    await changeAfterPixels(page, 'text'); await startVisible(page); await readOpenedCapture(page);
    const result = await page.evaluate(() => ({ blocks: globalThis.__openedCapture.textBlocks, limited: globalThis.__openedCapture.textLayerLimited }));
    expect(result).toEqual({ blocks: [], limited: true });
  } finally { await page.close(); }
});

test('stable visible capture retains searchable text', async () => {
  const page = await fixture();
  try {
    await startVisible(page); await readOpenedCapture(page);
    expect(await page.evaluate(() => globalThis.__openedCapture.textBlocks.map(block => block.text))).toContain('PUBLIC_A');
  } finally { await page.close(); }
});

test('source title is fixed when the session begins', async () => {
  const page = await fixture();
  try {
    await changeAfterPixels(page, 'title'); await startVisible(page); await readOpenedCapture(page);
    expect(await page.evaluate(() => globalThis.__openedCapture.title)).toBe('Source A');
  } finally { await page.close(); }
});

test('SPA navigation during acquisition aborts and releases the session', async () => {
  const page = await fixture();
  try {
    await changeAfterPixels(page, 'navigation'); await startVisible(page);
    await expect.poll(() => page.evaluate(() => globalThis.__alerts.length)).toBe(1);
    expect(await page.evaluate(() => globalThis.__openedCapture)).toBeNull();
    await startVisible(page); await readOpenedCapture(page);
    expect(await page.evaluate(() => globalThis.__openedCapture.url)).toBe('https://capture.test/b');
  } finally { await page.close(); }
});

test('scroll during tile acquisition aborts instead of assembling stale coordinates', async () => {
  const page = await fixture('<style>html,body{margin:0;height:2400px}</style><p>PUBLIC_A</p>');
  try {
    await changeAfterPixels(page, 'scroll'); await startFullPageCapture(page);
    await expect.poll(() => page.evaluate(() => globalThis.__alerts.length)).toBe(1);
    expect(await page.evaluate(() => globalThis.__openedCapture)).toBeNull();
    expect(await page.evaluate(() => globalThis.scrollY)).toBe(0);
    await expect(page.locator('[data-scionos-capture="motion"], [data-scionos-capture="progress"]')).toHaveCount(0);
  } finally { await page.close(); }
});

test('mutated tile keeps pixels but discards the whole uncertain text layer', async () => {
  const page = await fixture('<style>html,body{margin:0;height:1200px}</style><p>PUBLIC_A</p>');
  try {
    await changeAfterPixels(page, 'text'); await startFullPageCapture(page); await readOpenedCapture(page);
    expect(await page.evaluate(() => ({ blocks: globalThis.__openedCapture.textBlocks, limited: globalThis.__openedCapture.textLayerLimited })))
      .toEqual({ blocks: [], limited: true });
  } finally { await page.close(); }
});

 test('white-on-white text is excluded while contrasted text survives', async () => {
  const page = await fixture('<style>body{background:white}.secret{color:white}</style><p>PUBLIC_A</p><p class="secret">SECRET_WHITE</p>');
  try {
    await startVisible(page); await readOpenedCapture(page);
    const words = await page.evaluate(() => globalThis.__openedCapture.textBlocks.map(block => block.text));
    expect(words).toContain('PUBLIC_A'); expect(words).not.toContain('SECRET_WHITE');
  } finally { await page.close(); }
});

test('text with image backgrounds or blending is omitted when painted contrast is uncertain', async () => {
  const page = await fixture('<style>body{background:white}.image{color:white;background-image:linear-gradient(white,white)}.blend{color:black;mix-blend-mode:screen}</style><p>PUBLIC_A</p><p class="image">SECRET_IMAGE</p><p class="blend">SECRET_BLEND</p>');
  try {
    await startVisible(page); await readOpenedCapture(page);
    const words = await page.evaluate(() => globalThis.__openedCapture.textBlocks.map(block => block.text));
    expect(words).toContain('PUBLIC_A');
    expect(words).not.toContain('SECRET_IMAGE');
    expect(words).not.toContain('SECRET_BLEND');
  } finally { await page.close(); }
});

test('CSSOM changes during acquisition invalidate the text layer without DOM mutations', async () => {
  const page = await fixture('<style>body{background:white}</style><p>PUBLIC_A</p>');
  try {
    await page.evaluate(() => {
      const previous = globalThis.chrome.runtime.sendMessage;
      globalThis.chrome.runtime.sendMessage = (message, callback) => previous(message, response => {
        if (message.action === 'CAPTURE_VISIBLE_TAB') document.styleSheets[0].insertRule('p{color:white}', 0);
        callback(response);
      });
    });
    await startVisible(page); await readOpenedCapture(page);
    expect(await page.evaluate(() => globalThis.__openedCapture.textBlocks)).toEqual([]);
    expect(await page.evaluate(() => globalThis.__openedCapture.textLayerLimited)).toBe(true);
  } finally { await page.close(); }
});

test('capture portion limit rejects a long page before acquiring pixels and restores it', async () => {
  const page = await fixture('<style>html,body{margin:0;height:200000px}</style><p>PUBLIC_A</p>');
  try {
    await page.evaluate(() => globalThis.scrollTo(0, 123));
    await startFullPageCapture(page);
    // Dimension stabilization has its own five-second budget before this limit.
    await expect.poll(() => page.evaluate(() => globalThis.__alerts.length), { timeout: 10000 }).toBe(1);
    expect(await page.evaluate(() => globalThis.__capturePositions.length)).toBe(0);
    expect(await page.evaluate(() => globalThis.__openedCapture)).toBeNull();
    expect(await page.evaluate(() => globalThis.scrollY)).toBe(123);
    await expect(page.locator('[data-scionos-capture]')).toHaveCount(0);
  } finally { await page.close(); }
});

test('capture duration limit discards late pixels and releases the session for retry', async () => {
  const page = await fixture();
  try {
    await page.evaluate(() => {
      const now = globalThis.Date.now;
      globalThis.clockOffset = 0;
      globalThis.Date.now = () => now() + globalThis.clockOffset;
      const previous = globalThis.chrome.runtime.sendMessage;
      globalThis.chrome.runtime.sendMessage = (message, callback) => previous(message, response => {
        if (message.action === 'CAPTURE_VISIBLE_TAB' && !globalThis.clockOffset) globalThis.clockOffset = 180001;
        callback(response);
      });
    });
    await startVisible(page);
    await expect.poll(() => page.evaluate(() => globalThis.__alerts.length)).toBe(1);
    expect(await page.evaluate(() => globalThis.__openedCapture)).toBeNull();
    // The second session starts at the new clock and has its own deadline.
    await startVisible(page); await readOpenedCapture(page);
    expect(await page.evaluate(() => globalThis.__openedCapture.title)).toBe('Source A');
  } finally { await page.close(); }
});
