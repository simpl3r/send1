// Тестовая функция для проверки Neynar API
export default async function handler(req, res) {
    console.log('Test Neynar API called:', {
        method: req.method,
        url: req.url,
        query: req.query,
        timestamp: new Date().toISOString()
    });
    
    // Устанавливаем CORS заголовки
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Обрабатываем preflight запросы
    if (req.method === 'OPTIONS') {
        console.log('Handling OPTIONS request');
        res.status(200).end();
        return;
    }
    
    if (req.method === 'GET') {
        try {
            const query = req.query.q || 'vitalik';
            const apiKey = process.env.NEYNAR_API_KEY || 'NEYNAR_API_DOCS';
            
            console.log('Testing Neynar API with:', {
                query,
                hasApiKey: !!apiKey,
                keyLength: apiKey.length,
                keyPreview: apiKey.substring(0, 8) + '...'
            });
            
            const neynarUrl = `https://api.neynar.com/v2/farcaster/user/search?q=${encodeURIComponent(query)}&limit=5`;
            
            console.log('Making request to:', neynarUrl);
            
            const response = await fetch(neynarUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'api_key': apiKey
                }
            });
            
            console.log('Neynar API response:', {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries())
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('Neynar API success:', {
                    resultCount: data.result?.users?.length || 0,
                    hasResult: !!data.result
                });
                
                res.status(200).json({
                    success: true,
                    query,
                    apiKey: apiKey.substring(0, 8) + '...',
                    neynarResponse: data,
                    timestamp: new Date().toISOString()
                });
            } else {
                const errorText = await response.text();
                console.error('Neynar API error:', {
                    status: response.status,
                    statusText: response.statusText,
                    errorText
                });
                
                res.status(response.status).json({
                    success: false,
                    error: 'Neynar API error',
                    status: response.status,
                    statusText: response.statusText,
                    errorText,
                    query,
                    apiKey: apiKey.substring(0, 8) + '...',
                    timestamp: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error('Error testing Neynar API:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}