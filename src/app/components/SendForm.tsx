'use client'

import React, { useMemo, useRef, useState } from 'react'
import { useAppKitAccount } from '@reown/appkit/react'
import { usePublicClient, useWalletClient } from 'wagmi'
import { connect } from '@wagmi/core'
import { wagmiAdapter } from '@/config'
import { parseUnits, formatEther } from 'viem'
import { celo } from '@reown/appkit/networks'
import { getReferralTag, submitReferral } from '@divvi/referral-sdk'
import { tryFarcasterConnect } from '@/hooks/farcaster'

const CELO_CONTRACT_ADDRESS = '0xAc8f5e96f45600a9a67b33C5F6f060FFf48353d6' as const
const TRANSFER_FUNCTION_SELECTOR = '0x3f4dbf04' as const
const DIVVI_CONSUMER_ADDRESS = '0xA2c408956988672D64562A23bb0eD1d247a03B98' as const

export default function SendForm() {
  const { address, isConnected } = useAppKitAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('0.001')
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [sending, setSending] = useState(false)

  const amountFloat = useMemo(() => {
    const n = Number(amount)
    return Number.isFinite(n) ? n : 0
  }, [amount])

  function showStatus(message: string, type: 'success' | 'error' | 'info' = 'info') {
    setStatus({ type, message })
  }

  async function estimateFees(valueWei: bigint, data: `0x${string}`) {
    try {
      const gas = await publicClient!.estimateGas({
        account: address as `0x${string}`,
        to: CELO_CONTRACT_ADDRESS,
        data,
        value: valueWei
      })
      const gasPrice = await publicClient!.getGasPrice()
      const gasCostWei = gas * gasPrice
      return { gas, gasPrice, gasCostWei, gasCostCelo: Number(formatEther(gasCostWei)) }
    } catch (err) {
      // conservative fallback
      const gas = 200000n
      const gasPrice = 1_000_000_000n // 1 gwei
      const gasCostWei = gas * gasPrice
      return { gas, gasPrice, gasCostWei, gasCostCelo: Number(formatEther(gasCostWei)) }
    }
  }

  async function onSend() {
    try {
      if (!isConnected || !address || !walletClient) {
        // 1) Пытаемся Farcaster SDK
        await tryFarcasterConnect()
        // 2) Фолбэк: injected через wagmi
        try {
          const connectors = (wagmiAdapter as any)?.wagmiConfig?.connectors || []
          const injected = connectors.find((c: any) => c?.id === 'injected')
          if (injected) {
            await connect(wagmiAdapter.wagmiConfig as any, { connector: injected })
          }
        } catch (_) {}
        if (!isConnected || !address || !walletClient) {
          showStatus('Подключите кошелек для отправки', 'error')
          return
        }
      }

      const to = recipient.trim()
      const amt = amount.trim()
      if (!to || !amt) {
        showStatus('Заполните все поля', 'error')
        return
      }
      if (!to.startsWith('0x') || to.length !== 42) {
        showStatus('Некорректный формат адреса получателя', 'error')
        return
      }
      if (amountFloat <= 0) {
        showStatus('Сумма должна быть больше нуля', 'error')
        return
      }

      setSending(true)
      showStatus('Проверяю баланс и комиссии...', 'info')

      const valueWei = parseUnits(amt, 18)
      const padded = to.slice(2).padStart(64, '0')
      let data: `0x${string}` = `${TRANSFER_FUNCTION_SELECTOR}${padded}` as `0x${string}`

      try {
        const referralTag = getReferralTag({ user: address as `0x${string}`, consumer: DIVVI_CONSUMER_ADDRESS })
        data = (data + referralTag) as `0x${string}`
      } catch (_) {
        // продолжаем без referral тега
      }

      const { gasCostCelo } = await estimateFees(valueWei, data)

      // Проверка баланса (упрощённо через публичный клиент)
      const balanceWei = await publicClient!.getBalance({ address: address as `0x${string}` })
      const balanceCelo = Number(formatEther(balanceWei))
      const totalRequired = amountFloat + gasCostCelo
      if (balanceCelo < totalRequired) {
        const shortfall = (totalRequired - balanceCelo).toFixed(6)
        showStatus(`Insufficient funds. Need ${totalRequired.toFixed(6)} CELO (${amt} + ${gasCostCelo.toFixed(6)} fee). Shortfall: ${shortfall} CELO`, 'error')
        setSending(false)
        return
      }

      showStatus('Preparing transaction...', 'info')

      const hash = await walletClient.sendTransaction({
        account: address as `0x${string}`,
        chain: celo,
        to: CELO_CONTRACT_ADDRESS,
        data,
        value: valueWei
      })

      const explorerUrl = `https://celoscan.io/tx/${hash}`
      const shortHash = `${hash.slice(0, 8)}...${hash.slice(-6)}`
      showStatus(`Transaction sent! ${shortHash} (${explorerUrl})`, 'success')

      try {
        await submitReferral({ txHash: hash, chainId: 42220 })
      } catch (_) {}
    } catch (error) {
      console.error(error)
      showStatus('Error sending transaction', 'error')
    } finally {
      setSending(false)
    }
  }

  function onFillMyAddress() {
    if (address) setRecipient(address)
  }

  function onIncrease() {
    const current = Number(amount) || 0
    const next = (current + 0.001).toFixed(3)
    setAmount(next)
  }

  function onDecrease() {
    const current = Number(amount) || 0
    const next = Math.max(0.001, current - 0.001).toFixed(3)
    setAmount(next)
  }

  // Slider state and handlers (Slide to Send)
  const [sliderProgress, setSliderProgress] = useState(0)
  const sliderProgressRef = useRef(0)
  const [dragging, setDragging] = useState(false)
  const sliderRef = useRef<HTMLDivElement | null>(null)
  const sliderWidthRef = useRef(0)

  function onSliderPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!sliderRef.current) return
    setDragging(true)
    const rect = sliderRef.current.getBoundingClientRect()
    sliderWidthRef.current = rect.width
    const update = (clientX: number) => {
      const x = Math.min(Math.max(clientX - rect.left, 0), rect.width)
      const p = x / rect.width
      sliderProgressRef.current = p
      setSliderProgress(p)
    }
    update(e.clientX)
    const onMove = (ev: PointerEvent) => update(ev.clientX)
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      setDragging(false)
      const threshold = 0.85
      const current = sliderProgressRef.current
      if (current >= threshold && !sending) {
        onSend()
      }
      setTimeout(() => setSliderProgress(0), 250)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <div id="transferForm">
      <div className="form-group">
        <label htmlFor="usernameSearch">Search by Username</label>
        <div className="autocomplete-container">
          <div className="search-input-wrapper">
            <div id="selectedUsers" className="selected-users-inline" />
            <input id="usernameSearch" placeholder="Search Farcaster users..." autoComplete="off" />
          </div>
          <div id="autocompleteDropdown" className="autocomplete-dropdown" style={{ display: 'none' }} />
          <div className="search-loading" id="searchLoading" style={{ display: 'none' }}>Searching...</div>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="recipient">Recipient Address</label>
        <input id="recipient" value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="0x..." />
      </div>

      <div className="form-group">
        <label htmlFor="amount">CELO Amount</label>
        <div className="amount-controls">
          <input id="amount" type="number" min={0.001} step={0.001} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.001" />
          <div className="amount-btn-container">
            <button type="button" className="amount-btn" onClick={onIncrease}>↑</button>
            <button type="button" className="amount-btn" onClick={onDecrease}>↓</button>
          </div>
        </div>
      </div>

      <div className="button-group">
        <button className="send-to-myself-btn" type="button" onClick={onFillMyAddress}>Choose yourself</button>
        <div className="transfer-row">
          <div className={`slider-button${dragging ? ' dragging' : ''}`} ref={sliderRef} onPointerDown={onSliderPointerDown}>
            <div className="slider-track" />
            <div className="slider-progress" style={{ width: `${Math.round(sliderProgress * 100)}%` }} />
            <div className="slider-thumb" style={{ left: `${8 + Math.round(sliderProgress * Math.max(0, sliderWidthRef.current - 40))}px` }}>
              <span className="arrow-symbol">→</span>
            </div>
            <div className="slider-text">Slide to Send CELO</div>
          </div>
        </div>
        <button className="share-button" type="button" onClick={() => {
          const url = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
          if (navigator.share) {
            navigator.share({ title: 'CELO Sender', text: 'Send CELO easily', url }).catch(() => {})
          } else {
            navigator.clipboard?.writeText(url)
            showStatus('Link copied to clipboard', 'info')
          }
        }}>Share app with friends</button>
      </div>

      {status && (
        <div id="status" className={`status ${status.type === 'success' ? 'success' : status.type === 'error' ? 'error' : ''}`}>{status.message}</div>
      )}
    </div>
  )
}