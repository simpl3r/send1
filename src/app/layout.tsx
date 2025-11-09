import './globals.css'
import './styles.css'
import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'
import { Inter } from 'next/font/google'
import ContextProvider from '@/context'
import { cookieToInitialState } from 'wagmi'
import { config } from '@/config'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CELO Sender',
  description: 'Send CELO tokens miniapp'
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  const initialState = cookieToInitialState(config, headers().get('cookie'))

  return (
    <html lang="en">
      <body className={inter.className}>
        <ContextProvider initialState={initialState}>{children}</ContextProvider>
      </body>
    </html>
  )
}