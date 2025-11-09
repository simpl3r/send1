import { createConfig, http } from 'wagmi'
import { celo, celoAlfajores } from 'viem/chains'

const useAlfajores = process.env.NEXT_PUBLIC_NETWORK === 'celo-alfajores'
export const defaultNetwork = useAlfajores ? celoAlfajores : celo

export const config = useAlfajores
  ? createConfig({
      chains: [celoAlfajores],
      ssr: true,
      transports: {
        [celoAlfajores.id]: http()
      }
    })
  : createConfig({
      chains: [celo],
      ssr: true,
      transports: {
        [celo.id]: http()
      }
    })