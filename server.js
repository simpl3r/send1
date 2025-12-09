const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
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
  const startedAt = Date.now();
  const logPrefix = `[${new Date().toISOString()}]`;
  const rootDir = process.cwd();
  const writeSecurityHeaders = () => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  };
  const finishLog = (status, bytes = 0) => {
    const duration = Date.now() - startedAt;
    console.log(`${logPrefix} ${req.method} ${req.url} -> ${status} ${bytes}b ${duration}ms`);
  };

  // Health check
  if (req.url === '/healthz') {
    writeSecurityHeaders();
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
    const body = JSON.stringify({ status: 'ok', time: new Date().toISOString() });
    res.end(body);
    finishLog(200, Buffer.byteLength(body));
    return;
  }

  // API endpoint for configuration
  if (req.url === '/api/config' && req.method === 'GET') {
    // Set security headers BEFORE writing response headers
    writeSecurityHeaders();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    // Use different keys for different purposes
    const notificationApiKey = process.env.NEYNAR_API_KEY || 'NEYNAR_API_DOCS';
    const searchApiKey = process.env.NEYNAR_SEARCH_API_KEY || 'NEYNAR_API_DOCS';
    const body = JSON.stringify({ 
      NEYNAR_API_KEY: notificationApiKey,
      NEYNAR_SEARCH_API_KEY: searchApiKey 
    });
    res.end(body);
    finishLog(200, Buffer.byteLength(body));
    return;
  }



  // API endpoint for testing Neynar
  // Simple per-IP rate limiting for /api/test-neynar
  const RATE_LIMIT_WINDOW_MS = 60 * 1000;
  const RATE_LIMIT_MAX = 30;
  const ip = req.socket.remoteAddress || 'unknown';
  if (!global.__rateLimit) global.__rateLimit = new Map();

  if (req.url.startsWith('/api/test-neynar') && req.method === 'GET') {
    const now = Date.now();
    const bucket = global.__rateLimit.get(ip) || { count: 0, reset: now + RATE_LIMIT_WINDOW_MS };
    if (now > bucket.reset) {
      bucket.count = 0;
      bucket.reset = now + RATE_LIMIT_WINDOW_MS;
    }
    bucket.count += 1;
    global.__rateLimit.set(ip, bucket);
    if (bucket.count > RATE_LIMIT_MAX) {
      writeSecurityHeaders();
      res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '60' });
      const body = JSON.stringify({ error: 'Rate limit exceeded', windowMs: RATE_LIMIT_WINDOW_MS });
      res.end(body);
      finishLog(429, Buffer.byteLength(body));
      return;
    }
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
      writeSecurityHeaders();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      const body = JSON.stringify({
        success: status === 200,
        status,
        query,
        limit,
        apiKey: apiKey.substring(0, 8) + '...',
        neynarResponse: data,
        timestamp: new Date().toISOString()
      });
      res.end(body);
      finishLog(200, Buffer.byteLength(body));
    })
    .catch(error => {
      console.error('Error testing Neynar API:', error);
      writeSecurityHeaders();
      res.writeHead(500, { 'Content-Type': 'application/json' });
      const body = JSON.stringify({
        success: false,
        error: error.message,
        query,
        limit,
        apiKey: apiKey.substring(0, 8) + '...',
        timestamp: new Date().toISOString()
      });
      res.end(body);
      finishLog(500, Buffer.byteLength(body));
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

  // Prevent path traversal and resolve safe path
  const normalized = path.normalize(filePath).replace(/^\.\//, '');
  const safePath = path.join(rootDir, normalized);
  if (!safePath.startsWith(rootDir)) {
    writeSecurityHeaders();
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    const body = 'Forbidden';
    res.end(body);
    finishLog(403, Buffer.byteLength(body));
    return;
  }

  // Get file extension
  const extname = path.extname(safePath);
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  // Choose caching policy
  const isStaticAsset = /\.(js|css|png|jpg|jpeg|gif|svg|ico)$/.test(extname);
  const isHtml = extname === '.html';

  // Read file with stat for ETag/Last-Modified
  fs.stat(safePath, (statErr, stat) => {
    if (statErr) {
      if (statErr.code === 'ENOENT') {
        writeSecurityHeaders();
        res.writeHead(404);
        res.end('File not found');
        finishLog(404);
      } else {
        writeSecurityHeaders();
        res.writeHead(500);
        res.end(`Server Error: ${statErr.code}`);
        finishLog(500);
      }
      return;
    }

    fs.readFile(safePath, (error, content) => {
      if (error) {
        if (error.code === 'ENOENT') {
          writeSecurityHeaders();
          res.writeHead(404);
          res.end('File not found');
          finishLog(404);
        } else {
          writeSecurityHeaders();
          res.writeHead(500);
          res.end(`Server Error: ${error.code}`);
          finishLog(500);
        }
        return;
      }

      // Prepare headers
      const etag = `${stat.size}-${stat.mtimeMs}`;
      const lastModified = new Date(stat.mtimeMs).toUTCString();

      // Conditional requests
      if (req.headers['if-none-match'] === etag || req.headers['if-modified-since'] === lastModified) {
        writeSecurityHeaders();
        res.writeHead(304, {
          'ETag': etag,
          'Last-Modified': lastModified,
          'Cache-Control': isHtml ? 'no-cache' : 'public, max-age=31536000, immutable'
        });
        res.end();
        finishLog(304);
        return;
      }

      // Compression for text-like responses
      const accept = req.headers['accept-encoding'] || '';
      let encoding = null;
      const shouldCompress = /^(text\/|application\/json|image\/svg\+xml)/.test(contentType);
      let body = content;
      if (shouldCompress && accept.includes('br')) {
        body = zlib.brotliCompressSync(content);
        encoding = 'br';
      } else if (shouldCompress && accept.includes('gzip')) {
        body = zlib.gzipSync(content);
        encoding = 'gzip';
      }

      writeSecurityHeaders();
      const headers = {
        'Content-Type': contentType,
        'ETag': etag,
        'Last-Modified': lastModified,
        'Cache-Control': isHtml ? 'no-cache' : (isStaticAsset ? 'public, max-age=31536000, immutable' : 'public, max-age=86400'),
      };
      if (encoding) headers['Content-Encoding'] = encoding;
      res.writeHead(200, headers);
      res.end(body);
      finishLog(200, body.length);
    });
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});