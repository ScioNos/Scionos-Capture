const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Utils = require('../capture-utils.js');

function guardHarness() {
  const position = { x: 0, y: 0 }, geometry = { left: 0, top: 0, width: 800, height: 600 };
  const observers = [];
  class MutationObserver {
    constructor(callback) { this.callback = callback; this.records = []; observers.push(this); }
    observe() {} takeRecords() { return this.records.splice(0); } disconnect() { this.disconnected = true; }
  }
  const context = vm.createContext({ console, MutationObserver, document: { documentElement: {} }, window: {} });
  vm.runInContext(fs.readFileSync(require.resolve('../content-dom.js'), 'utf8'), context);
  const dom = context.ScionosContentDom.create({ Utils, text: key => key });
  const surface = { getPosition: () => ({ ...position }), getCaptureRect: () => ({ ...geometry }),
    getMetrics: () => ({ fullWidth: 800, fullHeight: 2000, viewportWidth: 800, viewportHeight: 600 }) };
  return { dom, surface, position, geometry, observers };
}

test('acquisition guard discards text after a mutation even when content changes back', () => {
  const h = guardHarness(), guard = h.dom.createAcquisitionGuard(h.surface);
  h.observers[0].records.push({ type: 'characterData', target: { parentElement: null } });
  assert.equal(guard.textIsStable(), false);
  assert.equal(guard.textIsStable(), false);
  guard.assertGeometry(); guard.close();
  assert.equal(h.observers[0].disconnected, true);
});

test('acquisition guard rejects scrolling and moved surfaces after screenshot acquisition', () => {
  for (const change of [h => { h.position.y = 100; }, h => { h.geometry.top = 20; }]) {
    const h = guardHarness(), guard = h.dom.createAcquisitionGuard(h.surface);
    change(h);
    assert.throws(() => guard.assertGeometry(), { code: 'LAYOUT_CHANGED' });
    guard.close();
  }
});

test('extension progress mutations do not discard otherwise stable text', () => {
  const h = guardHarness(), guard = h.dom.createAcquisitionGuard(h.surface);
  h.observers[0].records.push({ type: 'attributes', target: { closest: () => ({}) } });
  assert.equal(guard.textIsStable(), true); guard.close();
});
