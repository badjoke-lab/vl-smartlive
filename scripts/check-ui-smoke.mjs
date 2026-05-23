import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const releaseRoot = join(root, 'dist', 'direct-release');
const errors = [];

function check(condition, message) {
  if (!condition) errors.push(message);
}

function read(path) {
  check(existsSync(path), `missing file: ${path}`);
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

function mustInclude(label, text, terms) {
  for (const term of terms) {
    check(text.includes(term), `${label}: missing ${term}`);
  }
}

const cases = [
  {
    id: 'obs-bridge',
    files: ['apps/obs-bridge/index.html', 'apps/obs-bridge/src/renderer/main.js'],
    terms: ['Comments', 'Raw', 'Radar', 'Report', 'OBS'],
    blocked: ['StartStream', 'StopStream', 'SetCurrentProgramScene', 'StartRecord', 'StopRecord']
  },
  {
    id: 'web-console',
    files: ['apps/console/index.html', 'apps/console/src/main.js'],
    terms: ['Load OBS Bridge sample', 'Comments', 'Alerts list', 'Stream-state timeline', 'Report markdown preview', 'Raw', 'Radar'],
    blocked: []
  },
  {
    id: 'pc-standalone',
    files: ['apps/pc-standalone/index.html', 'apps/pc-standalone/src/main.js', 'apps/pc-standalone/src/i18n.js'],
    terms: ['Live','Prepare','Comments','Stability','Settings','Report','Language','English','日本語','Raw','Radar','Desktop capture','Ready for preview','Stream key is not saved','Download report.json','Download logs.json','Download comments.jsonl'],
    blocked: []
  },
  {
    id: 'mobile',
    files: ['apps/mobile/index.html', 'apps/mobile/src/main.js'],
    terms: ['SmartLive Encoder Mobile', 'コメントセンター', '配信の安定化', '配信レポート', '配信準備', 'Radar', 'data-target'],
    blocked: []
  }
];

check(existsSync(releaseRoot), 'dist/direct-release missing. Run pnpm run release:direct first.');

for (const item of cases) {
  let combined = '';
  for (const file of item.files) {
    combined += `\n${read(join(releaseRoot, item.id, file))}`;
  }
  mustInclude(item.id, combined, item.terms);
  for (const term of item.blocked) {
    check(!combined.includes(term), `${item.id}: blocked operation term found: ${term}`);
  }
}

if (errors.length) {
  console.error('UI smoke check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('UI smoke check passed.');