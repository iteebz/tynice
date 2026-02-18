import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { extname, join } from 'path';
import * as r2 from './lib/r2.js';

const PORT = Number(process.env.PORT || 3000);
const PASSWORD = process.env.SITE_PASSWORD || '';
const html = readFileSync('index.html', 'utf8');
const loginPage = existsSync('public/login.html') ? readFileSync('public/login.html', 'utf8') : 'Login pending...';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
};

function checkAuth(req) {
  if (!PASSWORD) return true;
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/auth=([^;]+)/);
  return match && match[1] === PASSWORD;
}

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

    // 1. Auth Handlers
    if (pathname === '/login' && req.method === 'POST') {
      let body = '';
      for await (const chunk of req) body += chunk;
      const params = new URLSearchParams(body);
      if (params.get('password') === PASSWORD) {
        res.writeHead(302, { 'Set-Cookie': `auth=${PASSWORD}; Path=/; HttpOnly; SameSite=Strict`, Location: '/' });
        res.end();
      } else {
        res.writeHead(302, { Location: '/login?error=1' });
        res.end();
      }
      return;
    }

    if (PASSWORD && !checkAuth(req)) {
      if (pathname === '/login') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(loginPage);
        return;
      }
      res.writeHead(302, { Location: '/login' });
      res.end();
      return;
    }

    // 2. Page Handlers
    if (pathname === '/' || pathname === '/index.html' || pathname === '/upload') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    // 3. API Handlers
    if (pathname === '/gallery' && req.method === 'GET') {
      const data = await r2.fetchGallery();
      sendJson(res, 200, data);
      return;
    }

    if (pathname === '/presign' && req.method === 'GET') {
      const filename = reqUrl.searchParams.get('filename');
      const type = reqUrl.searchParams.get('type') || 'video/mp4';
      if (!filename) return sendJson(res, 400, { error: 'filename required' });
      const data = await r2.generatePresignedUrl(filename, type);
      sendJson(res, 200, data);
      return;
    }

    if (pathname === '/folder-link' && req.method === 'GET') {
      sendJson(res, 200, { uploadUrl: r2.getPublicUrl() });
      return;
    }

    if (pathname === '/stats' && req.method === 'GET') {
      const { count } = await r2.fetchGallery();
      sendJson(res, 200, { count });
      return;
    }

    // 4. Static Files
    const filePath = join('public', pathname);
    if (existsSync(filePath) && statSync(filePath).isFile()) {
      const ext = extname(filePath);
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const file = readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(file);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  } catch (error) {
    console.error('Server error:', error);
    sendJson(res, 500, {
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}).listen(PORT, () => console.log(`Server running on :${PORT}`));
