// Temporary, extension-origin storage for screenshots. Records are deleted by
// the editor after a successful load and purged after one hour as a fallback.
(function registerCaptureStore(globalScope, factory) {
  const api = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  globalScope.CaptureStore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const DATABASE_NAME = 'scionos-capture';
  const DATABASE_VERSION = 1;
  const STORE_NAME = 'captures';

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;
        const store = database.objectStoreNames.contains(STORE_NAME)
          ? request.transaction.objectStore(STORE_NAME)
          : database.createObjectStore(STORE_NAME, { keyPath: 'id' });

        if (!store.indexNames.contains('createdAt')) {
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Impossible d’ouvrir le stockage temporaire.'));
    });
  }

  async function putCapture(record) {
    const database = await openDatabase();
    try {
      await requestInTransaction(database, 'readwrite', store => store.put(record));
    } finally {
      database.close();
    }
  }

  async function getCapture(id) {
    const database = await openDatabase();
    try {
      return await requestInTransaction(database, 'readonly', store => store.get(id));
    } finally {
      database.close();
    }
  }

  async function deleteCapture(id) {
    const database = await openDatabase();
    try {
      await requestInTransaction(database, 'readwrite', store => store.delete(id));
    } finally {
      database.close();
    }
  }

  async function listCaptures() {
    const database = await openDatabase();
    try {
      return await requestInTransaction(database, 'readonly', store => store.getAll());
    } finally {
      database.close();
    }
  }

  async function purgeExpiredCaptures(maxAgeMs, now = Date.now()) {
    const database = await openDatabase();
    const cutoff = now - maxAgeMs;

    try {
      return await new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, 'readwrite');
        const index = transaction.objectStore(STORE_NAME).index('createdAt');
        const request = index.openCursor(IDBKeyRange.upperBound(cutoff));
        let deletedCount = 0;

        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) return;
          cursor.delete();
          deletedCount += 1;
          cursor.continue();
        };
        request.onerror = () => reject(request.error || new Error('Impossible de purger les captures temporaires.'));
        transaction.oncomplete = () => resolve(deletedCount);
        transaction.onerror = () => reject(transaction.error || new Error('Impossible de purger les captures temporaires.'));
        transaction.onabort = () => reject(transaction.error || new Error('Purge des captures annulée.'));
      });
    } finally {
      database.close();
    }
  }

  function requestInTransaction(database, mode, createRequest) {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode);
      const request = createRequest(transaction.objectStore(STORE_NAME));
      let result;

      request.onsuccess = () => {
        result = request.result;
      };
      request.onerror = () => reject(request.error || new Error('Opération de stockage impossible.'));
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error || new Error('Opération de stockage impossible.'));
      transaction.onabort = () => reject(transaction.error || new Error('Opération de stockage annulée.'));
    });
  }

  return {
    putCapture,
    getCapture,
    listCaptures,
    deleteCapture,
    purgeExpiredCaptures
  };
});
