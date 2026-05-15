export {
  OG_GALILEO,
  ETH_SEPOLIA,
  CHAINS,
  SWITCH_CHAINS,
  getChain,
  getChainName,
  getExplorerTxUrl,
  getExplorerAddrUrl,
  type ChainInfo,
} from "./chains";

export {
  textToHex,
  ethToHexWei,
  weiToEth,
  shortAddr,
  handleError,
  buildChainConfig,
  defaultSupportedNetworks,
  type Result,
} from "./utils";

export { getWalletClient, DEFAULT_CONNECT_CHAINS } from "./client";
