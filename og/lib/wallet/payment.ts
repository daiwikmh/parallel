import { createWalletClient, custom, parseEther, type Hex } from "viem";
import paymentAbi from "./payment-abi.json";
import { OG_GALILEO } from "./chains";
import { getWalletClient } from "./client";

export const PAYMENT_CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_OG_PAYMENT_CONTRACT as `0x${string}` | undefined) ??
  "0x2a8142Db4C3b90333339A6E25b225e808098BDB0";

export const DEFAULT_PRICE_OG = "0.01";

export interface PayResult {
  txHash: Hex;
}

export async function payForCommission(commissionId: string, account: `0x${string}`, priceOg: string = DEFAULT_PRICE_OG): Promise<PayResult> {
  const evmClient = await getWalletClient();
  const provider = evmClient.getProvider();

  const wallet = createWalletClient({
    account,
    chain: {
      id: 16601,
      name: OG_GALILEO.name,
      nativeCurrency: OG_GALILEO.nativeCurrency,
      rpcUrls: { default: { http: [OG_GALILEO.rpcUrl] } },
    },
    transport: custom(provider as { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> }),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const txHash = await (wallet.writeContract as any)({
    address: PAYMENT_CONTRACT_ADDRESS,
    abi: paymentAbi,
    functionName: "pay",
    args: [commissionId],
    value: parseEther(priceOg),
  });

  return { txHash: txHash as Hex };
}
