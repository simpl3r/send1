'use client'

import React from 'react'
import { AppKitButton, AppKitNetworkButton, AppKitAccountButton } from '@reown/appkit/react'
import { useAppKitAccount } from '@reown/appkit/react'
import { useBalance } from 'wagmi'
import SendForm from './components/SendForm'
import { usePreferredConnect } from '@/hooks/usePreferredConnect'

export default function Home() {
  const { address, isConnected } = useAppKitAccount()
  const { data: balance } = useBalance({ address: address as `0x${string}`, query: { enabled: Boolean(address) } })
  usePreferredConnect()

  return (
    <main>
      <div className="container">
        <h1>CELO Sender</h1>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <AppKitButton />
          <AppKitNetworkButton />
          {isConnected && <AppKitAccountButton />}
        </div>

        <div id="walletInfo">
          <div className="balance-display">
            <div className="farcaster-profile" id="farcasterProfile">
              <img className="profile-avatar" id="profileAvatar" src="" alt="Profile" style={{ display: 'none' }} />
              <div className="profile-info">
                <div className="profile-name" id="profileName">{isConnected ? 'Connected' : 'Not connected'}</div>
                <div className="profile-username" id="profileUsername">{address ? address : ''}</div>
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