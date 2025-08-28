// Webhook endpoint for Farcaster frames
export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    // Handle frame interactions
    const { untrustedData, trustedData } = req.body;
    
    // For now, just redirect to the main app
    res.status(200).json({
      type: 'frame',
      frameUrl: process.env.VERCEL_URL || 'https://send1.vercel.app'
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}