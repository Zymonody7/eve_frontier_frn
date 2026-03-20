import type {
  EscrowRecord,
  HazardLevel,
  ProfileStats,
  RequestActivity,
  RequestActivityKind,
  RequestStatus,
  ServiceRequest
} from "@frn/shared";
import type { MyDashboardData } from "./adapter";
import type { ResponseNetworkRuntimeConfig } from "./runtimeConfig";

type ChainEventCursor = {
  txDigest: string;
  eventSeq: string;
};

type ChainEvent = {
  id: ChainEventCursor;
  parsedJson: unknown;
  timestampMs?: string | null;
  type: string;
};

type ChainEventsPage = {
  data: ChainEvent[];
  hasNextPage: boolean;
  nextCursor?: ChainEventCursor | null;
};

type ChainObjectResponse = {
  data?: {
    content?: unknown;
    objectId: string;
    type?: string | null;
  } | null;
  error?: {
    code: string;
  } | null;
};

export type ChainReadClient = {
  getObject(input: {
    id: string;
    options?: {
      showContent?: boolean;
      showType?: boolean;
    };
  }): Promise<ChainObjectResponse>;
  multiGetObjects(input: {
    ids: string[];
    options?: {
      showContent?: boolean;
      showType?: boolean;
    };
  }): Promise<ChainObjectResponse[]>;
  queryEvents(input: {
    query: {
      MoveEventType: string;
    };
    cursor?: ChainEventCursor | null;
    limit?: number;
    order?: "ascending" | "descending";
  }): Promise<ChainEventsPage>;
};

export type ChainSnapshot = {
  activitiesById: Map<string, RequestActivity[]>;
  escrowsById: Map<string, EscrowRecord>;
  requests: ServiceRequest[];
};

const REQUEST_BATCH_SIZE = 50;

function createEventType(config: ResponseNetworkRuntimeConfig, eventName: string) {
  return `${config.packageId}::${config.moduleName}::${eventName}`;
}

function toRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function readIdLike(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  const record = toRecord(value);

  if (!record) {
    return null;
  }

  if (typeof record.id === "string") {
    return record.id;
  }

  if (typeof record.bytes === "string") {
    return record.bytes;
  }

  if (typeof record.inner === "string") {
    return record.inner;
  }

  return null;
}

function readMoveObjectContent(value: unknown) {
  const record = toRecord(value);

  if (!record || record.dataType !== "moveObject") {
    return null;
  }

  const fields = toRecord(record.fields);
  const type = typeof record.type === "string" ? record.type : null;

  if (!fields || !type) {
    return null;
  }

  return {
    fields,
    type
  };
}

function readStringValue(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }

  return readIdLike(value);
}

function readBoolValue(value: unknown) {
  return typeof value === "boolean" ? value : false;
}

function readBigIntString(value: unknown) {
  const text = readStringValue(value);
  return text ?? "0";
}

function readNumberValue(value: unknown) {
  const text = readBigIntString(value);
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeAddress(value: unknown) {
  return readStringValue(value) ?? "";
}

function isNullAddress(address: string) {
  const normalized = address.toLowerCase().replace(/^0x/, "").replace(/^0+/, "");
  return normalized.length === 0;
}

function normalizeStatus(statusCode: number): RequestStatus {
  switch (statusCode) {
    case 0:
      return "open";
    case 1:
      return "accepted";
    case 2:
      return "in_progress";
    case 3:
      return "awaiting_confirmation";
    case 4:
      return "completed";
    case 5:
      return "cancelled";
    default:
      return "open";
  }
}

function toActivityKindFromStatus(status: RequestStatus): RequestActivityKind | null {
  switch (status) {
    case "accepted":
      return "accepted";
    case "in_progress":
      return "in_progress";
    case "awaiting_confirmation":
      return "awaiting_confirmation";
    case "completed":
      return "completed";
    case "cancelled":
      return "cancelled";
    default:
      return null;
  }
}

function normalizeHazard(hazard: unknown): HazardLevel {
  const value = readStringValue(hazard);

  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }

  return "medium";
}

function toEscrowState(status: RequestStatus): EscrowRecord["state"] {
  if (status === "completed") {
    return "released";
  }

  if (status === "cancelled") {
    return "refunded";
  }

  return "locked";
}

function toSortedRequests(requests: ServiceRequest[]) {
  return [...requests].sort((left, right) => right.updatedAtMs - left.updatedAtMs);
}

function toSortedRecentActivity(activities: RequestActivity[]) {
  return [...activities].sort((left, right) => right.timestampMs - left.timestampMs);
}

function buildProfileStats(address: string, requests: ServiceRequest[]): ProfileStats {
  const posted = requests.filter((request) => request.requester === address);
  const accepted = requests.filter((request) => request.responder === address);

  return {
    wallet: address,
    jobsPosted: posted.length,
    jobsCompleted: accepted.filter((request) => request.status === "completed").length,
    jobsCancelled: posted.filter((request) => request.status === "cancelled").length,
    jobsFailed: accepted.filter((request) => request.status === "expired").length
  };
}

function sumMist(values: string[]) {
  return values.reduce((total, current) => total + BigInt(current), BigInt(0)).toString();
}

async function queryAllEvents(client: ChainReadClient, moveEventType: string) {
  const events: ChainEvent[] = [];
  let cursor: ChainEventCursor | null | undefined = null;

  while (true) {
    const page = await client.queryEvents({
      query: {
        MoveEventType: moveEventType
      },
      cursor,
      limit: 100,
      order: "ascending"
    });

    events.push(...page.data);

    if (!page.hasNextPage || !page.nextCursor) {
      return events;
    }

    cursor = page.nextCursor;
  }
}

function chunk<T>(values: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

function parseRequestFromObject(response: ChainObjectResponse, config: ResponseNetworkRuntimeConfig) {
  const object = response.data;

  const content = readMoveObjectContent(object?.content);

  if (!object || !content) {
    return null;
  }

  const objectType = object.type ?? content.type;

  if (!objectType?.includes(`::${config.moduleName}::RescueRequest`)) {
    return null;
  }

  const fields = content.fields;
  const requester = normalizeAddress(fields.requester);
  const responderAddress = normalizeAddress(fields.responder);
  const status = normalizeStatus(readNumberValue(fields.status));

  const request: ServiceRequest = {
    id: object.objectId,
    jobType: "rescue",
    requester,
    responder: isNullAddress(responderAddress) ? undefined : responderAddress,
    startSystem: readStringValue(fields.start_system) ?? "Unknown system",
    hazardLevel: normalizeHazard(fields.hazard_level),
    title: readStringValue(fields.title) ?? "Untitled rescue request",
    description: readStringValue(fields.description) ?? "",
    rewardMist: readBigIntString(fields.reward_mist),
    deadlineMs: readNumberValue(fields.deadline_ms),
    status,
    createdAtMs: readNumberValue(fields.created_at_ms),
    updatedAtMs: readNumberValue(fields.updated_at_ms),
    needsFuel: readBoolValue(fields.needs_fuel),
    needsEscortHome: readBoolValue(fields.needs_escort_home)
  };

  return request;
}

async function loadRequestsById(
  client: ChainReadClient,
  requestIds: string[],
  config: ResponseNetworkRuntimeConfig
) {
  const responses = await Promise.all(
    chunk(requestIds, REQUEST_BATCH_SIZE).map((ids) =>
      client.multiGetObjects({
        ids,
        options: {
          showContent: true,
          showType: true
        }
      })
    )
  );

  return responses
    .flat()
    .map((response) => parseRequestFromObject(response, config))
    .filter((request): request is ServiceRequest => request !== null);
}

export async function loadChainSnapshot(
  client: ChainReadClient,
  config: ResponseNetworkRuntimeConfig
): Promise<ChainSnapshot> {
  if (!config.packageId) {
    return {
      activitiesById: new Map(),
      requests: [],
      escrowsById: new Map()
    };
  }

  const [createdEvents, statusChangedEvents, settledEvents] = await Promise.all([
    queryAllEvents(client, createEventType(config, "RequestCreated")),
    queryAllEvents(client, createEventType(config, "RequestStatusChanged")),
    queryAllEvents(client, createEventType(config, "RequestSettled"))
  ]);

  const requestIds = Array.from(
    new Set(
      createdEvents
        .map((event) => {
          const parsed = toRecord(event.parsedJson);
          return parsed ? readIdLike(parsed.request_id) : null;
        })
        .filter((requestId): requestId is string => Boolean(requestId))
    )
  );
  const activitiesById = new Map<string, RequestActivity[]>();

  const createdDigestById = new Map<string, string>();

  for (const event of createdEvents) {
    const parsed = toRecord(event.parsedJson);
    const requestId = parsed ? readIdLike(parsed.request_id) : null;

    if (requestId) {
      const timestampMs = Number(event.timestampMs ?? "0");
      createdDigestById.set(requestId, event.id.txDigest);
      const existingActivities = activitiesById.get(requestId) ?? [];
      existingActivities.push({
        id: `${requestId}:created:${event.id.txDigest}`,
        requestId,
        kind: "created",
        source: "chain",
        timestampMs: Number.isFinite(timestampMs) ? timestampMs : 0,
        actor: parsed ? normalizeAddress(parsed.requester) : undefined,
        status: "open",
        digest: event.id.txDigest,
        amountMist: parsed ? readBigIntString(parsed.reward_mist) : undefined
      });
      activitiesById.set(requestId, existingActivities);
    }
  }

  const settledDigestById = new Map<string, string>();
  const settlementMetaById = new Map<
    string,
    {
      refunded: boolean;
      recipient?: string;
      txDigest: string;
    }
  >();

  for (const event of settledEvents) {
    const parsed = toRecord(event.parsedJson);
    const requestId = parsed ? readIdLike(parsed.request_id) : null;

    if (requestId) {
      const timestampMs = Number(event.timestampMs ?? "0");
      settledDigestById.set(requestId, event.id.txDigest);
      const recipient = parsed ? normalizeAddress(parsed.recipient) : "";
      settlementMetaById.set(requestId, {
        refunded: readBoolValue(parsed?.refunded),
        recipient: recipient || undefined,
        txDigest: event.id.txDigest
      });
      const existingActivities = activitiesById.get(requestId) ?? [];
      existingActivities.push({
        id: `${requestId}:${readBoolValue(parsed?.refunded) ? "refund" : "release"}:${event.id.txDigest}`,
        requestId,
        kind: readBoolValue(parsed?.refunded) ? "settled_refunded" : "settled_released",
        source: "chain",
        timestampMs: Number.isFinite(timestampMs) ? timestampMs : 0,
        digest: event.id.txDigest,
        amountMist: parsed ? readBigIntString(parsed.reward_mist) : undefined,
        recipient: recipient || undefined,
        refunded: readBoolValue(parsed?.refunded)
      });
      activitiesById.set(requestId, existingActivities);
    }
  }

  const lastDigestById = new Map<string, string>(createdDigestById);

  for (const event of statusChangedEvents) {
    const parsed = toRecord(event.parsedJson);
    const requestId = parsed ? readIdLike(parsed.request_id) : null;

    if (requestId) {
      const timestampMs = Number(event.timestampMs ?? "0");
      const status = normalizeStatus(parsed ? readNumberValue(parsed.status) : 0);
      const kind = toActivityKindFromStatus(status);
      lastDigestById.set(requestId, event.id.txDigest);

      if (kind) {
        const existingActivities = activitiesById.get(requestId) ?? [];
        existingActivities.push({
          id: `${requestId}:${kind}:${event.id.txDigest}`,
          requestId,
          kind,
          source: "chain",
          timestampMs: Number.isFinite(timestampMs) ? timestampMs : 0,
          actor: parsed ? normalizeAddress(parsed.actor) : undefined,
          status,
          digest: event.id.txDigest
        });
        activitiesById.set(requestId, existingActivities);
      }
    }
  }

  for (const [requestId, digest] of settledDigestById.entries()) {
    lastDigestById.set(requestId, digest);
  }

  const requests = toSortedRequests(await loadRequestsById(client, requestIds, config));
  const escrowsById = new Map<string, EscrowRecord>();

  for (const request of requests) {
    const settlementMeta = settlementMetaById.get(request.id);
    request.lastTxDigest = lastDigestById.get(request.id) ?? createdDigestById.get(request.id);

    escrowsById.set(request.id, {
      requestId: request.id,
      depositor: request.requester,
      amountMist: request.rewardMist,
      tokenType: "SUI",
      state: toEscrowState(request.status),
      recipient:
        settlementMeta?.recipient ??
        (request.status === "completed"
          ? request.responder
          : request.status === "cancelled"
            ? request.requester
            : undefined),
      refunded: settlementMeta?.refunded ?? request.status === "cancelled",
      txDigest: settlementMeta?.txDigest ?? request.lastTxDigest
    });

    activitiesById.set(
      request.id,
      [...(activitiesById.get(request.id) ?? [])].sort(
        (left, right) => left.timestampMs - right.timestampMs
      )
    );
  }

  return {
    activitiesById,
    requests,
    escrowsById
  };
}

export async function loadChainRequest(
  client: ChainReadClient,
  config: ResponseNetworkRuntimeConfig,
  requestId: string
) {
  if (!config.packageId) {
    return null;
  }

  const response = await client.getObject({
    id: requestId,
    options: {
      showContent: true,
      showType: true
    }
  });

  return parseRequestFromObject(response, config);
}

export function buildChainDashboard(
  address: string,
  requests: ServiceRequest[],
  escrowsById: Map<string, EscrowRecord>,
  activitiesById: Map<string, RequestActivity[]>
): MyDashboardData {
  const postedRequests = toSortedRequests(
    requests.filter((request) => request.requester === address)
  );
  const acceptedRequests = toSortedRequests(
    requests.filter((request) => request.responder === address)
  );
  const dashboardRequestIds = new Set(
    [...postedRequests, ...acceptedRequests].map((request) => request.id)
  );
  const releasedEscrows = acceptedRequests
    .map((request) => escrowsById.get(request.id))
    .filter((escrow): escrow is EscrowRecord => Boolean(escrow && escrow.state === "released"));
  const recentActivity = toSortedRecentActivity(
    [...dashboardRequestIds].flatMap((requestId) => activitiesById.get(requestId) ?? [])
  ).slice(0, 8);

  return {
    postedRequests,
    acceptedRequests,
    recentActivity,
    stats: buildProfileStats(address, requests),
    earnedMist: sumMist(releasedEscrows.map((escrow) => escrow.amountMist))
  };
}
