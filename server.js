import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { extname, join } from 'path';

const PORT = Number(process.env.PORT || 3000);
const PASSWORD = process.env.SITE_PASSWORD || '';
const html = readFileSync('index.html', 'utf8');

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

const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID || '';
const DRIVE_API_KEY = process.env.DRIVE_API_KEY || '';

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

async function fetchDriveFolder() {
  if (!DRIVE_FOLDER_ID || !DRIVE_API_KEY) {
    return { items: [], count: 0 };
  }

  const url = `https://www.googleapis.com/drive/v3/files?q='${DRIVE_FOLDER_ID}'+in+parents&key=${DRIVE_API_KEY}&fields=files(id,name,mimeType,createdTime,thumbnailLink)&orderBy=createdTime+desc&pageSize=100`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error('Drive API error:', response.status);
      return { items: [], count: 0 };
    }

    const data = await response.json();
    const files = data.files || [];

    const items = files.map((file) => ({
      key: file.id,
      name: file.name,
      mimeType: file.mimeType,
      lastModified: file.createdTime,
      thumbnailUrl: file.thumbnailLink || `https://drive.google.com/thumbnail?id=${file.id}&sz=w400`,
      openUrl: `https://drive.google.com/open?id=${file.id}`,
    }));

    return { items, count: files.length };
  } catch (error) {
    console.error('Failed to fetch Drive folder:', error);
    return { items: [], count: 0 };
  }
}

async function handleGallery(res) {
  const { items, count } = await fetchDriveFolder();
  sendJson(res, 200, { items, count });
}

const loginPage = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>tynice</title>
  <link rel="stylesheet" href="/login.css">
</head>
<body>
  <form method="POST" action="/login">
    <input type="password" name="password" placeholder="• • • • •" autofocus>
    <button type="submit">enter</button>
  </form>
</body>
</html>`;

createServer(async (req, res) => {
  try {
    const reqUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = reqUrl.pathname;

    if (pathname === '/login' && req.method === 'POST') {
      let body = '';
      for await (const chunk of req) body += chunk;
      const params = new URLSearchParams(body);
      const pw = params.get('password') || '';
      if (pw === PASSWORD) {
        res.writeHead(302, { 'Set-Cookie': `auth=${PASSWORD}; Path=/; HttpOnly; SameSite=Strict`, Location: '/' });
        res.end();
      } else {
        res.writeHead(302, { Location: '/login' });
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

    if (pathname === '/' || pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    if (pathname === '/gallery' && req.method === 'GET') {
      await handleGallery(res);
      return;
    }

    if (pathname === '/folder-link' && req.method === 'GET') {
      sendJson(res, 200, {
        folderId: DRIVE_FOLDER_ID,
        uploadUrl: DRIVE_FOLDER_ID ? `https://drive.google.com/drive/folders/${DRIVE_FOLDER_ID}` : null,
      });
      return;
    }

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
    sendJson(res, 500, {
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}).listen(PORT, () => console.log(`Server running on :${PORT}`));
