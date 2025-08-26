const http = require('http');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const PORT = 3000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  // API endpoint для конфигурации
  if (req.url === '/api/config' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ NEYNAR_API_KEY: process.env.NEYNAR_API_KEY || 'NEYNAR_API_DOCS' }));
    return;
  }

  let filePath;
  // Редирект для hosted manifest Farcaster
  if (req.url === '/.well-known/farcaster.json') {
    // Замените YOUR_HOSTED_MANIFEST_ID на реальный ID после создания hosted manifest
    const hostedManifestUrl = 'https://api.farcaster.xyz/miniapps/hosted-manifest/YOUR_HOSTED_MANIFEST_ID';
    res.writeHead(307, { 'Location': hostedManifestUrl });
    res.end();
    return;
  } else {
    // Нормализуем URL
    filePath = '.' + req.url;
    if (filePath === './') {
      filePath = './index.html';
    }
  }

  // Получаем расширение файла
  const extname = path.extname(filePath);
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  // Читаем файл
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        // Файл не найден
        res.writeHead(404);
        res.end('File not found');
      } else {
        // Серверная ошибка
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`);
      }
    } else {
      // Успешно
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});