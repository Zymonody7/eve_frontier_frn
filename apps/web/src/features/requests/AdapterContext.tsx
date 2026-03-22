import { useSuiClient, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import type { ResponseNetworkAdapter } from "./adapter";
import { ChainResponseNetworkAdapter } from "./chainAdapter";
import { LocalResponseNetworkAdapter } from "./localAdapter";
import {
  getResponseNetworkRuntimeConfig,
  isChainRuntimeReady,
  type ResponseNetworkRuntimeConfig
} from "./runtimeConfig";
import { useWalletSession } from "../wallet/useWalletSession";

type ChainReadStatus = "healthy" | "degraded" | "checking";

type AdapterContextValue = {
  adapter: ResponseNetworkAdapter;
  runtime: ResponseNetworkRuntimeConfig & {
    chainReady: boolean;
    dataSourceLabel: string;
    isReadChecking: boolean;
    isReadDegraded: boolean;
    readStatus: ChainReadStatus;
    readStatusMessage?: string;
    settlementLabel: string;
    transportLabel: string;
    retryChainReads: () => Promise<void>;
  };
};

type ChainExecutionResult = {
  digest: string;
  events?: Array<{
    parsedJson?: unknown;
    type?: string;
  }> | null;
  objectChanges?: Array<{
    objectId?: string;
    objectType?: string;
    type?: string;
  }> | null;
};

const AdapterContext = createContext<AdapterContextValue | null>(null);
const DATA_QUERY_ROOTS = new Set(["requests", "escrow", "me"]);

function isResponseNetworkQuery(queryKey: unknown) {
  return (
    Array.isArray(queryKey) &&
    typeof queryKey[0] === "string" &&
    DATA_QUERY_ROOTS.has(queryKey[0])
  );
}

export function AdapterProvider({ children }: PropsWithChildren) {
  const client = useSuiClient();
  const queryClient = useQueryClient();
  const { currentAccount } = useWalletSession();
  const localAdapter = useMemo(() => new LocalResponseNetworkAdapter(), []);
  const runtimeBase = useMemo(() => getResponseNetworkRuntimeConfig(), []);
  const chainReady = isChainRuntimeReady(runtimeBase);
  const [readStatus, setReadStatus] = useState<ChainReadStatus>("healthy");
  const [readStatusMessage, setReadStatusMessage] = useState<string>();
  const { mutateAsync: signAndExecuteTransaction } =
    useSignAndExecuteTransaction<ChainExecutionResult>({
      execute: ({ bytes, signature }) =>
        client.executeTransactionBlock({
          transactionBlock: bytes,
          signature,
          options: {
            showEvents: true,
            showEffects: true,
            showObjectChanges: true,
            showRawEffects: true
          }
        })
    });

  const markChainReadHealthy = useCallback(() => {
    setReadStatus("healthy");
    setReadStatusMessage(undefined);
  }, []);

  const markChainReadDegraded = useCallback((error: Error) => {
    setReadStatus("degraded");
    setReadStatusMessage(error.message || "Chain read unavailable");
  }, []);

  useEffect(() => {
    if (runtimeBase.mode !== "chain" || !runtimeBase.packageId) {
      markChainReadHealthy();
    }
  }, [markChainReadHealthy, runtimeBase.mode, runtimeBase.packageId]);

  const adapter = useMemo(() => {
    if (runtimeBase.mode === "chain") {
      return new ChainResponseNetworkAdapter({
        client,
        config: runtimeBase,
        currentAccount: currentAccount?.address,
        executeTransaction: (transaction) =>
          signAndExecuteTransaction({
            transaction,
            chain: runtimeBase.chainId
          }),
        onChainReadDegraded: markChainReadDegraded,
        onChainReadHealthy: markChainReadHealthy
      });
    }

    return localAdapter;
  }, [
    client,
    currentAccount?.address,
    localAdapter,
    markChainReadDegraded,
    markChainReadHealthy,
    runtimeBase,
    signAndExecuteTransaction
  ]);

  const retryChainReads = useCallback(async () => {
    if (runtimeBase.mode !== "chain" || !runtimeBase.packageId) {
      return;
    }

    setReadStatus("checking");
    setReadStatusMessage(undefined);

    try {
      await adapter.refreshChainReads();
      await queryClient.refetchQueries({
        predicate: (query) => isResponseNetworkQuery(query.queryKey),
        type: "active"
      });
      markChainReadHealthy();
    } catch (error) {
      markChainReadDegraded(
        error instanceof Error ? error : new Error("Chain read unavailable")
      );
    }
  }, [
    adapter,
    markChainReadDegraded,
    markChainReadHealthy,
    queryClient,
    runtimeBase.mode,
    runtimeBase.packageId
  ]);

  const runtime = useMemo(
    () => ({
      ...runtimeBase,
      chainReady,
      isReadChecking: readStatus === "checking",
      isReadDegraded: readStatus === "degraded",
      readStatus,
      readStatusMessage,
      dataSourceLabel:
        runtimeBase.mode === "chain"
          ? runtimeBase.packageId
            ? readStatus === "degraded"
              ? "Local mirror fallback"
              : readStatus === "checking"
                ? "Retrying chain read"
                : "Sui event + object read model"
            : "Local mirror read model"
          : "Browser local storage",
      settlementLabel:
        runtimeBase.mode === "chain"
          ? chainReady
            ? "Signed Sui transactions"
            : "Package publish pending"
          : "Off-chain draft receipts",
      transportLabel:
        runtimeBase.mode === "chain"
          ? chainReady
            ? "Chain write mode"
            : "Chain mode pending config"
          : "Local draft mode",
      retryChainReads
    }),
    [chainReady, readStatus, readStatusMessage, retryChainReads, runtimeBase]
  );

  return <AdapterContext.Provider value={{ adapter, runtime }}>{children}</AdapterContext.Provider>;
}

export function useResponseNetworkAdapter() {
  const context = useContext(AdapterContext);

  if (!context) {
    throw new Error("useResponseNetworkAdapter must be used inside AdapterProvider");
  }

  return context.adapter;
}

export function useResponseNetworkRuntime() {
  const context = useContext(AdapterContext);

  if (!context) {
    throw new Error("useResponseNetworkRuntime must be used inside AdapterProvider");
  }

  return context.runtime;
}
