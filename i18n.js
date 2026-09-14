// Runtime internationalization backed by the extension's canonical locale files.
(function registerI18n(globalScope) {
  if (globalScope.ScionosI18n) return;

  const SUPPORTED_LANGUAGES = ['fr', 'en', 'es', 'de'];
  const LANGUAGE_MODES = ['auto', ...SUPPORTED_LANGUAGES];
  const localeCache = new Map();
  let currentLang = 'fr';
  let currentMode = 'auto';
  let messages = {};
  let localeRequestVersion = 0;

  function browserLanguage() {
    const language = (navigator.language || chrome.i18n.getUILanguage() || 'fr').slice(0, 2).toLowerCase();
    return SUPPORTED_LANGUAGES.includes(language) ? language : 'fr';
  }

  async function loadLocale(language) {
    const safeLanguage = SUPPORTED_LANGUAGES.includes(language) ? language : 'fr';
    if (localeCache.has(safeLanguage)) return localeCache.get(safeLanguage);

    const response = await fetch(chrome.runtime.getURL(`_locales/${safeLanguage}/messages.json`));
    if (!response.ok) throw new Error(`Locale ${safeLanguage} unavailable`);
    const raw = await response.json();
    const normalized = Object.fromEntries(
      Object.entries(raw).map(([key, value]) => [key, value && typeof value.message === 'string' ? value.message : key])
    );
    localeCache.set(safeLanguage, normalized);
    return normalized;
  }

  function interpolate(value, params = {}) {
    return Object.entries(params).reduce(
      (result, [name, replacement]) => result.replaceAll(`{${name}}`, String(replacement)),
      value
    );
  }

  async function applyMode(mode) {
    const requestVersion = ++localeRequestVersion;
    const nextMode = LANGUAGE_MODES.includes(mode) ? mode : 'auto';
    let nextLanguage = nextMode === 'auto' ? browserLanguage() : nextMode;
    let nextMessages = {};
    try {
      nextMessages = await loadLocale(nextLanguage);
    } catch (error) {
      console.error('Locale loading failed:', error);
      nextLanguage = 'fr';
      try { nextMessages = await loadLocale('fr'); } catch { nextMessages = {}; }
    }
    if (requestVersion !== localeRequestVersion) return false;
    currentMode = nextMode;
    currentLang = nextLanguage;
    messages = nextMessages;
    globalScope.currentLang = currentLang;
    globalScope.languageMode = currentMode;
    document.documentElement.lang = currentLang;
    return true;
  }

  function getStorage(keys) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(keys, values => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(values);
      });
    });
  }

  function setStorage(values) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(values, () => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve();
      });
    });
  }

  function removeStorage(keys) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove(keys, () => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve();
      });
    });
  }

  async function initI18n(onLoaded) {
    let stored = {};
    try { stored = await getStorage(['languageMode', 'userLang']); }
    catch (error) { console.warn('Language preference unavailable:', error); }
    const migratedMode = LANGUAGE_MODES.includes(stored.languageMode)
      ? stored.languageMode
      : (SUPPORTED_LANGUAGES.includes(stored.userLang) ? stored.userLang : 'auto');
    if (!stored.languageMode || stored.userLang) {
      try {
        await setStorage({ languageMode: migratedMode });
        if (stored.userLang) await removeStorage('userLang');
      } catch (error) { console.warn('Language preference migration failed:', error); }
    }
    await applyMode(migratedMode);
    if (typeof onLoaded === 'function') onLoaded(currentLang, currentMode);
    return { language: currentLang, mode: currentMode };
  }

  async function setLanguageMode(mode, callback) {
    if (!LANGUAGE_MODES.includes(mode)) return;
    try { await setStorage({ languageMode: mode }); }
    catch (error) { console.warn('Language preference save failed:', error); }
    const applied = await applyMode(mode);
    if (!applied) return;
    globalScope.dispatchEvent(new CustomEvent('scionos-language-change', {
      detail: { language: currentLang, mode: currentMode }
    }));
    if (typeof callback === 'function') callback(currentLang, currentMode);
  }

  function getI18nText(key, params = {}) {
    const extensionFallback = chrome.i18n && typeof chrome.i18n.getMessage === 'function' ? chrome.i18n.getMessage(key) : '';
    return interpolate(messages[key] || extensionFallback || key, params);
  }

  function getMessageBundle(keys) {
    return Object.fromEntries(keys.map(key => [key, messages[key] || key]));
  }

  function setupLanguageMenu({ button, menu, flag, code }) {
    const options = Array.from(menu.querySelectorAll('[data-language-mode]'));

    function closeMenu({ restoreFocus = false } = {}) {
      menu.hidden = true;
      button.setAttribute('aria-expanded', 'false');
      if (restoreFocus) button.focus();
    }

    function openMenu() {
      menu.hidden = false;
      button.setAttribute('aria-expanded', 'true');
      const active = options.find(option => option.dataset.languageMode === currentMode) || options[0];
      active.focus();
    }

    function update() {
      flag.src = `images/flags/${currentLang}.svg`;
      flag.alt = '';
      code.textContent = currentLang.toUpperCase();
      button.setAttribute('aria-label', getI18nText('languageCurrent', {
        language: getI18nText(`language${currentLang.toUpperCase()}`)
      }));
      menu.setAttribute('aria-label', getI18nText('languagePicker'));
      options.forEach(option => {
        const selected = option.dataset.languageMode === currentMode;
        option.setAttribute('aria-checked', String(selected));
        option.querySelector('.language-check').textContent = selected ? '✓' : '';
      });
    }

    button.addEventListener('click', () => {
      if (menu.hidden) openMenu();
      else closeMenu({ restoreFocus: true });
    });

    options.forEach(option => {
      option.addEventListener('click', async () => {
        await setLanguageMode(option.dataset.languageMode);
        closeMenu({ restoreFocus: true });
      });
      option.addEventListener('keydown', event => {
        const currentIndex = options.indexOf(option);
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          const offset = event.key === 'ArrowDown' ? 1 : -1;
          options[(currentIndex + offset + options.length) % options.length].focus();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          closeMenu({ restoreFocus: true });
        }
      });
    });

    document.addEventListener('pointerdown', event => {
      if (!menu.hidden && !menu.contains(event.target) && !button.contains(event.target)) closeMenu();
    });
    globalScope.addEventListener('scionos-language-change', update);
    update();
    return { update, close: closeMenu };
  }

  const api = {
    SUPPORTED_LANGUAGES,
    initI18n,
    setLanguageMode,
    getI18nText,
    getMessageBundle,
    setupLanguageMenu,
    get language() { return currentLang; },
    get mode() { return currentMode; }
  };

  globalScope.ScionosI18n = api;
  globalScope.currentLang = currentLang;
  globalScope.languageMode = currentMode;
  globalScope.initI18n = initI18n;
  globalScope.setLanguageMode = setLanguageMode;
  globalScope.setLanguage = setLanguageMode;
  globalScope.getI18nText = getI18nText;
})(window);
