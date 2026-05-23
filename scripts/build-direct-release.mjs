import { chmodSync, copyFileSync, cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { releaseEditions } from './release-editions.mjs';
import { buildReleaseReadme } from './release-readme-template.mjs';

const root = process.cwd();
const outRoot = join(root, 'dist', 'direct-release');
const commonFiles = ['README.md', 'package.json', 'pnpm-workspace.yaml', 'pnpm-lock.yaml', 'tsconfig.base.json'];
const commonDirs = ['packages', 'reference', 'sample-data'];

function copyIfExists(source, targetRoot) {
  const sourcePath = join(root, source);
  if (!existsSync(sourcePath)) return;
  cpSync(sourcePath, join(targetRoot, source), { recursive: true });
}

function writeLauncher(target, edition) {
  const server = `import './scripts/portable-server.mjs';\n`;
  writeFileSync(join(target, 'server.mjs'), server, 'utf8');

  const mac = `#!/bin/bash\ncd "$(dirname "$0")"\nnode scripts/portable-server.mjs ${edition.appPath} ${edition.defaultPort}\n`;
  const linux = `#!/bin/sh\ncd "$(dirname "$0")"\nnode scripts/portable-server.mjs ${edition.appPath} ${edition.defaultPort}\n`;
  const win = `@echo off\ncd /d %~dp0\nnode scripts\\portable-server.mjs ${edition.appPath} ${edition.defaultPort}\npause\n`;

  const macPath = join(target, 'start-macos.command');
  const linuxPath = join(target, 'start-linux.sh');
  writeFileSync(macPath, mac, 'utf8');
  writeFileSync(linuxPath, linux, 'utf8');
  writeFileSync(join(target, 'start-windows.cmd'), win, 'utf8');
  chmodSync(macPath, 0o755);
  chmodSync(linuxPath, 0o755);
}

rmSync(outRoot, { recursive: true, force: true });
mkdirSync(outRoot, { recursive: true });

for (const edition of releaseEditions) {
  const target = join(outRoot, edition.id);
  mkdirSync(target, { recursive: true });
  for (const file of commonFiles) copyIfExists(file, target);
  for (const dir of commonDirs) copyIfExists(dir, target);
  copyIfExists('scripts/portable-server.mjs', target);
  copyIfExists(edition.appPath, target);
  for (const extra of edition.extraPaths || []) copyIfExists(extra, target);
  writeLauncher(target, edition);
  writeFileSync(join(target, 'START_HERE.md'), buildReleaseReadme(edition), 'utf8');
}

writeFileSync(join(outRoot, 'manifest.json'), JSON.stringify({ type: 'direct-release', editions: releaseEditions }, null, 2) + '\n', 'utf8');
console.log(`Direct release folders generated in ${outRoot}`);
