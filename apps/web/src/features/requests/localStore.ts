import type { EscrowRecord, ProfileStats, RequestActivity, ServiceRequest } from "@frn/shared";
import type {
  CreateRescueRequestInput,
  MyDashboardData,
  MutationReceipt
} from "./adapter";

export type LocalDatabase = {
  requests: ServiceRequest[];
  escrows: EscrowRecord[];
  activities: RequestActivity[];
};

const STORAGE_KEY = "frn.local.db.v3";
const LEGACY_STORAGE_KEYS = ["frn.local.db.v2"];

function getInitialState(): LocalDatabase {
  return {
    requests: [],
    escrows: [],
    activities: []
  };
}

function normalizeDb(raw: unknown): LocalDatabase {
  const record = raw && typeof raw === "object" ? (raw as Partial<LocalDatabase>) : {};

  return {
    requests: Array.isArray(record.requests) ? record.requests : [],
    escrows: Array.isArray(record.escrows) ? record.escrows : [],
    activities: Array.isArray(record.activities) ? record.activities : []
  };
}

export function readLocalDb(): LocalDatabase {
  if (typeof window === "undefined") {
    return getInitialState();
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    for (const legacyKey of LEGACY_STORAGE_KEYS) {
      const legacyRaw = window.localStorage.getItem(legacyKey);

      if (legacyRaw) {
        const migrated = normalizeDb(JSON.parse(legacyRaw) as unknown);
        writeLocalDb(migrated);
        return migrated;
      }
    }

    const initial = getInitialState();
    writeLocalDb(initial);
    return initial;
  }

  return normalizeDb(JSON.parse(raw) as unknown);
}

export function writeLocalDb(db: LocalDatabase) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function createReference(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function createActivityId(requestId: string, kind: RequestActivity["kind"], reference: string) {
  return `${requestId}:${kind}:${reference}`;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
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

type MutationOverrides = Partial<Pick<MutationReceipt, "reference" | "transport">>;

function createMutationReceipt(
  requestId: string,
  prefix: string,
  overrides: MutationOverrides = {}
): MutationReceipt {
  return {
    requestId,
    transport: overrides.transport ?? "local",
    reference: overrides.reference ?? createReference(prefix)
  };
}

export function buildRequestTitle(input: CreateRescueRequestInput) {
  return input.needsEscortHome
    ? `Rescue and escort needed from ${input.startSystem}`
    : `Fuel rescue needed near ${input.startSystem}`;
}

function pushActivity(
  db: LocalDatabase,
  activity: Omit<RequestActivity, "id">
) {
  db.activities.push({
    ...activity,
    id: createActivityId(activity.requestId, activity.kind, activity.digest ?? createReference("local-activity"))
  });
}

export function listLocalRequests() {
  return toSortedRequests(readLocalDb().requests);
}

export function listLocalOpenRequests() {
  return toSortedRequests(
    readLocalDb().requests.filter((request) => request.status === "open")
  );
}

export function getLocalRequest(id: string) {
  return readLocalDb().requests.find((request) => request.id === id) ?? null;
}

export function getLocalEscrow(id: string) {
  return readLocalDb().escrows.find((escrow) => escrow.requestId === id) ?? null;
}

export function getLocalRequestActivity(id: string) {
  const db = readLocalDb();
  const activities = db.activities
    .filter((activity) => activity.requestId === id)
    .sort((left, right) => left.timestampMs - right.timestampMs);

  if (activities.length > 0) {
    return activities;
  }

  const request = db.requests.find((item) => item.id === id);
  const escrow = db.escrows.find((item) => item.requestId === id);

  if (!request) {
    return [];
  }

  const derived: RequestActivity[] = [
    {
      id: createActivityId(id, "created", request.lastTxDigest ?? `derived-${id}`),
      requestId: id,
      kind: "created",
      source: "local",
      timestampMs: request.createdAtMs,
      actor: request.requester,
      status: "open",
      digest: request.lastTxDigest,
      amountMist: request.rewardMist
    }
  ];

  if (request.status === "completed") {
    derived.push({
      id: createActivityId(id, "completed", request.lastTxDigest ?? `completed-${id}`),
      requestId: id,
      kind: "completed",
      source: "local",
      timestampMs: request.updatedAtMs,
      actor: request.requester,
      status: "completed",
      digest: request.lastTxDigest
    });
  }

  if (request.status === "cancelled") {
    derived.push({
      id: createActivityId(id, "cancelled", request.lastTxDigest ?? `cancelled-${id}`),
      requestId: id,
      kind: "cancelled",
      source: "local",
      timestampMs: request.updatedAtMs,
      actor: request.requester,
      status: "cancelled",
      digest: request.lastTxDigest
    });
  }

  if (escrow?.txDigest && (escrow.state === "released" || escrow.state === "refunded")) {
    derived.push({
      id: createActivityId(
        id,
        escrow.state === "released" ? "settled_released" : "settled_refunded",
        escrow.txDigest
      ),
      requestId: id,
      kind: escrow.state === "released" ? "settled_released" : "settled_refunded",
      source: "local",
      timestampMs: request.updatedAtMs + 1,
      digest: escrow.txDigest,
      amountMist: escrow.amountMist,
      recipient: escrow.recipient,
      refunded: escrow.refunded
    });
  }

  return derived.sort((left, right) => left.timestampMs - right.timestampMs);
}

export function createLocalRequest(
  input: CreateRescueRequestInput,
  overrides: MutationOverrides & { requestId?: string } = {}
) {
  const db = readLocalDb();
  const now = Date.now();
  const requestId = overrides.requestId ?? crypto.randomUUID();
  const receipt = createMutationReceipt(requestId, "local-create", overrides);

  db.requests.push({
    id: requestId,
    jobType: "rescue",
    requester: input.requester,
    startSystem: input.startSystem,
    hazardLevel: input.hazardLevel,
    title: buildRequestTitle(input),
    description: input.description,
    rewardMist: input.rewardMist,
    deadlineMs: input.deadlineMs,
    status: "open",
    createdAtMs: now,
    updatedAtMs: now,
    lastTxDigest: receipt.reference,
    needsFuel: input.needsFuel,
    needsEscortHome: input.needsEscortHome
  });

  db.escrows.push({
    requestId,
    depositor: input.requester,
    amountMist: input.rewardMist,
    tokenType: "SUI",
    state: "locked",
    refunded: false,
    txDigest: receipt.reference
  });

  pushActivity(db, {
    requestId,
    kind: "created",
    source: overrides.transport ?? "local",
    timestampMs: now,
    actor: input.requester,
    status: "open",
    digest: receipt.reference,
    amountMist: input.rewardMist
  });

  writeLocalDb(db);

  return receipt;
}

export function acceptLocalRequest(id: string, actor: string, overrides: MutationOverrides = {}) {
  const db = readLocalDb();
  const request = db.requests.find((item) => item.id === id);
  assert(request, "Request not found");
  assert(request.status === "open", "Only open requests can be accepted");
  assert(request.requester !== actor, "Requester cannot accept their own request");

  const receipt = createMutationReceipt(id, "local-accept", overrides);

  request.responder = actor;
  request.status = "accepted";
  request.updatedAtMs = Date.now();
  request.lastTxDigest = receipt.reference;
  pushActivity(db, {
    requestId: id,
    kind: "accepted",
    source: overrides.transport ?? "local",
    timestampMs: request.updatedAtMs,
    actor,
    status: "accepted",
    digest: receipt.reference
  });
  writeLocalDb(db);

  return receipt;
}

export function markLocalRequestInProgress(
  id: string,
  actor: string,
  overrides: MutationOverrides = {}
) {
  const db = readLocalDb();
  const request = db.requests.find((item) => item.id === id);
  assert(request, "Request not found");
  assert(request.responder === actor, "Only the assigned responder can start work");
  assert(request.status === "accepted", "Request must be accepted before it can start");

  const receipt = createMutationReceipt(id, "local-progress", overrides);

  request.status = "in_progress";
  request.updatedAtMs = Date.now();
  request.lastTxDigest = receipt.reference;
  pushActivity(db, {
    requestId: id,
    kind: "in_progress",
    source: overrides.transport ?? "local",
    timestampMs: request.updatedAtMs,
    actor,
    status: "in_progress",
    digest: receipt.reference
  });
  writeLocalDb(db);

  return receipt;
}

export function markLocalRequestAwaitingConfirmation(
  id: string,
  actor: string,
  overrides: MutationOverrides = {}
) {
  const db = readLocalDb();
  const request = db.requests.find((item) => item.id === id);
  assert(request, "Request not found");
  assert(request.responder === actor, "Only the assigned responder can mark completion");
  assert(
    request.status === "accepted" || request.status === "in_progress",
    "Request must be accepted or in progress before completion"
  );

  const receipt = createMutationReceipt(id, "local-awaiting", overrides);

  request.status = "awaiting_confirmation";
  request.updatedAtMs = Date.now();
  request.lastTxDigest = receipt.reference;
  pushActivity(db, {
    requestId: id,
    kind: "awaiting_confirmation",
    source: overrides.transport ?? "local",
    timestampMs: request.updatedAtMs,
    actor,
    status: "awaiting_confirmation",
    digest: receipt.reference
  });
  writeLocalDb(db);

  return receipt;
}

export function confirmLocalRequestCompletion(
  id: string,
  actor: string,
  overrides: MutationOverrides = {}
) {
  const db = readLocalDb();
  const request = db.requests.find((item) => item.id === id);
  const escrow = db.escrows.find((item) => item.requestId === id);
  assert(request, "Request not found");
  assert(escrow, "Escrow record not found");
  assert(request.requester === actor, "Only the requester can confirm completion");
  assert(
    request.status === "awaiting_confirmation",
    "Request must await confirmation before completion"
  );
  assert(escrow.state === "locked", "Escrow must be locked before release");

  const receipt = createMutationReceipt(id, "local-release", overrides);

  request.status = "completed";
  request.updatedAtMs = Date.now();
  request.lastTxDigest = receipt.reference;
  escrow.state = "released";
  escrow.recipient = request.responder;
  escrow.refunded = false;
  escrow.txDigest = receipt.reference;
  pushActivity(db, {
    requestId: id,
    kind: "completed",
    source: overrides.transport ?? "local",
    timestampMs: request.updatedAtMs,
    actor,
    status: "completed",
    digest: receipt.reference
  });
  pushActivity(db, {
    requestId: id,
    kind: "settled_released",
    source: overrides.transport ?? "local",
    timestampMs: request.updatedAtMs + 1,
    actor,
    digest: receipt.reference,
    amountMist: escrow.amountMist,
    recipient: request.responder,
    refunded: false
  });
  writeLocalDb(db);

  return receipt;
}

export function cancelLocalOpenRequest(
  id: string,
  actor: string,
  overrides: MutationOverrides = {}
) {
  const db = readLocalDb();
  const request = db.requests.find((item) => item.id === id);
  const escrow = db.escrows.find((item) => item.requestId === id);
  assert(request, "Request not found");
  assert(request.requester === actor, "Only the requester can cancel the request");
  assert(request.status === "open", "Only open requests can be cancelled");

  const receipt = createMutationReceipt(id, "local-cancel", overrides);

  request.status = "cancelled";
  request.updatedAtMs = Date.now();
  request.lastTxDigest = receipt.reference;

  if (escrow) {
    escrow.state = "refunded";
    escrow.recipient = request.requester;
    escrow.refunded = true;
    escrow.txDigest = receipt.reference;
  }

  pushActivity(db, {
    requestId: id,
    kind: "cancelled",
    source: overrides.transport ?? "local",
    timestampMs: request.updatedAtMs,
    actor,
    status: "cancelled",
    digest: receipt.reference
  });

  if (escrow) {
    pushActivity(db, {
      requestId: id,
      kind: "settled_refunded",
      source: overrides.transport ?? "local",
      timestampMs: request.updatedAtMs + 1,
      actor,
      digest: receipt.reference,
      amountMist: escrow.amountMist,
      recipient: request.requester,
      refunded: true
    });
  }

  writeLocalDb(db);

  return receipt;
}

export function getLocalDashboard(address: string): MyDashboardData {
  const db = readLocalDb();
  const postedRequests = toSortedRequests(
    db.requests.filter((request) => request.requester === address)
  );
  const acceptedRequests = toSortedRequests(
    db.requests.filter((request) => request.responder === address)
  );
  const dashboardRequestIds = new Set(
    [...postedRequests, ...acceptedRequests].map((request) => request.id)
  );
  const releasedEscrows = db.escrows.filter(
    (escrow) =>
      escrow.state === "released" &&
      acceptedRequests.some((request) => request.id === escrow.requestId)
  );
  const recentActivity =
    db.activities.length > 0
      ? toSortedRecentActivity(
          db.activities.filter((activity) => dashboardRequestIds.has(activity.requestId))
        ).slice(0, 8)
      : toSortedRecentActivity(
          [...dashboardRequestIds].flatMap((requestId) => getLocalRequestActivity(requestId))
        ).slice(0, 8);

  return {
    postedRequests,
    acceptedRequests,
    recentActivity,
    stats: buildProfileStats(address, db.requests),
    earnedMist: sumMist(releasedEscrows.map((escrow) => escrow.amountMist))
  };
}
