import { Router, Request, Response } from 'express'
import { createPublicClient, http, decodeEventLog, type Hex, type Address } from 'viem'
import { galileoTestnet } from '../og/chain'
import { PAYMENT_CONFIG } from '../lib/flags'
import paymentAbi from '../og/payment-abi.json' with { type: 'json' }
import { recordPayment } from '../payment/access'

const router: Router = Router()

router.post('/confirm', async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as { txHash?: string; commissionId?: string; wallet?: string }
  const txHash = (body.txHash ?? '').trim()
  if (!txHash.startsWith('0x') || txHash.length !== 66) {
    res.status(400).json({ error: 'txHash required, 0x-prefixed 32-byte hex' })
    return
  }
  if (!PAYMENT_CONFIG.contractAddress) {
    res.status(500).json({ error: 'backend OG_PAYMENT_CONTRACT not configured' })
    return
  }

  const rpcUrl = process.env.OG_CHAIN_RPC ?? galileoTestnet.rpcUrls.default.http[0]
  const client = createPublicClient({ chain: galileoTestnet, transport: http(rpcUrl) })

  let receipt: Awaited<ReturnType<typeof client.getTransactionReceipt>>
  try {
    receipt = await client.getTransactionReceipt({ hash: txHash as Hex })
  } catch (e) {
    res.status(404).json({ error: `tx not found: ${(e as Error).message}` })
    return
  }
  if (receipt.status !== 'success') {
    res.status(400).json({ error: `tx reverted on-chain (status=${receipt.status})` })
    return
  }
  if (receipt.to?.toLowerCase() !== PAYMENT_CONFIG.contractAddress.toLowerCase()) {
    res.status(400).json({ error: `tx target ${receipt.to} is not the payment contract` })
    return
  }

  let user: Address | null = null
  let commissionId: string | null = null
  let amount: bigint | null = null

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== PAYMENT_CONFIG.contractAddress.toLowerCase()) continue
    try {
      const decoded = decodeEventLog({
        abi: paymentAbi as unknown as readonly unknown[],
        data: log.data,
        topics: log.topics,
      }) as unknown as { eventName?: string; args?: { user?: Address; commissionId?: string; amount?: bigint } }
      if (decoded.eventName !== 'Paid') continue
      user = decoded.args?.user ?? null
      commissionId = decoded.args?.commissionId ?? null
      amount = decoded.args?.amount ?? null
      break
    } catch {
      continue
    }
  }

  if (!user || !commissionId || amount === null) {
    res.status(400).json({ error: 'no Paid event found in this tx' })
    return
  }
  if (body.commissionId && commissionId !== body.commissionId) {
    res.status(400).json({
      error: `commission id mismatch: tx paid for "${commissionId}", request claims "${body.commissionId}"`,
    })
    return
  }
  if (body.wallet && user.toLowerCase() !== body.wallet.toLowerCase()) {
    res.status(400).json({
      error: `wallet mismatch: tx signed by ${user}, request claims ${body.wallet}`,
    })
    return
  }

  recordPayment(user, commissionId, txHash)

  res.json({
    ok: true,
    user,
    commissionId,
    amount: amount.toString(),
    txHash,
    blockNumber: Number(receipt.blockNumber),
  })
})

export default router
