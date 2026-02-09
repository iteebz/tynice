import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { extname, join } from 'path';

const html = readFileSync('index.html', 'utf8');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

createServer((req, res) => {
  const url = req.url === '/' ? '/index.html' : req.url;
  
  if (url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    return;
  }
  
  const filePath = join('public', url);
  if (existsSync(filePath) && statSync(filePath).isFile()) {
    const ext = extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const file = readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(file);
    return;
  }
  
  res.writeHead(404);
  res.end('Not found');
}).listen(3000, () => console.log('Server running on :3000'));
