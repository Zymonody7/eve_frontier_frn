import { createNetworkConfig } from "@mysten/dapp-kit";

export const REQUIRED_NETWORK = "testnet" as const;
export const GAS_RESERVE_MIST = "200000000";
export const SUI_COIN_TYPE = "0x2::sui::SUI";

export const DEFAULT_NETWORK =
  (import.meta.env.VITE_SUI_NETWORK as "mainnet" | "testnet" | "devnet" | undefined) ??
  REQUIRED_NETWORK;

export const { networkConfig } = createNetworkConfig({
  testnet: { network: "testnet", url: "https://fullnode.testnet.sui.io:443" },
  mainnet: { network: "mainnet", url: "https://fullnode.mainnet.sui.io:443" },
  devnet: { network: "devnet", url: "https://fullnode.devnet.sui.io:443" }
});
