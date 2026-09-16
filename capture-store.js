// Temporary, extension-origin storage for screenshots and chunked transfers.
(function registerCaptureStore(globalScope, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  globalScope.CaptureStore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const DATABASE_NAME = 'scionos-capture';
  const DATABASE_VERSION = 2;
  const CAPTURE_STORE = 'captures';
  const TRANSFER_STORE = 'transfers';
  const CHUNK_STORE = 'captureChunks';

  const MIGRATIONS = {
    1: (database, transaction) => {
      const captures = database.objectStoreNames.contains(CAPTURE_STORE)
        ? transaction.objectStore(CAPTURE_STORE)
        : database.createObjectStore(CAPTURE_STORE, { keyPath: 'id' });
      if (!captures.indexNames.contains('createdAt')) {
        captures.createIndex('createdAt', 'createdAt', { unique: false });
      }
    },
    2: (database, transaction) => {
      const transfers = database.objectStoreNames.contains(TRANSFER_STORE)
        ? transaction.objectStore(TRANSFER_STORE)
        : database.createObjectStore(TRANSFER_STORE, { keyPath: 'id' });
      if (!transfers.indexNames.contains('expiresAt')) {
        transfers.createIndex('expiresAt', 'expiresAt', { unique: false });
      }
      if (!transfers.indexNames.contains('ownerTabId')) {
        transfers.createIndex('ownerTabId', 'ownerTabId', { unique: false });
      }

      const chunks = database.objectStoreNames.contains(CHUNK_STORE)
        ? transaction.objectStore(CHUNK_STORE)
        : database.createObjectStore(CHUNK_STORE, { keyPath: ['transferId', 'index'] });
      if (!chunks.indexNames.contains('transferId')) {
        chunks.createIndex('transferId', 'transferId', { unique: false });
      }
    }
  };

  function applyMigrations(database, transaction, oldVersion, newVersion) {
    for (let version = oldVersion + 1; version <= newVersion; version += 1) {
      if (typeof MIGRATIONS[version] === 'function') {
        MIGRATIONS[version](database, transaction);
      }
    }
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = event => {
        const database = request.result;
        const transaction = request.transaction;
        const oldVersion = (event && event.oldVersion) || 0;
        const newVersion = (event && event.newVersion) || DATABASE_VERSION;
        applyMigrations(database, transaction, oldVersion, newVersion);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Impossible d’ouvrir le stockage temporaire.'));
    });
  }

  function runRequest(storeName, mode, createRequest) {
    return openDatabase().then(database => new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, mode);
      const request = createRequest(transaction.objectStore(storeName));
      let result;
      request.onsuccess = () => { result = request.result; };
      request.onerror = () => reject(request.error || new Error('Opération de stockage impossible.'));
      transaction.oncomplete = () => { database.close(); resolve(result); };
      transaction.onerror = () => { database.close(); reject(transaction.error || new Error('Opération de stockage impossible.')); };
      transaction.onabort = () => { database.close(); reject(transaction.error || new Error('Opération de stockage annulée.')); };
    }));
  }

  const captureCache = new Map();

  function clearCaptureCache() {
    captureCache.clear();
  }

  const putCapture = async record => {
    const result = await runRequest(CAPTURE_STORE, 'readwrite', store => store.put(record));
    if (record && record.id) captureCache.set(record.id, record);
    return result;
  };

  const getCapture = async id => {
    if (captureCache.has(id)) return captureCache.get(id);
    const record = await runRequest(CAPTURE_STORE, 'readonly', store => store.get(id));
    if (record) captureCache.set(id, record);
    return record;
  };

  const deleteCapture = async id => {
    captureCache.delete(id);
    return runRequest(CAPTURE_STORE, 'readwrite', store => store.delete(id));
  };
  const listCaptures = () => runRequest(CAPTURE_STORE, 'readonly', store => store.getAll());
  const putTransfer = record => runRequest(TRANSFER_STORE, 'readwrite', store => store.put(record));
  const getTransfer = id => runRequest(TRANSFER_STORE, 'readonly', store => store.get(id));
  const listTransfers = () => runRequest(TRANSFER_STORE, 'readonly', store => store.getAll());
  const putTransferChunk = record => runRequest(CHUNK_STORE, 'readwrite', store => store.put(record));
  const getTransferChunk = (transferId, index) => runRequest(CHUNK_STORE, 'readonly', store => store.get([transferId, index]));

  async function listTransferChunks(transferId) {
    const database = await openDatabase();
    try {
      return await new Promise((resolve, reject) => {
        const transaction = database.transaction(CHUNK_STORE, 'readonly');
        const request = transaction.objectStore(CHUNK_STORE).index('transferId').getAll(IDBKeyRange.only(transferId));
        request.onsuccess = () => resolve(request.result.sort((a, b) => a.index - b.index));
        request.onerror = () => reject(request.error || new Error('Lecture des fragments impossible.'));
      });
    } finally { database.close(); }
  }

  async function deleteTransfer(id) {
    const database = await openDatabase();
    try {
      await new Promise((resolve, reject) => {
        const transaction = database.transaction([TRANSFER_STORE, CHUNK_STORE], 'readwrite');
        transaction.objectStore(TRANSFER_STORE).delete(id);
        const index = transaction.objectStore(CHUNK_STORE).index('transferId');
        const cursorRequest = index.openCursor(IDBKeyRange.only(id));
        cursorRequest.onsuccess = () => {
          const cursor = cursorRequest.result;
          if (!cursor) return;
          cursor.delete();
          cursor.continue();
        };
        cursorRequest.onerror = () => reject(cursorRequest.error || new Error('Suppression des fragments impossible.'));
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error || new Error('Suppression du transfert impossible.'));
        transaction.onabort = () => reject(transaction.error || new Error('Suppression du transfert annulée.'));
      });
    } finally { database.close(); }
  }

  async function purgeByIndex(storeName, indexName, cutoff, deleteRelatedChunks = false) {
    const database = await openDatabase();
    const deletedIds = [];
    try {
      await new Promise((resolve, reject) => {
        const stores = deleteRelatedChunks ? [storeName, CHUNK_STORE] : [storeName];
        const transaction = database.transaction(stores, 'readwrite');
        const request = transaction.objectStore(storeName).index(indexName).openCursor(IDBKeyRange.upperBound(cutoff));
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) return;
          const id = cursor.primaryKey;
          deletedIds.push(id);
          cursor.delete();
          if (deleteRelatedChunks) {
            const chunkRequest = transaction.objectStore(CHUNK_STORE).index('transferId').openCursor(IDBKeyRange.only(id));
            chunkRequest.onsuccess = () => {
              const chunkCursor = chunkRequest.result;
              if (!chunkCursor) return;
              chunkCursor.delete();
              chunkCursor.continue();
            };
          }
          cursor.continue();
        };
        request.onerror = () => reject(request.error || new Error('Purge impossible.'));
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error || new Error('Purge impossible.'));
        transaction.onabort = () => reject(transaction.error || new Error('Purge annulée.'));
      });
      return deletedIds;
    } finally { database.close(); }
  }

  async function purgeExpiredCaptures(maxAgeMs, now = Date.now()) {
    const deleted = await purgeByIndex(CAPTURE_STORE, 'createdAt', now - maxAgeMs);
    deleted.forEach(id => captureCache.delete(id));
    return deleted.length;
  }

  async function purgeExpiredTransfers(now = Date.now()) {
    return purgeByIndex(TRANSFER_STORE, 'expiresAt', now, true);
  }

  async function listTransfersByOwner(ownerTabId) {
    const database = await openDatabase();
    try {
      return await new Promise((resolve, reject) => {
        const transaction = database.transaction(TRANSFER_STORE, 'readonly');
        const request = transaction.objectStore(TRANSFER_STORE).index('ownerTabId').getAll(IDBKeyRange.only(ownerTabId));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('Lecture des transferts impossible.'));
      });
    } finally { database.close(); }
  }

  return {
    putCapture, getCapture, listCaptures, deleteCapture, purgeExpiredCaptures,
    putTransfer, getTransfer, listTransfers, putTransferChunk, getTransferChunk,
    listTransferChunks, deleteTransfer, purgeExpiredTransfers, listTransfersByOwner,
    applyMigrations, MIGRATIONS, clearCaptureCache, captureCache
  };
});
