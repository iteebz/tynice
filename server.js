import { createServer } from 'http';
import { readFileSync, existsSync, statSync, writeFileSync, mkdirSync } from 'fs';
import { extname, join } from 'path';

const PORT = Number(process.env.PORT || 3000);
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

const DATA_DIR = process.env.DATA_DIR || '/data';
const LINKS_FILE = join(DATA_DIR, 'links.json');

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(payload));
}

function loadLinks() {
  try {
    if (!existsSync(LINKS_FILE)) {
      return [];
    }
    return JSON.parse(readFileSync(LINKS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveLinks(links) {
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(LINKS_FILE, JSON.stringify(links, null, 2));
  } catch (error) {
    console.error('Failed to save links:', error);
    throw error;
  }
}

function getDrivePreviewUrl(fileId) {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

function getDriveThumbnailUrl(fileId) {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
}

async function handleSubmitLink(req, res) {
  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    try {
      const { url, fileId } = JSON.parse(body);
      if (!url || !fileId) {
        sendJson(res, 400, { error: 'Missing url or fileId' });
        return;
      }

      const links = loadLinks();
      const newLink = {
        id: Date.now().toString(),
        url,
        fileId,
        previewUrl: getDrivePreviewUrl(fileId),
        thumbnailUrl: getDriveThumbnailUrl(fileId),
        submittedAt: new Date().toISOString(),
      };

      links.unshift(newLink);
      saveLinks(links);
      sendJson(res, 200, { success: true });
    } catch (error) {
      sendJson(res, 400, { error: 'Invalid request' });
    }
  });
}

function handleGallery(res) {
  const links = loadLinks();
  const items = links.map((link) => ({
    key: link.id,
    size: 0,
    lastModified: link.submittedAt,
    mediaType: 'drive',
    url: link.previewUrl,
    driveUrl: link.url,
  }));
  sendJson(res, 200, items);
}

createServer(async (req, res) => {
  try {
    const reqUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = reqUrl.pathname;

    if (pathname === '/' || pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    if (pathname === '/submit-link' && req.method === 'POST') {
      await handleSubmitLink(req, res);
      return;
    }

    if (pathname === '/gallery' && req.method === 'GET') {
      handleGallery(res);
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
