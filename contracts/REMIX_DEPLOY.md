# Deploy OGTimesPayment on Remix → 0G Galileo testnet

## 1. Open Remix
https://remix.ethereum.org

## 2. Create the file
- File explorer → New File → `OGTimesPayment.sol`
- Paste the contents of `contracts/OGTimesPayment.sol` from this repo

## 3. Compile
- Solidity Compiler tab → Compiler version `0.8.20` or higher
- Click Compile

## 4. Add Galileo testnet to MetaMask
- Network Name: `0G Galileo Testnet`
- RPC URL: `https://evmrpc-testnet.0g.ai`
- Chain ID: `16602`
- Currency Symbol: `OG`
- Block Explorer: `https://chainscan-galileo.0g.ai`

## 5. Get test OG
- Faucet: search "0G Galileo faucet" — URL changes; current one as of writing is `https://faucet.0g.ai`
- Need ~0.05 OG to deploy + test (deploy ~0.01, test pay ~0.01, gas headroom)

## 6. Deploy in Remix
- Deploy & Run Transactions tab
- Environment: `Injected Provider — MetaMask` (make sure MetaMask is on Galileo)
- Contract: `OGTimesPayment`
- Click Deploy → confirm in MetaMask
- After mining, copy the deployed address from Remix

## 7. Verify it works
- Expand the deployed contract in Remix
- Call `pay` with: `commissionId = "test"`, value = `10000000000000000` (0.01 OG in wei)
- Confirm in MetaMask
- Check the tx on chainscan-galileo.0g.ai → should show Paid event

## 8. Send these to the backend
After deployment, paste the following (the backend listener uses these to know what to watch):

```
OG_PAYMENT_CONTRACT=0xYourDeployedAddress
OG_PAYMENT_EVENT=Paid
OG_CHAIN_RPC=https://evmrpc-testnet.0g.ai
OG_CHAIN_ID=16602
```

The event ABI fragment the listener watches:
```json
{
  "anonymous": false,
  "inputs": [
    {"indexed": true,  "name": "user",             "type": "address"},
    {"indexed": true,  "name": "commissionIdHash", "type": "bytes32"},
    {"indexed": false, "name": "commissionId",     "type": "string"},
    {"indexed": false, "name": "amount",           "type": "uint256"},
    {"indexed": false, "name": "paidAt",           "type": "uint256"}
  ],
  "name": "Paid",
  "type": "event"
}
```

## 9. (Optional) Adjust price
Default is 0.01 OG. To change to e.g. 0.001 OG (1e15 wei):
- Call `setMinPrice` with `1000000000000000`

## 10. (Optional) Withdraw collected fees
- Call `withdraw` with your address as `to`

---

## Frontend integration notes

The frontend "Pay to unlock" button (will be wired post-deployment) calls:

```ts
const tx = await walletClient.writeContract({
  address: OG_PAYMENT_CONTRACT,
  abi: paymentAbi,
  functionName: "pay",
  args: [commissionId],   // the commission's string id
  value: parseEther("0.01"),
})
```

The backend's viem listener watches for `Paid` events on this contract and calls `recordPayment(user, commissionId, txHash)` in `back/src/payment/access.ts` to grant the wallet access.
