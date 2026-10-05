// Expand the unit-test list explicitly: Node.js 20 on Windows does not expand CLI globs.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../tests');
const files = (await fs.readdir(directory)).filter(name => name.endsWith('.test.js')).sort();
if (!files.length) throw new Error('No unit tests found.');
const result = spawnSync(process.execPath, ['--test', ...files.map(name => path.join(directory, name))], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
