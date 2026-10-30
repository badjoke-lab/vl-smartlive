'use strict';
// Self-contained desktop runtime for the OBS Bridge local-first UI.
// Renderer runs with no Node integration; only read-only OBS WebSocket traffic is used.
const { app, BrowserWindow, session } = require('electron');
const { createServer } = require('node:http');
const { createReadStream, existsSync, statSync, readFileSync } = require('node:fs');
const { extname, relative, isAbsolute, resolve, sep, join } = require('node:path');

const root = resolve(__dirname, 'apps', 'obs-bridge');
let localServer = null;
let localBaseUrl = '';
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.ts': 'text/javascript; charset=utf-8',
  '.tsx': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
  '.md': 'text/plain; charset=utf-8'
};
function serveBrowserTypeScript(content) {
  return content
    .replace(/^import\s+type\s+[^;]+;\s*$/gm, '')
    .replace(/:\s*[A-Za-z_$][A-Za-z0-9_$<>|&\[\]\s,]*(?=\s*[=,;)])/g, '')
    .replace(/\s+as\s+[A-Za-z_$][A-Za-z0-9_$<>|&\[\]\s,]*/g, '')
    .replace(/<[^>]+>\s*(?=\()/g, '');
}
function findAsset(pathname) {
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { return null; }
  const candidate = resolve(root, decoded.replace(/^\/+/, '') || 'index.html');
  const rel = relative(root, candidate);
  if (rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel)) return null;
  const options = [candidate];
  if (!extname(candidate)) options.push(candidate + '.js', candidate + '.ts', candidate + '.tsx', join(candidate, 'index.html'));
  for (const file of options) {
    if (existsSync(file) && statSync(file).isFile()) return file;
  }
  return null;
}
function startLocalServer() {
  return new Promise((resolveStart, rejectStart) => {
    const server = createServer((request, response) => {
      if (!['GET', 'HEAD'].includes(request.method || '')) {
        response.writeHead(405); response.end('Method not allowed'); return;
      }
      if (!['127.0.0.1', 'localhost'].includes(String(request.headers.host || '').split(':')[0])) {
        response.writeHead(403); response.end('Forbidden host'); return;
      }
      const uri = new URL(request.url || '/', 'http://localhost');
      const file = findAsset(uri.pathname);
      if (!file) { response.writeHead(404); response.end('Not found'); return; }
      const extension = extname(file);
      response.writeHead(200, { 'content-type': mime[extension] || 'application/octet-stream', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
      if (request.method === 'HEAD') { response.end(); return; }
      if (extension === '.ts' || extension === '.tsx') { response.end(serveBrowserTypeScript(readFileSync(file, 'utf8'))); return; }
      createReadStream(file).on('error', () => { response.destroy(); }).pipe(response);
    });
    server.once('error', rejectStart);
    server.listen(0, '127.0.0.1', () => {
      localServer = server;
      localBaseUrl = 'http://127.0.0.1:' + server.address().port;
      resolveStart(localBaseUrl);
    });
  });
}
async function createWindow() {
  const url = await startLocalServer();
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  const window = new BrowserWindow({
    width: 1440, height: 900, minWidth: 960, minHeight: 700,
    title: 'SmartLive OBS Bridge',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: false,
      devTools: false
    }
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, destination) => {
    if (!destination.startsWith(url + '/')) event.preventDefault();
  });
  await window.loadURL(url + '/');
}
app.whenReady().then(createWindow).catch((error) => {
  // Do not print secret URLs or credentials to a log.
  process.stderr.write('SmartLive OBS Bridge could not start its local UI.\n');
  app.exit(1);
});
app.on('before-quit', () => { if (localServer) localServer.close(); });
app.on('window-all-closed', () => { app.quit(); });
