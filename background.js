// Background service worker - Scionos Capture (Manifest V3)
importScripts('capture-utils.js', 'capture-store.js');

const CAPTURE_INTERVAL_MS = 550;
const CAPTURE_TTL_MS = 15 * 60 * 1000;
const TRANSFER_TTL_MS = 15 * 60 * 1000;
const CAPTURE_ALARM_PREFIX = 'capture-expiry:';
const TRANSFER_ALARM_PREFIX = 'capture-transfer-expiry:';
const TAB_MAPPING_PREFIX = 'capture-tab:';
const MAX_METADATA_LENGTH = 4096;

let captureQueue = Promise.resolve();
let lastCaptureStartedAt = 0;
let storageInitialization = Promise.resolve();

const alarmName = captureId => CAPTURE_ALARM_PREFIX + captureId;
const transferAlarmName = transferId => TRANSFER_ALARM_PREFIX + transferId;
const mappingKey = tabId => TAB_MAPPING_PREFIX + tabId;

async function scheduleExpiry(record) {
  await chrome.alarms.create(alarmName(record.id), { when: Number(record.expiresAt) || Number(record.createdAt) + CAPTURE_TTL_MS });
}

async function scheduleTransferExpiry(record) {
  await chrome.alarms.create(transferAlarmName(record.id), { when: record.expiresAt });
}

async function removeCaptureMappings(captureId) {
  const stored = await chrome.storage.session.get(null);
  const keys = Object.entries(stored)
    .filter(([key, value]) => key.startsWith(TAB_MAPPING_PREFIX) && value === captureId)
    .map(([key]) => key);
  if (keys.length) await chrome.storage.session.remove(keys);
}

async function cleanupCapture(captureId, { clearAlarm = true } = {}) {
  await CaptureStore.deleteCapture(captureId);
  if (clearAlarm) await chrome.alarms.clear(alarmName(captureId));
  await removeCaptureMappings(captureId);
}

async function cleanupTransfer(transferId, { clearAlarm = true } = {}) {
  await CaptureStore.deleteTransfer(transferId);
  if (clearAlarm) await chrome.alarms.clear(transferAlarmName(transferId));
}

function editorCaptureId(tab) {
  try {
    const url = new URL(tab.pendingUrl || tab.url);
    const editor = new URL(chrome.runtime.getURL('editor.html'));
    return url.protocol === editor.protocol && url.host === editor.host && url.pathname === editor.pathname
      ? url.searchParams.get('capture') : null;
  } catch { return null; }
}

async function getExtensionTabContexts() {
  if (typeof chrome.runtime.getContexts !== 'function') return null;
  try {
    return await chrome.runtime.getContexts({ contextTypes: ['TAB'] });
  } catch (error) {
    console.warn('Extension tab context lookup failed:', error);
    return null;
  }
}

async function getOpenCaptureIds(excludedTabId = null) {
  const contexts = await getExtensionTabContexts();
  if (contexts) {
    return new Set(contexts
      .filter(context => context.tabId !== excludedTabId)
      .map(context => editorCaptureId({ url: context.documentUrl }))
      .filter(Boolean));
  }

  const [tabs, stored] = await Promise.all([chrome.tabs.query({}), chrome.storage.session.get(null)]);
  const activeTabIds = new Set(tabs.filter(tab => tab.id !== excludedTabId).map(tab => tab.id));
  const captureIds = new Set(tabs
    .filter(tab => tab.id !== excludedTabId)
    .map(editorCaptureId)
    .filter(Boolean));
  Object.entries(stored).forEach(([key, captureId]) => {
    const tabId = Number(key.slice(TAB_MAPPING_PREFIX.length));
    if (key.startsWith(TAB_MAPPING_PREFIX) && activeTabIds.has(tabId)) captureIds.add(captureId);
  });
  return captureIds;
}

function initializeStorage() {
  storageInitialization = storageInitialization.then(reconcileStorage);
  return storageInitialization;
}

async function reconcileStorage() {
  try {
    await chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
    await chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
  } catch (error) {
    console.warn('Storage access restriction failed:', error);
  }
  try {
    await chrome.storage.local.remove('captureData');
    await CaptureStore.purgeExpiredTransfers();
    const [captures, transfers, tabs, stored, contexts] = await Promise.all([
      CaptureStore.listCaptures(), CaptureStore.listTransfers(), chrome.tabs.query({}),
      chrome.storage.session.get(null), getExtensionTabContexts()
    ]);
    const existingIds = new Set(captures.map(record => record.id));
    const mappings = {};
    if (contexts) {
      for (const context of contexts) {
        const id = editorCaptureId({ url: context.documentUrl });
        if (Number.isInteger(context.tabId) && context.tabId >= 0 && id && existingIds.has(id)) {
          mappings[mappingKey(context.tabId)] = id;
        }
      }
    } else {
      for (const tab of tabs) {
        const id = editorCaptureId(tab);
        if (id && existingIds.has(id)) mappings[mappingKey(tab.id)] = id;
      }
      const tabsById = new Map(tabs.map(tab => [tab.id, tab]));
      for (const [key, id] of Object.entries(stored)) {
        if (!key.startsWith(TAB_MAPPING_PREFIX) || !existingIds.has(id) || mappings[key]) continue;
        const tabId = Number(key.slice(TAB_MAPPING_PREFIX.length));
        const tab = tabsById.get(tabId);
        if (tab && typeof tab.url !== 'string' && typeof tab.pendingUrl !== 'string') mappings[key] = id;
      }
    }
    const staleKeys = Object.keys(stored).filter(key => key.startsWith(TAB_MAPPING_PREFIX) && stored[key] !== mappings[key]);
    if (staleKeys.length) await chrome.storage.session.remove(staleKeys);
    if (Object.keys(mappings).length) await chrome.storage.session.set(mappings);
    const activeIds = new Set(Object.values(mappings));
    for (const record of captures) {
      if (activeIds.has(record.id)) await chrome.alarms.clear(alarmName(record.id));
      else if ((Number(record.expiresAt) || record.createdAt + CAPTURE_TTL_MS) <= Date.now()) await cleanupCapture(record.id);
      else await scheduleExpiry(record);
    }
    await Promise.all(transfers.map(scheduleTransferExpiry));
  } catch (error) {
    console.warn('Temporary capture initialization failed:', error);
  }
}

async function assertOriginalTabActive(senderTab) {
  if (!senderTab || !Number.isInteger(senderTab.id) || !Number.isInteger(senderTab.windowId)) throw new Error('Invalid capture source.');
  const [activeTab] = await chrome.tabs.query({ active: true, windowId: senderTab.windowId });
  if (!activeTab || activeTab.id !== senderTab.id) {
    const error = new Error('The active tab changed during capture.');
    error.code = 'TAB_CHANGED';
    throw error;
  }
}

function enqueueVisibleCapture(senderTab) {
  const task = captureQueue.then(async () => {
    await assertOriginalTabActive(senderTab);
    const remainingDelay = CAPTURE_INTERVAL_MS - (Date.now() - lastCaptureStartedAt);
    if (remainingDelay > 0) await ScionosCaptureUtils.delay(remainingDelay);
    await assertOriginalTabActive(senderTab);
    lastCaptureStartedAt = Date.now();
    return chrome.tabs.captureVisibleTab(senderTab.windowId, { format: 'png' }).catch(error => {
      const message = error && error.message ? error.message : '';
      if (/rate|limit|quota|timed out|timeout|busy/i.test(message)) {
        const tagged = new Error(message || 'Tab capture is rate limited, retrying.');
        tagged.code = 'RATE_LIMITED';
        throw tagged;
      }
      throw error;
    });
  });
  captureQueue = task.catch(() => undefined);
  return task;
}

function safeMetadata(value, fallback = '') {
  return typeof value === 'string' ? value.slice(0, MAX_METADATA_LENGTH) : fallback;
}

function decodeChunk(base64) {
  const maximumLength = Math.ceil(ScionosCaptureUtils.TRANSFER_CHUNK_BYTES * 4 / 3) + 16;
  if (typeof base64 !== 'string' || base64.length > maximumLength || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
    throw new Error('Invalid capture chunk.');
  }
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: 'application/octet-stream' });
}

async function assertPngBlob(blob) {
  if (!(blob instanceof Blob) || blob.size === 0 || blob.size > ScionosCaptureUtils.MAX_TRANSFER_BYTES) throw new Error('Invalid capture image.');
  const signature = new Uint8Array(await blob.slice(0, 8).arrayBuffer());
  const expected = [137, 80, 78, 71, 13, 10, 26, 10];
  if (signature.length !== expected.length || expected.some((value, index) => signature[index] !== value)) throw new Error('Invalid PNG signature.');
}

async function openEditorFromBlob(blob, metadata = {}) {
  await assertPngBlob(blob);
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  const numericScale = Number(metadata.scale);
  const record = {
    id,
    blob: blob.type === 'image/png' ? blob : new Blob([blob], { type: 'image/png' }),
    title: safeMetadata(metadata.title, 'Screenshot'),
    url: safeMetadata(metadata.url),
    timestamp: new Date(createdAt).toISOString(),
    scale: Number.isFinite(numericScale) ? Math.max(0.01, Math.min(1, numericScale)) : 1,
    textBlocks: Array.isArray(metadata.textBlocks) ? metadata.textBlocks : [],
    textCoordinateSpace: metadata.textCoordinateSpace === 'bitmap' ? 'bitmap' : null,
    textLayerLimited: Boolean(metadata.textLayerLimited),
    createdAt,
    expiresAt: createdAt + CAPTURE_TTL_MS
  };
  await CaptureStore.putCapture(record);
  await scheduleExpiry(record);
  let editorTab;
  try {
    editorTab = await chrome.tabs.create({ url: chrome.runtime.getURL('editor.html?capture=' + encodeURIComponent(id)) });
    if (!editorTab || !Number.isInteger(editorTab.id)) throw new Error('Editor tab was not created.');
    await chrome.storage.session.set({ [mappingKey(editorTab.id)]: id });
  } catch (error) {
    await cleanupCapture(id);
    if (editorTab && Number.isInteger(editorTab.id)) await chrome.tabs.remove(editorTab.id).catch(() => undefined);
    throw error;
  }
  return { success: true, captureId: id };
}

async function beginTransfer(message, senderTab) {
  const expectedBytes = Number(message.expectedBytes);
  const expectedChunks = Number(message.expectedChunks);
  if (!Number.isInteger(expectedBytes) || expectedBytes < 1 || expectedBytes > ScionosCaptureUtils.MAX_TRANSFER_BYTES) throw new Error('Invalid capture size.');
  const calculatedChunks = Math.ceil(expectedBytes / ScionosCaptureUtils.TRANSFER_CHUNK_BYTES);
  if (!Number.isInteger(expectedChunks) || expectedChunks !== calculatedChunks) throw new Error('Invalid capture chunk count.');
  const createdAt = Date.now();
  const record = {
    id: crypto.randomUUID(), ownerTabId: senderTab.id,
    expectedBytes, expectedChunks, receivedBytes: 0, nextIndex: 0,
    title: safeMetadata(message.title, 'Screenshot'), url: safeMetadata(message.url),
    scale: Number.isFinite(Number(message.scale)) ? Math.max(0.01, Math.min(1, Number(message.scale))) : 1,
    textBlocks: Array.isArray(message.textBlocks) ? message.textBlocks : [],
    textCoordinateSpace: message.textCoordinateSpace === 'bitmap' ? 'bitmap' : null,
    textLayerLimited: Boolean(message.textLayerLimited),
    createdAt, expiresAt: createdAt + TRANSFER_TTL_MS
  };
  await CaptureStore.putTransfer(record);
  await scheduleTransferExpiry(record);
  return { success: true, transferId: record.id, chunkBytes: ScionosCaptureUtils.TRANSFER_CHUNK_BYTES };
}

async function getOwnedTransfer(transferId, senderTab) {
  const transfer = await CaptureStore.getTransfer(transferId);
  if (!transfer || transfer.ownerTabId !== senderTab.id) throw new Error('Capture transfer is unavailable.');
  if (transfer.expiresAt <= Date.now()) {
    await cleanupTransfer(transfer.id);
    throw new Error('Capture transfer expired.');
  }
  return transfer;
}

async function appendTransferChunk(message, senderTab) {
  const transfer = await getOwnedTransfer(message.transferId, senderTab);
  const index = Number(message.index);
  if (!Number.isInteger(index) || index < 0 || index >= transfer.expectedChunks) throw new Error('Invalid capture chunk index.');
  if (index < transfer.nextIndex) {
    const existing = await CaptureStore.getTransferChunk(transfer.id, index);
    if (!existing) throw new Error('Capture transfer state is inconsistent.');
    return { success: true, nextIndex: transfer.nextIndex, duplicate: true };
  }
  if (index !== transfer.nextIndex) throw new Error('Capture chunks must be sent in order.');
  const blob = decodeChunk(message.data);
  const isLast = index === transfer.expectedChunks - 1;
  if ((!isLast && blob.size !== ScionosCaptureUtils.TRANSFER_CHUNK_BYTES) || blob.size < 1 || transfer.receivedBytes + blob.size > transfer.expectedBytes) {
    throw new Error('Invalid capture chunk size.');
  }
  transfer.receivedBytes += blob.size;
  transfer.nextIndex += 1;
  transfer.expiresAt = Date.now() + TRANSFER_TTL_MS;
  await CaptureStore.appendTransferChunk(
    transfer,
    { transferId: transfer.id, index, blob, size: blob.size }
  );
  await scheduleTransferExpiry(transfer);
  return { success: true, nextIndex: transfer.nextIndex };
}

async function completeTransfer(message, senderTab) {
  const transfer = await getOwnedTransfer(message.transferId, senderTab);
  if (transfer.nextIndex !== transfer.expectedChunks || transfer.receivedBytes !== transfer.expectedBytes) throw new Error('Capture transfer is incomplete.');
  const chunks = await CaptureStore.listTransferChunks(transfer.id);
  if (chunks.length !== transfer.expectedChunks || chunks.some((chunk, index) => chunk.index !== index)) throw new Error('Capture transfer is incomplete.');
  const blob = new Blob(chunks.map(chunk => chunk.blob), { type: 'image/png' });
  if (blob.size !== transfer.expectedBytes) throw new Error('Capture transfer size mismatch.');
  try {
    const result = await openEditorFromBlob(blob, transfer);
    await cleanupTransfer(transfer.id);
    return result;
  } catch (error) {
    await cleanupTransfer(transfer.id).catch(() => undefined);
    throw error;
  }
}

function isTrustedTabSender(sender) {
  return sender && sender.id === chrome.runtime.id && sender.tab && Number.isInteger(sender.tab.id);
}

function isEditorSender(sender) {
  if (!isTrustedTabSender(sender) || typeof sender.url !== 'string') return false;
  try {
    const url = new URL(sender.url);
    const editorUrl = new URL(chrome.runtime.getURL('editor.html'));
    return url.protocol === editorUrl.protocol && url.host === editorUrl.host && url.pathname === editorUrl.pathname;
  } catch { return false; }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message.action !== 'string' || !isTrustedTabSender(sender)) return;
  if (!['CAPTURE_VISIBLE_TAB', 'BEGIN_CAPTURE_TRANSFER', 'APPEND_CAPTURE_CHUNK',
    'COMPLETE_CAPTURE_TRANSFER', 'ABORT_CAPTURE_TRANSFER', 'ACK_CAPTURE_LOADED'].includes(message.action)) return;
  storageInitialization.then(() => {
    let operation;
    if (message.action === 'CAPTURE_VISIBLE_TAB') operation = enqueueVisibleCapture(sender.tab).then(dataUrl => ({ success: true, dataUrl }));
    else if (message.action === 'BEGIN_CAPTURE_TRANSFER') operation = beginTransfer(message, sender.tab);
    else if (message.action === 'APPEND_CAPTURE_CHUNK') operation = appendTransferChunk(message, sender.tab);
    else if (message.action === 'COMPLETE_CAPTURE_TRANSFER') operation = completeTransfer(message, sender.tab);
    else if (message.action === 'ABORT_CAPTURE_TRANSFER') operation = getOwnedTransfer(message.transferId, sender.tab)
      .then(transfer => cleanupTransfer(transfer.id)).then(() => ({ success: true }));
    else if (message.action === 'ACK_CAPTURE_LOADED' && isEditorSender(sender)) {
      operation = chrome.storage.session.get(mappingKey(sender.tab.id)).then(async stored => {
        const key = mappingKey(sender.tab.id);
        const captureId = stored[key];
        if (!captureId || captureId !== message.captureId) throw new Error('Invalid editor capture acknowledgement.');
        await chrome.alarms.clear(alarmName(captureId));
        return { success: true };
      });
    } else return;
    return operation;
  }).then(sendResponse).catch(error => {
    console.error(message.action + ' failed:', error);
    sendResponse({ success: false, error: error.message || 'Capture operation failed.', errorCode: error.code || '' });
  });
  return true;
});

chrome.alarms.onAlarm.addListener(async alarm => {
  await storageInitialization;
  try {
    if (alarm.name.startsWith(CAPTURE_ALARM_PREFIX)) {
      const id = alarm.name.slice(CAPTURE_ALARM_PREFIX.length);
      const openCaptureIds = await getOpenCaptureIds();
      if (openCaptureIds.has(id)) {
        await chrome.alarms.clear(alarm.name);
      } else {
        const record = await CaptureStore.getCapture(id);
        if (record && (Number(record.expiresAt) || record.createdAt + CAPTURE_TTL_MS) > Date.now()) await scheduleExpiry(record);
        else await cleanupCapture(id, { clearAlarm: false });
      }
    } else if (alarm.name.startsWith(TRANSFER_ALARM_PREFIX)) {
      const id = alarm.name.slice(TRANSFER_ALARM_PREFIX.length);
      const transfer = await CaptureStore.getTransfer(id);
      if (transfer && transfer.expiresAt > Date.now()) await scheduleTransferExpiry(transfer);
      else await cleanupTransfer(id, { clearAlarm: false });
    }
  } catch (error) { console.warn('Temporary capture expiry failed:', error); }
});

chrome.tabs.onRemoved.addListener(async tabId => {
  try {
    await storageInitialization;
    const key = mappingKey(tabId);
    const stored = await chrome.storage.session.get(key);
    if (stored[key]) {
      const openCaptureIds = await getOpenCaptureIds(tabId);
      if (!openCaptureIds.has(stored[key])) await cleanupCapture(stored[key]);
      else await chrome.storage.session.remove(key);
    }
    const transfers = await CaptureStore.listTransfersByOwner(tabId);
    await Promise.all(transfers.map(transfer => cleanupTransfer(transfer.id)));
  } catch (error) {
    console.warn('Capture cleanup failed:', error);
  }
});

// Navigation away from an editor makes its capture orphaned, even if the tab stays open.
chrome.tabs.onUpdated.addListener(async (tabId, change) => {
  if (!change.url) return;
  const key = mappingKey(tabId);
  const stored = await chrome.storage.session.get(key);
  const captureId = editorCaptureId({ url: change.url });
  if (stored[key] && stored[key] !== captureId) await chrome.storage.session.remove(key);
  if (stored[key] || captureId) await initializeStorage();
});

initializeStorage();
chrome.runtime.onStartup.addListener(initializeStorage);
chrome.runtime.onInstalled.addListener(initializeStorage);
