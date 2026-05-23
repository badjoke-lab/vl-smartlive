import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const appPath = process.argv[2] || '.';
const port = Number(process.argv[3] || 4173);
const root = resolve(process.cwd(), appPath);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

function isFile(path) {
  return existsSync(path) && statSync(path).isFile();
}

function findFile(url) {
  const clean = String(url || '/').split('?')[0].replace(/^\/+/, '') || 'index.html';
  const first = resolve(root, clean);
  if (!first.startsWith(root)) return null;
  if (isFile(first)) return first;
  if (!extname(first) && isFile(`${first}.js`)) return `${first}.js`;
  const index = join(first, 'index.html');
  if (isFile(index)) return index;
  return null;
}

createServer((req, res) => {
  const file = findFile(req.url);
  if (!file) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' });
  createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => {
  console.log(`Open http://127.0.0.1:${port}/`);
});