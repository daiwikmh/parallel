import { createPublicClient, http, defineChain, type Address, type Log } from 'viem'
import { FLAGS, PAYMENT_CONFIG } from '../lib/flags'
import { recordPayment } from '../payment/access'
import paymentAbi from './payment-abi.json' with { type: 'json' }

export const galileoTestnet = defineChain({
  id: 16601,
  name: '0G Galileo Testnet',
  nativeCurrency: { name: '0G', symbol: 'OG', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://evmrpc-testnet.0g.ai'] },
  },
  blockExplorers: {
    default: { name: 'Chainscan', url: 'https://chainscan-galileo.0g.ai' },
  },
})

let unwatch: (() => void) | null = null

export interface ChainEventLog {
  txHash: string
  user: string
  commissionId: string
  amountWei: string
  blockNumber?: number
}

interface PaidEventArgs {
  user?: Address
  commissionIdHash?: `0x${string}`
  commissionId?: string
  amount?: bigint
  paidAt?: bigint
}

export function startPaymentEventListener(): void {
  if (unwatch) return
  if (!FLAGS.OG_CHAIN_ENABLED) {
    console.log('[chain] OG_CHAIN_ENABLED=false; payment listener not started')
    return
  }
  if (!PAYMENT_CONFIG.contractAddress) {
    console.warn('[chain] OG_PAYMENT_CONTRACT not set; cannot watch payments')
    return
  }
  const rpcUrl = process.env.OG_CHAIN_RPC ?? galileoTestnet.rpcUrls.default.http[0]
  const client = createPublicClient({
    chain: galileoTestnet,
    transport: http(rpcUrl),
  })
  console.log(`[chain] watching ${PAYMENT_CONFIG.contractAddress} for Paid events on ${rpcUrl}`)
  try {
    unwatch = client.watchContractEvent({
      address: PAYMENT_CONFIG.contractAddress as Address,
      abi: paymentAbi as unknown as readonly unknown[],
      eventName: 'Paid',
      pollingInterval: 4_000,
      onLogs: (logs: Log[]) => {
        for (const log of logs) {
          // viem decodes args based on the abi event definition
          const decoded = log as unknown as { args: PaidEventArgs; transactionHash: `0x${string}`; blockNumber: bigint }
          const args = decoded.args
          if (!args?.user || !args?.commissionId || args.amount === undefined) {
            console.warn('[chain] received malformed Paid event; skipping')
            continue
          }
          const txHash = decoded.transactionHash
          ingestPaymentEvent({
            txHash,
            user: args.user,
            commissionId: args.commissionId,
            amountWei: args.amount.toString(),
            blockNumber: Number(decoded.blockNumber),
          })
        }
      },
      onError: (err) => {
        console.error('[chain] watch error:', err.message)
      },
    })
  } catch (e) {
    console.error('[chain] failed to start listener:', (e as Error).message)
  }
}

export function ingestPaymentEvent(ev: ChainEventLog): void {
  if (!ev.commissionId) {
    console.log('[chain] payment with empty commission id (tip), tx', ev.txHash)
    return
  }
  recordPayment(ev.user, ev.commissionId, ev.txHash)
  console.log('[chain] payment recorded', {
    user: ev.user,
    commission: ev.commissionId,
    amount: ev.amountWei,
    tx: ev.txHash,
    block: ev.blockNumber,
  })
}

export function stopPaymentEventListener(): void {
  if (unwatch) {
    unwatch()
    unwatch = null
  }
}

export function isListening(): boolean {
  return unwatch !== null
}
