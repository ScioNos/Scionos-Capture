// Single source of truth for the files included in the release ZIP.
// Imported by scripts/package.mjs and scripts/validate-package.mjs so the
// allow-list cannot drift between packaging and validation.
export const RELEASE_ZIP_FILES = [
  'manifest.json', 'background.js', 'capture-store.js', 'capture-utils.js', 'capture-content-utils.js', 'content-dom.js', 'content-transfer.js', 'content-capture.js', 'content.js',
  'editor.html', 'editor-operations.js', 'editor-export.js', 'editor.js', 'help.html', 'help.js', 'i18n.js', 'popup.html', 'popup.js',
  'images/icon16.png', 'images/icon48.png', 'images/icon128.png',
  ...['fr', 'en', 'es', 'de'].map(locale => `_locales/${locale}/messages.json`),
  ...['fr', 'en', 'es', 'de'].map(locale => `images/flags/${locale}.svg`)
];
