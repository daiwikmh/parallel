import { db, now } from '../db/client'
import { FLAGS, PAYMENT_CONFIG } from '../lib/flags'

export interface AccessResult {
  allowed: boolean
  reason: 'flag-off' | 'free-tier' | 'paid' | 'paywall' | 'no-wallet'
  freeUsesLeft: number
  paidUntilMs: number | null
  paidCommissionIds: string[]
  pricePerCommissionWei: string
}

interface WalletAccessRow {
  wallet_lower: string
  free_uses_consumed: number
  paid_until: number | null
  paid_commission_ids: string
  last_payment_tx: string | null
  updated_at: number
}

function getRow(walletLower: string): WalletAccessRow | null {
  return db
    .query<WalletAccessRow, [string]>(`SELECT * FROM wallet_access WHERE wallet_lower = ?`)
    .get(walletLower)
}

function ensureRow(walletLower: string): WalletAccessRow {
  const existing = getRow(walletLower)
  if (existing) return existing
  db.query(
    `INSERT INTO wallet_access (wallet_lower, free_uses_consumed, paid_until, paid_commission_ids, updated_at)
     VALUES (?, 0, NULL, '[]', ?)`,
  ).run(walletLower, now())
  return getRow(walletLower)!
}

export function describeAccess(wallet: string | null, commissionId?: string): AccessResult {
  if (!FLAGS.PAYMENT_ENABLED) {
    return {
      allowed: true,
      reason: 'flag-off',
      freeUsesLeft: PAYMENT_CONFIG.freeRunsPerWallet,
      paidUntilMs: null,
      paidCommissionIds: [],
      pricePerCommissionWei: PAYMENT_CONFIG.pricePerCommissionWei,
    }
  }

  if (!wallet) {
    return {
      allowed: false,
      reason: 'no-wallet',
      freeUsesLeft: 0,
      paidUntilMs: null,
      paidCommissionIds: [],
      pricePerCommissionWei: PAYMENT_CONFIG.pricePerCommissionWei,
    }
  }

  const row = ensureRow(wallet.toLowerCase())
  const paidIds = JSON.parse(row.paid_commission_ids) as string[]
  const paidUntilOk = row.paid_until !== null && row.paid_until > Date.now()
  if (commissionId && (paidIds.includes(commissionId) || paidUntilOk)) {
    return {
      allowed: true,
      reason: 'paid',
      freeUsesLeft: Math.max(0, PAYMENT_CONFIG.freeRunsPerWallet - row.free_uses_consumed),
      paidUntilMs: row.paid_until,
      paidCommissionIds: paidIds,
      pricePerCommissionWei: PAYMENT_CONFIG.pricePerCommissionWei,
    }
  }
  const freeUsesLeft = Math.max(0, PAYMENT_CONFIG.freeRunsPerWallet - row.free_uses_consumed)
  if (freeUsesLeft > 0) {
    return {
      allowed: true,
      reason: 'free-tier',
      freeUsesLeft,
      paidUntilMs: row.paid_until,
      paidCommissionIds: paidIds,
      pricePerCommissionWei: PAYMENT_CONFIG.pricePerCommissionWei,
    }
  }
  return {
    allowed: false,
    reason: 'paywall',
    freeUsesLeft: 0,
    paidUntilMs: row.paid_until,
    paidCommissionIds: paidIds,
    pricePerCommissionWei: PAYMENT_CONFIG.pricePerCommissionWei,
  }
}

export function consumeFreeUse(wallet: string): void {
  if (!FLAGS.PAYMENT_ENABLED) return
  const row = ensureRow(wallet.toLowerCase())
  db.query(`UPDATE wallet_access SET free_uses_consumed = ?, updated_at = ? WHERE wallet_lower = ?`).run(
    row.free_uses_consumed + 1,
    now(),
    wallet.toLowerCase(),
  )
}

export function recordPayment(wallet: string, commissionId: string, txHash: string): void {
  const row = ensureRow(wallet.toLowerCase())
  const ids = new Set(JSON.parse(row.paid_commission_ids) as string[])
  ids.add(commissionId)
  db.query(
    `UPDATE wallet_access SET paid_commission_ids = ?, last_payment_tx = ?, updated_at = ? WHERE wallet_lower = ?`,
  ).run(JSON.stringify(Array.from(ids)), txHash, now(), wallet.toLowerCase())
}
