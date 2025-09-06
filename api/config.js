// Serverless функция для Vercel
export default function handler(req, res) {
  console.log('Config API called:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
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
      // Используем разные ключи для разных целей
      const notificationApiKey = process.env.NEYNAR_API_KEY || 'NEYNAR_API_DOCS';
      const searchApiKey = process.env.NEYNAR_SEARCH_API_KEY || 'NEYNAR_API_DOCS';
      
      console.log('Environment variables check:', {
        hasNotificationKey: !!process.env.NEYNAR_API_KEY,
        hasSearchKey: !!process.env.NEYNAR_SEARCH_API_KEY,
        notificationKeyLength: process.env.NEYNAR_API_KEY ? process.env.NEYNAR_API_KEY.length : 0,
        searchKeyLength: process.env.NEYNAR_SEARCH_API_KEY ? process.env.NEYNAR_SEARCH_API_KEY.length : 0,
        finalNotificationKey: notificationApiKey.substring(0, 8) + '...',
        finalSearchKey: searchApiKey.substring(0, 8) + '...'
      });
      
      const response = {
        NEYNAR_API_KEY: notificationApiKey,
        NEYNAR_SEARCH_API_KEY: searchApiKey,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      };
      
      console.log('Sending response:', {
        ...response,
        NEYNAR_API_KEY: response.NEYNAR_API_KEY.substring(0, 8) + '...' // Безопасное логирование
      });
      
      res.status(200).json(response);
    } catch (error) {
      console.error('Error in config API:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}