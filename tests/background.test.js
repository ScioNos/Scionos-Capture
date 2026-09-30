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

async function createHarness() {
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
    chrome, CaptureStore, ScionosCaptureUtils, Blob, URL, Uint8Array, fetch: globalThis.fetch,
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
