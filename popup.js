// Popup controller - Scionos Capture
document.addEventListener('DOMContentLoaded', async () => {
  const captureButtons = [
    document.getElementById('btn-full'),
    document.getElementById('btn-visible'),
    document.getElementById('btn-zone'),
    document.getElementById('btn-scrolling')
  ];
  const status = document.getElementById('status');

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
      'shortcut-label': 'shortcutText',
      'brand-tagline': 'brandTagline'
    };
    Object.entries(mappings).forEach(([id, key]) => {
      document.getElementById(id).textContent = getI18nText(key);
    });
    document.querySelector('[data-i18n="languageAuto"]').textContent = getI18nText('languageAuto');
  }

  function updateShortcut() {
    chrome.commands.getAll(commands => {
      const command = commands.find(item => item.name === '_execute_action');
      document.getElementById('shortcut-value').textContent = command && command.shortcut
        ? command.shortcut.replaceAll('+', ' + ')
        : getI18nText('shortcutUnavailable');
    });
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

  async function startCapture(action, statusKey) {
    setBusy(true);
    showStatus(getI18nText(statusKey));
    try {
      const tab = await getActiveTab();
      if (ScionosCaptureUtils.isRestrictedUrl(tab.url)) throw new Error(getI18nText('unsupportedPage'));

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['capture-utils.js', 'content.js']
      });

      const messageKeys = [
        'progress', 'reduced', 'visibleError', 'fullError', 'fullScrollError', 'zoneError',
        'scrollingError', 'scrollingDialogLabel', 'scrollingGeometry',
        'scrollingInstructionStart', 'scrollingInstructionEnd', 'scrollingPointSet',
        'scrollingInvalidRegion', 'scrollingCapture', 'scrollingRestart', 'scrollingCancel',
        'coordinateX', 'coordinateY', 'coordinateWidth', 'coordinateHeight',
        'btnScrollingTitle', 'tabChangedError', 'captureAlreadyRunning'
      ];
      const response = await chrome.tabs.sendMessage(tab.id, {
        action,
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

  captureButtons[0].addEventListener('click', () => startCapture('START_FULL_PAGE_CAPTURE', 'statusFull'));
  captureButtons[1].addEventListener('click', () => startCapture('START_VISIBLE_CAPTURE', 'statusVisible'));
  captureButtons[2].addEventListener('click', () => startCapture('START_ZONE_CAPTURE', 'statusZone'));
  captureButtons[3].addEventListener('click', () => startCapture('START_SCROLLING_ZONE_CAPTURE', 'statusScrolling'));
});
