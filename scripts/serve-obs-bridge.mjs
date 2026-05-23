import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const port = Number(process.env.PORT || 4174);

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

createServer((req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${port}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/apps/obs-bridge/";

  let filePath = normalize(join(root, pathname));
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, "index.html");
  }

  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  res.writeHead(200, { "content-type": mime[extname(filePath)] ?? "text/plain; charset=utf-8" });
  res.end(readFileSync(filePath));
}).listen(port, () => {
  console.log(`SmartLive OBS Bridge shell: http://localhost:${port}/apps/obs-bridge/`);
});
