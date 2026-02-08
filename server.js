import { createServer } from 'http';
import { readFileSync } from 'fs';

const html = readFileSync('index.html', 'utf8');

createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
}).listen(3000, () => console.log('Server running on :3000'));
