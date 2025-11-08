// Serverless function for redirecting the Farcaster manifest
export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method === 'GET') {
    // Redirect to the hosted Farcaster manifest
    const hostedManifestUrl = 'https://api.farcaster.xyz/miniapps/hosted-manifest/0198e42f-9f8f-7389-e85a-b6adc5cec69d';
    res.redirect(307, hostedManifestUrl);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}