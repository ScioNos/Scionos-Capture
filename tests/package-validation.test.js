const test = require('node:test');
const assert = require('node:assert/strict');

test('manifest, locale catalogs, icons and referenced files are valid', async () => {
  const { validatePackage } = await import('../scripts/validate-package.mjs');
  const result = await validatePackage();
  assert.equal(result.locales, 4);
  assert.ok(result.keys > 70);
  assert.ok(result.files > 10);
});

test('PNG dimensions require a complete PNG signature and IHDR header', async () => {
  const { pngDimensions } = await import('../scripts/validate-package.mjs');
  const header = Buffer.alloc(24);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(header, 0);
  header.writeUInt32BE(13, 8);
  header.write('IHDR', 12, 'ascii');
  header.writeUInt32BE(16, 16);
  header.writeUInt32BE(48, 20);

  assert.deepEqual(pngDimensions(header), { width: 16, height: 48 });

  const invalidSignature = Buffer.from(header);
  invalidSignature[0] = 0;
  assert.throws(() => pngDimensions(invalidSignature), /Invalid PNG signature/);
  assert.throws(() => pngDimensions(header.subarray(0, 23)), /PNG header is truncated/);

  const invalidHeader = Buffer.from(header);
  invalidHeader.write('IDAT', 12, 'ascii');
  assert.throws(() => pngDimensions(invalidHeader), /Invalid PNG IHDR/);
});

test('version sync rejects a missing or malformed lockfile before changing package.json', async () => {
  const fs = require('node:fs/promises');
  const os = require('node:os');
  const path = require('node:path');
  const { updateReadmeVersion } = await import('../scripts/update-readme-version.mjs');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'scionos-version-sync-'));
  const packageJson = { name: 'fixture', version: '1.3.0' };
  const packagePath = path.join(root, 'package.json');

  try {
    await fs.writeFile(packagePath, JSON.stringify(packageJson), 'utf8');
    await assert.rejects(updateReadmeVersion('1.3.1', root));
    assert.deepEqual(JSON.parse(await fs.readFile(packagePath, 'utf8')), packageJson);

    await fs.writeFile(path.join(root, 'package-lock.json'), '{ invalid json', 'utf8');
    await assert.rejects(updateReadmeVersion('1.3.1', root));
    assert.deepEqual(JSON.parse(await fs.readFile(packagePath, 'utf8')), packageJson);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});


test('version sync updates all version files after validating a complete lockfile', async () => {
  const fs = require('node:fs/promises');
  const os = require('node:os');
  const path = require('node:path');
  const { updateReadmeVersion } = await import('../scripts/update-readme-version.mjs');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'scionos-version-sync-valid-'));
  const packageJson = { name: 'fixture', version: '1.3.0' };
  const packageLock = { version: '1.3.0', packages: { '': { version: '1.3.0' } } };
  const manifest = { version: '1.3.0' };
  const docs = [
    'README.md', 'README.en.md', 'README.es.md', 'README.de.md',
    'RELEASE_NOTES.md', 'SECURITY.md', 'SECURITY.en.md', 'SECURITY.es.md', 'SECURITY.de.md'
  ];
  const quote = String.fromCharCode(96);

  try {
    await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(packageJson), 'utf8');
    await fs.writeFile(path.join(root, 'package-lock.json'), JSON.stringify(packageLock), 'utf8');
    await fs.writeFile(path.join(root, 'manifest.json'), JSON.stringify(manifest), 'utf8');
    for (const file of docs) {
      const content = file === 'RELEASE_NOTES.md'
        ? '# Scionos Capture 1.3.0'
        : file.startsWith('SECURITY')
          ? 'Supported: ' + quote + '1.3.x' + quote
          : 'scionos-capture-v1.3.0.zip';
      await fs.writeFile(path.join(root, file), content, 'utf8');
    }

    const result = await updateReadmeVersion('1.4.0', root);
    assert.equal(result.version, '1.4.0');
    assert.ok(result.updatedFiles.includes('package.json'));
    assert.ok(result.updatedFiles.includes('package-lock.json'));
    assert.ok(result.updatedFiles.includes('manifest.json'));
    assert.ok(result.updatedFiles.includes('README.md'));

    assert.equal(JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8')).version, '1.4.0');
    assert.equal(JSON.parse(await fs.readFile(path.join(root, 'package-lock.json'), 'utf8')).packages[''].version, '1.4.0');
    assert.equal(JSON.parse(await fs.readFile(path.join(root, 'manifest.json'), 'utf8')).version, '1.4.0');
    assert.equal(await fs.readFile(path.join(root, 'RELEASE_NOTES.md'), 'utf8'), '# Scionos Capture 1.4.0');
    assert.equal(await fs.readFile(path.join(root, 'SECURITY.md'), 'utf8'), 'Supported: ' + quote + '1.4.x' + quote);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
