import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import archiver from 'archiver';
import { validatePackage } from './validate-package.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const manifest = JSON.parse(await fsp.readFile(path.join(root, 'manifest.json'), 'utf8'));
const zipName = `scionos-capture-v${manifest.version}.zip`;
const zipPath = path.join(dist, zipName);
const files = [
  'manifest.json', 'background.js', 'capture-store.js', 'capture-utils.js', 'capture-content-utils.js', 'content-dom.js', 'content-transfer.js', 'content-capture.js', 'content.js',
  'editor.html', 'editor-operations.js', 'editor-export.js', 'editor.js', 'help.html', 'help.js', 'i18n.js', 'popup.html', 'popup.js',
  'images/icon16.png', 'images/icon48.png', 'images/icon128.png',
  ...['fr', 'en', 'es', 'de'].map(locale => `_locales/${locale}/messages.json`),
  ...['fr', 'en', 'es', 'de'].map(locale => `images/flags/${locale}.svg`)
];

await validatePackage();
await fsp.mkdir(dist, { recursive: true });
await fsp.rm(zipPath, { force: true });

await new Promise((resolve, reject) => {
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });
  output.on('close', resolve);
  output.on('error', reject);
  archive.on('error', reject);
  archive.pipe(output);
  files.forEach(relativePath => archive.file(path.join(root, relativePath), { name: relativePath.replaceAll('\\', '/') }));
  archive.finalize();
});

const zipBuffer = await fsp.readFile(zipPath);
const entries = [];
for (let offset = 0; offset <= zipBuffer.length - 46;) {
  if (zipBuffer.readUInt32LE(offset) !== 0x02014b50) {
    offset += 1;
    continue;
  }
  const nameLength = zipBuffer.readUInt16LE(offset + 28);
  const extraLength = zipBuffer.readUInt16LE(offset + 30);
  const commentLength = zipBuffer.readUInt16LE(offset + 32);
  entries.push(zipBuffer.subarray(offset + 46, offset + 46 + nameLength).toString('utf8'));
  offset += 46 + nameLength + extraLength + commentLength;
}
const expected = files.map(file => file.replaceAll('\\', '/')).sort();
if (JSON.stringify(entries.sort()) !== JSON.stringify(expected)) {
  throw new Error('Generated ZIP does not match the release allow-list.');
}

const digest = crypto.createHash('sha256').update(zipBuffer).digest('hex');
await fsp.writeFile(`${zipPath}.sha256`, `${digest}  ${zipName}\n`, 'utf8');
console.log(`Created dist/${zipName} (${files.length} files)`);
