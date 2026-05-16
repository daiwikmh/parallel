import type { createEVMClient as CreateEVMClient } from "@metamask/connect-evm";
import { defaultSupportedNetworks } from "./utils";
import { OG_GALILEO } from "./chains";

type EVMClient = Awaited<ReturnType<typeof CreateEVMClient>>;

let clientPromise: Promise<EVMClient> | null = null;

export async function getWalletClient(): Promise<EVMClient> {
  if (typeof window === "undefined") {
    throw new Error("wallet client is browser-only");
  }
  if (!clientPromise) {
    clientPromise = (async () => {
      const { createEVMClient } = await import("@metamask/connect-evm");
      return createEVMClient({
        dapp: {
          name: "Frame0",
          url: window.location.href,
        },
        api: {
          supportedNetworks: defaultSupportedNetworks(
            process.env.NEXT_PUBLIC_INFURA_API_KEY,
          ),
        },
        ui: { headless: false, preferExtension: true },
      });
    })();
  }
  return clientPromise;
}

export const DEFAULT_CONNECT_CHAINS: `0x${string}`[] = [OG_GALILEO.id];
