const http = require('http');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

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
    // Используем пользовательский ключ из переменных окружения (Vercel Environment Variables)
    const apiKey = process.env.NEYNAR_API_KEY || 'NEYNAR_API_DOCS';
    res.end(JSON.stringify({ NEYNAR_API_KEY: apiKey }));
    return;
  }



  // API endpoint для тестирования Neynar
  if (req.url.startsWith('/api/test-neynar') && req.method === 'GET') {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const query = url.searchParams.get('q') || 'vitalik';
    const limit = parseInt(url.searchParams.get('limit')) || 5;
    const apiKey = process.env.NEYNAR_API_KEY || 'NEYNAR_API_DOCS';
    
    console.log('Testing Neynar API with query:', query, 'limit:', limit);
    
    // Импортируем fetch для Node.js
    const fetch = require('node-fetch');
    
    const neynarUrl = `https://api.neynar.com/v2/farcaster/user/search?q=${encodeURIComponent(query)}&limit=${limit}`;
    
    fetch(neynarUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api_key': apiKey
      }
    })
    .then(response => {
      console.log('Neynar API response status:', response.status);
      return response.json().then(data => ({ status: response.status, data }));
    })
    .then(({ status, data }) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: status === 200,
        status,
        query,
        limit,
        apiKey: apiKey.substring(0, 8) + '...',
        neynarResponse: data,
        timestamp: new Date().toISOString()
      }));
    })
    .catch(error => {
      console.error('Error testing Neynar API:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: error.message,
        query,
        limit,
        apiKey: apiKey.substring(0, 8) + '...',
        timestamp: new Date().toISOString()
      }));
    });
    return;
  }

  let filePath;
  // Редирект для hosted manifest Farcaster
  if (req.url === '/.well-known/farcaster.json') {
    console.log('Redirecting to hosted manifest...');
    // Замените YOUR_HOSTED_MANIFEST_ID на реальный ID после создания hosted manifest
    const hostedManifestUrl = 'https://api.farcaster.xyz/miniapps/hosted-manifest/0198e42f-9f8f-7389-e85a-b6adc5cec69d';
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