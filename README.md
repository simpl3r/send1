# CELO Sender

> A Farcaster Mini App for seamless CELO token transfers with user search functionality

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.11.0-brightgreen)](https://nodejs.org/)
[![Farcaster](https://img.shields.io/badge/Farcaster-Mini%20App-purple)](https://docs.farcaster.xyz/)

## 📖 About

CELO Sender is a decentralized application built for the Farcaster ecosystem that enables users to send CELO tokens directly within the Farcaster interface. The app features user search functionality powered by Neynar API and provides a seamless Web3 experience.

### ✨ Key Features

- 🔗 **Farcaster SDK Integration** - Native integration with Farcaster ecosystem
- 💰 **CELO Token Transfers** - Send CELO tokens via smart contract
- 👥 **User Search** - Find recipients by Farcaster username with autocomplete
- 🎨 **Modern UI/UX** - Clean, responsive design following CELO brand guidelines
- 📱 **Mobile Optimized** - Perfect experience on mobile devices
- 🔐 **Secure Wallet Connection** - Safe wallet integration via Farcaster
- ⚡ **Real-time Gas Estimation** - Dynamic gas cost calculation
- 🌐 **Multi-network Support** - CELO mainnet integration

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 22.11.0 or higher
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- Farcaster account with Developer Mode enabled
- [Neynar API key](https://neynar.com) (optional for development)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd celo-sender
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables** (optional)
   ```bash
   cp .env.example .env
   # Edit .env and add your Neynar API key
   ```

4. **Start development server**
   ```bash
   npm start
   ```

5. **Open in browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### 🔧 Development Scripts

```bash
npm start          # Start development server
npm run dev        # Alternative development command
npm test           # Run tests (if available)
npm run build      # Build for production
```

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Blockchain**: CELO Network, Ethereum Web3
- **APIs**: Farcaster SDK, Neynar API
- **Development**: Node.js, Express.js
- **Deployment**: Vercel, Ngrok (for testing)

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NEYNAR_API_KEY` | Neynar API key for user search | No | `NEYNAR_API_DOCS` |
| `NODE_ENV` | Environment mode | No | `development` |

### Neynar API Setup

> **Note**: User search functionality requires a Neynar API key with paid plan

1. **Get API Key**
   - Register at [Neynar](https://neynar.com)
   - Upgrade to paid plan at [neynar.com/#pricing](https://neynar.com/#pricing)

2. **Configure Environment**
   ```bash
   cp .env.example .env
   echo "NEYNAR_API_KEY=your_actual_api_key_here" >> .env
   ```

3. **Update Server Configuration**
   - Modify `server.js` to use your API key
   - Restart development server

## 🧪 Testing

### Local Testing

1. **Start Development Server**
   ```bash
   npm start
   ```

2. **Test with Ngrok** (for Farcaster testing)
   ```bash
   ngrok http 3000
   ```

### Farcaster Integration Testing

1. **Enable Developer Mode**
   - Open Farcaster app settings
   - Enable Developer Mode

2. **Test Mini App**
   - Use Farcaster developer tools
   - Preview your mini app
   - Verify manifest at `/.well-known/farcaster.json`

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect Repository**
   ```bash
   # Connect your GitHub repo to Vercel
   vercel --prod
   ```

2. **Configure Environment Variables**
   ```bash
   # In Vercel dashboard, add:
   NEYNAR_API_KEY=your_api_key
   ```

3. **Update Configuration**
   - Update URLs in `farcaster.json`
   - Deploy the project

### Manual Deployment

1. **Build for Production**
   ```bash
   npm run build  # if build script exists
   ```

2. **Deploy Files**
   - Upload all files to your web server
   - Ensure `/.well-known/farcaster.json` is accessible
   - Configure environment variables

3. **Submit for Review**
   - Test thoroughly
   - Submit via Farcaster Developer Tools

## 📁 Project Structure

```
celo-sender/
├── 📄 index.html              # Main application interface
├── 📄 app.js                  # Core application logic
├── 📄 styles.css              # Application styles
├── 📄 server.js               # Development server
├── 📄 package.json            # Dependencies and scripts
├── 📄 farcaster.json          # Farcaster Mini App manifest
├── 📄 .env.example            # Environment variables template
├── 🖼️ Assets/
│   ├── icon-1024.png          # App icon (1024x1024)
│   ├── splash.png             # Splash screen image
│   ├── splash.svg             # Splash screen (vector)
│   └── OG-farcaster.png       # Open Graph image
├── 🔧 api/                    # Serverless functions
│   ├── config.js              # API configuration
│   ├── webhook.js             # Farcaster webhook
│   ├── test-neynar.js         # Neynar API testing
│   └── farcaster-manifest.js  # Manifest endpoint
└── 📁 .well-known/
    └── farcaster.json         # Farcaster manifest (public)
```

## 📚 API Reference

### Core Functions

- `initApp()` - Initialize Farcaster SDK and app
- `connectWallet()` - Connect user wallet
- `sendTransaction()` - Send CELO tokens
- `searchMultipleUsers()` - Search Farcaster users
- `estimateGasCost()` - Calculate transaction gas

### Endpoints

- `GET /api/config` - Get API configuration
- `POST /api/webhook` - Farcaster webhook handler
- `GET /api/test-neynar` - Test Neynar API connection
- `GET /.well-known/farcaster.json` - App manifest

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the repository**
2. **Create feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
4. **Push to branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open Pull Request**

### Development Guidelines

- Follow existing code style
- Add comments for complex logic
- Test thoroughly before submitting
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [Farcaster Docs](https://docs.farcaster.xyz/)
- **CELO Network**: [CELO Docs](https://docs.celo.org/)
- **Neynar API**: [Neynar Docs](https://docs.neynar.com/)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)

## 🙏 Acknowledgments

- [Farcaster](https://farcaster.xyz/) for the amazing protocol
- [CELO](https://celo.org/) for the sustainable blockchain
- [Neynar](https://neynar.com/) for the powerful API
- Community contributors and testers

---

**Made with ❤️ for the Farcaster ecosystem**