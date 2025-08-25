# CELO Transfer Mini App

A Farcaster Mini App for sending CELO tokens via smart contract.

## Features

- 🔗 Farcaster SDK integration
- 💰 Send CELO tokens directly from Farcaster
- 🎨 Clean, minimalist design following CELO brand guidelines
- 📱 Mobile-optimized interface
- 🔐 Secure wallet connection via Farcaster

## Development

### Prerequisites

- Node.js 22.11.0 or higher
- Farcaster account with Developer Mode enabled

### Setup

1. Clone or download this project
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables (optional):
   ```bash
   cp .env.example .env
   # Отредактируйте .env файл и добавьте ваш Neynar API ключ
   ```
4. Start the development server:
   ```bash
   npm start
   ```
5. Open http://localhost:3000 in your browser

### Environment Variables

- `NEYNAR_API_KEY` - API ключ для Neynar (получите на https://neynar.com)
  - Для разработки: используется публичный ключ по умолчанию
  - Для продакшена: обязательно установите ваш собственный ключ

### Testing in Farcaster

1. Enable Developer Mode in Farcaster settings
2. Use the developer tools to preview your mini app
3. Test the manifest at `/.well-known/farcaster.json`

## Deployment

### Vercel Deployment

1. Подключите ваш репозиторий к Vercel
2. В настройках проекта Vercel добавьте переменные окружения:
   - `NEYNAR_API_KEY` = ваш API ключ от Neynar
3. Обновите URLs в `farcaster.json` на ваш production домен
4. Деплойте проект

### For Production

1. Update URLs in `farcaster.json` to your production domain
2. Host the application on a web server
3. Ensure `farcaster.json` is accessible at `/.well-known/farcaster.json`
4. Configure environment variables on your hosting platform:
   - `NEYNAR_API_KEY` - your Neynar API key
5. Submit for review in Farcaster Developer Tools

### Required Files for Deployment

- `index.html` - Main application interface
- `app.js` - Application logic with Farcaster SDK
- `farcaster.json` - Mini app manifest
- `icon.svg` - Application icon
- `splash.svg` - Splash screen image
- `server.js` - Development server (optional for production)

## File Structure

```
├── index.html          # Main HTML file
├── app.js             # JavaScript with Farcaster SDK
├── farcaster.json     # Farcaster manifest
├── manifest.json      # Legacy manifest
├── icon.svg           # App icon
├── splash.svg         # Splash image
├── server.js          # Development server
├── package.json       # Node.js dependencies
└── README.md          # This file
```

## Manifest Configuration

The `farcaster.json` file contains all necessary configuration for Farcaster Mini App publication. Update the following fields before deployment:

- `homeUrl` - Your production domain
- `iconUrl` - URL to your app icon
- `splashImageUrl` - URL to your splash image
- `webhookUrl` - Your webhook endpoint (if needed)
- `developer` information
- `support` and `privacy` URLs

## License

MIT License