const test = require('node:test');
const assert = require('node:assert/strict');

test('manifest, locale catalogs, icons and referenced files are valid', async () => {
  const { validatePackage } = await import('../scripts/validate-package.mjs');
  const result = await validatePackage();
  assert.equal(result.locales, 4);
  assert.ok(result.keys > 70);
  assert.ok(result.files > 10);
});
