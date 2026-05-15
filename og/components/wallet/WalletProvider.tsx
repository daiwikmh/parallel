"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  getWalletClient,
  DEFAULT_CONNECT_CHAINS,
  weiToEth,
  buildChainConfig,
  handleError,
} from "@/lib/wallet";

export interface WalletState {
  account: string | null;
  chainId: string | null;
  balance: string;
  connecting: boolean;
  ready: boolean;
}

export interface WalletContextValue extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  switchChain: (chainId: string) => Promise<void>;
  signMessage: (msg: string) => Promise<string | null>;
  refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [balance, setBalance] = useState("--");
  const [connecting, setConnecting] = useState(false);
  const [ready, setReady] = useState(false);
  const providerRef = useRef<{
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    on: (event: string, fn: (...args: unknown[]) => void) => void;
    off: (event: string, fn: (...args: unknown[]) => void) => void;
  } | null>(null);

  const fetchBalance = useCallback(async (addr: string) => {
    try {
      const provider = providerRef.current;
      if (!provider) return;
      const wei = await provider.request({
        method: "eth_getBalance",
        params: [addr, "latest"],
      });
      setBalance(weiToEth(wei as string));
    } catch {
      setBalance("--");
    }
  }, []);

  const refreshBalance = useCallback(async () => {
    if (account) await fetchBalance(account);
  }, [account, fetchBalance]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const client = await getWalletClient();
        if (cancelled) return;
        const provider = client.getProvider();
        providerRef.current = provider as unknown as typeof providerRef.current;

        const existing = client.getAccount();
        const existingChain = client.getChainId();
        if (existing) {
          setAccount(existing);
          setChainId(existingChain ?? null);
          fetchBalance(existing);
        }

        const onAccountsChanged = (...args: unknown[]) => {
          const accounts = args[0] as string[];
          if (!accounts || accounts.length === 0) {
            setAccount(null);
            setChainId(null);
            setBalance("--");
            return;
          }
          const chain = client.getChainId();
          setAccount(accounts[0]);
          setChainId(chain ?? null);
          fetchBalance(accounts[0]);
        };

        const onChainChanged = (...args: unknown[]) => {
          const newChainId = args[0] as string;
          setChainId(newChainId);
          const addr = client.getAccount();
          if (addr) fetchBalance(addr);
        };

        const onDisconnect = () => {
          setAccount(null);
          setChainId(null);
          setBalance("--");
        };

        provider.on("accountsChanged", onAccountsChanged);
        provider.on("chainChanged", onChainChanged);
        provider.on("disconnect", onDisconnect);
        setReady(true);

        return () => {
          provider.off("accountsChanged", onAccountsChanged);
          provider.off("chainChanged", onChainChanged);
          provider.off("disconnect", onDisconnect);
        };
      } catch (e) {
        handleError(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchBalance]);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const client = await getWalletClient();
      const { accounts, chainId: cid } = await client.connect({
        chainIds: DEFAULT_CONNECT_CHAINS,
      });
      if (accounts[0]) {
        setAccount(accounts[0]);
        setChainId(cid);
        fetchBalance(accounts[0]);
      }
    } catch (e) {
      handleError(e);
    } finally {
      setConnecting(false);
    }
  }, [fetchBalance]);

  const disconnect = useCallback(async () => {
    try {
      const client = await getWalletClient();
      await client.disconnect();
    } catch (e) {
      handleError(e);
    } finally {
      setAccount(null);
      setChainId(null);
      setBalance("--");
    }
  }, []);

  const switchChain = useCallback(async (target: string) => {
    try {
      const client = await getWalletClient();
      const chainConfig = buildChainConfig(
        target,
        process.env.NEXT_PUBLIC_INFURA_API_KEY,
      );
      await client.switchChain({
        chainId: target as `0x${string}`,
        ...(chainConfig && { chainConfiguration: chainConfig }),
      });
    } catch (e) {
      handleError(e);
    }
  }, []);

  const signMessage = useCallback(
    async (msg: string): Promise<string | null> => {
      const provider = providerRef.current;
      if (!provider || !account) return null;
      try {
        const sig = await provider.request({
          method: "personal_sign",
          params: [
            "0x" + Array.from(msg).map((c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join(""),
            account,
          ],
        });
        return sig as string;
      } catch (e) {
        handleError(e);
        return null;
      }
    },
    [account],
  );

  const value: WalletContextValue = {
    account,
    chainId,
    balance,
    connecting,
    ready,
    connect,
    disconnect,
    switchChain,
    signMessage,
    refreshBalance,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside WalletProvider");
  return ctx;
}
