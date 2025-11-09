'use client'

export async function tryFarcasterConnect(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  const w = window as any
  const fc = w.farcaster
  try {
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
    if (fc && fc.ethereum && !w.ethereum) {
      w.ethereum = fc.ethereum
      return true
    }
    return !!w.ethereum
  } catch (_) {
    return false
  }
}

export function getFarcasterProvider(): any | null {
  if (typeof window === 'undefined') return null
  const w = window as any
  if (w.farcaster?.ethereum) return w.farcaster.ethereum
  if (w.ethereum) return w.ethereum
  return null
}

export async function getFarcasterAddress(): Promise<string | null> {
  try {
    const provider = getFarcasterProvider()
    if (!provider || typeof provider.request !== 'function') return null
    const accounts: string[] = await provider.request({ method: 'eth_accounts' })
    if (accounts && accounts[0]) return accounts[0]
    const req: string[] = await provider.request({ method: 'eth_requestAccounts' })
    return req && req[0] ? req[0] : null
  } catch (_) {
    return null
  }
}