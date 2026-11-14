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

test('returns stored captures and drops them on deletion', async () => {
  const id = `cache-test-${Date.now()}`;
  const record = { id, title: 'Cache Test', createdAt: Date.now() };
  await CaptureStore.putCapture(record);

  const cached = await CaptureStore.getCapture(id);
  assert.equal(cached.title, 'Cache Test');

  await CaptureStore.deleteCapture(id);
  assert.equal(await CaptureStore.getCapture(id), undefined);
});

test('keeps every capture readable when the memory cache overflows', async () => {
  const ids = [];
  for (let i = 0; i < 8; i += 1) {
    const id = `lru-${Date.now()}-${i}`;
    ids.push(id);
    await CaptureStore.putCapture({ id, title: `Doc ${i}`, createdAt: Date.now() });
  }
  for (let i = 0; i < ids.length; i += 1) {
    assert.equal((await CaptureStore.getCapture(ids[i])).title, `Doc ${i}`);
  }
  await Promise.all(ids.map(id => CaptureStore.deleteCapture(id)));
  assert.equal(await CaptureStore.getCapture(ids[0]), undefined);
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
  assert.equal(typeof CaptureStore.MIGRATIONS[3], 'function');
  CaptureStore.applyMigrations(fakeDb, fakeTx, 2, 3);
});

test('upgrades an actual v2 database while preserving temporary data', async () => {
  const { IDBFactory } = require('fake-indexeddb');
  const original = globalThis.indexedDB;
  const isolated = new IDBFactory();
  globalThis.indexedDB = isolated;
  try {
    const db = await new Promise((resolve, reject) => {
      const request = isolated.open('scionos-capture', 2);
      request.onupgradeneeded = () => CaptureStore.applyMigrations(request.result, request.transaction, 0, 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(['captures', 'transfers', 'captureChunks'], 'readwrite');
      transaction.objectStore('captures').put({ id: 'migration-capture', createdAt: 100 });
      transaction.objectStore('transfers').put({ id: 'migration-transfer', expiresAt: 1000, ownerTabId: 1 });
      transaction.objectStore('captureChunks').put({ transferId: 'migration-transfer', index: 0, blob: new Blob(['part']) });
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
    assert.equal((await CaptureStore.getCapture('migration-capture')).createdAt, 100);
    assert.equal((await CaptureStore.getTransfer('migration-transfer')).ownerTabId, 1);
    assert.equal(await (await CaptureStore.getTransferChunk('migration-transfer', 0)).blob.text(), 'part');
    assert.deepEqual(await CaptureStore.listLibraryProjects(), []);
    assert.equal((await CaptureStore.getLibrarySettings()).quotaBytes, 256 * 1024 * 1024);
    await CaptureStore.deleteCapture('migration-capture');
  } finally { globalThis.indexedDB = original; }
});

const makeProject = (id, extra = {}) => ({ id, title: 'My project', source: 'https://example.com', blob: new Blob(['project']), thumbnail: new Blob(['thumb'], { type: 'image/png' }), ...extra });

test('library stores metadata separately and provides revision-checked atomic updates and duplication', async () => {
  const id = 'library-roundtrip';
  const created = await CaptureStore.saveLibraryProject(makeProject(id), { expectedRevision: null });
  assert.equal(created.revision, 1);
  assert.equal(created.size, 12);
  const list = await CaptureStore.listLibraryProjects();
  const row = list.find(item => item.id === id);
  assert.ok(row);
  assert.equal(Object.hasOwn(row, 'blob'), false);
  assert.equal(await (await CaptureStore.getLibraryProject(id)).blob.text(), 'project');
  const updated = await CaptureStore.saveLibraryProject(makeProject(id, { title: 'Updated', blob: new Blob(['new']) }), { expectedRevision: 1 });
  assert.equal(updated.revision, 2);
  assert.equal(updated.createdAt, created.createdAt);
  await assert.rejects(CaptureStore.saveLibraryProject(makeProject(id, { title: 'Stale' }), { expectedRevision: 1 }), { code: 'LIBRARY_CONFLICT' });
  assert.equal((await CaptureStore.getLibraryProject(id)).title, 'Updated');
  assert.equal(await (await CaptureStore.getLibraryProject(id)).blob.text(), 'new');
  const copy = await CaptureStore.duplicateLibraryProject(id, 'library-copy', { title: 'Copy', expectedRevision: 2 });
  assert.equal(copy.revision, 1);
  assert.equal(await (await CaptureStore.getLibraryProject('library-copy')).blob.text(), 'new');
  await assert.rejects(CaptureStore.deleteLibraryProject(id, 1), { code: 'LIBRARY_CONFLICT' });
  await assert.rejects(CaptureStore.deleteLibraryProject('missing', null), { code: 'INVALID_LIBRARY_INPUT' });
  await assert.rejects(CaptureStore.duplicateLibraryProject('missing', 'copy-missing', { expectedRevision: null }), { code: 'INVALID_LIBRARY_INPUT' });
  await CaptureStore.deleteLibraryProject(id, 2);
  await CaptureStore.deleteLibraryProject('library-copy', 1);
  assert.equal(await CaptureStore.getLibraryProject(id), undefined);
});

test('concurrent updates with the same revision allow exactly one writer', async () => {
  const id = 'library-concurrent';
  await CaptureStore.saveLibraryProject(makeProject(id), { expectedRevision: null });
  const results = await Promise.allSettled(['first', 'second'].map(title => CaptureStore.saveLibraryProject(makeProject(id, { title }), { expectedRevision: 1 })));
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.find(result => result.status === 'rejected').reason.code, 'LIBRARY_CONFLICT');
  assert.equal((await CaptureStore.getLibraryProject(id)).revision, 2);
  await CaptureStore.deleteLibraryProject(id, 2);
});

test('library quota is configured, enforced atomically, and includes thumbnails', async () => {
  const mib = 1024 * 1024;
  await CaptureStore.setLibrarySettings({ quotaBytes: 64 * mib, retentionDays: null });
  try {
    await assert.rejects(CaptureStore.setLibrarySettings({ quotaBytes: 63 * mib, retentionDays: null }), { code: 'INVALID_LIBRARY_INPUT' });
    await assert.rejects(CaptureStore.setLibrarySettings({ quotaBytes: 1025 * mib, retentionDays: null }), { code: 'INVALID_LIBRARY_INPUT' });
    const bytes = new Uint8Array(64 * mib);
    const exact = new Blob([bytes]);
    await CaptureStore.saveLibraryProject(makeProject('library-full', { blob: exact, thumbnail: null }), { expectedRevision: null });
    await assert.rejects(CaptureStore.saveLibraryProject(makeProject('library-over'), { expectedRevision: null }), { code: 'LIBRARY_QUOTA_EXCEEDED' });
    await assert.rejects(CaptureStore.duplicateLibraryProject('library-full', 'library-duplicate-over', { expectedRevision: 1 }), { code: 'LIBRARY_QUOTA_EXCEEDED' });
    assert.equal(await CaptureStore.getLibraryProject('library-duplicate-over'), undefined);
    await assert.rejects(CaptureStore.saveLibraryProject(makeProject('library-full', { blob: exact }), { expectedRevision: 1 }), { code: 'LIBRARY_QUOTA_EXCEEDED' });
    assert.equal((await CaptureStore.getLibraryProject('library-full')).revision, 1);
    assert.equal(await CaptureStore.getLibraryProject('library-over'), undefined);
    await CaptureStore.setLibrarySettings({ quotaBytes: 128 * mib, retentionDays: null });
    await CaptureStore.saveLibraryProject(makeProject('library-extra'), { expectedRevision: null });
    await assert.rejects(CaptureStore.setLibrarySettings({ quotaBytes: 64 * mib, retentionDays: null }), { code: 'LIBRARY_QUOTA_EXCEEDED' });
    assert.equal((await CaptureStore.getLibrarySettings()).quotaBytes, 128 * mib);
    await CaptureStore.deleteLibraryProject('library-extra', 1);
    await CaptureStore.deleteLibraryProject('library-full', 1);
  } finally { await CaptureStore.setLibrarySettings({ quotaBytes: 256 * mib, retentionDays: null }); }
});

test('retention and purge affect only expired library projects, never temporary captures or transfers', async () => {
  const now = Date.now();
  await CaptureStore.setLibrarySettings({ quotaBytes: 256 * 1024 * 1024, retentionDays: 2 });
  try {
    const saved = await CaptureStore.saveLibraryProject(makeProject('library-retained'), { expectedRevision: null });
    assert.ok(saved.expiresAt >= now + 2 * 86400000);
    await CaptureStore.saveLibraryProject(makeProject('library-expired', { expiresAt: now - 1 }), { expectedRevision: null });
    await CaptureStore.putCapture({ id: 'library-expired', createdAt: 1 });
    await CaptureStore.putTransfer({ id: 'library-expired', ownerTabId: 1, expiresAt: 1 });
    await CaptureStore.putTransferChunk({ transferId: 'library-expired', index: 0, blob: new Blob(['temporary']) });
    assert.deepEqual(await CaptureStore.purgeExpiredLibraryProjects(now), ['library-expired']);
    assert.equal(await CaptureStore.getLibraryProject('library-expired'), undefined);
    assert.ok(await CaptureStore.getCapture('library-expired'));
    assert.ok(await CaptureStore.getTransfer('library-expired'));
    assert.ok(await CaptureStore.getTransferChunk('library-expired', 0));
    assert.ok(await CaptureStore.getLibraryProject('library-retained'));
    await CaptureStore.deleteLibraryProject('library-retained', 1);
    await CaptureStore.deleteCapture('library-expired');
    await CaptureStore.deleteTransfer('library-expired');
  } finally { await CaptureStore.setLibrarySettings({ quotaBytes: 256 * 1024 * 1024, retentionDays: null }); }
});
