// Help & documentation controller - Scionos Capture
document.addEventListener('DOMContentLoaded', async () => {
  function updateTexts() {
    document.title = getI18nText('helpTitle');
    const textMappings = {
      'help-tagline': 'helpTagline',
      'sec-privacy-title': 'helpPrivacyHeader',
      'sec-privacy-text': 'helpPrivacyText',
      'sec-modes-title': 'helpModesHeader',
      'mode-full-title': 'btnFullPageTitle',
      'mode-full-desc': 'helpModeFull',
      'mode-visible-title': 'btnVisibleTitle',
      'mode-visible-desc': 'helpModeVisible',
      'mode-zone-title': 'btnZoneTitle',
      'mode-zone-desc': 'helpModeZone',
      'mode-scrolling-title': 'btnScrollingTitle',
      'mode-scrolling-desc': 'helpModeScrolling',
      'sec-editor-title': 'helpEditorHeader',
      'sec-editor-text': 'helpEditorText',
      'sec-shortcuts-title': 'helpShortcutsHeader',
      'sc-activation': 'helpShortcutActivation',
      'sc-select': 'helpShortcutSelect',
      'sc-draw': 'helpShortcutDraw',
      'sc-arrow': 'helpShortcutArrow',
      'sc-text': 'helpShortcutText',
      'sc-step': 'helpShortcutStep',
      'sc-shape': 'helpShortcutShape',
      'sc-censor': 'helpShortcutCensor',
      'sc-crop': 'helpShortcutCrop',
      'sc-undoredo': 'helpShortcutUndoRedo',
      'sc-zoom': 'helpShortcutZoom'
    };

    Object.entries(textMappings).forEach(([id, key]) => {
      const element = document.getElementById(id);
      if (element) element.textContent = getI18nText(key);
    });

    const manifestVersion = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest)
      ? chrome.runtime.getManifest().version
      : '1.3.0';
    const versionElement = document.getElementById('help-version');
    if (versionElement) {
      versionElement.textContent = getI18nText('helpVersionLabel', { version: manifestVersion });
    }

    const autoLang = document.querySelector('[data-i18n="languageAuto"]');
    if (autoLang) autoLang.textContent = getI18nText('languageAuto');
  }

  await initI18n();
  const languageMenu = ScionosI18n.setupLanguageMenu({
    button: document.getElementById('language-button'),
    menu: document.getElementById('language-menu'),
    flag: document.getElementById('language-flag'),
    code: document.getElementById('language-code')
  });

  updateTexts();

  window.addEventListener('scionos-language-change', () => {
    updateTexts();
    languageMenu.update();
  });
});
