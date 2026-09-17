import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const semverRegex = /^\d+\.\d+\.\d+(-[\w.]+)?$/;

/**
 * Synchronise la version du projet dans package.json, manifest.json,
 * ainsi que dans tous les fichiers README et RELEASE_NOTES.
 *
 * @param {string} [targetVersion] - Nouvelle version cible (optionnelle, défaut: version dans package.json).
 * @returns {Promise<{ version: string, updatedFiles: string[] }>}
 */
export async function updateReadmeVersion(targetVersion) {
  const packagePath = path.join(root, 'package.json');
  const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf8'));

  const version = targetVersion || packageJson.version;
  if (!semverRegex.test(version)) {
    throw new Error(`Version invalide : "${version}". Doit respecter le format SemVer (ex: 1.1.2).`);
  }

  const updatedFiles = [];

  // 1. Mettre à jour package.json si une nouvelle version a été spécifiée
  if (targetVersion && packageJson.version !== targetVersion) {
    packageJson.version = targetVersion;
    await fs.writeFile(packagePath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
    updatedFiles.push('package.json');
  }

  // 1b. Mettre à jour package-lock.json si présent
  const packageLockPath = path.join(root, 'package-lock.json');
  try {
    const packageLock = JSON.parse(await fs.readFile(packageLockPath, 'utf8'));
    let lockChanged = false;
    if (packageLock.version !== version) {
      packageLock.version = version;
      lockChanged = true;
    }
    if (packageLock.packages?.[''] && packageLock.packages[''].version !== version) {
      packageLock.packages[''].version = version;
      lockChanged = true;
    }
    if (lockChanged) {
      await fs.writeFile(packageLockPath, JSON.stringify(packageLock, null, 2) + '\n', 'utf8');
      updatedFiles.push('package-lock.json');
    }
  } catch {
    // Fichier package-lock.json absent ou ignoré
  }

  // 2. Mettre à jour manifest.json si nécessaire
  const manifestPath = path.join(root, 'manifest.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  if (manifest.version !== version) {
    manifest.version = version;
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    updatedFiles.push('manifest.json');
  }

  // 3. Fichiers de documentation ciblés
  const docFiles = [
    'README.md',
    'README.en.md',
    'README.es.md',
    'README.de.md',
    'RELEASE_NOTES.md'
  ];

  for (const relPath of docFiles) {
    const fullPath = path.join(root, relPath);
    let content = await fs.readFile(fullPath, 'utf8');
    const originalContent = content;

    // Badges shields.io
    content = content.replace(
      /https:\/\/img\.shields\.io\/badge\/version-[\d.]+(-[\w.]+)?-blue/g,
      `https://img.shields.io/badge/version-${version}-blue`
    );

    // Liens vers les tags GitHub Release
    content = content.replace(
      /https:\/\/github\.com\/ScioNos\/Scionos-Capture\/releases\/tag\/v[\d.]+(-[\w.]+)?/g,
      `https://github.com/ScioNos/Scionos-Capture/releases/tag/v${version}`
    );

    // Mentions et archives zip
    content = content.replace(
      /scionos-capture-v[\d.]+(-[\w.]+)?\.zip/g,
      `scionos-capture-v${version}.zip`
    );

    // Textes de liens Markdown vers la release
    content = content.replace(
      /\[([Rr]elease|versión)\s+v[\d.]+(-[\w.]+)?\]/g,
      `[$1 v${version}]`
    );
    content = content.replace(
      /\[v[\d.]+(-[\w.]+)?\s+release\]/g,
      `[v${version} release]`
    );

    // Titre principal dans RELEASE_NOTES.md
    if (relPath === 'RELEASE_NOTES.md') {
      content = content.replace(
        /^#\s+Scionos\s+Capture\s+[\d.]+(-[\w.]+)?/m,
        `# Scionos Capture ${version}`
      );
    }

    if (content !== originalContent) {
      await fs.writeFile(fullPath, content, 'utf8');
      updatedFiles.push(relPath);
    }
  }

  return { version, updatedFiles };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cliVersion = process.argv[2];
  try {
    const result = await updateReadmeVersion(cliVersion);
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
