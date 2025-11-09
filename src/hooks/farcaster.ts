'use client'

export async function tryFarcasterConnect(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  const w = window as any
  const fc = w.farcaster
  try {
    // Prefer using official Warpcast Mini App SDK when available
    try {
      const mod = await import('@farcaster/miniapp-sdk')
      const sdk = (mod as any).sdk
      if (sdk?.wallet?.getEthereumProvider) {
        const provider = await sdk.wallet.getEthereumProvider()
        if (provider) {
          // Map SDK provider to window.ethereum for Wagmi compatibility
          w.ethereum = provider
          // Request accounts using EIP-1193
          await provider.request({ method: 'eth_requestAccounts' })
          return true
        }
      }
    } catch (_) {}
    // Farcaster Miniapp SDK may expose connect() or an ethereum-like provider
    if (fc && typeof fc.connect === 'function') {
      await fc.connect()
      return true
    }
    if (fc && fc.ethereum && typeof fc.ethereum.request === 'function') {
      await fc.ethereum.request({ method: 'eth_requestAccounts' })
      return true
    }
    // Fallback: use injected ethereum if available
    if (w.ethereum && typeof w.ethereum.request === 'function') {
      await w.ethereum.request({ method: 'eth_requestAccounts' })
      return true
    }
  } catch (_) {}
  return false
}

export function ensureInjectedFromFarcaster(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as any
  const fc = w.farcaster
  try {
    // Try to use SDK provider if present
    if (!w.ethereum && fc?.ethereum) {
      w.ethereum = fc.ethereum
      return true
    }
    if (fc && fc.ethereum && !w.ethereum) {
      w.ethereum = fc.ethereum
      return true
    }
    return !!w.ethereum
  } catch (_) {
    return false
  }
}