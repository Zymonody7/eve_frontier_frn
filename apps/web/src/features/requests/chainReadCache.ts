import type { EscrowRecord, RequestActivity, ServiceRequest } from "@frn/shared";
import type { ChainSnapshot } from "./chainReadModel";
import type { ResponseNetworkRuntimeConfig } from "./runtimeConfig";

const CHAIN_CACHE_TTL_MS = 45_000;

type SerializedChainSnapshot = {
  cachedAt: number;
  requests: ServiceRequest[];
  escrows: EscrowRecord[];
  activitiesById: Array<[string, RequestActivity[]]>;
};

function getStorageKey(config: ResponseNetworkRuntimeConfig) {
  return `frn.chain.snapshot:${config.network}:${config.packageId ?? "unknown"}`;
}

function hasWindowStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function readCachedChainSnapshot(config: ResponseNetworkRuntimeConfig): ChainSnapshot | null {
  if (!hasWindowStorage() || !config.packageId) {
    return null;
  }

  const raw = window.localStorage.getItem(getStorageKey(config));

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as SerializedChainSnapshot;

    if (Date.now() - parsed.cachedAt > CHAIN_CACHE_TTL_MS) {
      window.localStorage.removeItem(getStorageKey(config));
      return null;
    }

    return {
      requests: parsed.requests,
      escrowsById: new Map(parsed.escrows.map((escrow) => [escrow.requestId, escrow])),
      activitiesById: new Map(parsed.activitiesById)
    };
  } catch {
    window.localStorage.removeItem(getStorageKey(config));
    return null;
  }
}

export function writeCachedChainSnapshot(
  config: ResponseNetworkRuntimeConfig,
  snapshot: ChainSnapshot
) {
  if (!hasWindowStorage() || !config.packageId) {
    return;
  }

  const serialized: SerializedChainSnapshot = {
    cachedAt: Date.now(),
    requests: snapshot.requests,
    escrows: [...snapshot.escrowsById.values()],
    activitiesById: [...snapshot.activitiesById.entries()]
  };

  window.localStorage.setItem(getStorageKey(config), JSON.stringify(serialized));
}

export function clearCachedChainSnapshot(config: ResponseNetworkRuntimeConfig) {
  if (!hasWindowStorage() || !config.packageId) {
    return;
  }

  window.localStorage.removeItem(getStorageKey(config));
}
