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
