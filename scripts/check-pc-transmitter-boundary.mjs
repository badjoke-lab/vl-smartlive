import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { request as httpRequest } from 'node:http';
import { createServer } from 'node:net';
import { setTimeout as wait } from 'node:timers/promises';

// Probe the actual local Node server without launching FFmpeg or opening an external stream.
const probe = createServer();
await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve));
const port = probe.address().port;
await new Promise((resolve) => probe.close(resolve));

const origin = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['scripts/serve-pc-standalone.mjs'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let stderr = '';
child.stderr.on('data', (chunk) => { stderr += String(chunk); });
const request = async (path, options = {}) => {
  const r = await fetch(`${origin}${path}`, options);
  return { status: r.status, data: await r.json() };
};
const headers = (type, from = origin) => ({ origin: from, 'content-type': type });

try {
  let started = false;
  for (let n = 0; n < 40; n += 1) {
    if (child.exitCode !== null) throw new Error(`server exited: ${stderr}`);
    try {
      const r = await request('/api/transmitter/status');
      assert.equal(r.status, 200);
      started = true;
      break;
    } catch {
      await wait(150);
    }
  }
  assert.ok(started, `local transmitter server did not become ready: ${stderr}`);

  // Use the low-level client; fetch() may normalize/ignore a caller-supplied Host header.
  const maliciousHost = await new Promise((resolve, reject) => {
    const req = httpRequest({
      hostname: '127.0.0.1', port, path: '/api/transmitter/status', method: 'GET',
      headers: { Host: 'untrusted.example.test' }
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += String(chunk); });
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body) }));
    });
    req.on('error', reject);
    req.end();
  });
  assert.equal(maliciousHost.status, 403);
  assert.equal(maliciousHost.data.error.code, 'localhost_only');

  const missingOrigin = await request('/api/transmitter/stop', { method: 'POST' });
  assert.equal(missingOrigin.status, 403);

  const crossOrigin = await request('/api/transmitter/stop', { method: 'POST', headers: { origin: 'https://untrusted.example.test' } });
  assert.equal(crossOrigin.status, 403);

  const wrongMime = await request('/api/transmitter/start', {
    method: 'POST', headers: headers('text/plain'), body: JSON.stringify({ targetUrl: 'bad://' })
  });
  assert.equal(wrongMime.status, 415);

  const invalidTarget = await request('/api/transmitter/start', {
    method: 'POST', headers: headers('application/json'), body: JSON.stringify({ targetUrl: 'https://invalid.example.test' })
  });
  assert.equal(invalidTarget.status, 400);
  assert.equal(invalidTarget.data.error.code, 'invalid_target');

  const wrongChunk = await request('/api/transmitter/chunk', {
    method: 'POST', headers: headers('text/plain'), body: 'sample'
  });
  assert.equal(wrongChunk.status, 415);

  const validOriginStop = await request('/api/transmitter/stop', { method: 'POST', headers: { origin } });
  assert.equal(validOriginStop.status, 409);

  console.log('PC transmitter Host, Origin, request-type and no-stream behavior checks passed.');
} finally {
  child.kill('SIGTERM');
}
