import { CHAINS, getChain, type ChainInfo } from "./chains";

export interface Result {
  label: string;
  value: string;
  url?: string;
}

export function textToHex(s: string): string {
  let h = "0x";
  for (let i = 0; i < s.length; i++) h += s.charCodeAt(i).toString(16).padStart(2, "0");
  return h;
}

export function ethToHexWei(eth: string): string {
  const trimmed = (eth ?? "").trim();
  if (!trimmed) return "0x0";
  const [whole, frac = ""] = trimmed.split(".");
  const padded = (frac + "0".repeat(18)).slice(0, 18);
  const wei = BigInt(whole || "0") * 10n ** 18n + BigInt(padded || "0");
  return "0x" + wei.toString(16);
}

export function weiToEth(wei: string): string {
  if (!wei || wei === "0x0") return "0";
  const v = BigInt(wei);
  const whole = v / 10n ** 18n;
  const frac = (v % 10n ** 18n).toString().padStart(18, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac.slice(0, 6)}` : whole.toString();
}

export function shortAddr(addr: string | null | undefined): string {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function handleError(err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  console.error("[wallet]", msg);
}

export function buildChainConfig(targetChainId: string, infuraApiKey?: string) {
  const info: ChainInfo | null = getChain(targetChainId);
  if (!info) return null;
  let rpc = info.rpcUrl;
  if (!rpc && infuraApiKey) {
    if (info.id === "0xaa36a7") rpc = `https://sepolia.infura.io/v3/${infuraApiKey}`;
  }
  if (!rpc) return null;
  return {
    chainId: info.id.toLowerCase(),
    chainName: info.name,
    nativeCurrency: info.nativeCurrency,
    rpcUrls: [rpc],
    blockExplorerUrls: [info.explorerUrl],
  };
}

export function defaultSupportedNetworks(infuraApiKey?: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [id, info] of Object.entries(CHAINS)) {
    if (info.rpcUrl) out[id] = info.rpcUrl;
  }
  if (infuraApiKey) {
    out["0xaa36a7"] = `https://sepolia.infura.io/v3/${infuraApiKey}`;
  }
  return out;
}
