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
  const chrome = {
    runtime: {
      id: 'test-extension',
      getURL: relative => 'chrome-extension://test-extension/' + relative,
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
      query: async () => [{ id: 7, windowId: 3 }],
      captureVisibleTab: async () => '',
      create: async () => ({ id: ++nextTabId }),
      remove: async () => {},
      onRemoved: removedEvent
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
  return { chrome, messageEvent, alarms, sessionValues };
}

function send(listener, message, sender) {
  return new Promise((resolve, reject) => {
    const keepAlive = listener(message, sender, resolve);
    if (keepAlive !== true) reject(new Error('Message was not accepted'));
  });
}

test('service worker persists a chunked PNG, opens the editor, and deletes it after acknowledgement', async () => {
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
