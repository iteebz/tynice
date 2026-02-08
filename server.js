import { createServer } from 'http';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const uploadHtml = readFileSync('index.html', 'utf8');
const loveHtml = readFileSync('love.html', 'utf8');

const STATS_FILE = '/data/stats.json';

const loadStats = () => {
  if (existsSync(STATS_FILE)) {
    return JSON.parse(readFileSync(STATS_FILE, 'utf8'));
  }
  return { uploads: 0, bytes: 0, contributors: new Set() };
};

const saveStats = (stats) => {
  const toSave = { ...stats, contributors: [...stats.contributors] };
  writeFileSync(STATS_FILE, JSON.stringify(toSave));
};

let stats = loadStats();
if (Array.isArray(stats.contributors)) {
  stats.contributors = new Set(stats.contributors);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  if (url.pathname === '/presign' && req.method === 'GET') {
    const filename = url.searchParams.get('filename');
    const type = url.searchParams.get('type');
    const size = parseInt(url.searchParams.get('size') || '0', 10);
    const contributor = url.searchParams.get('contributor') || 'anonymous';
    
    if (!filename || !type) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Missing filename or type' }));
    }

    const key = `${Date.now()}-${crypto.randomUUID()}-${filename}`;
    
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      ContentType: type,
    });

    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
    
    stats.uploads++;
    stats.bytes += size;
    if (contributor) stats.contributors.add(contributor);
    saveStats(stats);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ url: presignedUrl, key }));
  }

  if (url.pathname === '/stats' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      uploads: stats.uploads,
      bytes: stats.bytes,
      contributors: stats.contributors.size,
    }));
  }

  if (url.pathname === '/sync-stats' && req.method === 'POST') {
    try {
      const command = new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET });
      const response = await s3.send(command);
      const objects = response.Contents || [];
      
      stats.uploads = objects.length;
      stats.bytes = objects.reduce((sum, obj) => sum + (obj.Size || 0), 0);
      saveStats(stats);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ synced: true, ...stats, contributors: stats.contributors.size }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: err.message }));
    }
  }

  if (url.pathname === '/gallery' && req.method === 'GET') {
    try {
      const command = new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET });
      const response = await s3.send(command);
      const objects = (response.Contents || [])
        .sort((a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0))
        .slice(0, 50);
      
      const videos = await Promise.all(objects.map(async (obj) => {
        let videoUrl;
        if (R2_PUBLIC_URL) {
          videoUrl = `${R2_PUBLIC_URL}/${obj.Key}`;
        } else {
          const getCmd = new GetObjectCommand({ Bucket: process.env.R2_BUCKET, Key: obj.Key });
          videoUrl = await getSignedUrl(s3, getCmd, { expiresIn: 3600 });
        }
        return { key: obj.Key, url: videoUrl, size: obj.Size };
      }));
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(videos));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: err.message }));
    }
  }

  if (url.pathname === '/' || url.pathname === '/upload') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(uploadHtml);
  }

  if (url.pathname === '/love') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(loveHtml);
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(3000, () => console.log('Server running on :3000'));
