import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { extname, join } from 'path';
import { randomBytes } from 'crypto';
import * as r2 from './lib/r2.js';

const adminSessions = new Set();

function generateToken() {
  return randomBytes(32).toString('hex');
}

function getAdminToken(req) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/admin_token=([a-f0-9]{64})/);
  return match ? match[1] : null;
}

function isAdminAuthed(req) {
  const token = getAdminToken(req);
  return token && adminSessions.has(token);
}

async function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => resolve(body));
  });
}

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

    if (pathname === '/admin/login' && req.method === 'POST') {
      const body = await readBody(req);
      let password;
      try { password = JSON.parse(body).password; } catch { password = null; }
      const adminPassword = process.env.ADMIN_PASSWORD;
      if (!adminPassword || password !== adminPassword) {
        return sendJson(res, 401, { error: 'unauthorized' });
      }
      const token = generateToken();
      adminSessions.add(token);
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Set-Cookie': `admin_token=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400`,
      });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (pathname === '/admin/logout' && req.method === 'POST') {
      const token = getAdminToken(req);
      if (token) adminSessions.delete(token);
      res.writeHead(200, { 'Set-Cookie': 'admin_token=; HttpOnly; Path=/; Max-Age=0' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (pathname === '/admin/delete' && req.method === 'DELETE') {
      if (!isAdminAuthed(req)) return sendJson(res, 401, { error: 'unauthorized' });
      const key = reqUrl.searchParams.get('key');
      if (!key) return sendJson(res, 400, { error: 'key required' });
      try {
        await r2.deleteObject(key);
        return sendJson(res, 200, { ok: true });
      } catch (err) {
        console.error('Delete error:', err);
        return sendJson(res, 500, { error: 'delete failed' });
      }
    }

    if (pathname === '/admin/notes' && req.method === 'DELETE') {
      if (!isAdminAuthed(req)) return sendJson(res, 401, { error: 'unauthorized' });
      const id = reqUrl.searchParams.get('id');
      if (!id) return sendJson(res, 400, { error: 'id required' });
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseKey) return sendJson(res, 500, { error: 'supabase not configured' });
      try {
        const r = await fetch(`${supabaseUrl}/rest/v1/notes?id=eq.${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` },
        });
        return sendJson(res, r.ok ? 200 : 500, r.ok ? { ok: true } : { error: 'delete failed' });
      } catch (err) {
        console.error('Note delete error:', err);
        return sendJson(res, 500, { error: 'delete failed' });
      }
    }

    if (pathname === '/admin/notes' && req.method === 'GET') {
      if (!isAdminAuthed(req)) return sendJson(res, 401, { error: 'unauthorized' });
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseKey) return sendJson(res, 500, { error: 'supabase not configured' });
      try {
        const r = await fetch(`${supabaseUrl}/rest/v1/notes?order=created_at.desc&limit=100`, {
          headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` },
        });
        const notes = await r.json();
        return sendJson(res, 200, notes);
      } catch (err) {
        console.error('Notes fetch error:', err);
        return sendJson(res, 500, { error: 'fetch failed' });
      }
    }

    if ((pathname === '/admin' || pathname === '/admin/') && req.method === 'GET') {
      if (!isAdminAuthed(req)) {
        res.writeHead(302, { Location: '/admin/login' });
        res.end();
        return;
      }
      const adminPath = join('public', 'admin.html');
      if (existsSync(adminPath)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(readFileSync(adminPath));
      } else {
        sendJson(res, 404, { error: 'admin page not found' });
      }
      return;
    }

    if (pathname === '/admin/login' && req.method === 'GET') {
      const loginPath = join('public', 'admin-login.html');
      if (existsSync(loginPath)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(readFileSync(loginPath));
      } else {
        sendJson(res, 404, { error: 'not found' });
      }
      return;
    }

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
