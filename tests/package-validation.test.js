const test = require('node:test');
const assert = require('node:assert/strict');

test('manifest, locale catalogs, icons and referenced files are valid', async () => {
  const { validatePackage } = await import('../scripts/validate-package.mjs');
  const result = await validatePackage();
  assert.equal(result.locales, 4);
  assert.ok(result.keys > 70);
  assert.ok(result.files > 10);
});

test('manifest policy allows only the current permission set and local CSP', async () => {
  const { validateManifestPolicy } = await import('../scripts/validate-package.mjs');
  const manifest = require('../manifest.json');
  assert.doesNotThrow(() => validateManifestPolicy(manifest));
  assert.doesNotThrow(() => validateManifestPolicy({ ...manifest,
    host_permissions: [], optional_host_permissions: [], optional_permissions: [], externally_connectable: {},
    content_security_policy: { extension_pages: "script-src 'self'; object-src 'self'; connect-src 'none'" }
  }));
  for (const permissions of [undefined, 'activeTab', ['activeTab', 'tabs'], ['https://example.com/*'], ['activeTab', 'activeTab']]) {
    assert.throws(() => validateManifestPolicy({ ...manifest, permissions }), /permissions|permission/);
  }
  for (const field of ['host_permissions', 'optional_host_permissions', 'optional_permissions']) {
    for (const value of [['https://example.com/*'], ['<all_urls>'], ['tabs'], '']) {
      assert.throws(() => validateManifestPolicy({ ...manifest, [field]: value }), new RegExp(field));
    }
  }
  for (const value of [{ matches: ['https://example.com/*'] }, { ids: ['*'] }, { accepts_tls_channel_id: true }, []]) {
    assert.throws(() => validateManifestPolicy({ ...manifest, externally_connectable: value }), /externally_connectable/);
  }
});

test('manifest policy rejects remote CSP and unsafe evaluation across scopes', async () => {
  const { validateManifestPolicy } = await import('../scripts/validate-package.mjs');
  const manifest = require('../manifest.json');
  for (const scope of ['extension_pages', 'sandbox']) {
    for (const source of ['https://cdn.example.com', 'http://example.com', 'https:', 'wss://example.com',
      '//cdn.example.com', '*.example.com', 'example.com', '*', "'unsafe-eval'", "'UNSAFE-EVAL'"]) {
      assert.throws(() => validateManifestPolicy({ ...manifest,
        content_security_policy: { [scope]: "script-src 'self' " + source }
      }), /CSP/);
    }
  }
  assert.throws(() => validateManifestPolicy({ ...manifest, content_security_policy: "script-src 'self'" }), /MV3/);
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

test('unreleased synchronization preserves published links and history and is idempotent', async () => {
  const fs = require('node:fs/promises');
  const os = require('node:os');
  const path = require('node:path');
  const { updateReadmeVersion } = await import('../scripts/update-readme-version.mjs');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'scionos-unreleased-'));
  const docs = [
    'README.md', 'README.en.md', 'README.es.md', 'README.de.md', 'RELEASE_NOTES.md',
    'SECURITY.md', 'SECURITY.en.md', 'SECURITY.es.md', 'SECURITY.de.md'
  ];
  try {
    for (const file of ['package.json', 'package-lock.json', 'manifest.json', ...docs]) {
      await fs.copyFile(path.join(__dirname, '..', file), path.join(root, file));
    }
    // Fix the published download fixture independently of the repository's current release.
    const publishedReadme = [
      '![Version](https://img.shields.io/badge/version-1.3.2-blue)',
      '[Release v1.3.2](https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.3.2)',
      'Download: `scionos-capture-v1.3.2.zip`'
    ].join('\n') + '\n';
    for (const file of docs.filter(file => file.startsWith('README'))) {
      const badgeReadme = file === 'README.md' ? publishedReadme : publishedReadme.replace(
        '![Version](https://img.shields.io/badge/version-1.3.2-blue)',
        '[![Version](https://img.shields.io/badge/version-1.3.2-blue)](https://github.com/ScioNos/Scionos-Capture) [![Checks](https://example.com/check.svg)](https://example.com/check)'
      );
      await fs.writeFile(path.join(root, file), badgeReadme, 'utf8');
    }
    const publishedArtifact = '<!-- local-package --> Published: `scionos-capture-v1.3.2.zip` · SHA-256: `published-fixture-checksum`.\n';
    await fs.appendFile(path.join(root, 'README.en.md'), publishedArtifact);
    await fs.appendFile(path.join(root, 'README.es.md'), '<!-- source-version --> **1.3.3 — en preparación.** Published GitHub: 1.3.2.\n');
    const candidateArtifact = '<!-- local-package --> Candidata 1.3.3 no publicada: nombre previsto `scionos-capture-v1.3.3.zip`. Sin suma de comprobación.\n';
    await fs.appendFile(path.join(root, 'README.es.md'), candidateArtifact);
    await fs.appendFile(path.join(root, 'README.de.md'), '<!-- local-package --> Unveröffentlichter Kandidat 1.3.3: `scionos-capture-v1.3.3.zip`.\n');
    const releaseHistory = '\n---\n\n# Scionos Capture 1.3.2\n[Release v1.3.2](https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.3.2)\nArchive: `scionos-capture-v1.3.2.zip`\n';
    const releaseDraft = '# Scionos Capture 1.3.3\nLatest published: [v1.3.2 release](https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.3.2)\n';
    await fs.writeFile(path.join(root, 'RELEASE_NOTES.md'), releaseDraft + releaseHistory);
    const history = '# Historical audit 1.3.2\nPublished 2026-09-30\n';
    for (const file of ['CHANGELOG.md', 'AUDIT_1.3.2.md']) await fs.writeFile(path.join(root, file), history);
    await updateReadmeVersion('1.3.4', root, { unreleased: true });
    for (const file of docs.filter(file => file.startsWith('README'))) {
      const text = await fs.readFile(path.join(root, file), 'utf8');
      assert.ok(text.includes('/badge/version-1.3.4-blue'));
      assert.ok(text.includes('<!-- source-version --> **1.3.4'));
      assert.ok(text.includes('/releases/tag/v1.3.2'));
      assert.ok(text.includes('scionos-capture-v1.3.2.zip'));
      assert.ok(text.includes('<!-- local-package -->'));
      if (file === 'README.en.md') assert.ok(text.includes(publishedArtifact));
      else assert.ok(text.includes('scionos-capture-v1.3.4.zip'));
      if (file === 'README.es.md') assert.ok(text.includes('Published GitHub: 1.3.2.'));
      assert.equal(text.match(/<!-- source-version -->/g).length, 1);
      assert.ok(!text.includes('/releases/tag/v1.3.4'));
    }
    const draftNotes = await fs.readFile(path.join(root, 'RELEASE_NOTES.md'), 'utf8');
    assert.equal(draftNotes, (releaseDraft + releaseHistory).replace('# Scionos Capture 1.3.3', '# Scionos Capture 1.3.4'));
    assert.deepEqual((await updateReadmeVersion('1.3.4', root, { unreleased: true })).updatedFiles, []);
    await updateReadmeVersion('1.3.5', root, { unreleased: true });
    for (const file of docs.filter(file => file.startsWith('README'))) {
      const text = await fs.readFile(path.join(root, file), 'utf8');
      assert.ok(text.includes('/badge/version-1.3.5-blue'));
      assert.ok(text.includes('<!-- source-version --> **1.3.5'));
      assert.ok(text.includes('/releases/tag/v1.3.2'));
      assert.ok(!text.includes('/releases/tag/v1.3.5'));
      const artifact = text.match(/^<!-- local-package -->[^\n]*/m)[0];
      if (file === 'README.en.md') assert.equal(artifact + '\n', publishedArtifact);
      else {
        assert.ok(artifact.includes('scionos-capture-v1.3.5.zip'));
        assert.ok(!artifact.includes('1.3.4'));
      }
      if (file === 'README.es.md') assert.ok(text.includes(candidateArtifact.replaceAll('1.3.3', '1.3.5')));
    }
    assert.deepEqual((await updateReadmeVersion('1.3.5', root, { unreleased: true })).updatedFiles, []);
    assert.ok((await fs.readFile(path.join(root, 'RELEASE_NOTES.md'), 'utf8')).endsWith(releaseHistory));
    await updateReadmeVersion('1.3.5', root);
    assert.ok((await fs.readFile(path.join(root, 'RELEASE_NOTES.md'), 'utf8')).endsWith(releaseHistory.slice(releaseHistory.indexOf('\n# Scionos Capture'))));
    for (const file of ['CHANGELOG.md', 'AUDIT_1.3.2.md']) {
      assert.equal(await fs.readFile(path.join(root, file), 'utf8'), history);
    }
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('Markdown validation checks relative files and anchors including local ignored documents', async () => {
  const fs = require('node:fs/promises');
  const os = require('node:os');
  const path = require('node:path');
  const { validateMarkdownDocuments } = await import('../scripts/validate-package.mjs');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'scionos-markdown-'));
  try {
    await fs.writeFile(path.join(root, 'README.md'), '# Documentation\n[Roadmap](ROADMAP.md#étapes)\n[Historical](AUDIT_1.3.2.md)\n');
    await fs.writeFile(path.join(root, 'ROADMAP.md'), '# Étapes\n');
    await fs.writeFile(path.join(root, 'AUDIT_1.3.2.md'), '# Audit 1.3.2\n');
    assert.deepEqual(await validateMarkdownDocuments(root), { documents: 3, links: 2 });
    await fs.appendFile(path.join(root, 'README.md'), '[Line](ROADMAP.md#L1)\n[Lines](ROADMAP.md#L1-L2)\n');
    assert.deepEqual(await validateMarkdownDocuments(root), { documents: 3, links: 4 });
    await fs.appendFile(path.join(root, 'README.md'), '[Invalid](ROADMAP.md#L999)\n');
    await assert.rejects(validateMarkdownDocuments(root), /Invalid line anchor/);
    await fs.writeFile(path.join(root, 'README.md'), '# Documentation\n[Roadmap](ROADMAP.md#étapes)\n[Historical](AUDIT_1.3.2.md)\n');
    await fs.writeFile(path.join(root, 'ROADMAP.md'), '# Other heading\n');
    await assert.rejects(validateMarkdownDocuments(root), /Missing Markdown anchor/);
    await fs.rm(path.join(root, 'ROADMAP.md'));
    await assert.rejects(validateMarkdownDocuments(root), /Missing Markdown link/);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
