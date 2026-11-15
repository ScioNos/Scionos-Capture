const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
require('fake-indexeddb/auto');

const CaptureStore = require('../capture-store.js');
const ScionosCaptureUtils = require('../capture-utils.js');

function eventHook() {
  let listener;
  return { addListener(value) { listener = value; }, get listener() { return listener; } };
}

async function createHarness(store = CaptureStore, { clock, delay } = {}) {
  const messageEvent = eventHook();
  const alarmEvent = eventHook();
  const removedEvent = eventHook();
  const startupEvent = eventHook();
  const installedEvent = eventHook();
  const localValues = {};
  const sessionValues = {};
  const alarms = new Map();
  let nextTabId = 80;
  const tabs = new Map([[7, { id: 7, windowId: 3 }]]);
  const updatedEvent = eventHook();
  const chrome = {
    runtime: {
      id: 'test-extension',
      getURL: relative => 'chrome-extension://test-extension/' + relative,
      getContexts: async () => [...tabs.values()]
        .filter(tab => typeof tab.url === 'string' && tab.url.startsWith('chrome-extension://test-extension/'))
        .map(tab => ({ contextType: 'TAB', tabId: tab.id, documentUrl: tab.url })),
      onMessage: messageEvent, onStartup: startupEvent, onInstalled: installedEvent
    },
    alarms: {
      create: async (name, options) => { alarms.set(name, options); },
      clear: async name => alarms.delete(name),
      onAlarm: alarmEvent
    },
    storage: {
      local: {
        setAccessLevel: async () => {}, remove: async key => { delete localValues[key]; }
      },
      session: {
        setAccessLevel: async () => {},
        get: async key => {
          if (key === null) return { ...sessionValues };
          if (Array.isArray(key)) return Object.fromEntries(key.filter(item => item in sessionValues).map(item => [item, sessionValues[item]]));
          return key in sessionValues ? { [key]: sessionValues[key] } : {};
        },
        set: async values => Object.assign(sessionValues, values),
        remove: async keys => { for (const key of Array.isArray(keys) ? keys : [keys]) delete sessionValues[key]; }
      }
    },
    tabs: {
      query: async options => options.active ? [{ id: 7, windowId: 3 }] : [...tabs.values()],
      captureVisibleTab: async () => '',
      create: async options => { const tab = { id: ++nextTabId, url: options.url }; tabs.set(tab.id, tab); return tab; },
      remove: async id => { tabs.delete(id); await removedEvent.listener(id); },
      onRemoved: removedEvent, onUpdated: updatedEvent
    }
  };
  const context = vm.createContext({
    chrome, CaptureStore: store, ScionosCaptureUtils: delay ? { ...ScionosCaptureUtils, delay } : ScionosCaptureUtils,
    Date: clock ? { now: clock } : Date, Blob, URL, Uint8Array, fetch: globalThis.fetch,
    atob: globalThis.atob, console: { ...console, error() {} }, setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout, crypto: { randomUUID: crypto.randomUUID }
  });
  context.globalThis = context;
  context.importScripts = () => {};
  const source = fs.readFileSync(path.join(__dirname, '..', 'background.js'), 'utf8');
  vm.runInContext(source, context, { filename: 'background.js' });
  await new Promise(resolve => globalThis.setTimeout(resolve, 0));
  await vm.runInContext('storageInitialization', context);
  return { chrome, messageEvent, alarms, sessionValues, context, tabs };
}

function send(listener, message, sender) {
  return new Promise((resolve, reject) => {
    const keepAlive = listener(message, sender, resolve);
    if (keepAlive !== true) reject(new Error('Message was not accepted'));
  });
}

test('visible capture queue preserves 550ms start cadence after concurrent requests and quota failures', async () => {
  let now = 10000;
  const waits = [], starts = [];
  const h = await createHarness(CaptureStore, { clock: () => now, delay: async ms => { waits.push(ms); now += ms; } });
  h.chrome.tabs.captureVisibleTab = async () => {
    starts.push(now);
    now += 120; // Capture latency counts toward the interval between starts.
    if (starts.length === 2) throw new Error('capture quota rate limit');
    return 'data:image/png;base64,fixture';
  };
  const sender = { id: 'test-extension', tab: { id: 7, windowId: 3 }, url: 'https://example.com' };
  const responses = await Promise.all(Array.from({ length: 3 }, () =>
    send(h.messageEvent.listener, { action: 'CAPTURE_VISIBLE_TAB' }, sender)));
  assert.deepEqual(starts, [10000, 10550, 11100]);
  assert.deepEqual(waits, [430, 430]);
  assert.equal(responses[0].success, true);
  assert.equal(responses[1].success, false);
  assert.equal(responses[1].errorCode, 'RATE_LIMITED');
  assert.equal(responses[2].success, true, 'a failed capture must release the queue');
  now += 1000;
  assert.equal((await send(h.messageEvent.listener, { action: 'CAPTURE_VISIBLE_TAB' }, sender)).success, true);
  assert.equal(starts.at(-1), 12220);
  assert.equal(waits.length, 2, 'no extra delay after an idle interval');
});

test('visible capture queue rechecks the active tab after waiting', async () => {
  let now = 10000, activeId = 7, captures = 0;
  const h = await createHarness(CaptureStore, { clock: () => now, delay: async ms => { now += ms; activeId = 8; } });
  h.chrome.tabs.query = async () => [{ id: activeId, windowId: 3 }];
  h.chrome.tabs.captureVisibleTab = async () => { captures++; return 'fixture'; };
  const sender = { id: 'test-extension', tab: { id: 7, windowId: 3 }, url: 'https://example.com' };
  assert.equal((await send(h.messageEvent.listener, { action: 'CAPTURE_VISIBLE_TAB' }, sender)).success, true);
  const response = await send(h.messageEvent.listener, { action: 'CAPTURE_VISIBLE_TAB' }, sender);
  assert.equal(response.success, false);
  assert.equal(response.errorCode, 'TAB_CHANGED');
  assert.equal(captures, 1);
});

test('library retention reconciles at wake-up and reschedules without deleting future projects', async () => {
  const now = Date.now();
  const projects = new Map([
    ['expired', { id: 'expired', expiresAt: now - 1000 }],
    ['future', { id: 'future', expiresAt: now + 300000 }],
    ['permanent', { id: 'permanent', expiresAt: null }]
  ]);
  const store = Object.assign({}, CaptureStore, {
    async listLibraryProjects() { return [...projects.values()]; },
    async purgeExpiredLibraryProjects(cutoff) {
      const deleted = [];
      for (const [id, project] of projects) {
        if (typeof project.expiresAt === 'number' && project.expiresAt <= cutoff) { projects.delete(id); deleted.push(id); }
      }
      return deleted;
    }
  });
  const h = await createHarness(store);
  assert.equal(projects.has('expired'), false);
  assert.equal(projects.has('future'), true);
  assert.equal(projects.has('permanent'), true);
  assert.equal(h.alarms.get('library-project-expiry').when, now + 300000);
  // A retention update immediately before an old alarm must win atomically.
  projects.get('future').expiresAt = now + 600000;
  await h.chrome.alarms.onAlarm.listener({ name: 'library-project-expiry' });
  assert.equal(projects.has('future'), true);
  assert.equal(h.alarms.get('library-project-expiry').when, now + 600000);
  projects.get('future').expiresAt = null;
  const response = await send(h.messageEvent.listener, { action: 'LIBRARY_PROJECTS_CHANGED' }, {
    id: 'test-extension', url: 'chrome-extension://test-extension/editor.html'
  });
  assert.equal(response.success, true);
  assert.equal(h.alarms.has('library-project-expiry'), false);
  assert.equal(projects.has('future'), true);
  assert.equal(h.messageEvent.listener({ action: 'LIBRARY_PROJECTS_CHANGED' }, {
    id: 'test-extension', url: 'https://example.com/'
  }, () => {}), undefined);
});

test('real library expiry purge removes only due projects from both stores', async () => {
  const id = 'background-library-' + crypto.randomUUID();
  const now = Date.now();
  const ids = [id + '-expired', id + '-future', id + '-permanent'];
  try {
    await CaptureStore.saveLibraryProject({ id: ids[0], blob: new Blob(['a']), expiresAt: now - 1 }, { expectedRevision: null });
    await CaptureStore.saveLibraryProject({ id: ids[1], blob: new Blob(['b']), expiresAt: now + 300000 }, { expectedRevision: null });
    await CaptureStore.saveLibraryProject({ id: ids[2], blob: new Blob(['c']), expiresAt: null }, { expectedRevision: null });
    const h = await createHarness();
    assert.equal(await CaptureStore.getLibraryProject(ids[0]), undefined);
    assert.ok(await CaptureStore.getLibraryProject(ids[1]));
    assert.ok(await CaptureStore.getLibraryProject(ids[2]));
    assert.equal(h.alarms.get('library-project-expiry').when, now + 300000);
  } finally {
    for (const projectId of ids) {
      const project = await CaptureStore.getLibraryProject(projectId);
      if (project) await CaptureStore.deleteLibraryProject(projectId, project.revision);
    }
  }
});

test('library expiry failure schedules a retry and leaves temporary capture cleanup operational', async () => {
  let fail = true;
  const store = Object.assign({}, CaptureStore, {
    async purgeExpiredLibraryProjects() { if (fail) throw new Error('database unavailable'); return []; },
    async listLibraryProjects() { return []; }
  });
  const h = await createHarness(store);
  assert.ok(h.alarms.get('library-project-expiry').when > Date.now());
  const past = Date.now() - 1200000;
  await CaptureStore.putCapture({ id: 'library-failure-capture', createdAt: past, expiresAt: past + 900000, blob: new Blob(['image']) });
  await h.chrome.runtime.onStartup.listener();
  assert.equal(await CaptureStore.getCapture('library-failure-capture'), undefined);
  fail = false;
  await h.chrome.alarms.onAlarm.listener({ name: 'library-project-expiry' });
  assert.equal(h.alarms.has('library-project-expiry'), false);
});

test('service worker persists a chunked PNG, opens the editor, keeps it after acknowledgement until the editor closes', async () => {
  const harness = await createHarness();
  const sender = { id: 'test-extension', tab: { id: 7, windowId: 3 }, url: 'https://example.com/page' };
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  const begin = await send(harness.messageEvent.listener, {
    action: 'BEGIN_CAPTURE_TRANSFER', expectedBytes: png.length, expectedChunks: 1,
    title: 'Test', url: 'https://example.com', scale: 1
  }, sender);
  assert.equal(begin.success, true);
  const append = await send(harness.messageEvent.listener, {
    action: 'APPEND_CAPTURE_CHUNK', transferId: begin.transferId, index: 0, data: png.toString('base64')
  }, sender);
  assert.equal(append.nextIndex, 1);
  const complete = await send(harness.messageEvent.listener, { action: 'COMPLETE_CAPTURE_TRANSFER', transferId: begin.transferId }, sender);
  assert.equal(complete.success, true);
  assert.equal((await CaptureStore.getCapture(complete.captureId)).title, 'Test');
  const mapping = Object.entries(harness.sessionValues).find(([, value]) => value === complete.captureId);
  assert.ok(mapping);
  const editorTabId = Number(mapping[0].slice('capture-tab:'.length));
  const acknowledgement = await send(harness.messageEvent.listener, {
    action: 'ACK_CAPTURE_LOADED', captureId: complete.captureId
  }, { id: 'test-extension', tab: { id: editorTabId, windowId: 3 }, url: 'chrome-extension://test-extension/editor.html?capture=' + complete.captureId });
  assert.equal(acknowledgement.success, true);
  assert.equal((await CaptureStore.getCapture(complete.captureId)).title, 'Test');
  assert.equal(harness.sessionValues[mapping[0]], complete.captureId);
  await harness.chrome.tabs.remove(editorTabId);
  assert.equal(await CaptureStore.getCapture(complete.captureId), undefined);
  assert.equal(harness.sessionValues[mapping[0]], undefined);
});

test('service worker bounds transfer text metadata and strips invalid entries', async () => {
  const harness = await createHarness();
  const sender = { id: 'test-extension', tab: { id: 7, windowId: 3 }, url: 'https://example.com' };
  const begin = await send(harness.messageEvent.listener, {
    action: 'BEGIN_CAPTURE_TRANSFER', expectedBytes: 1, expectedChunks: 1,
    textBlocks: [{ text: 'valid', x: 0, y: 0, width: 10, height: 10, fontSize: 12 }, { text: 'bad', x: 'nope' }]
  }, sender);
  assert.equal(begin.success, true);
  const transfer = await CaptureStore.getTransfer(begin.transferId);
  assert.deepEqual(transfer.textBlocks, [{ text: 'valid', x: 0, y: 0, width: 10, height: 10, fontSize: 12, url: '' }]);
  await send(harness.messageEvent.listener, { action: 'ABORT_CAPTURE_TRANSFER', transferId: begin.transferId }, sender);
});

test('concurrent transfer appends are serialized and duplicate payloads cannot overwrite', async () => {
  const original = CaptureStore.appendTransferChunk;
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const store = Object.assign({}, CaptureStore, {
    async appendTransferChunk(...args) { await gate; return original(...args); }
  });
  const harness = await createHarness(store);
  const sender = { id: 'test-extension', tab: { id: 7, windowId: 3 }, url: 'https://example.com' };
  const begin = await send(harness.messageEvent.listener, { action: 'BEGIN_CAPTURE_TRANSFER', expectedBytes: 1, expectedChunks: 1 }, sender);
  const first = send(harness.messageEvent.listener, { action: 'APPEND_CAPTURE_CHUNK', transferId: begin.transferId, index: 0, data: 'AA==' }, sender);
  const second = send(harness.messageEvent.listener, { action: 'APPEND_CAPTURE_CHUNK', transferId: begin.transferId, index: 0, data: 'AQ==' }, sender);
  await Promise.resolve();
  await Promise.resolve();
  release();
  const responses = await Promise.all([first, second]);
  assert.equal(responses.filter(response => response.success).length, 2);
  assert.equal(responses.filter(response => response.duplicate).length, 1);
  assert.deepEqual(await (await CaptureStore.getTransferChunk(begin.transferId, 0)).blob.arrayBuffer().then(bytes => [...new Uint8Array(bytes)]), [0]);
  await send(harness.messageEvent.listener, { action: 'ABORT_CAPTURE_TRANSFER', transferId: begin.transferId }, sender);
});

test('service worker rejects out-of-order chunks', async () => {
  const harness = await createHarness();
  const sender = { id: 'test-extension', tab: { id: 7, windowId: 3 }, url: 'https://example.com' };
  const begin = await send(harness.messageEvent.listener, {
    action: 'BEGIN_CAPTURE_TRANSFER', expectedBytes: ScionosCaptureUtils.TRANSFER_CHUNK_BYTES + 1, expectedChunks: 2
  }, sender);
  const response = await send(harness.messageEvent.listener, {
    action: 'APPEND_CAPTURE_CHUNK', transferId: begin.transferId, index: 1, data: 'AA=='
  }, sender);
  assert.equal(response.success, false);
  assert.match(response.error, /order/i);
  await send(harness.messageEvent.listener, { action: 'ABORT_CAPTURE_TRANSFER', transferId: begin.transferId }, sender);
});


test('active editors survive expiry and wake-up, including a lost session mapping', async () => {
  const h = await createHarness();
  const expired = Date.now() - 20 * 60 * 1000;
  await CaptureStore.putCapture({ id: 'active-expired', createdAt: expired, expiresAt: expired + 15 * 60 * 1000, blob: new Blob(['image']) });
  h.tabs.set(91, { id: 91, url: 'chrome-extension://test-extension/editor.html?capture=active-expired' });
  await h.chrome.runtime.onStartup.listener();
  assert.equal(h.sessionValues['capture-tab:91'], 'active-expired');
  assert.ok(await CaptureStore.getCapture('active-expired'));
  await h.chrome.alarms.onAlarm.listener({ name: 'capture-expiry:active-expired' });
  assert.ok(await CaptureStore.getCapture('active-expired'));
  assert.equal(h.alarms.has('capture-expiry:active-expired'), false);
  await h.chrome.tabs.remove(91);
  assert.equal(await CaptureStore.getCapture('active-expired'), undefined);
});

test('worker startup restores open editor mappings from extension contexts without tab URL permission', async () => {
  const h = await createHarness();
  const createdAt = Date.now();
  const captureId = 'context-only-editor';
  await CaptureStore.putCapture({ id: captureId, createdAt, expiresAt: createdAt + 60000, blob: new Blob(['image']) });
  h.tabs.set(91, { id: 91, windowId: 3 });
  h.sessionValues['capture-tab:91'] = captureId;
  await h.chrome.alarms.create('capture-expiry:' + captureId, { when: createdAt + 60000 });
  h.chrome.runtime.getContexts = async () => [{
    contextType: 'TAB', tabId: 91,
    documentUrl: 'chrome-extension://test-extension/editor.html?capture=' + captureId
  }];

  await h.chrome.runtime.onStartup.listener();

  assert.equal(h.sessionValues['capture-tab:91'], captureId);
  assert.equal(h.alarms.has('capture-expiry:' + captureId), false);
  const acknowledgement = await send(h.messageEvent.listener, { action: 'ACK_CAPTURE_LOADED', captureId }, {
    id: 'test-extension', tab: { id: 91, windowId: 3 },
    url: 'chrome-extension://test-extension/editor.html?capture=' + captureId
  });
  assert.equal(acknowledgement.success, true);
  assert.ok(await CaptureStore.getCapture(captureId));
});

test('wake-up expires orphan captures and discards stale mappings', async () => {
  const h = await createHarness();
  const createdAt = Date.now() - 20 * 60 * 1000;
  await CaptureStore.putCapture({ id: 'orphan-expired', createdAt, expiresAt: createdAt + 15 * 60 * 1000, blob: new Blob(['image']) });
  h.sessionValues['capture-tab:99'] = 'orphan-expired';
  await h.chrome.runtime.onStartup.listener();
  assert.equal(await CaptureStore.getCapture('orphan-expired'), undefined);
  assert.equal(h.sessionValues['capture-tab:99'], undefined);
});

test('early alarms reschedule captures and refreshed transfers instead of deleting them', async () => {
  const h = await createHarness();
  const createdAt = Date.now();
  await CaptureStore.putCapture({ id: 'future-orphan', createdAt, expiresAt: createdAt + 900000, blob: new Blob(['image']) });
  await h.chrome.alarms.onAlarm.listener({ name: 'capture-expiry:future-orphan' });
  assert.ok(await CaptureStore.getCapture('future-orphan'));
  assert.ok(h.alarms.has('capture-expiry:future-orphan'));
  await CaptureStore.putTransfer({ id: 'refreshed-transfer', ownerTabId: 7, expiresAt: createdAt + 900000 });
  await h.chrome.alarms.onAlarm.listener({ name: 'capture-transfer-expiry:refreshed-transfer' });
  assert.ok(await CaptureStore.getTransfer('refreshed-transfer'));
  await CaptureStore.deleteCapture('future-orphan');
  await CaptureStore.deleteTransfer('refreshed-transfer');
});

test('leaving an editor makes its expired capture eligible for orphan cleanup', async () => {
  const h = await createHarness();
  const createdAt = Date.now() - 1200000;
  await CaptureStore.putCapture({ id: 'navigated', createdAt, expiresAt: createdAt + 900000, blob: new Blob(['image']) });
  h.tabs.set(92, { id: 92, url: 'chrome-extension://test-extension/editor.html?capture=navigated' });
  await h.chrome.runtime.onStartup.listener();
  h.tabs.set(92, { id: 92, url: 'https://example.com' });
  await h.chrome.tabs.onUpdated.listener(92, { url: 'https://example.com' });
  await vm.runInContext('storageInitialization', h.context);
  assert.equal(await CaptureStore.getCapture('navigated'), undefined);
});
