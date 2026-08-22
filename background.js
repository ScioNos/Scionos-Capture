// Background service worker - Scionos Capture (Manifest V3)
importScripts('capture-utils.js', 'capture-store.js');

const CAPTURE_INTERVAL_MS = 550;
const CAPTURE_TTL_MS = 60 * 60 * 1000;
const CAPTURE_ALARM_PREFIX = 'capture-expiry:';
const TAB_MAPPING_PREFIX = 'capture-tab:';
const MAX_METADATA_LENGTH = 4096;

let captureQueue = Promise.resolve();
let lastCaptureStartedAt = 0;

function alarmName(captureId) {
  return `${CAPTURE_ALARM_PREFIX}${captureId}`;
}

function mappingKey(tabId) {
  return `${TAB_MAPPING_PREFIX}${tabId}`;
}

async function scheduleExpiry(record) {
  await chrome.alarms.create(alarmName(record.id), {
    when: Number(record.expiresAt) || Number(record.createdAt) + CAPTURE_TTL_MS
  });
}

async function initializeStorage() {
  try {
    await chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
    await chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
  } catch (error) {
    console.warn('Storage access restriction failed:', error);
  }

  try {
    await chrome.storage.local.remove('captureData');
    await CaptureStore.purgeExpiredCaptures(CAPTURE_TTL_MS);
    const captures = await CaptureStore.listCaptures();
    await Promise.all(captures.map(scheduleExpiry));
  } catch (error) {
    console.warn('Temporary capture initialization failed:', error);
  }
}

async function assertOriginalTabActive(senderTab) {
  if (!senderTab || !Number.isInteger(senderTab.id) || !Number.isInteger(senderTab.windowId)) {
    throw new Error('Invalid capture source.');
  }
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
    return chrome.tabs.captureVisibleTab(senderTab.windowId, { format: 'png' });
  });
  captureQueue = task.catch(() => undefined);
  return task;
}

async function dataUrlToBlob(dataUrl) {
  if (typeof dataUrl !== 'string' || !/^data:image\/png;base64,/i.test(dataUrl)) {
    throw new Error('Invalid capture payload.');
  }
  const response = await fetch(dataUrl);
  if (!response.ok) throw new Error('Capture conversion failed.');
  const blob = await response.blob();
  if (blob.type !== 'image/png' || blob.size === 0) throw new Error('Invalid capture image.');
  return blob;
}

function safeMetadata(value, fallback = '') {
  return typeof value === 'string' ? value.slice(0, MAX_METADATA_LENGTH) : fallback;
}

async function openEditor(message) {
  const blob = await dataUrlToBlob(message.dataUrl);
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  const numericScale = Number(message.scale);
  const record = {
    id,
    blob,
    title: safeMetadata(message.title, 'Screenshot'),
    url: safeMetadata(message.url),
    timestamp: new Date(createdAt).toISOString(),
    scale: Number.isFinite(numericScale) ? Math.max(0.01, Math.min(1, numericScale)) : 1,
    createdAt,
    expiresAt: createdAt + CAPTURE_TTL_MS
  };

  await CaptureStore.putCapture(record);
  await scheduleExpiry(record);
  let editorTab;
  try {
    editorTab = await chrome.tabs.create({
      url: chrome.runtime.getURL(`editor.html?capture=${encodeURIComponent(id)}`)
    });
    if (!editorTab || !Number.isInteger(editorTab.id)) throw new Error('Editor tab was not created.');
    await chrome.storage.session.set({ [mappingKey(editorTab.id)]: id });
  } catch (error) {
    await CaptureStore.deleteCapture(id);
    await chrome.alarms.clear(alarmName(id));
    if (editorTab && Number.isInteger(editorTab.id)) await chrome.tabs.remove(editorTab.id).catch(() => undefined);
    throw error;
  }
  return { success: true, captureId: id };
}

function isTrustedContentSender(sender) {
  return sender && sender.id === chrome.runtime.id && sender.tab && Number.isInteger(sender.tab.id);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message.action !== 'string' || !isTrustedContentSender(sender)) return;

  if (message.action === 'CAPTURE_VISIBLE_TAB') {
    enqueueVisibleCapture(sender.tab)
      .then(dataUrl => sendResponse({ success: true, dataUrl }))
      .catch(error => {
        console.error('Visible tab capture failed:', error);
        sendResponse({ success: false, error: error.message || 'Unable to capture the tab.', errorCode: error.code || '' });
      });
    return true;
  }

  if (message.action === 'OPEN_EDITOR') {
    openEditor(message)
      .then(sendResponse)
      .catch(error => {
        console.error('Editor opening failed:', error);
        sendResponse({ success: false, error: error.message || 'Unable to open the editor.' });
      });
    return true;
  }
});

chrome.alarms.onAlarm.addListener(alarm => {
  if (!alarm.name.startsWith(CAPTURE_ALARM_PREFIX)) return;
  const captureId = alarm.name.slice(CAPTURE_ALARM_PREFIX.length);
  CaptureStore.deleteCapture(captureId).catch(error => console.warn('Capture expiry failed:', error));
});

chrome.tabs.onRemoved.addListener(async tabId => {
  const key = mappingKey(tabId);
  try {
    const stored = await chrome.storage.session.get(key);
    const captureId = stored[key];
    if (!captureId) return;
    await CaptureStore.deleteCapture(captureId);
    await chrome.alarms.clear(alarmName(captureId));
    await chrome.storage.session.remove(key);
  } catch (error) {
    console.warn('Editor cleanup failed:', error);
  }
});

initializeStorage();
chrome.runtime.onStartup.addListener(initializeStorage);
chrome.runtime.onInstalled.addListener(initializeStorage);
