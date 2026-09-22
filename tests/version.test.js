const test = require('node:test');
const assert = require('node:assert/strict');

test('accepts Chrome-compatible extension versions', async () => {
  const { isValidChromeVersion, chromeSupportedLine } = await import('../scripts/version.mjs');
  assert.equal(isValidChromeVersion('1.2.0'), true);
  assert.equal(isValidChromeVersion('1.2'), true);
  assert.equal(isValidChromeVersion('1.2.3.4'), true);
  assert.equal(chromeSupportedLine('1.2.0'), '1.2.x');
});

test('rejects versions that Chrome cannot install', async () => {
  const { isValidChromeVersion, assertChromeVersion } = await import('../scripts/version.mjs');
  for (const version of ['1.2.3-beta', '01.2.0', '1.2.3.4.5', '1.65536.0', '0.0.0']) {
    assert.equal(isValidChromeVersion(version), false, version);
    assert.throws(() => assertChromeVersion(version), /Invalid Chrome extension version/);
  }
});
