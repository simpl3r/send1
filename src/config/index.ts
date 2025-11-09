import { cookieStorage, createStorage } from '@wagmi/core'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { celo, celoAlfajores } from '@reown/appkit/networks'
// Cast to non-empty tuple expected by AppKit; using any to satisfy type contract in runtime

export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID

if (!projectId) {
  throw new Error('NEXT_PUBLIC_PROJECT_ID is not defined')
}

const useAlfajores = process.env.NEXT_PUBLIC_NETWORK === 'celo-alfajores'
export const networks = (useAlfajores
  ? [celoAlfajores]
  : [celo]) as [any, ...any[]]

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage
  }),
  ssr: true,
  projectId,
  networks
})

export const config = wagmiAdapter.wagmiConfig
export const defaultNetwork = networks[0]