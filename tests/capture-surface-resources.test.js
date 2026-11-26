const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Utils = require('../capture-utils.js');

function canvases(state) {
  return { createElement(name) {
    assert.equal(name, 'canvas');
    const canvas = { width: 300, height: 150, getContext() {
      if (state.noContext) return null;
      return { fillRect() {}, scale() {}, translate() {}, fillText() {}, drawImage() {
        if (state.drawFailure || (state.patchDrawFailure && state.allocated[1] === canvas)) throw new Error('draw refused');
      } };
    } };
    state.allocated.push(canvas); return canvas;
  } };
}
function released(state) {
  assert.ok(state.allocated.length > 0);
  assert.ok(state.allocated.every(canvas => canvas.width === 1 && canvas.height === 1), 'all owned pixel surfaces must be released');
}
function captureHarness() {
  const state = { allocated: [], images: [], captures: 0, prepared: [], position: { x: 0, y: 0 } };
  const metrics = { fullWidth: 800, fullHeight: 1200, viewportWidth: 800, viewportHeight: 600 };
  const surface = { getPosition: () => ({ ...state.position }), getMetrics: () => metrics,
    getCaptureRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    scrollTo(x, y) { state.position = { x, y }; } };
  const dom = {
    assertStableMetrics() {}, assertSurfacePosition: () => ({ ...state.position }),
    createAnchoredElementManager: () => ({ prepare() {}, restore() {}, getBottomPatches: () => [{ left: 0, top: 550, right: 800, bottom: 600 }] }),
    surfaceRectToClient: (_surface, rect) => rect,
    clientPointToSurface: (_surface, x, y) => ({ x, y: y + state.position.y }),
    createAcquisitionGuard: () => ({ assertGeometry() {}, textIsStable: () => false, close() {} }),
    extractDomTextBlocks: () => [],
    getSurfaceCaptureCrop: () => ({ scaleX: 1, scaleY: 1, crop: { x: 0, y: 0, width: 800, height: 600 } })
  };
  const transfer = {
    async captureVisibleTab() {
      state.captures++;
      if (state.captures === state.failCapture) throw Object.assign(new Error('capture refused'), { name: state.abort ? 'AbortError' : 'Error' });
      return { dataUrl: 'pixels' };
    },
    async loadImage() { const image = { width: 800, height: 600, src: 'pixels' }; state.images.push(image); return image; },
    async prepareCanvasForEditor(canvas) {
      assert.equal(canvas.width, 800); assert.equal(canvas.height, 1200);
      state.prepared.push(canvas);
      state.onPrepare?.();
      if (state.encodingGate) await state.encodingGate;
      assert.equal(canvas.width, 800, 'encoding must finish before source canvas release');
      if (state.encodingFailure) throw new Error('encode refused');
      return { blob: new Blob(['pixels']) };
    }
  };
  const context = vm.createContext({ Blob, console, document: canvases(state), window: { innerWidth: 800, innerHeight: 600 },
    ScionosContentSelection: { create: () => ({}) } });
  // Expose only this private attempt in the VM; production exports remain unchanged.
  const source = fs.readFileSync(require.resolve('../content-capture.js'), 'utf8').replace('return Object.freeze({\n      setDelay:', 'return Object.freeze({\n      captureRegionAttempt,\n      setDelay:');
  vm.runInContext(source, context);
  const api = context.ScionosContentCapture.create({ Utils: { ...Utils, waitForPaint: async () => {}, delay: async () => {} }, dom, transfer, text: key => key });
  return { state, run: () => api.captureRegionAttempt(surface, { x: 0, y: 0, width: 800, height: 1200 }, metrics, { style: {} }) };
}

for (const failure of ['none', 'refused', 'cancelled', 'encoding']) {
  test(`region surfaces release on ${failure} and the next attempt can succeed`, async () => {
    const h = captureHarness();
    if (failure === 'refused' || failure === 'cancelled') { h.state.failCapture = 2; h.state.abort = failure === 'cancelled'; }
    h.state.encodingFailure = failure === 'encoding';
    if (failure === 'none') assert.equal((await h.run()).blob.size, 6);
    else await assert.rejects(h.run(), failure === 'encoding' ? /encode refused/ : /capture refused/);
    assert.ok(h.state.allocated.length >= 2, 'assembly and bottom patch were allocated before exit');
    released(h.state);
    assert.ok(h.state.images.every(image => image.src === ''), 'decoded tile images are released');
    h.state.failCapture = 0; h.state.encodingFailure = false;
    assert.equal((await h.run()).blob.size, 6);
    released(h.state);
  });
}
test('a patch whose drawing throws is released before it enters the patch list', async () => {
  const h = captureHarness(); h.state.patchDrawFailure = true;
  await assert.rejects(h.run(), /draw refused/);
  assert.equal(h.state.allocated.length, 2);
  released(h.state);
  assert.ok(h.state.images.every(image => image.src === ''));
  h.state.patchDrawFailure = false;
  assert.equal((await h.run()).blob.size, 6);
  released(h.state);
});

test('region assembly remains live until asynchronous preparation settles', async () => {
  const h = captureHarness(); let resume;
  h.state.encodingGate = new Promise(resolve => { resume = resolve; });
  const ready = new Promise(resolve => { h.state.onPrepare = resolve; });
  const pending = h.run();
  await ready;
  assert.equal(h.state.prepared.length, 1);
  assert.equal(h.state.prepared[0].height, 1200);
  resume(); await pending; released(h.state);
});

function exportHarness() {
  const state = { allocated: [], decoded: [], blob: new Blob(['PNG'], { type: 'image/png' }) };
  const layout = { width: 80, height: 60, background: '#fff', titleLines: [], settings: { padding: 0 },
    items: [{ imageX: 0, imageY: 0, imageWidth: 80, imageHeight: 60, imageYEnd: 60, headingLines: [], captionLines: [] }] };
  const context = vm.createContext({ Blob, document: canvases(state), ScionosCaptureUtils: Utils,
    ScionosCompositionUtils: { LIMITS: {}, computeLayout: () => layout, cleanPng: async () => ({ width: 80, height: 60 }) },
    async createImageBitmap(blob) {
      assert.equal(blob, state.blob);
      if (state.decodeFailure) throw new Error('decode refused');
      const bitmap = { width: 80, height: 60, close() { this.closed = true; } }; state.decoded.push(bitmap); return bitmap;
    } });
  vm.runInContext(fs.readFileSync(require.resolve('../composition-export.js'), 'utf8'), context);
  const snapshot = { items: [{ id: 'owned-input', blob: state.blob, width: 80, height: 60 }], settings: {} };
  return { state, snapshot, render: () => context.ScionosCompositionExport.render(snapshot, { x: 0, y: 0, width: 80, height: 60 }) };
}
for (const failure of ['noContext', 'decodeFailure', 'drawFailure']) {
  test(`composition failed render releases allocated canvas after ${failure} and allows retry`, async () => {
    const h = exportHarness(); h.state[failure] = true;
    await assert.rejects(h.render(), /unavailable|refused/);
    released(h.state);
    assert.ok(h.state.decoded.every(bitmap => bitmap.closed));
    h.state[failure] = false;
    const rendered = await h.render();
    assert.equal(rendered.width, 80); assert.equal(rendered.height, 60, 'successful render transfers canvas ownership to caller');
    assert.ok(h.state.decoded.every(bitmap => bitmap.closed));
    assert.equal(h.snapshot.items[0].blob.size, 3, 'caller input remains intact');
    assert.equal(h.snapshot.items[0].width, 80);
    rendered.width = rendered.height = 1;
    released(h.state);
  });
}
