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

  // API endpoint for configuration
  if (req.url === '/api/config' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    // Use different keys for different purposes
    const notificationApiKey = process.env.NEYNAR_API_KEY || 'NEYNAR_API_DOCS';
    const searchApiKey = process.env.NEYNAR_SEARCH_API_KEY || 'NEYNAR_API_DOCS';
    res.end(JSON.stringify({ 
      NEYNAR_API_KEY: notificationApiKey,
      NEYNAR_SEARCH_API_KEY: searchApiKey 
    }));
    return;
  }



  // API endpoint for testing Neynar
  if (req.url.startsWith('/api/test-neynar') && req.method === 'GET') {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const query = url.searchParams.get('q') || 'vitalik';
    const limit = parseInt(url.searchParams.get('limit')) || 5;
    const apiKey = process.env.NEYNAR_SEARCH_API_KEY || 'NEYNAR_API_DOCS';
    
    console.log('Testing Neynar API with query:', query, 'limit:', limit);
    
    // Import fetch for Node.js
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
  // Redirect to hosted Farcaster manifest
  if (req.url === '/.well-known/farcaster.json') {
    console.log('Redirecting to hosted manifest...');
    // Replace YOUR_HOSTED_MANIFEST_ID with a real ID after creating the hosted manifest
    const hostedManifestUrl = 'https://api.farcaster.xyz/miniapps/hosted-manifest/0198e42f-9f8f-7389-e85a-b6adc5cec69d';
    res.writeHead(307, { 'Location': hostedManifestUrl });
    res.end();
    return;
  } else {
    // Normalize URL
    filePath = '.' + req.url;
    if (filePath === './') {
      filePath = './index.html';
    }
  }

  // Get file extension
  const extname = path.extname(filePath);
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  // Read file
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        // File not found
        res.writeHead(404);
        res.end('File not found');
      } else {
        // Server error
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`);
      }
    } else {
      // Success
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});