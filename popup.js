// Popup controller - Scionos Capture
document.addEventListener('DOMContentLoaded', async () => {
  const captureButtons = [
    document.getElementById('btn-full'),
    document.getElementById('btn-visible'),
    document.getElementById('btn-zone'),
    document.getElementById('btn-scrolling'),
    document.getElementById('btn-element')
  ];
  const delaySelect = document.getElementById('capture-delay');
  const allowedDelays = [0, 3, 5, 10];
  const normalizeDelay = value => allowedDelays.includes(Number(value)) ? Number(value) : 0;
  const status = document.getElementById('status');
  const shortcutButton = document.getElementById('shortcut-button');
  const shortcutValue = document.getElementById('shortcut-value');

  function updateTexts() {
    const mappings = {
      'txt-full-title': 'btnFullPageTitle',
      'txt-full-desc': 'btnFullPageDesc',
      'txt-visible-title': 'btnVisibleTitle',
      'txt-visible-desc': 'btnVisibleDesc',
      'txt-zone-title': 'btnZoneTitle',
      'txt-zone-desc': 'btnZoneDesc',
      'txt-scrolling-title': 'btnScrollingTitle',
      'txt-scrolling-desc': 'btnScrollingDesc',
      'txt-element-title': 'elementTitle',
      'txt-element-desc': 'elementDesc',
      'delay-label': 'delayLabel',
      'shortcut-label': 'shortcutText',
      'brand-tagline': 'brandTagline'
    };
    Object.entries(mappings).forEach(([id, key]) => {
      document.getElementById(id).textContent = getI18nText(key);
    });
    const helpBtn = document.getElementById('btn-help');
    if (helpBtn) {
      helpBtn.title = getI18nText('btnHelp');
      helpBtn.setAttribute('aria-label', getI18nText('btnHelp'));
    }
    document.querySelector('[data-i18n="languageAuto"]').textContent = getI18nText('languageAuto');
    for (const option of delaySelect.options) {
      const seconds = Number(option.value);
      option.textContent = seconds === 0 ? getI18nText('delayImmediate') : getI18nText('delaySeconds', { seconds });
    }
  }

  function updateShortcut() {
    if (!chrome.commands || typeof chrome.commands.getAll !== 'function') {
      shortcutValue.textContent = getI18nText('shortcutUnavailable');
      shortcutButton.classList.add('unconfigured');
      return;
    }
    const handleCommands = commands => {
      const command = (commands || []).find(item =>
        item.name === '_execute_action' || item.name === '_execute_browser_action'
      );
      const isConfigured = Boolean(command && command.shortcut);
      shortcutValue.textContent = isConfigured
        ? command.shortcut.replaceAll('+', ' + ')
        : getI18nText('shortcutUnavailable');
      shortcutButton.classList.toggle('unconfigured', !isConfigured);
      shortcutButton.title = getI18nText('shortcutConfigure');
      shortcutButton.setAttribute(
        'aria-label',
        `${getI18nText('shortcutText')} : ${shortcutValue.textContent}. ${getI18nText('shortcutConfigure')}`
      );
    };

    try {
      const result = chrome.commands.getAll(handleCommands);
      if (result && typeof result.then === 'function') {
        result.then(handleCommands).catch(() => handleCommands([]));
      }
    } catch {
      handleCommands([]);
    }
  }

  function showStatus(message, isError = false) {
    status.textContent = message;
    status.classList.add('visible');
    status.classList.toggle('error', isError);
    status.setAttribute('role', isError ? 'alert' : 'status');
  }

  function setBusy(busy) {
    document.body.setAttribute('aria-busy', String(busy));
    captureButtons.forEach(button => { button.disabled = busy; });
    delaySelect.disabled = busy;
  }

  function getActiveTab() {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        const tab = tabs[0];
        if (chrome.runtime.lastError || !tab || !Number.isInteger(tab.id)) {
          reject(new Error(getI18nText('unsupportedPage')));
        } else {
          resolve(tab);
        }
      });
    });
  }

  function hasFileAccess() {
    return new Promise(resolve => {
      if (!chrome.extension || typeof chrome.extension.isAllowedFileSchemeAccess !== 'function') {
        resolve(false);
        return;
      }
      chrome.extension.isAllowedFileSchemeAccess(resolve);
    });
  }

  async function assertCapturableTab(tab) {
    if (ScionosCaptureUtils.isRestrictedUrl(tab.url)) throw new Error(getI18nText('unsupportedPage'));
    if (new URL(tab.url).protocol === 'file:' && !(await hasFileAccess())) throw new Error(getI18nText('unsupportedPage'));
  }

  async function ensureContentInjected(tabId) {
    try {
      const ping = await chrome.tabs.sendMessage(tabId, { action: 'PING' });
      if (ping && ping.loaded) return;
    } catch {
      // Script not loaded in tab yet, proceed to inject
    }
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['capture-utils.js', 'capture-content-utils.js', 'content-dom.js', 'content-transfer.js', 'content-selection.js', 'content-capture.js', 'content.js']
    });
  }

  async function startCapture(action, statusKey) {
    setBusy(true);
    showStatus(getI18nText(statusKey));
    try {
      const tab = await getActiveTab();
      await assertCapturableTab(tab);

      await ensureContentInjected(tab.id);

      const messageKeys = [
        'progress', 'reduced', 'visibleError', 'fullError', 'fullScrollError', 'zoneError',
        'statusZone',
        'scrollingError', 'scrollingDialogLabel', 'scrollingGeometry',
        'scrollingInstructionStart', 'scrollingInstructionEnd', 'scrollingPointSet',
        'scrollingInvalidRegion', 'scrollingCapture', 'scrollingToBottom', 'scrollingRestart', 'scrollingCancel',
        'coordinateX', 'coordinateY', 'coordinateWidth', 'coordinateHeight',
        'btnScrollingTitle', 'tabChangedError', 'captureAlreadyRunning',
        'layoutChangedError', 'captureTooLargeError', 'unsupportedTransformError',
        'elementTitle', 'elementDesc', 'delayLabel', 'delayImmediate', 'delaySeconds',
        'selectionTitle', 'selectionCapture', 'selectionRestart', 'selectionCancel',
        'selectionParent', 'selectionChild', 'elementVisible', 'elementFull',
        'selectionInstructions', 'countdownStatus', 'countdownCancel', 'elementUnavailable'
      ];
      const response = await chrome.tabs.sendMessage(tab.id, {
        action,
        delaySeconds: normalizeDelay(delaySelect.value),
        language: ScionosI18n.language,
        messages: ScionosI18n.getMessageBundle(messageKeys)
      });

      if (!response || response.status === 'busy') {
        throw new Error(getI18nText('captureAlreadyRunning'));
      }
      if (response.status !== 'started') throw new Error(getI18nText('captureStartError'));
      window.close();
    } catch (error) {
      console.error('Capture start failed:', error);
      showStatus(`${getI18nText('captureStartError')}${error.message}`, true);
      setBusy(false);
    }
  }

  delaySelect.disabled = true;
  try {
    const stored = await chrome.storage.local.get('captureDelaySeconds');
    delaySelect.value = String(normalizeDelay(stored.captureDelaySeconds));
  } catch (error) {
    console.warn('Capture delay preference unavailable:', error);
    delaySelect.value = '0';
  }
  delaySelect.disabled = false;
  delaySelect.addEventListener('change', async () => {
    const captureDelaySeconds = normalizeDelay(delaySelect.value);
    delaySelect.value = String(captureDelaySeconds);
    try { await chrome.storage.local.set({ captureDelaySeconds }); }
    catch (error) { console.warn('Capture delay preference could not be saved:', error); }
  });

  await initI18n();
  const languageMenu = ScionosI18n.setupLanguageMenu({
    button: document.getElementById('language-button'),
    menu: document.getElementById('language-menu'),
    flag: document.getElementById('language-flag'),
    code: document.getElementById('language-code')
  });
  updateTexts();
  updateShortcut();

  window.addEventListener('scionos-language-change', () => {
    updateTexts();
    updateShortcut();
    languageMenu.update();
  });

  const helpButton = document.getElementById('btn-help');
  if (helpButton) {
    helpButton.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('help.html') });
    });
  }

  shortcutButton.addEventListener('click', async () => {
    const isEdge = navigator.userAgent.includes('Edg/');
    const shortcutsUrl = isEdge ? 'edge://extensions/shortcuts' : 'chrome://extensions/shortcuts';
    try {
      const created = chrome.tabs.create({ url: shortcutsUrl });
      if (created && typeof created.catch === 'function') {
        await created.catch(error => {
          throw error instanceof Error ? error : new Error(String(error));
        });
      }
    } catch (error) {
      console.error('Shortcut page open failed:', error);
      showStatus(error && error.message ? error.message : String(error), true);
    }
  });

  captureButtons[0].addEventListener('click', () => startCapture('START_FULL_PAGE_CAPTURE', 'statusFull'));
  captureButtons[1].addEventListener('click', () => startCapture('START_VISIBLE_CAPTURE', 'statusVisible'));
  captureButtons[2].addEventListener('click', () => startCapture('START_ZONE_CAPTURE', 'statusZone'));
  captureButtons[3].addEventListener('click', () => startCapture('START_SCROLLING_ZONE_CAPTURE', 'statusScrolling'));
  captureButtons[4].addEventListener('click', () => startCapture('START_ELEMENT_CAPTURE', 'elementTitle'));
});
