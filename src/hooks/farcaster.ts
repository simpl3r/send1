'use client'

const CELO_NETWORK = {
  chainId: '0xa4ec',
  chainName: 'Celo Mainnet',
  nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
  rpcUrls: ['https://forno.celo.org'],
  blockExplorerUrls: ['https://explorer.celo.org']
} as const

async function loadFarcasterSdk(): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    const w = window as any
    // Inject a module script that loads the SDK from CDN and wires provider
    if (!w.__farcasterSdkInjected) {
      const script = document.createElement('script')
      script.type = 'module'
      script.textContent = `
        import { sdk } from 'https://esm.sh/@farcaster/miniapp-sdk';
        (async () => {
          try { await sdk.actions.ready({ disableNativeGestures: true }); } catch (e) {}
          try { await sdk.actions.addMiniApp(); } catch (e) {}
          try {
            const provider = await sdk.wallet.getEthereumProvider();
            window.farcaster = window.farcaster || {};
            window.farcaster.sdk = sdk;
            if (provider) {
              window.farcaster.ethereum = provider;
              if (!window.ethereum) window.ethereum = provider;
            }
          } catch (e) {}
          window.__farcasterSdkReady = true;
        })();
      `
      document.head.appendChild(script)
      w.__farcasterSdkInjected = true
    }
  } catch (_) {}
}

async function switchToCeloNetwork(provider: any): Promise<void> {
  if (!provider || typeof provider.request !== 'function') return
  try {
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: CELO_NETWORK.chainId }] })
  } catch (switchError: any) {
    if (switchError?.code === 4902) {
      try {
        await provider.request({ method: 'wallet_addEthereumChain', params: [CELO_NETWORK] })
      } catch (_) {}
    }
  }
}

export async function tryFarcasterConnect(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  const w = window as any
  let fc = w.farcaster
  try {
    // Ensure SDK and provider loaded per docs
    if (!fc?.ethereum) {
      await loadFarcasterSdk()
      fc = (window as any).farcaster
    }
    // Farcaster Miniapp SDK may expose connect() or an ethereum-like provider
    if (fc && typeof fc.connect === 'function') {
      await fc.connect()
      return true
    }
    if (fc && fc.ethereum && typeof fc.ethereum.request === 'function') {
      await fc.ethereum.request({ method: 'eth_requestAccounts' })
      await switchToCeloNetwork(fc.ethereum)
      return true
    }
    // Fallback: use injected ethereum if available
    if (w.ethereum && typeof w.ethereum.request === 'function') {
      await w.ethereum.request({ method: 'eth_requestAccounts' })
      await switchToCeloNetwork(w.ethereum)
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
    if (!w.ethereum) {
      // Try load SDK and map provider
      void loadFarcasterSdk()
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
    const provider = getFarcasterProvider() || (await (async () => { await loadFarcasterSdk(); return getFarcasterProvider() })())
    if (!provider || typeof provider.request !== 'function') return null
    const accounts: string[] = await provider.request({ method: 'eth_accounts' })
    if (accounts && accounts[0]) return accounts[0]
    const req: string[] = await provider.request({ method: 'eth_requestAccounts' })
    await switchToCeloNetwork(provider)
    return req && req[0] ? req[0] : null
  } catch (_) {
    return null
  }
}