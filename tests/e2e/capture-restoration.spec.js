const { test, expect, chromium } = require('@playwright/test');
const { prepareFullPageHarness, startFullPageCapture } = require('./helpers/capture');

let browser;
test.beforeAll(async () => { browser = await chromium.launch({ channel: 'chromium', headless: true }); });
test.afterAll(async () => { if (browser) await browser.close(); });

for (const visibility of ['', 'visible']) test(`failed anchored preparation restores original inline visibility (${visibility || 'absent'})`, async () => {
  const page = await browser.newPage();
  try {
    await prepareFullPageHarness(page, '<style>html,body{margin:0;height:1200px}footer{position:fixed;bottom:0;width:200px;height:40px}</style><footer>Local fixture</footer>');
    await page.evaluate(visibility => {
      const footer = document.querySelector('footer');
      if (visibility) footer.style.setProperty('visibility', visibility, 'important');
      globalThis.__beforeVisibility = { value: footer.style.getPropertyValue('visibility'), priority: footer.style.getPropertyPriority('visibility') };
      globalThis.__alerts = [];
      globalThis.alert = message => globalThis.__alerts.push(message);
      const original = globalThis.ScionosContentUtils.snapshotInlineStyle;
      globalThis.ScionosContentUtils.snapshotInlineStyle = (element, property) => {
        const snapshot = original(element, property);
        if (element === footer && property === 'visibility') {
          const setProperty = element.style.setProperty.bind(element.style);
          element.style.setProperty = (name, value, priority) => {
            setProperty(name, value, priority);
            if (name === 'visibility' && value === 'hidden') {
              globalThis.__maskedBeforeFailure = true;
              element.style.setProperty = setProperty;
              throw new Error('injected anchored preparation failure');
            }
          };
        }
        return snapshot;
      };
    }, visibility);
    await startFullPageCapture(page);
    await expect.poll(() => page.evaluate(() => globalThis.__alerts.length)).toBe(1);
    const result = await page.evaluate(() => {
      const style = document.querySelector('footer').style;
      return { masked: globalThis.__maskedBeforeFailure, before: globalThis.__beforeVisibility,
        after: { value: style.getPropertyValue('visibility'), priority: style.getPropertyPriority('visibility') },
        captures: globalThis.__capturePositions.length, y: globalThis.scrollY };
    });
    expect(result.masked).toBe(true);
    expect(result.after).toEqual(result.before);
    expect(result.captures).toBe(0);
    expect(result.y).toBe(0);
    await expect(page.locator('[data-scionos-capture="progress"], [data-scionos-capture="motion"]')).toHaveCount(0);
  } finally { await page.close(); }
});
