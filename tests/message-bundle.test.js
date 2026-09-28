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
