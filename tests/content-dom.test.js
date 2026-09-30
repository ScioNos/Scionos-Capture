const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Utils = require('../capture-utils.js');

test('the stabilization deadline bounds inner scroll loops on very tall pages', async () => {
  let now = 0;
  let y = 0;
  let moves = 0;
  const context = vm.createContext({ Date: { now: () => now }, document: { images: [] }, console });
  vm.runInContext(fs.readFileSync(require.resolve('../content-dom.js'), 'utf8'), context);
  const dom = context.ScionosContentDom.create({
    Utils: { ...Utils, delay: async ms => { now += ms; }, waitForPaint: async () => { now += 16; } }, text: key => key
  });
  const surface = {
    element: { scrollHeight: 60000, clientHeight: 600, scrollWidth: 800, clientWidth: 800 },
    getMetrics: () => ({ fullHeight: 60000, fullWidth: 800, viewportHeight: 600, viewportWidth: 800 }),
    getPosition: () => ({ x: 0, y }), scrollTo: (_x, nextY) => { y = nextY; moves++; }
  };
  const result = await dom.stabilizePageDimensions(surface);
  assert.equal(result.fullHeight, 60000);
  assert.ok(now <= 5016, 'paint may cross the deadline by one frame');
  assert.ok(moves < 50, 'the full 100-tile pass must not exceed the budget');
});
