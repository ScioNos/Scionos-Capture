const { test, expect } = require('@playwright/test');
const { frenchMessages, prepareFullPageHarness } = require('./helpers/capture');

const adjustment = '[data-scionos-capture="adjustment"]';
const scrolling = '[data-scionos-capture="scrolling-selection"]';
const zone = '[data-scionos-capture="selection"]';

async function start(page, action) {
  await page.evaluate(({ action, messages }) => new Promise(resolve => {
    globalThis.__captureListener({ action, messages, language: 'fr' }, {}, resolve);
  }), { action, messages: frenchMessages });
}
async function pointer(page, selector, type, pointerId, x = 100, y = 100, isPrimary = true) {
  await page.locator(selector).dispatchEvent(type, {
    pointerId, pointerType: 'touch', isPrimary, button: 0, buttons: type === 'pointerup' ? 0 : 1,
    clientX: x, clientY: y, bubbles: true
  });
}
async function geometry(page, selector = adjustment) {
  return page.locator(selector).evaluate(element => Object.fromEntries(
    [...element.querySelectorAll('input')].map(input => [input.name, Number(input.value)])));
}

test.beforeEach(async ({ page }) => {
  await prepareFullPageHarness(page, '<style>html,body{margin:0}body{height:2400px}</style>');
  // Synthetic multi-touch events have no browser-owned active pointers. Model capture
  // explicitly so these tests can exercise arbitrary IDs and capture loss deterministically.
  await page.evaluate(() => {
    const captured = new WeakMap();
    globalThis.Element.prototype.setPointerCapture = function(id) { captured.set(this, id); };
    globalThis.Element.prototype.hasPointerCapture = function(id) { return captured.get(this) === id; };
    globalThis.Element.prototype.releasePointerCapture = function(id) {
      if (captured.get(this) === id) {
        captured.delete(this);
        this.dispatchEvent(new globalThis.PointerEvent('lostpointercapture', { pointerId: id }));
      }
    };
  });
});

async function openAdjustment(page) {
  await start(page, 'START_ZONE_CAPTURE');
  await pointer(page, zone, 'pointerdown', 11, 100, 100);
  await pointer(page, zone, 'pointerup', 11, 300, 300);
  await expect(page.locator(adjustment)).toBeVisible();
}

for (const ending of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  test('adjustment tracks its pointer through foreign events and ' + ending, async ({ page }) => {
    await openAdjustment(page);
    const box = adjustment + ' > div';
    await pointer(page, box, 'pointerdown', 21, 150, 150);
    await pointer(page, box, 'pointermove', 21, 170, 180);
    expect(await geometry(page)).toMatchObject({ x: 120, y: 130 });
    await pointer(page, box, 'pointerdown', 22, 400, 400, false);
    for (const type of ['pointermove', 'pointerup', 'pointercancel', 'lostpointercapture']) {
      await pointer(page, box, type, 22, 500, 500, false);
    }
    await pointer(page, box, 'pointermove', 21, 180, 190);
    expect(await geometry(page)).toMatchObject({ x: 130, y: 140 });
    await pointer(page, box, ending, 21, 180, 190);
    await pointer(page, box, 'pointermove', 21, 250, 250);
    expect(await geometry(page)).toMatchObject({ x: 130, y: 140 });
    await pointer(page, box, 'pointerdown', 23, 180, 190);
    await pointer(page, box, 'pointermove', 23, 190, 200);
    await pointer(page, box, 'pointerup', 23, 190, 200);
    expect(await geometry(page)).toMatchObject({ x: 140, y: 150 });
    await page.locator(box).focus();
    await page.keyboard.press('Shift+ArrowRight');
    expect(await geometry(page)).toMatchObject({ x: 150 });
    await page.keyboard.press('Escape');
    await expect(page.locator(adjustment)).toHaveCount(0);
  });
}

for (const ending of ['pointercancel', 'lostpointercapture']) {
  test('zone ignores secondary pointers and stops auto-scroll on ' + ending, async ({ page }) => {
    await start(page, 'START_ZONE_CAPTURE');
    await pointer(page, zone, 'pointerdown', 31, 100, 100);
    await pointer(page, zone, 'pointermove', 31, 300, 598);
    await expect.poll(() => page.evaluate(() => globalThis.scrollY)).toBeGreaterThan(0);
    await pointer(page, zone, 'pointerdown', 32, 400, 400, false);
    for (const type of ['pointermove', 'pointerup', 'pointercancel', 'lostpointercapture']) {
      await pointer(page, zone, type, 32, 500, 500, false);
    }
    await expect(page.locator(zone)).toBeVisible();
    await expect(page.locator(adjustment)).toHaveCount(0);
    await pointer(page, zone, ending, 31);
    await expect(page.locator(zone)).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => globalThis.scrollY)).toBe(0);
    expect(await page.evaluate(() => globalThis.__openedCapture)).toBeNull();
    await openAdjustment(page);
  });
}

test('scrolling drag ignores foreign releases and completes with the active pointer', async ({ page }) => {
  await start(page, 'START_SCROLLING_ZONE_CAPTURE');
  await pointer(page, scrolling, 'pointerdown', 41, 100, 100);
  await pointer(page, scrolling, 'pointermove', 41, 300, 350);
  const before = await geometry(page, scrolling);
  await pointer(page, scrolling, 'pointerdown', 42, 350, 400, false);
  for (const type of ['pointermove', 'pointerup', 'pointercancel', 'lostpointercapture']) {
    await pointer(page, scrolling, type, 42, 450, 500, false);
  }
  expect(await geometry(page, scrolling)).toEqual(before);
  await expect(page.locator(scrolling)).toBeVisible();
  await pointer(page, scrolling, 'pointerup', 41, 300, 350);
  await expect(page.locator(adjustment)).toBeVisible();
  expect(await geometry(page)).toMatchObject({ x: 100, y: 100, width: 200, height: 250 });
});

for (const ending of ['pointercancel', 'lostpointercapture']) {
  test('scrolling ' + ending + ' resets the drag and preserves two clicks and keyboard scrolling', async ({ page }) => {
    await start(page, 'START_SCROLLING_ZONE_CAPTURE');
    await pointer(page, scrolling, 'pointerdown', 51, 100, 100);
    await pointer(page, scrolling, 'pointermove', 51, 300, 350);
    await pointer(page, scrolling, ending, 51);
    await page.locator(scrolling).dispatchEvent('click', { pointerId: 51, clientX: 300, clientY: 350, detail: 1 });
    await pointer(page, scrolling, 'pointermove', 51, 400, 400);
    await expect(page.locator('[data-scionos-capture="scrolling-box"]')).toBeHidden();
    await page.mouse.click(100, 100);
    await page.keyboard.press('PageDown');
    await expect.poll(() => page.evaluate(() => globalThis.scrollY)).toBeGreaterThan(0);
    await page.mouse.click(300, 300);
    await expect(page.locator(adjustment)).toBeVisible();
    expect((await geometry(page)).height).toBeGreaterThan(200);
    await page.keyboard.press('Escape');
    await expect.poll(() => page.evaluate(() => globalThis.scrollY)).toBe(0);
  });
}
