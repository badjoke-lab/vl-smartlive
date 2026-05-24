import { spawn } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';

const editions = [
  { id: 'obs-bridge', port: 4176, paths: ['/', '/src/renderer/main.js'], terms: ['Comments', 'Raw', 'Radar'] },
  { id: 'web-console', port: 4173, paths: ['/', '/src/main.js'], terms: ['Load OBS Bridge sample', 'Comments', 'Report'] },
  { id: 'pc-standalone', port: 4174, paths: ['/', '/?review=all', '/src/main.js', '/src/i18n.js'], terms: ['SmartLive PC Standalone', 'Live', 'Prepare', 'Comments', 'Stability', 'Settings', 'Report', 'Open preview', 'End preview', 'Stream key is not saved', 'Validation status', 'Read queued', 'Pinned', 'Done', 'Muted', 'Stability mode ON', 'Settings saved locally', 'Download report.json', 'Download logs.json', 'Download comments.jsonl', 'Review: PC Standalone', '01 Live', '06 Report', 'Export review snapshot'] },
  { id: 'mobile', port: 4175, paths: ['/', '/src/main.js'], terms: ['SmartLive Encoder Mobile', 'コメントセンター', '配信の安定化', '配信レポート', 'Radar'] }
];

const errors = [];
const children = [];

async function fetchText(port, path = '/') {
  const response = await fetch(`http://127.0.0.1:${port}${path}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

async function waitForServer(port) {
  let lastError;
  for (let i = 0; i < 40; i += 1) {
    try {
      return await fetchText(port, '/');
    } catch (error) {
      lastError = error;
      await wait(250);
    }
  }
  throw lastError || new Error('server did not respond');
}

try {
  for (const edition of editions) {
    const cwd = `dist/direct-release/${edition.id}`;
    const child = spawn(process.execPath, ['server.mjs'], { cwd, stdio: 'ignore' });
    children.push(child);
    await waitForServer(edition.port);
    let combined = '';
    for (const path of edition.paths) combined += `\n${await fetchText(edition.port, path)}`;
    for (const term of edition.terms) {
      if (!combined.includes(term)) errors.push(`${edition.id}: missing term ${term}`);
    }
  }
} finally {
  for (const child of children) child.kill('SIGTERM');
}

if (errors.length) {
  console.error('Local URL check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Local URL check passed.');
