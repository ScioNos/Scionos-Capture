import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertChromeVersion, chromeSupportedLine } from './version.mjs';
import { RELEASE_ZIP_FILES } from './release-files.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const supportedLocales = ['fr', 'en', 'es', 'de'];
const allowedPermissions = new Set(['activeTab', 'alarms', 'scripting', 'storage', 'unlimitedStorage']);

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(root, relativePath), 'utf8'));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function pngDimensions(buffer) {
  assert(buffer.length >= 24, 'PNG header is truncated');
  assert(buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'Invalid PNG signature');
  assert(buffer.readUInt32BE(8) === 13 && buffer.subarray(12, 16).toString('ascii') === 'IHDR', 'Invalid PNG IHDR');
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

export async function validateMarkdownDocuments(projectRoot = root) {
  const ignored = new Set(['node_modules', '.git', '.codegraph', 'dist', 'test-results', 'playwright-report', 'coverage']);
  const documents = [];
  async function visit(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory() && !ignored.has(entry.name)) await visit(filename);
      else if (entry.isFile() && /\.md$/iu.test(entry.name)) documents.push(filename);
    }
  }
  await visit(projectRoot);
  const contents = new Map(await Promise.all(documents.map(async file => [file, await fs.readFile(file, 'utf8')])));
  const anchors = new Map();
  for (const [file, content] of contents) {
    const seen = new Map(), ids = new Set();
    const source = content.replace(/```[\s\S]*?```/gu, '');
    for (const heading of source.matchAll(/^#{1,6}\s+(.+)$/gmu)) {
      const base = heading[1].replace(/<[^>]*>/gu, '').toLowerCase().replace(/[^\p{L}\p{N}_\- ]/gu, '').replace(/ /gu, '-');
      const count = seen.get(base) || 0;
      seen.set(base, count + 1); ids.add(base + (count ? '-' + count : ''));
    }
    anchors.set(file, ids);
  }
  let links = 0;
  for (const [file, content] of contents) {
    const source = content.replace(/```[\s\S]*?```/gu, '');
    const destinations = [...source.matchAll(/!?\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/gu)].map(match => match[1]);
    destinations.push(...[...source.matchAll(/^\[[^\]]+\]:\s+(\S+)/gmu)].map(match => match[1]));
    for (const target of destinations) {
      if (/^[a-z][\w+.-]*:/iu.test(target)) continue;
      const [relative, fragment] = target.split('#');
      const destination = relative ? path.resolve(path.dirname(file), decodeURIComponent(relative)) : file;
      const stat = await fs.stat(destination).catch(() => null);
      assert(stat, `Missing Markdown link in ${path.relative(projectRoot, file)}: ${target}`);
      if (fragment && anchors.has(destination)) assert(anchors.get(destination).has(decodeURIComponent(fragment)),
        `Missing Markdown anchor in ${path.relative(projectRoot, file)}: ${target}`);
      links += 1;
    }
  }
  return { documents: documents.length, links };
}

export async function validatePackage() {
  const manifest = await readJson('manifest.json');
  const packageJson = await readJson('package.json');
  const packageLock = await readJson('package-lock.json');
  assert(manifest.manifest_version === 3, 'manifest_version must be 3');
  assertChromeVersion(manifest.version);
  assert(packageJson.version === manifest.version, 'manifest and package versions must match');
  assert(packageLock && typeof packageLock === 'object', 'package-lock.json must contain an object');
  assert(packageLock.version === manifest.version, 'manifest and package-lock versions must match');
  assert(packageLock.packages && packageLock.packages[''], 'package-lock root entry is missing');
  assert(packageLock.packages[''].version === manifest.version, 'package-lock root version must match');
  assert(manifest.default_locale === 'fr', 'default locale must be fr');
  manifest.permissions.forEach(permission => assert(allowedPermissions.has(permission), `Unexpected permission: ${permission}`));

  const localeEntries = await Promise.all(supportedLocales.map(async locale => {
    const messages = await readJson(`_locales/${locale}/messages.json`);
    assert(messages.appDesc.message.length <= 132, `${locale} description exceeds 132 characters`);
    return [locale, messages];
  }));
  const referenceKeys = Object.keys(localeEntries[0][1]).sort();
  localeEntries.forEach(([locale, messages]) => {
    assert(JSON.stringify(Object.keys(messages).sort()) === JSON.stringify(referenceKeys), `${locale} locale keys differ`);
    Object.entries(messages).forEach(([key, value]) => assert(typeof value.message === 'string' && value.message.trim(), `${locale}.${key} is empty`));
  });

  const referencedFiles = [
    manifest.background.service_worker,
    manifest.action.default_popup,
    ...Object.values(manifest.icons),
    manifest.action.default_icon,
    'editor.html', 'help.html', 'capture-utils.js', 'capture-content-utils.js', 'capture-store.js', 'content-dom.js', 'content-transfer.js', 'content-capture.js', 'content.js', 'editor-operations.js', 'editor-export.js', 'editor.js', 'help.js', 'i18n.js', 'popup.js'
  ];
  await Promise.all(referencedFiles.map(async relativePath => {
    const stat = await fs.stat(path.join(root, relativePath));
    assert(stat.isFile(), `Referenced file is missing: ${relativePath}`);
  }));
  await Promise.all(RELEASE_ZIP_FILES.map(async relativePath => {
    const stat = await fs.stat(path.join(root, relativePath));
    assert(stat.isFile(), `Release ZIP file is missing: ${relativePath}`);
  }));

  for (const size of [16, 48, 128]) {
    const dimensions = pngDimensions(await fs.readFile(path.join(root, `images/icon${size}.png`)));
    assert(dimensions.width === size && dimensions.height === size, `icon${size}.png has wrong dimensions`);
  }

  const documentBases = ['README', 'CHANGELOG', 'PRIVACY', 'SECURITY', 'CONTRIBUTING', 'PULL_REQUEST_TEMPLATE'];
  const documentFiles = documentBases.flatMap(base => [
    `${base}.md`, `${base}.en.md`, `${base}.es.md`, `${base}.de.md`
  ]);
  await Promise.all(documentFiles.map(async relativePath => {
    const content = await fs.readFile(path.join(root, relativePath), 'utf8');
    assert(content.trim().length > 100, `Documentation is incomplete: ${relativePath}`);
  }));

  for (const relativePath of ['README.md', 'README.en.md', 'README.es.md', 'README.de.md']) {
    const readme = await fs.readFile(path.join(root, relativePath), 'utf8');
    assert(readme.includes(`/badge/version-${manifest.version}-blue`), `README source version is stale: ${relativePath}`);
    assert(readme.includes(`scionos-capture-v${manifest.version}.zip`), `README local archive version is stale: ${relativePath}`);
    const sourceMarker = readme.match(/<!-- source-version -->([^\n]+)/u);
    if (sourceMarker) assert(sourceMarker[1].includes(manifest.version), `README preparation version is stale: ${relativePath}`);
  }
  const releaseNotes = await fs.readFile(path.join(root, 'RELEASE_NOTES.md'), 'utf8');
  assert(releaseNotes.includes(`# Scionos Capture ${manifest.version}`), 'Release notes version is stale');

  const supportedLine = chromeSupportedLine(manifest.version);
  await Promise.all(['SECURITY.md', 'SECURITY.en.md', 'SECURITY.es.md', 'SECURITY.de.md'].map(async relativePath => {
    const content = await fs.readFile(path.join(root, relativePath), 'utf8');
    assert(content.includes(supportedLine), `Security policy version is stale: ${relativePath}`);
  }));

  const markdown = await validateMarkdownDocuments();
  return { locales: supportedLocales.length, keys: referenceKeys.length, files: referencedFiles.length + documentFiles.length, markdown };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await validatePackage();
  console.log(`Package validation passed: ${result.locales} locales, ${result.keys} keys, ${result.files} references; ${result.markdown.documents} Markdown documents, ${result.markdown.links} local links.`);
}
