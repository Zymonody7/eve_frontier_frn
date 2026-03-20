import { Transaction } from "@mysten/sui/transactions";
import type {
  CreateRescueRequestInput,
  MutationReceipt,
  ResponseNetworkAdapter
} from "./adapter";
import {
  buildChainDashboard,
  loadChainRequest,
  loadChainSnapshot,
  type ChainReadClient,
  type ChainSnapshot
} from "./chainReadModel";
import {
  clearCachedChainSnapshot,
  readCachedChainSnapshot,
  writeCachedChainSnapshot
} from "./chainReadCache";
import {
  acceptLocalRequest,
  buildRequestTitle,
  cancelLocalOpenRequest,
  confirmLocalRequestCompletion,
  createLocalRequest,
  getLocalDashboard,
  getLocalEscrow,
  getLocalRequestActivity,
  getLocalRequest,
  listLocalOpenRequests,
  listLocalRequests,
  markLocalRequestAwaitingConfirmation,
  markLocalRequestInProgress
} from "./localStore";
import type { ResponseNetworkRuntimeConfig } from "./runtimeConfig";

type ChainExecutionResult = {
  digest: string;
  objectChanges?: Array<{
    objectId?: string;
    objectType?: string;
    type?: string;
  }> | null;
};

type ChainResponseNetworkAdapterOptions = {
  client: ChainReadClient;
  config: ResponseNetworkRuntimeConfig;
  currentAccount?: string;
  executeTransaction: (transaction: Transaction) => Promise<ChainExecutionResult>;
  onChainReadDegraded?: (error: Error) => void;
  onChainReadHealthy?: () => void;
};

function createChainReceipt(requestId: string, digest: string): MutationReceipt {
  return {
    requestId,
    transport: "chain",
    reference: digest
  };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertWritableConfig(config: ResponseNetworkRuntimeConfig) {
  assert(
    config.packageId && config.registryObjectId,
    "Chain mode is enabled, but the package id or registry object id is missing."
  );
}

function buildActionTransaction(
  config: ResponseNetworkRuntimeConfig,
  requestId: string,
  action:
    | "accept_request"
    | "mark_in_progress"
    | "mark_awaiting_confirmation"
    | "confirm_completion"
    | "cancel_open_request"
) {
  assertWritableConfig(config);

  const transaction = new Transaction();
  transaction.moveCall({
    target: `${config.packageId}::${config.moduleName}::${action}`,
    arguments: [transaction.object(requestId)]
  });

  return transaction;
}

function buildCreateRequestTransaction(
  config: ResponseNetworkRuntimeConfig,
  input: CreateRescueRequestInput
) {
  assertWritableConfig(config);

  const transaction = new Transaction();
  const [rewardCoin] = transaction.splitCoins(transaction.gas, [input.rewardMist]);

  transaction.moveCall({
    target: `${config.packageId}::${config.moduleName}::create_request`,
    arguments: [
      transaction.object(config.registryObjectId!),
      rewardCoin,
      transaction.pure.string(buildRequestTitle(input)),
      transaction.pure.string(input.startSystem),
      transaction.pure.string(input.hazardLevel),
      transaction.pure.string(input.description),
      transaction.pure.u64(input.deadlineMs),
      transaction.pure.bool(input.needsFuel),
      transaction.pure.bool(input.needsEscortHome)
    ]
  });

  return transaction;
}

function findRequestObjectId(
  result: ChainExecutionResult,
  config: ResponseNetworkRuntimeConfig
) {
  const expectedType = `::${config.moduleName}::RescueRequest`;

  return result.objectChanges?.find(
    (change) =>
      change.type === "created" &&
      change.objectId &&
      change.objectType?.includes(expectedType)
  )?.objectId;
}

export class ChainResponseNetworkAdapter implements ResponseNetworkAdapter {
  private cache:
    | {
        loadedAt: number;
        snapshot: ChainSnapshot;
      }
    | undefined;
  private readonly config: ResponseNetworkRuntimeConfig;
  private readonly client: ChainReadClient;
  private readonly currentAccount?: string;
  private readonly executeTransaction: (transaction: Transaction) => Promise<ChainExecutionResult>;
  private readonly onChainReadDegraded?: (error: Error) => void;
  private readonly onChainReadHealthy?: () => void;
  private inflightSnapshot: Promise<ChainSnapshot> | undefined;

  constructor(options: ChainResponseNetworkAdapterOptions) {
    this.client = options.client;
    this.config = options.config;
    this.currentAccount = options.currentAccount;
    this.executeTransaction = options.executeTransaction;
    this.onChainReadDegraded = options.onChainReadDegraded;
    this.onChainReadHealthy = options.onChainReadHealthy;
  }

  private canReadFromChain() {
    return Boolean(this.config.packageId);
  }

  private invalidateSnapshot() {
    this.cache = undefined;
    this.inflightSnapshot = undefined;
    clearCachedChainSnapshot(this.config);
  }

  private markReadHealthy() {
    if (this.canReadFromChain()) {
      this.onChainReadHealthy?.();
    }
  }

  private markReadDegraded(error: unknown) {
    if (!this.canReadFromChain()) {
      return;
    }

    this.onChainReadDegraded?.(
      error instanceof Error ? error : new Error("Chain read unavailable")
    );
  }

  private async loadSnapshot(force = false) {
    if (!this.canReadFromChain()) {
      return {
        requests: listLocalRequests(),
        activitiesById: new Map(
          listLocalRequests().map((request) => [request.id, getLocalRequestActivity(request.id)])
        ),
        escrowsById: new Map(
          listLocalRequests()
            .map((request) => [request.id, getLocalEscrow(request.id)])
            .filter((entry): entry is [string, NonNullable<ReturnType<typeof getLocalEscrow>>] =>
              Boolean(entry[1])
            )
        )
      } satisfies ChainSnapshot;
    }

    if (!force && this.cache && Date.now() - this.cache.loadedAt < 5_000) {
      return this.cache.snapshot;
    }

    if (!force && !this.cache) {
      const cachedSnapshot = readCachedChainSnapshot(this.config);

      if (cachedSnapshot) {
        this.cache = {
          loadedAt: Date.now(),
          snapshot: cachedSnapshot
        };

        return cachedSnapshot;
      }
    }

    if (this.inflightSnapshot) {
      return this.inflightSnapshot;
    }

    this.inflightSnapshot = loadChainSnapshot(this.client, this.config)
      .then((snapshot) => {
        this.cache = {
          loadedAt: Date.now(),
          snapshot
        };
        writeCachedChainSnapshot(this.config, snapshot);
        this.markReadHealthy();

        return snapshot;
      })
      .finally(() => {
        this.inflightSnapshot = undefined;
      });

    return this.inflightSnapshot;
  }

  private async withChainFallback<T>(readOnChain: () => Promise<T>, readLocal: () => T | Promise<T>) {
    try {
      const value = await readOnChain();
      this.markReadHealthy();
      return value;
    } catch (error) {
      this.markReadDegraded(error);
      return await readLocal();
    }
  }

  async refreshChainReads() {
    if (!this.canReadFromChain()) {
      return;
    }

    this.invalidateSnapshot();
    try {
      await this.loadSnapshot(true);
      this.markReadHealthy();
    } catch (error) {
      this.markReadDegraded(error);
      throw error;
    }
  }

  async listRequests() {
    return this.withChainFallback(async () => (await this.loadSnapshot()).requests, () =>
      listLocalRequests()
    );
  }

  async listOpenRequests() {
    return this.withChainFallback(
      async () => (await this.loadSnapshot()).requests.filter((request) => request.status === "open"),
      () => listLocalOpenRequests()
    );
  }

  async getRequest(id: string) {
    return this.withChainFallback(
      async () => {
        const snapshot = await this.loadSnapshot();
        const requestFromSnapshot = snapshot.requests.find((item) => item.id === id);

        if (requestFromSnapshot) {
          return requestFromSnapshot;
        }

        const request = await loadChainRequest(this.client, this.config, id);

        if (request) {
          request.lastTxDigest = getLocalRequest(id)?.lastTxDigest;
          return request;
        }

        return null;
      },
      () => getLocalRequest(id)
    );
  }

  async getEscrow(id: string) {
    return this.withChainFallback(
      async () => (await this.loadSnapshot()).escrowsById.get(id) ?? null,
      () => getLocalEscrow(id)
    );
  }

  async getRequestActivity(id: string) {
    return this.withChainFallback(
      async () => (await this.loadSnapshot()).activitiesById.get(id) ?? [],
      () => getLocalRequestActivity(id)
    );
  }

  async createRescueRequest(input: CreateRescueRequestInput) {
    assert(
      this.currentAccount && this.currentAccount === input.requester,
      "The connected wallet must match the requester before publishing on-chain."
    );

    const result = await this.executeTransaction(buildCreateRequestTransaction(this.config, input));
    const requestId = findRequestObjectId(result, this.config) ?? result.digest;
    const receipt = createChainReceipt(requestId, result.digest);

    createLocalRequest(input, {
      requestId,
      transport: "chain",
      reference: result.digest
    });
    this.invalidateSnapshot();

    return receipt;
  }

  async acceptRequest(id: string, actor: string) {
    assert(
      this.currentAccount && this.currentAccount === actor,
      "Reconnect the active wallet before accepting this contract."
    );

    const result = await this.executeTransaction(
      buildActionTransaction(this.config, id, "accept_request")
    );
    acceptLocalRequest(id, actor, { transport: "chain", reference: result.digest });
    this.invalidateSnapshot();
    return createChainReceipt(id, result.digest);
  }

  async markInProgress(id: string, actor: string) {
    assert(
      this.currentAccount && this.currentAccount === actor,
      "Reconnect the assigned responder wallet before updating this contract."
    );

    const result = await this.executeTransaction(
      buildActionTransaction(this.config, id, "mark_in_progress")
    );
    markLocalRequestInProgress(id, actor, { transport: "chain", reference: result.digest });
    this.invalidateSnapshot();
    return createChainReceipt(id, result.digest);
  }

  async markAwaitingConfirmation(id: string, actor: string) {
    assert(
      this.currentAccount && this.currentAccount === actor,
      "Reconnect the assigned responder wallet before closing out this contract."
    );

    const result = await this.executeTransaction(
      buildActionTransaction(this.config, id, "mark_awaiting_confirmation")
    );
    markLocalRequestAwaitingConfirmation(id, actor, {
      transport: "chain",
      reference: result.digest
    });
    this.invalidateSnapshot();
    return createChainReceipt(id, result.digest);
  }

  async confirmCompletion(id: string, actor: string) {
    assert(
      this.currentAccount && this.currentAccount === actor,
      "Reconnect the requester wallet before confirming completion."
    );

    const result = await this.executeTransaction(
      buildActionTransaction(this.config, id, "confirm_completion")
    );
    confirmLocalRequestCompletion(id, actor, { transport: "chain", reference: result.digest });
    this.invalidateSnapshot();
    return createChainReceipt(id, result.digest);
  }

  async cancelOpenRequest(id: string, actor: string) {
    assert(
      this.currentAccount && this.currentAccount === actor,
      "Reconnect the requester wallet before cancelling this contract."
    );

    const result = await this.executeTransaction(
      buildActionTransaction(this.config, id, "cancel_open_request")
    );
    cancelLocalOpenRequest(id, actor, { transport: "chain", reference: result.digest });
    this.invalidateSnapshot();
    return createChainReceipt(id, result.digest);
  }

  async getMyDashboard(address: string) {
    return this.withChainFallback(
      async () => {
        const snapshot = await this.loadSnapshot();
        return buildChainDashboard(
          address,
          snapshot.requests,
          snapshot.escrowsById,
          snapshot.activitiesById
        );
      },
      () => getLocalDashboard(address)
    );
  }
}
