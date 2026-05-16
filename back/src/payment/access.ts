import { db, now } from '../db/client'
import { FLAGS, PAYMENT_CONFIG } from '../lib/flags'

export interface AccessResult {
  allowed: boolean
  reason: 'flag-off' | 'free-tier' | 'paid' | 'paywall' | 'no-identity'
  freeUsesLeft: number
  paidUntilMs: number | null
  paidCommissionIds: string[]
  pricePerCommissionWei: string
  identityKind: 'email' | 'wallet' | 'none'
}

interface WalletAccessRow {
  wallet_lower: string
  free_uses_consumed: number
  paid_until: number | null
  paid_commission_ids: string
  last_payment_tx: string | null
  updated_at: number
}

interface EmailAccessRow {
  user_email: string
  uses_consumed: number
  updated_at: number
}

function getWalletRow(walletLower: string): WalletAccessRow | null {
  return db
    .query<WalletAccessRow, [string]>(`SELECT * FROM wallet_access WHERE wallet_lower = ?`)
    .get(walletLower)
}

function ensureWalletRow(walletLower: string): WalletAccessRow {
  const existing = getWalletRow(walletLower)
  if (existing) return existing
  db.query(
    `INSERT INTO wallet_access (wallet_lower, free_uses_consumed, paid_until, paid_commission_ids, updated_at)
     VALUES (?, 0, NULL, '[]', ?)`,
  ).run(walletLower, now())
  return getWalletRow(walletLower)!
}

function getEmailRow(email: string): EmailAccessRow | null {
  return db
    .query<EmailAccessRow, [string]>(`SELECT * FROM user_free_uses WHERE user_email = ?`)
    .get(email)
}

function ensureEmailRow(email: string): EmailAccessRow {
  const existing = getEmailRow(email)
  if (existing) return existing
  db.query(
    `INSERT INTO user_free_uses (user_email, uses_consumed, updated_at)
     VALUES (?, 0, ?)`,
  ).run(email, now())
  return getEmailRow(email)!
}

export function describeAccess(
  wallet: string | null,
  email: string | null,
  commissionId?: string,
): AccessResult {
  const normalizedEmail = email?.trim().toLowerCase() || null
  const normalizedWallet = wallet?.trim().toLowerCase() || null

  if (!FLAGS.PAYMENT_ENABLED) {
    return {
      allowed: true,
      reason: 'flag-off',
      freeUsesLeft: PAYMENT_CONFIG.freeRunsPerWallet,
      paidUntilMs: null,
      paidCommissionIds: [],
      pricePerCommissionWei: PAYMENT_CONFIG.pricePerCommissionWei,
      identityKind: normalizedEmail ? 'email' : normalizedWallet ? 'wallet' : 'none',
    }
  }

  if (!normalizedEmail && !normalizedWallet) {
    return {
      allowed: false,
      reason: 'no-identity',
      freeUsesLeft: 0,
      paidUntilMs: null,
      paidCommissionIds: [],
      pricePerCommissionWei: PAYMENT_CONFIG.pricePerCommissionWei,
      identityKind: 'none',
    }
  }

  let paidIds: string[] = []
  let paidUntil: number | null = null
  let paidUntilOk = false
  if (normalizedWallet) {
    const walletRow = ensureWalletRow(normalizedWallet)
    paidIds = JSON.parse(walletRow.paid_commission_ids) as string[]
    paidUntil = walletRow.paid_until
    paidUntilOk = paidUntil !== null && paidUntil > Date.now()
  }
  if (paidUntilOk || (commissionId && paidIds.includes(commissionId))) {
    return {
      allowed: true,
      reason: 'paid',
      freeUsesLeft: getFreeUsesLeft(normalizedEmail, normalizedWallet),
      paidUntilMs: paidUntil,
      paidCommissionIds: paidIds,
      pricePerCommissionWei: PAYMENT_CONFIG.pricePerCommissionWei,
      identityKind: normalizedEmail ? 'email' : 'wallet',
    }
  }

  const freeUsesLeft = getFreeUsesLeft(normalizedEmail, normalizedWallet)
  if (freeUsesLeft > 0) {
    return {
      allowed: true,
      reason: 'free-tier',
      freeUsesLeft,
      paidUntilMs: null,
      paidCommissionIds: paidIds,
      pricePerCommissionWei: PAYMENT_CONFIG.pricePerCommissionWei,
      identityKind: normalizedEmail ? 'email' : 'wallet',
    }
  }
  return {
    allowed: false,
    reason: 'paywall',
    freeUsesLeft: 0,
    paidUntilMs: null,
    paidCommissionIds: paidIds,
    pricePerCommissionWei: PAYMENT_CONFIG.pricePerCommissionWei,
    identityKind: normalizedEmail ? 'email' : 'wallet',
  }
}

function getFreeUsesLeft(email: string | null, wallet: string | null): number {
  let consumed = 0
  if (email) {
    consumed = ensureEmailRow(email).uses_consumed
  } else if (wallet) {
    consumed = ensureWalletRow(wallet).free_uses_consumed
  }
  return Math.max(0, PAYMENT_CONFIG.freeRunsPerWallet - consumed)
}

export function consumeFreeUse(wallet: string | null, email: string | null): void {
  if (!FLAGS.PAYMENT_ENABLED) return
  const normalizedEmail = email?.trim().toLowerCase() || null
  const normalizedWallet = wallet?.trim().toLowerCase() || null

  if (normalizedEmail) {
    const row = ensureEmailRow(normalizedEmail)
    db.query(
      `UPDATE user_free_uses SET uses_consumed = ?, updated_at = ? WHERE user_email = ?`,
    ).run(row.uses_consumed + 1, now(), normalizedEmail)
    return
  }
  if (normalizedWallet) {
    const row = ensureWalletRow(normalizedWallet)
    db.query(
      `UPDATE wallet_access SET free_uses_consumed = ?, updated_at = ? WHERE wallet_lower = ?`,
    ).run(row.free_uses_consumed + 1, now(), normalizedWallet)
  }
}

const PAID_WINDOW_MS = 24 * 60 * 60 * 1000

export function recordPayment(wallet: string, commissionId: string, txHash: string): void {
  const row = ensureWalletRow(wallet.toLowerCase())
  const ids = new Set(JSON.parse(row.paid_commission_ids) as string[])
  ids.add(commissionId)
  const paidUntil = Date.now() + PAID_WINDOW_MS
  db.query(
    `UPDATE wallet_access SET paid_commission_ids = ?, paid_until = ?, last_payment_tx = ?, updated_at = ? WHERE wallet_lower = ?`,
  ).run(JSON.stringify(Array.from(ids)), paidUntil, txHash, now(), wallet.toLowerCase())
}
