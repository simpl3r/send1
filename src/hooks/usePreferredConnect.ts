'use client'

import { useEffect, useMemo } from 'react'
import { useAccount, useConnect } from 'wagmi'
import { tryFarcasterConnect, ensureInjectedFromFarcaster } from './farcaster'

function isFarcasterAvailable() {
  if (typeof window === 'undefined') return false
  // Basic heuristics: Farcaster miniapp may expose window.farcaster; also attempt injected ethereum
  const hasFarcasterObject = typeof (window as any).farcaster !== 'undefined'
  const hasInjected = typeof (window as any).ethereum !== 'undefined'
  return hasFarcasterObject || hasInjected
}

export function usePreferredConnect() {
  const { connectors, connectAsync, status: connectStatus } = useConnect()
  const { isConnected } = useAccount()

  const injected = useMemo(() => connectors.find((c) => c.id === 'injected'), [connectors])

  useEffect(() => {
    // Try Farcaster/injected first silently; if it fails, user can use AppKit modal
    async function tryInjected() {
      try {
        if (!isConnected && isFarcasterAvailable()) {
          // Trigger Farcaster SDK connect if available
          await tryFarcasterConnect()
        }
        // Map Farcaster provider to window.ethereum so InjectedConnector can see it
        ensureInjectedFromFarcaster()
        if (!isConnected && injected) {
          await connectAsync({ connector: injected })
        }
      } catch (_) {
        // Swallow errors; fallback handled by AppKit UI
      }
    }
    // Avoid spamming connect calls
    if (connectStatus === 'idle') {
      void tryInjected()
    }
    // Poll briefly for delayed Farcaster provider injection
    let attempts = 0
    const timer = setInterval(async () => {
      if (isConnected || attempts > 6) {
        clearInterval(timer)
        return
      }
      attempts += 1
      const has = ensureInjectedFromFarcaster()
      if (has && injected && !isConnected) {
        try {
          await connectAsync({ connector: injected })
          clearInterval(timer)
        } catch (_) {}
      }
    }, 500)
    return () => clearInterval(timer)
  }, [isConnected, injected, connectAsync, connectStatus])
}