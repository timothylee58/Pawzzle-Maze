import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || 'dist/gamepix');
const port = Number(process.env.PORT || 8067);
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.wasm': 'application/wasm', '.pck': 'application/octet-stream', '.png': 'image/png' };
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/iframe-test') {
    const width = Math.max(320, Math.min(1920, Number(url.searchParams.get('width')) || 640));
    const height = Math.max(320, Math.min(1080, Number(url.searchParams.get('height')) || 480));
    res.setHeader('Content-Type', 'text/html');
    res.end(`<!doctype html><title>GamePix iframe check</title><body style="margin:0;background:#555"><iframe title="Pawzzle Maze" src="/index.html" width="${width}" height="${height}" style="border:0" allow="autoplay; fullscreen"></iframe></body>`);
    return;
  }
  let file;
  try { file = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)); }
  catch { res.writeHead(400).end(); return; }
  if (!file.startsWith(root + path.sep) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404).end('Not found'); return;
  }
  res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-store');
  createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`GamePix build: http://127.0.0.1:${port}`));
