import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const releaseRoot = join(root, 'dist', 'direct-release');
const editions = ['obs-bridge', 'web-console', 'pc-standalone', 'mobile'];

function run(command, args, cwd = root) {
  execFileSync(command, args, { cwd, stdio: 'inherit' });
}

function output(command, args, cwd = root) {
  return execFileSync(command, args, { cwd, encoding: 'utf8' });
}

if (!existsSync(releaseRoot)) {
  run('pnpm', ['run', 'release:direct']);
}

for (const edition of editions) {
  if (!existsSync(join(releaseRoot, edition))) {
    throw new Error(`Missing direct-release folder: ${edition}`);
  }
}

for (const edition of editions) {
  const zipName = `${edition}.zip`;
  rmSync(join(releaseRoot, zipName), { force: true });
  run('zip', ['-r', zipName, edition], releaseRoot);
  run('unzip', ['-tq', zipName], releaseRoot);
}

const sums = editions.map((edition) => output('shasum', ['-a', '256', `${edition}.zip`], releaseRoot).trim()).join('\n') + '\n';
writeFileSync(join(releaseRoot, 'SHA256SUMS.txt'), sums, 'utf8');

console.log('Direct release zip assets generated.');
console.log(sums);
