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
   # Edit the .env file and add your Neynar API key
   ```
4. Start the development server:
   ```bash
   npm start
   ```
5. Open http://localhost:3000 in your browser

### Environment Variables

- `NEYNAR_API_KEY` - API key for Neynar (get it at https://neynar.com)
  - For development: uses public key by default
  - For production: you must set your own key

## Neynar API Key Setup

**IMPORTANT:** Neynar user search functionality requires a paid plan. Currently, the application uses the public demo key `NEYNAR_API_DOCS` to demonstrate functionality.

### To use your own API key:

1. Register at [Neynar](https://neynar.com) and get an API key
2. Upgrade to a paid plan at [neynar.com/#pricing](https://neynar.com/#pricing)
3. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
4. Add your API key to the `.env` file:
   ```
   NEYNAR_API_KEY=your_actual_api_key_here
   ```
5. Update `server.js` to use your key instead of the public one

### Testing in Farcaster

1. Enable Developer Mode in Farcaster settings
2. Use the developer tools to preview your mini app
3. Test the manifest at `/.well-known/farcaster.json`

## Deployment

### Vercel Deployment

1. Connect your repository to Vercel
2. In Vercel project settings, add environment variables:
   - `NEYNAR_API_KEY` = your Neynar API key
3. Update URLs in `farcaster.json` to your production domain
4. Deploy the project

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