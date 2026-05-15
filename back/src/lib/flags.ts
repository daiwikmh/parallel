function boolFlag(name: string, defaultValue = false): boolean {
  const v = process.env[name]
  if (v === undefined) return defaultValue
  const lower = v.toLowerCase().trim()
  return lower === 'true' || lower === '1' || lower === 'yes' || lower === 'on'
}

export const FLAGS = {
  PAYMENT_ENABLED: boolFlag('PAYMENT_ENABLED'),
  OG_STORAGE_ENABLED: boolFlag('OG_STORAGE_ENABLED'),
  OG_CHAIN_ENABLED: boolFlag('OG_CHAIN_ENABLED'),
}

export const PAYMENT_CONFIG = {
  freeRunsPerWallet: Number(process.env.FREE_RUNS_PER_WALLET ?? '2'),
  pricePerCommissionWei: process.env.PRICE_PER_COMMISSION_WEI ?? '10000000000000000',
  contractAddress: process.env.OG_PAYMENT_CONTRACT ?? '',
}

export const STORAGE_CONFIG = {
  endpoint: process.env.OG_STORAGE_ENDPOINT ?? '',
  privateKey: process.env.OG_STORAGE_PRIVATE_KEY ?? '',
}

export function dumpFlags(): void {
  console.log('[flags]', JSON.stringify({ ...FLAGS, freeRunsPerWallet: PAYMENT_CONFIG.freeRunsPerWallet }))
}
