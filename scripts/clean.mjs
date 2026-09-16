import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directories = ['dist', 'test-results', 'playwright-report', 'coverage', '.nyc_output'];

let cleanedCount = 0;

for (const dir of directories) {
  const target = path.join(root, dir);
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
    console.log(`Removed: ${dir}/`);
    cleanedCount++;
  }
}

if (cleanedCount === 0) {
  console.log('Working directory is already clean. Nothing to remove.');
} else {
  console.log(`Clean completed (${cleanedCount} directories removed).`);
}
