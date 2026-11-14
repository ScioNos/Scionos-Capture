// Extension-origin storage: temporary captures/transfers and an explicitly saved library.
(function registerCaptureStore(globalScope, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  globalScope.CaptureStore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const DATABASE_NAME = 'scionos-capture';
  const DATABASE_VERSION = 3;
  const CAPTURE_STORE = 'captures';
  const TRANSFER_STORE = 'transfers';
  const CHUNK_STORE = 'captureChunks';
  const LIBRARY_META = 'libraryProjects';
  const LIBRARY_CONTENT = 'libraryContents';
  const LIBRARY_CONFIG = 'librarySettings';
  const MIB = 1024 * 1024;
  const DEFAULT_LIBRARY_SETTINGS = Object.freeze({ quotaBytes: 256 * MIB, retentionDays: null });

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
    },
    3: (database, transaction) => {
      const projects = database.objectStoreNames.contains(LIBRARY_META)
        ? transaction.objectStore(LIBRARY_META)
        : database.createObjectStore(LIBRARY_META, { keyPath: 'id' });
      if (!projects.indexNames.contains('expiresAt')) projects.createIndex('expiresAt', 'expiresAt', { unique: false });
      if (!database.objectStoreNames.contains(LIBRARY_CONTENT)) database.createObjectStore(LIBRARY_CONTENT, { keyPath: 'id' });
      if (!database.objectStoreNames.contains(LIBRARY_CONFIG)) database.createObjectStore(LIBRARY_CONFIG, { keyPath: 'key' });
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
      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => database.close();
        resolve(database);
      };
      request.onerror = () => reject(request.error || new Error('Impossible d’ouvrir le stockage temporaire.'));
      request.onblocked = () => reject(new Error('La mise à jour du stockage est bloquée par une autre page. Fermez les anciennes pages puis réessayez.'));
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
  const CAPTURE_CACHE_LIMIT = 5;

  function cacheCapture(record) {
    if (!record || !record.id) return;
    captureCache.delete(record.id);
    captureCache.set(record.id, record);
    while (captureCache.size > CAPTURE_CACHE_LIMIT) {
      captureCache.delete(captureCache.keys().next().value);
    }
  }

  const putCapture = async record => {
    const result = await runRequest(CAPTURE_STORE, 'readwrite', store => store.put(record));
    cacheCapture(record);
    return result;
  };

  const getCapture = async id => {
    if (captureCache.has(id)) {
      const cached = captureCache.get(id);
      cacheCapture(cached);
      return cached;
    }
    const record = await runRequest(CAPTURE_STORE, 'readonly', store => store.get(id));
    if (record) cacheCapture(record);
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

  async function appendTransferChunk(transfer, chunk) {
    const database = await openDatabase();
    try {
      await new Promise((resolve, reject) => {
        const transaction = database.transaction([TRANSFER_STORE, CHUNK_STORE], 'readwrite');
        const transfers = transaction.objectStore(TRANSFER_STORE);
        const request = transfers.get(transfer.id);
        request.onsuccess = () => {
          const current = request.result;
          if (!current || current.ownerTabId !== transfer.ownerTabId || current.expiresAt <= Date.now()
              || current.nextIndex !== chunk.index || current.receivedBytes + chunk.size > current.expectedBytes) {
            transaction.abort();
            return;
          }
          transaction.objectStore(CHUNK_STORE).add(chunk);
          transfers.put(transfer);
        };
        request.onerror = () => { reject(request.error || new Error('Lecture du transfert impossible.')); };
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error || new Error('Écriture du fragment impossible.'));
        transaction.onabort = () => reject(transaction.error || new Error('Écriture du fragment annulée ou état modifié.'));
      });
    } finally {
      database.close();
    }
  }

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

  function libraryError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
  }

  function validId(id) {
    if (typeof id !== 'string' || !id.trim() || id.length > 256) throw libraryError('INVALID_LIBRARY_INPUT', 'Invalid project id.');
    return id;
  }

  function validSettings(value) {
    if (!value || typeof value !== 'object') throw libraryError('INVALID_LIBRARY_INPUT', 'Invalid library settings.');
    const quotaBytes = value.quotaBytes;
    const retentionDays = value.retentionDays;
    if (!Number.isSafeInteger(quotaBytes) || quotaBytes < 64 * MIB || quotaBytes > 1024 * MIB ||
        (retentionDays !== null && (!Number.isSafeInteger(retentionDays) || retentionDays < 1 || retentionDays > 36500))) {
      throw libraryError('INVALID_LIBRARY_INPUT', 'Invalid library quota or retention.');
    }
    return { quotaBytes, retentionDays };
  }

  function libraryRequest(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Library request failed.'));
    });
  }

  // All library read-modify-write operations share these stores, so IndexedDB
  // serializes quota and revision checks across tabs as well as this instance.
  async function libraryTransaction(mode, operation) {
    const database = await openDatabase();
    try {
      return await new Promise((resolve, reject) => {
        const transaction = database.transaction([LIBRARY_META, LIBRARY_CONTENT, LIBRARY_CONFIG], mode);
        let result, failure;
        transaction.oncomplete = () => resolve(result);
        transaction.onabort = () => reject(failure || transaction.error || new Error('Library transaction aborted.'));
        transaction.onerror = () => { /* onabort reports the final failure */ };
        Promise.resolve().then(() => operation(transaction)).then(value => { result = value; }, error => {
          failure = error;
          try { transaction.abort(); } catch { reject(error); }
        });
      });
    } finally { database.close(); }
  }

  function checkRevision(current, expectedRevision) {
    if (expectedRevision === null) {
      if (current) throw libraryError('LIBRARY_CONFLICT', 'Project already exists.');
    } else if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) {
      throw libraryError('INVALID_LIBRARY_INPUT', 'Expected revision must be null or a positive integer.');
    } else if (!current || current.revision !== expectedRevision) {
      throw libraryError('LIBRARY_CONFLICT', 'Project revision conflict.');
    }
  }

  function checkMetadata(record) {
    validId(record.id);
    for (const field of ['title', 'source']) {
      if (record[field] !== undefined && (typeof record[field] !== 'string' || record[field].length > 8192)) throw libraryError('INVALID_LIBRARY_INPUT', `Invalid project ${field}.`);
    }
    if (!(record.blob instanceof Blob) || record.blob.size < 1 || (record.thumbnail != null && !(record.thumbnail instanceof Blob))) throw libraryError('INVALID_LIBRARY_INPUT', 'Invalid project data.');
    if (record.thumbnail && record.thumbnail.size > MIB) throw libraryError('INVALID_LIBRARY_INPUT', 'Thumbnail exceeds 1 MiB.');
    if (record.expiresAt !== undefined && record.expiresAt !== null && (!Number.isSafeInteger(record.expiresAt) || record.expiresAt < 0)) throw libraryError('INVALID_LIBRARY_INPUT', 'Invalid expiration.');
  }

  async function getLibrarySettings() {
    const stored = await runRequest(LIBRARY_CONFIG, 'readonly', store => store.get('settings'));
    return stored ? validSettings(stored) : { ...DEFAULT_LIBRARY_SETTINGS };
  }

  async function setLibrarySettings(settings) {
    const normalized = validSettings(settings);
    return libraryTransaction('readwrite', async transaction => {
      const records = await libraryRequest(transaction.objectStore(LIBRARY_META).getAll());
      const usedBytes = records.reduce((sum, record) => sum + record.size, 0);
      if (usedBytes > normalized.quotaBytes) throw libraryError('LIBRARY_QUOTA_EXCEEDED', 'Current library exceeds the requested quota.');
      transaction.objectStore(LIBRARY_CONFIG).put({ key: 'settings', ...normalized });
      return normalized;
    });
  }

  async function listLibraryProjects() {
    return runRequest(LIBRARY_META, 'readonly', store => store.getAll());
  }

  async function getLibraryProject(id) {
    validId(id);
    return libraryTransaction('readonly', async transaction => {
      const [metadata, content] = await Promise.all([
        libraryRequest(transaction.objectStore(LIBRARY_META).get(id)),
        libraryRequest(transaction.objectStore(LIBRARY_CONTENT).get(id))
      ]);
      if (!metadata && !content) return undefined;
      if (!metadata || !content || !(content.blob instanceof Blob)) throw libraryError('LIBRARY_CORRUPT', 'Project metadata and content do not match.');
      return { ...metadata, blob: content.blob };
    });
  }

  async function writeLibraryProject(transaction, record, expectedRevision, now) {
    checkMetadata(record);
    const metaStore = transaction.objectStore(LIBRARY_META);
    const [current, all, config] = await Promise.all([
      libraryRequest(metaStore.get(record.id)), libraryRequest(metaStore.getAll()),
      libraryRequest(transaction.objectStore(LIBRARY_CONFIG).get('settings'))
    ]);
    checkRevision(current, expectedRevision);
    const settings = config ? validSettings(config) : DEFAULT_LIBRARY_SETTINGS;
    const size = record.blob.size + (record.thumbnail?.size || 0);
    const total = all.reduce((sum, item) => sum + item.size, 0) - (current?.size || 0) + size;
    if (total > settings.quotaBytes) throw libraryError('LIBRARY_QUOTA_EXCEEDED', 'Library storage quota exceeded.');
    const expiresAt = record.expiresAt !== undefined ? record.expiresAt : settings.retentionDays === null ? null : now + settings.retentionDays * 86400000;
    const metadata = { id: record.id, title: record.title || '', source: record.source || '', thumbnail: record.thumbnail || null,
      createdAt: current?.createdAt ?? now, updatedAt: now, expiresAt, revision: (current?.revision || 0) + 1, size };
    metaStore.put(metadata);
    transaction.objectStore(LIBRARY_CONTENT).put({ id: record.id, blob: record.blob });
    return metadata;
  }

  async function saveLibraryProject(record, { expectedRevision } = {}) {
    if (!record || typeof record !== 'object') throw libraryError('INVALID_LIBRARY_INPUT', 'Invalid project.');
    checkMetadata(record);
    return libraryTransaction('readwrite', transaction => writeLibraryProject(transaction, record, expectedRevision, Date.now()));
  }

  async function deleteLibraryProject(id, expectedRevision) {
    validId(id);
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) throw libraryError('INVALID_LIBRARY_INPUT', 'A positive expected revision is required.');
    return libraryTransaction('readwrite', async transaction => {
      const metaStore = transaction.objectStore(LIBRARY_META);
      const current = await libraryRequest(metaStore.get(id));
      checkRevision(current, expectedRevision);
      metaStore.delete(id);
      transaction.objectStore(LIBRARY_CONTENT).delete(id);
      return true;
    });
  }

  async function duplicateLibraryProject(id, newId, { title, expectedRevision } = {}) {
    validId(id); validId(newId);
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) throw libraryError('INVALID_LIBRARY_INPUT', 'A positive expected revision is required.');
    return libraryTransaction('readwrite', async transaction => {
      const [source, content] = await Promise.all([
        libraryRequest(transaction.objectStore(LIBRARY_META).get(id)),
        libraryRequest(transaction.objectStore(LIBRARY_CONTENT).get(id))
      ]);
      checkRevision(source, expectedRevision);
      if (!content || !(content.blob instanceof Blob)) throw libraryError('LIBRARY_CORRUPT', 'Project content is missing.');
      return writeLibraryProject(transaction, { id: newId, title: title === undefined ? source.title : title,
        source: source.source, thumbnail: source.thumbnail, blob: content.blob }, null, Date.now());
    });
  }

  async function purgeExpiredLibraryProjects(now = Date.now()) {
    if (!Number.isSafeInteger(now) || now < 0) throw libraryError('INVALID_LIBRARY_INPUT', 'Invalid purge time.');
    return libraryTransaction('readwrite', transaction => new Promise((resolve, reject) => {
      const ids = [];
      const request = transaction.objectStore(LIBRARY_META).index('expiresAt').openCursor(IDBKeyRange.upperBound(now));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) { resolve(ids); return; }
        ids.push(cursor.primaryKey);
        transaction.objectStore(LIBRARY_CONTENT).delete(cursor.primaryKey);
        cursor.delete();
        cursor.continue();
      };
      request.onerror = () => reject(request.error || new Error('Library purge failed.'));
    }));
  }

  return {
    saveLibraryProject, getLibraryProject, listLibraryProjects, deleteLibraryProject, duplicateLibraryProject,
    purgeExpiredLibraryProjects, getLibrarySettings, setLibrarySettings, DEFAULT_LIBRARY_SETTINGS,
    putCapture, getCapture, listCaptures, deleteCapture, purgeExpiredCaptures,
    putTransfer, getTransfer, listTransfers, putTransferChunk, getTransferChunk, appendTransferChunk,
    listTransferChunks, deleteTransfer, purgeExpiredTransfers, listTransfersByOwner,
    applyMigrations, MIGRATIONS
  };
});
