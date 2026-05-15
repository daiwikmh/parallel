"use client";
import { useState } from "react";
import { useWallet } from "./WalletProvider";
import { SWITCH_CHAINS, getChain, shortAddr, OG_GALILEO } from "@/lib/wallet";

interface Props {
  collapsed?: boolean;
}

export function ConnectWallet({ collapsed = false }: Props) {
  const {
    account,
    chainId,
    balance,
    connecting,
    ready,
    connect,
    disconnect,
    switchChain,
  } = useWallet();
  const [open, setOpen] = useState(false);

  const chain = getChain(chainId);
  const onTargetChain = chainId?.toLowerCase() === OG_GALILEO.id.toLowerCase();

  if (collapsed) {
    return (
      <div className="px-2 py-3 border-t border-ink-light/10 flex justify-center">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            account ? "bg-accent-lime" : "bg-ink-light-muted"
          }`}
          title={account ? `connected ${shortAddr(account)}` : "wallet not connected"}
        />
      </div>
    );
  }

  return (
    <div className="border-t border-ink-light/10 px-3 py-3 font-mono text-label-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-ink-light-muted uppercase tracking-widest hover:text-accent-lime transition-colors"
      >
        <span className="flex items-center gap-2">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              account ? "bg-accent-lime" : "bg-ink-light-muted"
            }`}
          />
          Wallet
        </span>
        <span>{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {!ready && (
            <div className="text-ink-light-muted">▶ initializing…</div>
          )}

          {ready && !account && (
            <button
              onClick={connect}
              disabled={connecting}
              className="w-full px-3 py-2 bg-accent-lime text-bg-dark uppercase tracking-widest hover:bg-accent-lime-bright disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {connecting ? "connecting…" : "connect"}
            </button>
          )}

          {ready && account && (
            <>
              <div>
                <div className="text-ink-light-muted uppercase tracking-widest text-[10px]">
                  account
                </div>
                <div className="text-ink-light truncate" title={account}>
                  {shortAddr(account)}
                </div>
              </div>

              <div>
                <div className="text-ink-light-muted uppercase tracking-widest text-[10px]">
                  balance
                </div>
                <div className="text-ink-light">
                  {balance}{" "}
                  <span className="text-ink-light-muted">
                    {chain?.nativeCurrency.symbol ?? ""}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-ink-light-muted uppercase tracking-widest text-[10px] mb-1">
                  chain
                </div>
                <div
                  className={`text-[11px] ${
                    onTargetChain ? "text-accent-lime" : "text-accent-orange"
                  }`}
                >
                  {chain?.shortName ?? chainId ?? "unknown"}
                </div>
                {!onTargetChain && (
                  <button
                    onClick={() => switchChain(OG_GALILEO.id)}
                    className="mt-2 w-full px-2 py-1 border border-accent-lime/60 text-accent-lime uppercase tracking-widest hover:bg-accent-lime/10 transition-colors text-[10px]"
                  >
                    switch to {OG_GALILEO.shortName}
                  </button>
                )}
              </div>

              {SWITCH_CHAINS.length > 1 && (
                <details className="text-ink-light-muted">
                  <summary className="cursor-pointer hover:text-ink-light uppercase tracking-widest text-[10px]">
                    other chains
                  </summary>
                  <div className="mt-2 space-y-1">
                    {SWITCH_CHAINS.filter(
                      (c) => c.id.toLowerCase() !== chainId?.toLowerCase(),
                    ).map((c) => (
                      <button
                        key={c.id}
                        onClick={() => switchChain(c.id)}
                        className="block w-full text-left px-2 py-1 hover:bg-bg-dark-2 hover:text-ink-light transition-colors"
                      >
                        ▸ {c.name}
                      </button>
                    ))}
                  </div>
                </details>
              )}

              <button
                onClick={disconnect}
                className="w-full px-2 py-1 text-ink-light-muted hover:text-accent-orange uppercase tracking-widest text-[10px] border border-ink-light/10 hover:border-accent-orange/40 transition-colors"
              >
                disconnect
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
