"use client";
import { useState } from "react";
import { useWallet } from "../wallet/WalletProvider";
import { payForCommission, PAYMENT_CONTRACT_ADDRESS, DEFAULT_PRICE_OG, OG_GALILEO } from "@/lib/wallet";

interface Props {
  commissionId: string;
  onPaid?: (txHash: string) => void;
}

export function PaywallButton({ commissionId, onPaid }: Props) {
  const { account, chainId, connect, switchChain } = useWallet();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tx, setTx] = useState<string | null>(null);

  const onTargetChain = chainId?.toLowerCase() === OG_GALILEO.id.toLowerCase();

  const handlePay = async () => {
    if (!account) {
      await connect();
      return;
    }
    if (!onTargetChain) {
      await switchChain(OG_GALILEO.id);
      return;
    }
    setBusy(true);
    setError(null);
    setTx(null);
    try {
      const { txHash } = await payForCommission(commissionId, account as `0x${string}`);
      setTx(txHash);
      onPaid?.(txHash);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  let buttonLabel = `▸ pay ${DEFAULT_PRICE_OG} OG to unlock`;
  if (!account) buttonLabel = "▸ connect wallet to pay";
  else if (!onTargetChain) buttonLabel = "▸ switch to 0G to pay";
  else if (busy) buttonLabel = "▸ confirming in wallet…";

  return (
    <div className="border border-accent-orange/40 bg-accent-orange/5 px-4 py-3 font-mono text-label-sm space-y-2">
      <div className="text-accent-orange uppercase tracking-widest">▶ paywall</div>
      <div className="text-ink-light text-sm">
        Free runs used. Pay {DEFAULT_PRICE_OG} OG to unlock unlimited runs on this commission.
      </div>
      <button
        onClick={handlePay}
        disabled={busy}
        className="w-full px-3 py-2 bg-accent-lime text-bg-dark uppercase tracking-widest hover:bg-accent-lime-bright disabled:opacity-40 transition-colors"
      >
        {buttonLabel}
      </button>
      <div className="text-ink-light-muted text-[10px] uppercase tracking-widest truncate">
        contract: {PAYMENT_CONTRACT_ADDRESS}
      </div>
      {tx && (
        <div className="text-accent-lime text-[11px] break-all">
          ▸ tx submitted:{" "}
          <a
            href={`https://chainscan-galileo.0g.ai/tx/${tx}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            {tx.slice(0, 14)}…
          </a>
          <div className="text-ink-light-muted normal-case mt-1">
            backend listener will grant access in ~5s after confirmation
          </div>
        </div>
      )}
      {error && (
        <div className="text-accent-orange text-[11px] break-words">▶ {error}</div>
      )}
    </div>
  );
}
