export interface ChainInfo {
  id: `0x${string}`;
  decimalId: number;
  name: string;
  shortName: string;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  isDefault?: boolean;
}

export const OG_GALILEO: ChainInfo = {
  id: "0x40da",
  decimalId: 16602,
  name: "0G Galileo Testnet",
  shortName: "0G",
  rpcUrl: "https://evmrpc-testnet.0g.ai",
  explorerUrl: "https://explorer.0g.ai/testnet",
  nativeCurrency: { name: "0G", symbol: "OG", decimals: 18 },
  isDefault: true,
};

export const ETH_SEPOLIA: ChainInfo = {
  id: "0xaa36a7",
  decimalId: 11155111,
  name: "Ethereum Sepolia",
  shortName: "ETH",
  rpcUrl: "",
  explorerUrl: "https://sepolia.etherscan.io",
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
};

export const CHAINS: Record<string, ChainInfo> = {
  [OG_GALILEO.id]: OG_GALILEO,
  [ETH_SEPOLIA.id]: ETH_SEPOLIA,
};

export function getChain(id: string | null | undefined): ChainInfo | null {
  if (!id) return null;
  const lower = id.toLowerCase();
  for (const [key, info] of Object.entries(CHAINS)) {
    if (key.toLowerCase() === lower) return info;
  }
  return null;
}

export function getChainName(id: string | null | undefined): string {
  return getChain(id)?.name ?? (id ?? "unknown");
}

export function getExplorerTxUrl(chainId: string, txHash: string): string | undefined {
  const c = getChain(chainId);
  return c ? `${c.explorerUrl}/tx/${txHash}` : undefined;
}

export function getExplorerAddrUrl(chainId: string, addr: string): string | undefined {
  const c = getChain(chainId);
  return c ? `${c.explorerUrl}/address/${addr}` : undefined;
}

export const SWITCH_CHAINS = Object.values(CHAINS).map((c) => ({
  id: c.id,
  name: c.name,
  symbol: c.nativeCurrency.symbol,
}));
