/**
 * Local demo server — receives /collect POST batches and serves the demo HTML.
 * Run: node demo/server.js
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PORT = 9000;

let batchCount = 0;

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.map':  'application/json',
  '.css':  'text/css',
};

const server = http.createServer((req, res) => {
  // CORS headers (demo only)
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // ── Collect endpoint ────────────────────────────────────────────────────
  if (req.method === 'POST' && req.url === '/collect') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        batchCount++;
        const types = payload.events.reduce((acc, e) => {
          acc[e.type] = (acc[e.type] ?? 0) + 1;
          return acc;
        }, {});

        console.log(
          `\n📦 Batch #${batchCount} — session=${payload.sessionId.slice(0, 8)}…  events=${payload.events.length}`,
        );
        for (const [type, count] of Object.entries(types)) {
          console.log(`   ${String(type).padEnd(14)} ×${count}`);
        }
      } catch {
        console.error('⚠  Bad payload');
      }
      res.writeHead(204);
      res.end();
    });
    return;
  }

  // ── Static file serving ─────────────────────────────────────────────────
  let urlPath = req.url === '/' ? '/demo/index.html' : req.url;
  // Allow /dist/* for the UMD bundle
  const filePath = path.join(ROOT, urlPath);

  // Security: stay within ROOT
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found: ' + urlPath);
      return;
    }
    const ext  = path.extname(filePath);
    const mime = MIME[ext] ?? 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀  Demo server running`);
  console.log(`   Browser → http://localhost:${PORT}`);
  console.log(`   Collect → POST http://localhost:${PORT}/collect\n`);
});
