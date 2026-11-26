const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Guards the B2 regression: every text('key') used by the content scripts must
// be included in the message bundle sent by popup.js (except canvas contexts).
test('content-script message keys are all covered by the popup bundle', () => {
  const root = path.join(__dirname, '..');
  const popupSource = fs.readFileSync(path.join(root, 'popup.js'), 'utf8');
  const bundleMatch = popupSource.match(/const messageKeys = \[([\s\S]*?)\];/);
  assert.ok(bundleMatch, 'messageKeys not found in popup.js');
  const bundled = new Set(
    [...bundleMatch[1].matchAll(/'([^']+)'/g)].map(match => match[1])
  );

  const used = new Set();
  for (const file of ['content-capture.js', 'content-dom.js', 'content-transfer.js', 'content.js']) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    for (const match of source.matchAll(/(?<![\w$.])text\('([^']+)'\)/g)) {
      used.add(match[1]);
    }
  }
  // '2d' comes from getContext('2d'), not from the i18n text() helper.
  used.delete('2d');

  const missing = [...used].filter(key => !bundled.has(key));
  assert.deepEqual(missing, [], `Keys missing from popup bundle: ${missing.join(', ')}`);
  assert.ok(bundled.has('statusZone'), 'statusZone must be bundled for the zone overlay label');
});

test('privacy notices and resource refusals have complete translations with consistent numeric limits', () => {
  const keys = ['textLayerLimitedNotice', 'captureDurationLimitError', 'capturePortionLimitError',
    'captureCancelledError', 'pdfResourceLimitError', 'projectResourceLimitError'];
  const translated = new Map();
  for (const language of ['fr', 'en', 'de', 'es']) {
    const messages = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '_locales', language, 'messages.json'), 'utf8'));
    for (const key of keys) {
      const value = messages[key]?.message;
      assert.equal(typeof value, 'string', `${language}: missing ${key}`);
      assert.ok(value.trim(), `${language}: empty ${key}`);
      assert.doesNotMatch(value, /\{[^}]+\}/u, `${language}: unresolved interpolation in ${key}`);
      const values = translated.get(key) || new Set();
      values.add(value); translated.set(key, values);
    }
    assert.match(messages.captureDurationLimitError.message, /\b180\b/u, language);
    assert.match(messages.capturePortionLimitError.message, /\b256\b/u, language);
    assert.deepEqual(messages.projectResourceLimitError.message.match(/\d+/gu), ['1', '128'], language);
  }
  for (const [key, values] of translated) assert.equal(values.size, 4, `${key}: translation copied from another language`);
});
