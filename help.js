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
      'mode-element-title': 'elementTitle',
      'mode-element-desc': 'helpModeElement',
      'mode-delay-title': 'delayLabel',
      'mode-delay-desc': 'helpCaptureDelay',
      'sec-editor-title': 'helpEditorHeader',
      'sec-editor-text': 'helpEditorText',
      'sec-composition-title': 'helpCompositionHeader',
      'help-import-title': 'helpImportHeader',
      'help-import-text': 'helpImportText',
      'help-compose-title': 'helpComposeHeader',
      'help-compose-text': 'helpComposeText',
      'help-export-title': 'helpExportHeader',
      'help-export-text': 'helpExportText',
      'help-save-title': 'helpSaveHeader',
      'help-save-text': 'helpSaveText',
      'help-annotations-title': 'helpAnnotationsHeader',
      'help-annotations-text': 'helpAnnotationsText',
      'help-library-title': 'helpLibraryHeader',
      'help-library-text': 'helpLibraryText',
      'sec-shortcuts-title': 'helpShortcutsHeader',
      'sc-activation': 'helpShortcutActivation',
      'sc-select': 'helpShortcutSelect',
      'sc-draw': 'helpShortcutDraw',
      'sc-highlight': 'helpShortcutHighlight',
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
      : '';
    const versionElement = document.getElementById('help-version');
    if (versionElement) {
      versionElement.hidden = !manifestVersion;
      versionElement.textContent = manifestVersion ? getI18nText('helpVersionLabel', { version: manifestVersion }) : '';
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
