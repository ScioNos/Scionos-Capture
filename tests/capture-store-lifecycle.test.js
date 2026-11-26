const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadStore(indexedDB) {
  const context = vm.createContext({ indexedDB, Blob, console });
  vm.runInContext(fs.readFileSync(require.resolve('../capture-store.js'), 'utf8'), context);
  return context.CaptureStore;
}

test('closes an IndexedDB connection opened after a blocked request was rejected', async () => {
  const request = {};
  let closed = 0;
  const store = loadStore({ open: () => request });
  const pending = store.getLibrarySettings();
  request.onblocked();
  await assert.rejects(pending, /bloqu/);
  request.result = { close: () => { closed++; } };
  request.onsuccess();
  assert.equal(closed, 1, 'the abandoned connection must not block subsequent upgrades');
});

test('closes an IndexedDB connection when transaction creation throws', async () => {
  const request = {};
  let closed = 0;
  const store = loadStore({ open: () => request });
  const pending = store.getLibrarySettings();
  request.result = { close: () => { closed++; }, transaction: () => { throw new Error('connection unavailable'); } };
  request.onsuccess();
  await assert.rejects(pending, /connection unavailable/);
  assert.equal(closed, 1);
});

test('temporary captures observe updates and deletion from another extension context', async () => {
  const { IDBFactory } = require('fake-indexeddb');
  const database = new IDBFactory();
  const first = loadStore(database);
  const second = loadStore(database);
  await first.putCapture({ id: 'shared', title: 'initial', blob: new Blob(['pixels']) });
  assert.equal((await second.getCapture('shared')).title, 'initial');
  await first.putCapture({ id: 'shared', title: 'updated', blob: new Blob(['new pixels']) });
  assert.equal((await second.getCapture('shared')).title, 'updated');
  await first.deleteCapture('shared');
  assert.equal(await second.getCapture('shared'), undefined);
});

test('mutating a caller-owned capture cannot change the persisted record', async () => {
  const { IDBFactory } = require('fake-indexeddb');
  const store = loadStore(new IDBFactory());
  const record = { id: 'immutable', title: 'persisted' };
  await store.putCapture(record);
  record.title = 'not persisted';
  assert.equal((await store.getCapture(record.id)).title, 'persisted');
  const read = await store.getCapture(record.id);
  read.title = 'also not persisted';
  assert.equal((await store.getCapture(record.id)).title, 'persisted');
  await store.deleteCapture(record.id);
});
