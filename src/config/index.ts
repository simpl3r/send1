import { createConfig, http } from 'wagmi'
import { celo, celoAlfajores } from 'viem/chains'

const useAlfajores = process.env.NEXT_PUBLIC_NETWORK === 'celo-alfajores'
export const defaultNetwork = useAlfajores ? celoAlfajores : celo

export const config = createConfig({
  chains: [defaultNetwork],
  ssr: true,
  transports: {
    [defaultNetwork.id]: http()
  }
})