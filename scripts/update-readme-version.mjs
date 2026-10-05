import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertChromeVersion, chromeSupportedLine } from './version.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Synchronise la version du projet dans package.json, manifest.json,
 * ainsi que dans tous les fichiers README et RELEASE_NOTES.
 *
 * @param {string} [targetVersion] - Nouvelle version cible (optionnelle, défaut: version dans package.json).
 * @param {string} [projectRoot] - Root directory to synchronize; defaults to the repository root.
 * @param {{unreleased?: boolean}} [options] - Preserve published downloads while synchronizing draft sources.
 * @returns {Promise<{ version: string, updatedFiles: string[] }>}
 */
export async function updateReadmeVersion(targetVersion, projectRoot = root, { unreleased = false } = {}) {
  const packagePath = path.join(projectRoot, 'package.json');
  const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf8'));

  const version = targetVersion || packageJson.version;
  assertChromeVersion(version);

  // Validate and stage all source data before writing any project files.
  const packageLockPath = path.join(projectRoot, 'package-lock.json');
  const packageLock = JSON.parse(await fs.readFile(packageLockPath, 'utf8'));
  if (!packageLock || typeof packageLock !== 'object' || !packageLock.packages || !packageLock.packages['']) {
    throw new Error('package-lock.json is invalid or missing its root package entry.');
  }

  const manifestPath = path.join(projectRoot, 'manifest.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const updates = new Map();

  if (packageJson.version !== version) {
    packageJson.version = version;
    updates.set('package.json', JSON.stringify(packageJson, null, 2) + '\n');
  }

  let lockChanged = false;
  if (packageLock.version !== version) {
    packageLock.version = version;
    lockChanged = true;
  }
  if (packageLock.packages[''].version !== version) {
    packageLock.packages[''].version = version;
    lockChanged = true;
  }
  if (lockChanged) updates.set('package-lock.json', JSON.stringify(packageLock, null, 2) + '\n');

  if (manifest.version !== version) {
    manifest.version = version;
    updates.set('manifest.json', JSON.stringify(manifest, null, 2) + '\n');
  }

  const docFiles = [
    'README.md',
    'README.en.md',
    'README.es.md',
    'README.de.md',
    'RELEASE_NOTES.md',
    'SECURITY.md',
    'SECURITY.en.md',
    'SECURITY.es.md',
    'SECURITY.de.md'
  ];
  const supportedLine = chromeSupportedLine(version);

  for (const relPath of docFiles) {
    const fullPath = path.join(projectRoot, relPath);
    let content = await fs.readFile(fullPath, 'utf8');
    const originalContent = content;

    content = content.replace(
      /https:\/\/img\.shields\.io\/badge\/version-[\d.]+(-[\w.]+)?-blue/g,
      `https://img.shields.io/badge/version-${version}-blue`
    );
    if (!unreleased || relPath === 'RELEASE_NOTES.md') {
      content = content.replace(
        /https:\/\/github\.com\/ScioNos\/Scionos-Capture\/releases\/tag\/v[\d.]+(-[\w.]+)?/g,
        `https://github.com/ScioNos/Scionos-Capture/releases/tag/v${version}`
      );
      content = content.replace(
        /scionos-capture-v[\d.]+(-[\w.]+)?\.zip/g,
        `scionos-capture-v${version}.zip`
      );
      content = content.replace(
        /\[([Rr]elease|versi(?:o|\u00f3)n)\s+v[\d.]+(-[\w.]+)?\]/g,
        `[$1 v${version}]`
      );
      content = content.replace(
        /\[v[\d.]+(-[\w.]+)?\s+release\]/g,
        `[v${version} release]`
      );
    }

    if (relPath.startsWith('README')) {
      content = content.replace(/(version:sync -- )[\d.]+( --unreleased)/gu, `$1${version}$2`);
      if (!content.includes('https://img.shields.io/badge/version-')) {
        const badge = `![Version](https://img.shields.io/badge/version-${version}-blue)`;
        if (/^\[Français\][^\n]*$/m.test(content)) content = content.replace(/(^\[Français\][^\n]*\n)/m, `$1\n${badge}\n`);
        else content += `\n${badge}\n`;
      }
      const language = relPath.split('.')[1];
      const labels = {
        md: ['en préparation, non publiée', 'Archive locale'],
        en: ['in preparation, unpublished', 'Local archive'],
        es: ['en preparación, no publicada', 'Archivo local'],
        de: ['in Vorbereitung, unveröffentlicht', 'Lokales Archiv']
      };
      const [status, archive] = labels[language];
      content = content.replace(/^### PDF — [\d.]+$/gm, '### PDF');
      content = content.replace(/\n+<!-- source-version -->[^\n]*\n/gu, '\n');
      if (unreleased) content = content.replace(/(^!\[Version\][^\n]*\n)/m,
        `$1\n<!-- source-version --> **${version} — ${status}.**\n`);
      const localPackage = `<!-- local-package --> ${archive} : \`scionos-capture-v${version}.zip\` · SHA-256 : \`scionos-capture-v${version}.zip.sha256\`.`;
      if (content.includes('<!-- local-package -->')) content = content.replace(/^<!-- local-package -->[^\n]*/gm, localPackage);
      else if (unreleased) content += `\n${localPackage}\n`;
    }

    if (relPath.startsWith('SECURITY')) {
      const marker = String.fromCharCode(96);
      content = content.replace(
        new RegExp(marker + '\\d+\\.\\d+\\.x' + marker, 'g'),
        marker + supportedLine + marker
      );
    }

    if (relPath === 'RELEASE_NOTES.md') {
      content = content.replace(
        /^#\s+Scionos\s+Capture\s+[\d.]+(-[\w.]+)?/m,
        `# Scionos Capture ${version}`
      );
    }

    if (content !== originalContent) updates.set(relPath, content);
  }

  for (const [relPath, content] of updates) {
    await fs.writeFile(path.join(projectRoot, relPath), content, 'utf8');
  }

  return { version, updatedFiles: [...updates.keys()] };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const cliVersion = args.find(argument => !argument.startsWith('--'));
  try {
    if (args.some(argument => argument.startsWith('--') && argument !== '--unreleased')) throw new Error('Unknown version synchronization option.');
    const result = await updateReadmeVersion(cliVersion, root, { unreleased: args.includes('--unreleased') });
    if (result.updatedFiles.length > 0) {
      console.log(`Version ${result.version} synchronisée avec succès dans :`);
      result.updatedFiles.forEach(file => console.log(`  - ${file}`));
    } else {
      console.log(`Tous les fichiers sont déjà à jour pour la version ${result.version}.`);
    }
  } catch (error) {
    console.error(`Erreur : ${error.message}`);
    process.exit(1);
  }
}
