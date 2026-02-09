import { createServer } from 'http';
import { readFileSync, existsSync, statSync, writeFileSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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

const MAX_UPLOAD_BYTES = 1024 * 1024 * 1024; // 1 GB
const STATS_DIR = process.env.STATS_DIR || '/data';
const STATS_FILE = join(STATS_DIR, 'stats.json');

const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

const hasR2Config = Boolean(
  R2_ENDPOINT && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET,
);

const r2Client = hasR2Config
  ? new S3Client({
      endpoint: R2_ENDPOINT,
      region: 'auto',
      forcePathStyle: true,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    })
  : null;

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(payload));
}

function loadStats() {
  const fallback = {
    presignRequests: 0,
    bytesRequested: 0,
    lastUpdated: null,
  };

  try {
    if (!existsSync(STATS_FILE)) {
      return fallback;
    }
    const parsed = JSON.parse(readFileSync(STATS_FILE, 'utf8'));
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

function saveStats(next) {
  try {
    mkdirSync(STATS_DIR, { recursive: true });
    writeFileSync(STATS_FILE, JSON.stringify(next, null, 2));
  } catch {
    // Ignore write errors in ephemeral local/dev environments.
  }
}

function bumpPresignStats(size) {
  const stats = loadStats();
  const next = {
    ...stats,
    presignRequests: stats.presignRequests + 1,
    bytesRequested: stats.bytesRequested + size,
    lastUpdated: new Date().toISOString(),
  };
  saveStats(next);
  return next;
}

function sanitizeFilename(name) {
  return (name || 'upload.mp4').replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 120);
}

function publicUrlForKey(key) {
  if (!R2_PUBLIC_URL) return null;
  const base = R2_PUBLIC_URL.endsWith('/') ? R2_PUBLIC_URL.slice(0, -1) : R2_PUBLIC_URL;
  return `${base}/${encodeURIComponent(key)}`;
}

async function handlePresign(reqUrl, res) {
  if (!r2Client) {
    sendJson(res, 500, {
      error: 'R2 not configured',
      required: ['R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET'],
    });
    return;
  }

  const filename = sanitizeFilename(reqUrl.searchParams.get('filename') || 'upload.mp4');
  const type = reqUrl.searchParams.get('type') || 'video/mp4';
  const size = Number(reqUrl.searchParams.get('size') || 0);

  if (!type.startsWith('video/')) {
    sendJson(res, 400, { error: 'Only video uploads are allowed' });
    return;
  }

  if (!Number.isFinite(size) || size <= 0 || size > MAX_UPLOAD_BYTES) {
    sendJson(res, 400, { error: 'Invalid upload size' });
    return;
  }

  const key = `${Date.now()}-${randomUUID()}-${filename}`;
  const cmd = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: type,
  });

  const url = await getSignedUrl(r2Client, cmd, { expiresIn: 900 });
  bumpPresignStats(size);

  sendJson(res, 200, {
    url,
    key,
    publicUrl: publicUrlForKey(key),
    expiresInSeconds: 900,
  });
}

async function resolvePlaybackUrl(key) {
  const publicUrl = publicUrlForKey(key);
  if (publicUrl) return publicUrl;

  const cmd = new GetObjectCommand({ Bucket: R2_BUCKET, Key: key });
  return getSignedUrl(r2Client, cmd, { expiresIn: 3600 });
}

async function handleGallery(res) {
  if (!r2Client) {
    sendJson(res, 500, { error: 'R2 not configured' });
    return;
  }

  const out = await r2Client.send(
    new ListObjectsV2Command({
      Bucket: R2_BUCKET,
      MaxKeys: 50,
    }),
  );

  const contents = (out.Contents || [])
    .filter((item) => item.Key)
    .sort((a, b) => new Date(b.LastModified || 0) - new Date(a.LastModified || 0));

  const items = await Promise.all(
    contents.map(async (item) => ({
      key: item.Key,
      size: item.Size || 0,
      lastModified: item.LastModified || null,
      url: await resolvePlaybackUrl(item.Key),
    })),
  );

  sendJson(res, 200, items);
}

async function handleSyncStats(res) {
  if (!r2Client) {
    sendJson(res, 500, { error: 'R2 not configured' });
    return;
  }

  const out = await r2Client.send(
    new ListObjectsV2Command({
      Bucket: R2_BUCKET,
      MaxKeys: 1000,
    }),
  );

  const contents = out.Contents || [];
  const bytesStored = contents.reduce((sum, it) => sum + Number(it.Size || 0), 0);
  const next = {
    ...loadStats(),
    objectCount: contents.length,
    bytesStored,
    lastSyncedAt: new Date().toISOString(),
  };

  saveStats(next);
  sendJson(res, 200, next);
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

    if (pathname === '/presign' && req.method === 'GET') {
      await handlePresign(reqUrl, res);
      return;
    }

    if (pathname === '/gallery' && req.method === 'GET') {
      await handleGallery(res);
      return;
    }

    if (pathname === '/stats' && req.method === 'GET') {
      sendJson(res, 200, loadStats());
      return;
    }

    if (pathname === '/sync-stats' && req.method === 'POST') {
      await handleSyncStats(res);
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
