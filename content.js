// Page capture entry point. Dependencies are injected before this script.
(function registerContentCapture() {
  if (window.hasScionosCaptureLoaded) return;

  const Utils = ScionosCaptureUtils;
  const ACTIONS = new Set([
    'PING', 'START_FULL_PAGE_CAPTURE', 'START_VISIBLE_CAPTURE',
    'START_ZONE_CAPTURE', 'START_SCROLLING_ZONE_CAPTURE'
  ]);
  let captureRunning = false;
  let activeMessages = {};

  function text(key, params = {}) {
    const value = typeof activeMessages[key] === 'string' ? activeMessages[key] : key;
    return Object.entries(params).reduce(
      (result, [name, replacement]) => result.replaceAll('{' + name + '}', String(replacement)),
      value
    );
  }

  const dom = globalThis.ScionosContentDom.create({ Utils, text });
  const transfer = globalThis.ScionosContentTransfer.create({ Utils, text });
  const capture = globalThis.ScionosContentCapture.create({ Utils, dom, transfer, text });

  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (!request || !ACTIONS.has(request.action)) return;
    if (request.action === 'PING') { sendResponse({ loaded: true }); return; }
    if (captureRunning) { sendResponse({ status: 'busy' }); return; }
    captureRunning = true;
    activeMessages = request.messages && typeof request.messages === 'object' ? request.messages : {};
    const operation = request.action === 'START_FULL_PAGE_CAPTURE'
      ? capture.executeFullPageCapture()
      : request.action === 'START_ZONE_CAPTURE'
        ? capture.executeZoneCapture()
        : request.action === 'START_SCROLLING_ZONE_CAPTURE'
          ? capture.executeScrollingZoneCapture()
          : capture.executeVisibleCapture();
    Promise.resolve(operation).finally(() => { captureRunning = false; });
    sendResponse({ status: 'started' });
  });
  window.hasScionosCaptureLoaded = true;
})();
