import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const releaseRoot = join(root, 'dist', 'direct-release');

const editions = [
  { id: 'obs-bridge', appPath: 'apps/obs-bridge', requiredFiles: ['index.html', 'src/renderer/main.js', 'src/renderer/styles.css'] },
  { id: 'web-console', appPath: 'apps/console', requiredFiles: ['index.html', 'src/main.js', 'src/styles.css'] },
  { id: 'pc-standalone', appPath: 'apps/pc-standalone', requiredFiles: ['index.html', 'src/main.js', 'src/styles.css'] },
  { id: 'mobile', appPath: 'apps/mobile', requiredFiles: ['index.html', 'src/main.js', 'src/styles.css', 'manifest.webmanifest'] }
];

const requiredRootFiles = ['START_HERE.md', 'server.mjs', 'start-macos.command', 'start-linux.sh', 'start-windows.cmd', 'scripts/portable-server.mjs'];
const requiredSharedDirs = ['packages', 'reference', 'sample-data'];
const blockedObsControlTerms = ['StartStream', 'StopStream', 'SetCurrentProgramScene', 'StartRecord', 'StopRecord'];
const blockedGeneratedTerms = ['OBS_PASSWORD=', 'STREAM_KEY=', 'SECRET=', 'TOKEN='];
const errors = [];

function check(condition, message) {
  if (!condition) errors.push(message);
}

function listFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  const walk = (current) => {
    for (const name of readdirSync(current)) {
      const path = join(current, name);
      const stat = statSync(path);
      if (stat.isDirectory()) walk(path);
      else out.push(path);
    }
  };
  walk(dir);
  return out;
}

function readText(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return '';
  }
}

check(existsSync(releaseRoot), 'dist/direct-release is missing. Run pnpm run release:direct first.');

for (const edition of editions) {
  const base = join(releaseRoot, edition.id);
  check(existsSync(base), `${edition.id}: release folder missing`);
  for (const file of requiredRootFiles) check(existsSync(join(base, file)), `${edition.id}: missing ${file}`);
  for (const dir of requiredSharedDirs) check(existsSync(join(base, dir)), `${edition.id}: missing ${dir}`);
  for (const file of edition.requiredFiles) check(existsSync(join(base, edition.appPath, file)), `${edition.id}: missing ${edition.appPath}/${file}`);

  const startHere = readText(join(base, 'START_HERE.md'));
  check(startHere.includes('Node.js 20+'), `${edition.id}: START_HERE missing Node.js requirement`);
  check(startHere.includes('node server.mjs'), `${edition.id}: START_HERE missing node server.mjs fallback`);

  const files = listFiles(base).filter((file) => /\.(js|mjs|html|md|json|jsonl|txt)$/i.test(file));
  for (const file of files) {
    const text = readText(file);
    for (const term of blockedGeneratedTerms) {
      check(!text.includes(term), `${edition.id}: blocked generated credential marker ${term} in ${file}`);
    }
    if (edition.id === 'obs-bridge') {
      for (const term of blockedObsControlTerms) {
        check(!text.includes(term), `${edition.id}: OBS control term ${term} found in ${file}`);
      }
    }
  }
}

if (errors.length) {
  console.error('Direct release check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Direct release check passed.');
