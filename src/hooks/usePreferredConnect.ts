'use client'

import { useEffect, useMemo } from 'react'
import { useAccount, useConnect } from 'wagmi'

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
        if (!isConnected && isFarcasterAvailable() && injected) {
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
  }, [isConnected, injected, connectAsync, connectStatus])
}