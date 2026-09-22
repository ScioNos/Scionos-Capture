const js = require('@eslint/js');

const browserGlobals = Object.fromEntries([
  'Blob', 'ClipboardItem', 'CustomEvent', 'FileReader', 'IDBKeyRange', 'Image', 'URL', 'URLSearchParams',
  'cancelAnimationFrame', 'chrome', 'confirm', 'console', 'crypto', 'document', 'fetch', 'indexedDB',
  'navigator', 'requestAnimationFrame', 'setTimeout', 'clearTimeout', 'window', 'alert', 'location',
  'createImageBitmap', 'getComputedStyle', 'importScripts', 'module',
  'ScionosCaptureUtils', 'ScionosContentUtils', 'CaptureStore', 'ScionosI18n', 'getI18nText', 'initI18n'
].map(name => [name, 'readonly']));

module.exports = [
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  {
    files: ['*.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: browserGlobals },
    rules: {
      'no-console': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  },
  {
    files: ['tests/**/*.js', 'scripts/**/*.js', 'playwright.config.js', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: { Blob: 'readonly', Buffer: 'readonly', CaptureStore: 'readonly', URL: 'readonly', __dirname: 'readonly', console: 'readonly', document: 'readonly', process: 'readonly', require: 'readonly', module: 'readonly' }
    }
  },
  {
    files: ['scripts/**/*.mjs', 'tests/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { Buffer: 'readonly', console: 'readonly', process: 'readonly' }
    }
  }
];
