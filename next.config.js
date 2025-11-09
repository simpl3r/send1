/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/.well-known/farcaster.json',
        destination:
          'https://api.farcaster.xyz/miniapps/hosted-manifest/0198e42f-9f8f-7389-e85a-b6adc5cec69d',
        permanent: false,
        statusCode: 307
      }
    ]
  },
  webpack: (config) => {
    // Ignore React Native async storage in web builds to fix MetaMask SDK resolution
    config.resolve = config.resolve || {}
    config.resolve.alias = config.resolve.alias || {}
    config.resolve.alias['@react-native-async-storage/async-storage'] = false
    // WalletConnect optional pretty logger not needed in production web builds
    config.resolve.alias['pino-pretty'] = false
    return config
  }
}

module.exports = nextConfig