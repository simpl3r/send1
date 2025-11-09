'use client'

import { useEffect } from 'react'
import { tryFarcasterConnect, ensureInjectedFromFarcaster } from './farcaster'

function isFarcasterAvailable() {
  if (typeof window === 'undefined') return false
  // Basic heuristics: Farcaster miniapp may expose window.farcaster; also attempt injected ethereum
  const hasFarcasterObject = typeof (window as any).farcaster !== 'undefined'
  const hasInjected = typeof (window as any).ethereum !== 'undefined'
  return hasFarcasterObject || hasInjected
}

export function usePreferredConnect() {
  useEffect(() => {
    async function initFarcasterOnly() {
      try {
        if (isFarcasterAvailable()) {
          await tryFarcasterConnect()
        }
        ensureInjectedFromFarcaster()
      } catch (_) {}
    }
    void initFarcasterOnly()
    // brief retries to allow delayed provider injection
    let attempts = 0
    const timer = setInterval(() => {
      attempts += 1
      const has = ensureInjectedFromFarcaster()
      if (has || attempts > 6) {
        clearInterval(timer)
      }
    }, 500)
    return () => clearInterval(timer)
  }, [])
}