import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { checkFfmpeg, getTransmitterStatus, startTransmitter, stopTransmitter, pushMediaChunk } from '../apps/pc-standalone/server/transmitter.mjs';

const root = process.cwd();
const port = Number(process.env.PORT || 4174);
const host = '127.0.0.1';
const maxChunkBytes = 5 * 1024 * 1024;
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.md': 'text/markdown; charset=utf-8' };

const localOnly = (req) => ['127.0.0.1', '::1'].includes(req.socket.remoteAddress);
const json = (res, status, data) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); };

function transmitterStatusCode(result) {
  if (result?.ok) return 200;
  const code = result?.error?.code;
  if (code === 'invalid_target') return 400;
  if (code === 'ffmpeg_missing') return 503;
  if (code === 'already_running' || code === 'not_running') return 409;
  return 500;
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return null; }
}

createServer(async (req, res) => {
  try {
    if (!localOnly(req)) return json(res, 403, { ok: false, error: { code: 'localhost_only', message: 'localhost only' } });
    const url = new URL(req.url || '/', `http://${host}:${port}`);
    if (url.pathname.startsWith('/api/transmitter')) {
      if (url.pathname === '/api/transmitter/status' && req.method === 'GET') return json(res, 200, getTransmitterStatus());
      if (url.pathname === '/api/transmitter/check-ffmpeg' && req.method === 'GET') return json(res, 200, checkFfmpeg());

      if (url.pathname === '/api/transmitter/start') {
        if (req.method !== 'POST') return json(res, 405, { ok: false, error: { code: 'method_not_allowed', message: 'POST required' } });
        const payload = await readJsonBody(req);
        if (!payload) return json(res, 400, { ok: false, error: { code: 'invalid_json', message: 'Request body must be valid JSON.' } });
        const result = startTransmitter(payload);
        return json(res, transmitterStatusCode(result), result);
      }

      if (url.pathname === '/api/transmitter/chunk') {
        if (req.method !== 'POST') return json(res, 405, { ok: false, error: { code: 'method_not_allowed', message: 'POST required' } });
        const chunks = [];
        let total = 0;
        for await (const c of req) {
          total += c.length;
          if (total > maxChunkBytes) return json(res, 413, { ok: false, error: { code: 'chunk_too_large', message: 'Chunk too large.' } });
          chunks.push(c);
        }
        const result = pushMediaChunk(Buffer.concat(chunks));
        return json(res, transmitterStatusCode(result), result);
      }

      if (url.pathname === '/api/transmitter/stop') {
        if (req.method !== 'POST') return json(res, 405, { ok: false, error: { code: 'method_not_allowed', message: 'POST required' } });
        const result = stopTransmitter();
        return json(res, transmitterStatusCode(result), result);
      }

      return json(res, 404, { ok: false, error: { code: 'not_found', message: 'not found' } });
    }

    let pathname = decodeURIComponent(url.pathname); if (pathname === '/') pathname = '/apps/pc-standalone/';
    let filePath = normalize(join(root, pathname)); if (!filePath.startsWith(root)) { res.writeHead(403); res.end('Forbidden'); return; }
    if (existsSync(filePath) && statSync(filePath).isDirectory()) filePath = join(filePath, 'index.html'); if (!existsSync(filePath)) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'content-type': mime[extname(filePath)] ?? 'text/plain; charset=utf-8' }); res.end(readFileSync(filePath));
  } catch {
    return json(res, 500, { ok: false, error: { code: 'server_error', message: 'Local server error.' } });
  }
}).listen(port, host, () => console.log(`PC Standalone local app: http://${host}:${port}/apps/pc-standalone/`));
