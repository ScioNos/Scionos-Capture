const test = require('node:test');
const assert = require('node:assert/strict');
require('fake-indexeddb/auto');

const CaptureStore = require('../capture-store.js');

test('stores, lists, reads and deletes a capture record', async () => {
  const id = `store-${Date.now()}`;
  const record = { id, blob: new Blob(['png'], { type: 'image/png' }), createdAt: Date.now() };
  await CaptureStore.putCapture(record);
  assert.equal((await CaptureStore.getCapture(id)).id, id);
  assert.ok((await CaptureStore.listCaptures()).some(item => item.id === id));
  await CaptureStore.deleteCapture(id);
  assert.equal(await CaptureStore.getCapture(id), undefined);
});

test('purges only records older than the requested TTL', async () => {
  const now = Date.now();
  const expiredId = `expired-${now}`;
  const freshId = `fresh-${now}`;
  await CaptureStore.putCapture({ id: expiredId, createdAt: now - 2_000 });
  await CaptureStore.putCapture({ id: freshId, createdAt: now - 500 });
  const deleted = await CaptureStore.purgeExpiredCaptures(1_000, now);
  assert.equal(deleted, 1);
  assert.equal(await CaptureStore.getCapture(expiredId), undefined);
  assert.equal((await CaptureStore.getCapture(freshId)).id, freshId);
  await CaptureStore.deleteCapture(freshId);
});

test('persists ordered transfer chunks and cleans them atomically', async () => {
  const now = Date.now();
  const transfer = { id: 'transfer-' + now, ownerTabId: 7, expiresAt: now + 60_000 };
  await CaptureStore.putTransfer(transfer);
  await CaptureStore.putTransferChunk({ transferId: transfer.id, index: 1, blob: new Blob(['b']), size: 1 });
  await CaptureStore.putTransferChunk({ transferId: transfer.id, index: 0, blob: new Blob(['a']), size: 1 });
  assert.equal((await CaptureStore.getTransfer(transfer.id)).ownerTabId, 7);
  assert.deepEqual((await CaptureStore.listTransferChunks(transfer.id)).map(chunk => chunk.index), [0, 1]);
  assert.equal((await CaptureStore.listTransfersByOwner(7))[0].id, transfer.id);
  await CaptureStore.deleteTransfer(transfer.id);
  assert.equal(await CaptureStore.getTransfer(transfer.id), undefined);
  assert.deepEqual(await CaptureStore.listTransferChunks(transfer.id), []);
});

test('appends a chunk and advances transfer metadata in one transaction', async () => {
  const id = 'atomic-transfer-' + Date.now();
  const transfer = { id, ownerTabId: 12, expectedBytes: 1, expectedChunks: 1, receivedBytes: 1, nextIndex: 1, expiresAt: Date.now() + 60_000 };
  const chunk = { transferId: id, index: 0, blob: new Blob(['x']), size: 1 };
  await CaptureStore.putTransfer({ ...transfer, receivedBytes: 0, nextIndex: 0 });
  await CaptureStore.appendTransferChunk(transfer, chunk);
  assert.deepEqual(await CaptureStore.getTransfer(id), transfer);
  assert.equal((await CaptureStore.getTransferChunk(id, 0)).size, 1);
  await CaptureStore.deleteTransfer(id);
});

test('purges expired transfer metadata and chunks', async () => {
  const now = Date.now();
  const id = 'expired-transfer-' + now;
  await CaptureStore.putTransfer({ id, ownerTabId: 9, expiresAt: now - 1 });
  await CaptureStore.putTransferChunk({ transferId: id, index: 0, blob: new Blob(['x']), size: 1 });
  assert.deepEqual(await CaptureStore.purgeExpiredTransfers(now), [id]);
  assert.equal(await CaptureStore.getTransfer(id), undefined);
  assert.deepEqual(await CaptureStore.listTransferChunks(id), []);
});

test('caches capture records in memory and invalidates on deletion', async () => {
  CaptureStore.clearCaptureCache();
  const id = `cache-test-${Date.now()}`;
  const record = { id, title: 'Cache Test', createdAt: Date.now() };
  await CaptureStore.putCapture(record);

  assert.equal(CaptureStore.captureCache.has(id), true);
  const cached = await CaptureStore.getCapture(id);
  assert.equal(cached.title, 'Cache Test');

  await CaptureStore.deleteCapture(id);
  assert.equal(CaptureStore.captureCache.has(id), false);
});

test('applies versioned migrations sequentially', () => {
  const fakeStore = {
    indexNames: { contains: () => false },
    createIndex: () => {}
  };
  const fakeDb = {
    objectStoreNames: { contains: () => false },
    createObjectStore: () => fakeStore
  };
  const fakeTx = { objectStore: () => fakeStore };

  assert.equal(typeof CaptureStore.applyMigrations, 'function');
  assert.equal(typeof CaptureStore.MIGRATIONS[1], 'function');
  assert.equal(typeof CaptureStore.MIGRATIONS[2], 'function');

  // Verify running migrations 1 to 2
  CaptureStore.applyMigrations(fakeDb, fakeTx, 0, 2);
  CaptureStore.applyMigrations(fakeDb, fakeTx, 1, 2);
});
