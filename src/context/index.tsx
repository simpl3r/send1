'use client'

import React, { type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createAppKit } from '@reown/appkit/react'
import { WagmiProvider, type Config, type State } from 'wagmi'
import { wagmiAdapter, projectId, networks, defaultNetwork } from '@/config'

const queryClient = new QueryClient()

const metadata = {
  name: 'CELO Sender',
  description: 'Send CELO tokens miniapp',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  icons: [
    process.env.NEXT_PUBLIC_APP_ICON_URL ||
      'https://avatars.githubusercontent.com/u/179229932'
  ]
}

if (!projectId) {
  throw new Error('Project ID is not defined')
}

createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks,
  defaultNetwork,
  metadata,
  features: {
    analytics: true
  }
})

export default function ContextProvider({
  children,
  initialState
}: {
  children: ReactNode
  initialState?: State
}) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}