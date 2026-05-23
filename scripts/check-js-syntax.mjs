import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const files = [
  'apps/pc-standalone/src/main.js',
  'apps/pc-standalone/src/i18n.js'
];

const errors = [];

for (const file of files) {
  const target = resolve(process.cwd(), file);
  const result = spawnSync(process.execPath, ['--check', target], { encoding: 'utf8' });
  if (result.status !== 0) {
    errors.push(`Syntax check failed for ${file}`);
    if (result.stderr) errors.push(result.stderr.trim());
    if (result.stdout) errors.push(result.stdout.trim());
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('PC Standalone syntax check passed.');
