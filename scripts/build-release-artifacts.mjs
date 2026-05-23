import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const outRoot = join(root, 'dist', 'artifacts');

const sharedFiles = [
  'README.md',
  'package.json',
  'pnpm-workspace.yaml',
  'pnpm-lock.yaml',
  'tsconfig.base.json'
];

const sharedDirs = [
  'packages',
  'reference',
  'sample-data'
];

const editions = [
  {
    id: 'obs-bridge',
    title: 'VL SmartLive OBS Bridge',
    paths: ['apps/obs-bridge']
  },
  {
    id: 'web-console',
    title: 'VL SmartLive Web Console',
    paths: ['apps/console']
  },
  {
    id: 'pc-standalone',
    title: 'VL SmartLive PC Standalone',
    paths: ['apps/pc-standalone']
  },
  {
    id: 'mobile',
    title: 'VL SmartLive Mobile',
    paths: ['apps/mobile', 'apps/mobile-android']
  }
];

function copyPath(source, target) {
  const sourcePath = join(root, source);
  const targetPath = join(target, source);
  if (!existsSync(sourcePath)) return;
  cpSync(sourcePath, targetPath, { recursive: true });
}

function copyShared(target) {
  for (const file of sharedFiles) {
    const sourcePath = join(root, file);
    if (existsSync(sourcePath)) {
      copyFileSync(sourcePath, join(target, file));
    }
  }
  for (const dir of sharedDirs) {
    copyPath(dir, target);
  }
}

function writeArtifactReadme(target, edition) {
  writeFileSync(
    join(target, 'ARTIFACT_README.md'),
    `# ${edition.title}\n\nThis folder is a source-based release bundle for ${edition.title}.\n\n## Included app paths\n\n${edition.paths.map((p) => `- ${p}`).join('\n')}\n\n## Local use\n\n1. Install dependencies from this folder.\n2. Run the root checks.\n3. Use the edition-specific README under the app path.\n\n\`\`\`bash\npnpm install\npnpm run check\npnpm run test\n\`\`\`\n\n## Safety\n\nRuntime credentials must stay runtime-only. Sensitive values must not be logged, exported, or embedded in generated files.\n`,
    'utf8'
  );
}

rmSync(outRoot, { recursive: true, force: true });
mkdirSync(outRoot, { recursive: true });

for (const edition of editions) {
  const target = join(outRoot, edition.id);
  mkdirSync(target, { recursive: true });
  copyShared(target);
  for (const appPath of edition.paths) {
    copyPath(appPath, target);
  }
  writeArtifactReadme(target, edition);
}

writeFileSync(
  join(outRoot, 'manifest.json'),
  JSON.stringify({
    generatedAt: new Date().toISOString(),
    editions: editions.map((edition) => ({
      id: edition.id,
      title: edition.title,
      paths: edition.paths
    }))
  }, null, 2) + '\n',
  'utf8'
);

console.log(`Release artifact folders generated in ${outRoot}`);
