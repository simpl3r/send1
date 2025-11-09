'use client'

import React from 'react'
import { useBalance } from 'wagmi'
import SendForm from './components/SendForm'
import { usePreferredConnect } from '@/hooks/usePreferredConnect'
import { getFarcasterAddress } from '@/hooks/farcaster'

export default function Home() {
  const [address, setAddress] = React.useState<`0x${string}` | null>(null)
  const { data: balance } = useBalance({ address: address ?? undefined, query: { enabled: Boolean(address) } })
  usePreferredConnect()

  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      const addr = await getFarcasterAddress()
      if (mounted && addr) setAddress(addr as `0x${string}`)
    })()
    return () => { mounted = false }
  }, [])

  return (
    <main>
      <div className="container">
        <h1>CELO Sender</h1>

        {/* Кнопки AppKit отключены. Оставляем только Farcaster-интеграцию. */}

        <div id="walletInfo">
          <div className="balance-display">
            <div className="farcaster-profile" id="farcasterProfile">
              <img className="profile-avatar" id="profileAvatar" src="" alt="Profile" style={{ display: 'none' }} />
              <div className="profile-info">
                <div className="profile-name" id="profileName">{address ? 'Connected (Farcaster)' : 'Not connected'}</div>
                <div className="profile-username" id="profileUsername">{address ?? ''}</div>
              </div>
            </div>
            <div className="balance-info">
              <div className="balance-label">Balance</div>
              <div className="balance-amount" id="balanceAmount">{balance ? `${Number(balance.formatted).toFixed(4)} ${balance.symbol}` : '-'}</div>
            </div>
          </div>
        </div>

        <SendForm />
      </div>
    </main>
  )
}