import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { extname, join } from 'path';
import * as r2 from './lib/r2.js';

if (existsSync('.env')) process.loadEnvFile('.env');

const PORT = Number(process.env.PORT || 3000);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(payload));
}

createServer(async (req, res) => {
  try {
    const reqUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = reqUrl.pathname;

    if (pathname === '/gallery' && req.method === 'GET') {
      const data = await r2.fetchGallery();
      sendJson(res, 200, data);
      return;
    }

    if (pathname === '/presign' && req.method === 'GET') {
      const filename = reqUrl.searchParams.get('filename');
      const type = reqUrl.searchParams.get('type') || 'video/mp4';
      const size = Number(reqUrl.searchParams.get('size') || 0);
      if (!filename) return sendJson(res, 400, { error: 'filename required' });
      try {
        const data = await r2.generatePresignedUrl(filename, type, size);
        sendJson(res, 200, data);
      } catch (err) {
        const status = err.code === 'UNSUPPORTED_TYPE' ? 415 : err.code === 'INVALID_TYPE' ? 415 : err.code === 'TOO_LARGE' ? 413 : 500;
        sendJson(res, status, { error: err.message });
      }
      return;
    }

    if (pathname === '/' || pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(readFileSync('index.html'));
      return;
    }

    const filePath = join('public', pathname);
    if (existsSync(filePath) && statSync(filePath).isFile()) {
      res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
      res.end(readFileSync(filePath));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  } catch (error) {
    console.error('Server error:', error);
    sendJson(res, 500, { error: 'Server error' });
  }
}).listen(PORT, () => console.log(`Server running on :${PORT}`));
