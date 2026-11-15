const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Utils = require('../capture-utils.js');

function extractionHarness({ diagnostics = false, nativeVisibility = false } = {}) {
  const rect = { left: 10, top: 10, right: 50, bottom: 25, width: 40, height: 15 };
  const style = { visibility: 'visible', display: 'block', opacity: '1', color: 'black',
    textTransform: 'none', filter: 'none', clipPath: 'none', clip: 'auto', fontSize: '14px',
    fontFamily: 'sans-serif', position: 'fixed', top: '10px', bottom: 'auto', left: '10px', right: 'auto' };
  let styleReads = 0, visibilityReads = 0, now = 0;
  const parent = { isConnected: true, parentElement: null, closest: () => null,
    getBoundingClientRect: () => rect, contains: element => element === parent,
    style: { setProperty() {} } };
  if (nativeVisibility) parent.checkVisibility = () => { visibilityReads++; return style.visibility !== 'hidden'; };
  const nodes = [{ parentElement: parent, nodeValue: 'Private https://secret.example/' }, { parentElement: parent, nodeValue: 'hidden-data' }];
  const colorContext = { canvas: {}, clearRect() {}, fillRect() {}, getImageData: () => ({ data: [0, 0, 0, 255] }) };
  const getComputedStyle = (_element, pseudo) => {
    if (pseudo) return { content: style.pseudoContent || 'none' };
    styleReads++;
    return { ...style };
  };
  const document = { body: parent, querySelectorAll: () => [parent],
    createElement: () => ({ getContext: () => colorContext }), elementFromPoint: () => parent,
    createTreeWalker: () => { let index = 0; return { nextNode: () => nodes[index++] }; },
    createRange: () => ({ setStart() {}, setEnd() {}, getClientRects: () => [rect], getBoundingClientRect: () => rect }) };
  const context = vm.createContext({ console, document, getComputedStyle, Date: { now: () => now++ },
    window: { getComputedStyle, innerWidth: 800, innerHeight: 600 }, NodeFilter: { SHOW_TEXT: 4 },
    ScionosContentUtils: { snapshotInlineStyle: () => ({}), restoreInlineStyle() {} } });
  if (diagnostics) context.__scionosDiagnostics = [];
  vm.runInContext(fs.readFileSync(require.resolve('../content-dom.js'), 'utf8'), context);
  const dom = context.ScionosContentDom.create({ Utils, text: key => key });
  const surface = { isDocument: true, getPosition: () => ({ x: 0, y: 0 }),
    getCaptureRect: () => ({ left: 0, top: 0, width: 800, height: 600 }) };
  const extract = () => dom.extractDomTextBlocks({ x: 0, y: 0, width: 800, height: 600 }, surface);
  return { dom, context, surface, extract, style, rect, parent,
    reads: () => ({ style: styleReads, visibility: visibilityReads }) };
}

test('text visibility and style caches are shared within one extraction and renewed for every tile', () => {
  for (const nativeVisibility of [false, true]) {
    const h = extractionHarness({ nativeVisibility });
    assert.equal(h.extract().length, 3);
    assert.equal(h.reads().style, 1);
    assert.equal(h.reads().visibility, nativeVisibility ? 1 : 0);
    h.style.visibility = 'hidden';
    assert.equal(h.extract().length, 0, 'a fixed element hidden on the next tile must be reconsidered');
    h.style.visibility = 'visible';
    h.style.opacity = '0.5';
    assert.equal(h.extract().length, 0, 'ancestor opacity checks still reject private text');
    h.style.opacity = '1';
    h.style.position = 'sticky';
    assert.equal(h.extract().length, 3);
    assert.equal(h.reads().style, nativeVisibility ? 3 : 4);
    h.rect.left = 900; h.rect.right = 940;
    assert.equal(h.extract().length, 0, 'geometry is also renewed on every extraction');
  }
});

test('text privacy checks continue rejecting masks, pseudo content, overlaps and failed hit tests', () => {
  for (const property of ['filter', 'clipPath', 'maskImage', 'webkitMaskImage', 'webkitTextSecurity']) {
    const h = extractionHarness();
    h.style[property] = 'unsafe';
    assert.equal(h.extract().length, 0, property);
  }
  const h = extractionHarness();
  h.style.pseudoContent = 'private-overlay';
  assert.equal(h.extract().length, 0);
  h.style.pseudoContent = 'none';
  h.context.document.elementFromPoint = () => null;
  assert.equal(h.extract().length, 0);
  const overlay = { closest: () => null, getBoundingClientRect: () => h.rect, contains: () => false };
  h.context.document.elementFromPoint = () => h.parent;
  h.context.document.querySelectorAll = () => [h.parent, overlay];
  assert.equal(h.extract().length, 0);
});

test('anchored manager reevaluates fixed and sticky styles for every prepare', () => {
  const h = extractionHarness();
  const manager = h.dom.createAnchoredElementManager(h.surface);
  manager.prepare();
  assert.equal(h.reads().style, 1);
  h.style.position = 'sticky';
  manager.prepare(1, 2);
  assert.equal(h.reads().style, 2);
  h.style.visibility = 'hidden';
  manager.prepare(2, 3);
  assert.equal(h.reads().style, 3);
});

test('diagnostics are opt-in, bounded, paired and contain only counts and timings', () => {
  const disabled = extractionHarness();
  disabled.extract();
  assert.equal(disabled.context.__scionosDiagnostics, undefined);
  const h = extractionHarness({ diagnostics: true });
  h.extract();
  h.dom.createAnchoredElementManager(h.surface).prepare();
  assert.deepEqual(Array.from(h.context.__scionosDiagnostics, entry => entry.stage),
    ['text:start', 'text:end', 'anchored:start', 'anchored:end']);
  assert.equal(h.context.__scionosDiagnostics[1].elements, 1);
  assert.equal(h.context.__scionosDiagnostics[1].blocks, 3);
  assert.equal(h.context.__scionosDiagnostics[3].elements, 1);
  for (let index = 0; index < 260; index++) h.extract();
  assert.equal(h.context.__scionosDiagnostics.length, 500);
  for (const entry of h.context.__scionosDiagnostics) {
    assert.deepEqual(Object.keys(entry).sort(), ['blocks', 'durationMs', 'elements', 'stage']);
    for (const key of ['blocks', 'durationMs', 'elements']) assert.ok(Number.isFinite(entry[key]) && entry[key] >= 0);
  }
  assert.doesNotMatch(JSON.stringify(h.context.__scionosDiagnostics), /Private|secret|hidden-data/);
  h.dom.extractDomTextBlocks(null, h.surface);
  assert.equal(h.context.__scionosDiagnostics.at(-1).stage, 'text:end');
  h.context.document.querySelectorAll = () => { throw new Error('fixture'); };
  assert.throws(() => h.dom.createAnchoredElementManager(h.surface).prepare(), /fixture/);
  assert.equal(h.context.__scionosDiagnostics.at(-1).stage, 'anchored:end');
});

function metricsHarness() {
  const context = vm.createContext({ console });
  vm.runInContext(fs.readFileSync(require.resolve('../content-dom.js'), 'utf8'), context);
  const dom = context.ScionosContentDom.create({ Utils, text: key => key });
  const baseline = { fullHeight: 2000, fullWidth: 800, viewportHeight: 600, viewportWidth: 800 };
  let current = { ...baseline };
  return { dom, baseline, surface: { getMetrics: () => current }, set: metrics => { current = { ...baseline, ...metrics }; } };
}

test('bounded selections tolerate appended feed content but full-page captures remain strict', () => {
  const { dom, baseline, surface, set } = metricsHarness();
  set({ fullHeight: 4000 });
  assert.doesNotThrow(() => dom.assertStableMetrics(surface, baseline, { y: 100, height: 1000 }));
  assert.throws(() => dom.assertStableMetrics(surface, baseline), { code: 'LAYOUT_CHANGED' });
});

test('bounded selections still reject shrinking content, viewport changes and insufficient bounds', () => {
  const { dom, baseline, surface, set } = metricsHarness();
  const region = { y: 100, height: 1000 };
  for (const metrics of [{ fullHeight: 1900 }, { fullWidth: 900 }, { viewportHeight: 580 }, { viewportWidth: 780 }]) {
    set(metrics);
    assert.throws(() => dom.assertStableMetrics(surface, baseline, region), { code: 'LAYOUT_CHANGED' });
  }
  set({ fullHeight: 4000 });
  assert.throws(() => dom.assertStableMetrics(surface, baseline, { y: 3500, height: 1000 }), { code: 'LAYOUT_CHANGED' });
});

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
