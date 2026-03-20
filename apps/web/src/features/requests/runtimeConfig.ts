import { DEFAULT_NETWORK } from "../wallet/networkConfig";

export type ResponseNetworkMode = "local" | "chain";
export type ResponseNetworkNetwork = "mainnet" | "testnet" | "devnet";

export type ResponseNetworkRuntimeConfig = {
  mode: ResponseNetworkMode;
  network: ResponseNetworkNetwork;
  chainId: `sui:${ResponseNetworkNetwork}`;
  moduleName: string;
  packageId?: string;
  registryObjectId?: string;
};

function readOptionalEnv(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function getResponseNetworkRuntimeConfig(): ResponseNetworkRuntimeConfig {
  const network =
    (import.meta.env.VITE_SUI_NETWORK as ResponseNetworkNetwork | undefined) ??
    DEFAULT_NETWORK;
  const mode = import.meta.env.VITE_RESPONSE_NETWORK_MODE === "chain" ? "chain" : "local";

  return {
    mode,
    network,
    chainId: `sui:${network}`,
    moduleName: readOptionalEnv(import.meta.env.VITE_RESPONSE_NETWORK_MODULE) ?? "response_network",
    packageId: readOptionalEnv(import.meta.env.VITE_RESPONSE_NETWORK_PACKAGE_ID),
    registryObjectId: readOptionalEnv(import.meta.env.VITE_RESPONSE_NETWORK_REGISTRY_ID)
  };
}

export function isChainRuntimeReady(config: ResponseNetworkRuntimeConfig) {
  return Boolean(config.packageId && config.registryObjectId);
}
