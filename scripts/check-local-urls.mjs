import { spawn } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';

const editions = [
  { id: 'obs-bridge', port: 4176, terms: ['Comments', 'Raw', 'Radar'] },
  { id: 'web-console', port: 4173, terms: ['Load OBS Bridge sample', 'Comments', 'Report'] },
  { id: 'pc-standalone', port: 4174, terms: ['SmartLive Encoder', 'Use camera', 'Raw', 'Radar'] },
  { id: 'mobile', port: 4175, terms: ['SmartLive Mobile', 'Load bundled sample data', 'Raw mode', 'Radar mode'] }
];

const errors = [];
const children = [];

async function fetchText(port) {
  const response = await fetch(`http://127.0.0.1:${port}/`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

async function waitForServer(port) {
  let lastError;
  for (let i = 0; i < 40; i += 1) {
    try {
      return await fetchText(port);
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
    const html = await waitForServer(edition.port);
    for (const term of edition.terms) {
      if (!html.includes(term)) errors.push(`${edition.id}: missing term ${term}`);
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
