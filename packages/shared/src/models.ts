export type JobType = "rescue" | "escort" | "recovery";

export type RequestStatus =
  | "draft"
  | "open"
  | "accepted"
  | "in_progress"
  | "awaiting_confirmation"
  | "completed"
  | "cancelled"
  | "expired"
  | "disputed";

export type HazardLevel = "low" | "medium" | "high";

export type RequestActivityKind =
  | "created"
  | "accepted"
  | "in_progress"
  | "awaiting_confirmation"
  | "completed"
  | "cancelled"
  | "settled_released"
  | "settled_refunded";

export type ServiceRequest = {
  id: string;
  jobType: JobType;
  requester: string;
  responder?: string;
  startSystem: string;
  targetSystem?: string;
  hazardLevel: HazardLevel;
  title: string;
  description: string;
  rewardMist: string;
  deadlineMs: number;
  status: RequestStatus;
  createdAtMs: number;
  updatedAtMs: number;
  lastTxDigest?: string;
  needsFuel?: boolean;
  needsEscortHome?: boolean;
};

export type EscrowState = "locked" | "released" | "refunded";

export type EscrowRecord = {
  requestId: string;
  depositor: string;
  amountMist: string;
  tokenType: string;
  state: EscrowState;
  recipient?: string;
  refunded?: boolean;
  txDigest?: string;
};

export type ProfileStats = {
  wallet: string;
  jobsPosted: number;
  jobsCompleted: number;
  jobsCancelled: number;
  jobsFailed: number;
};

export type RequestActivity = {
  id: string;
  requestId: string;
  kind: RequestActivityKind;
  source: "chain" | "local";
  timestampMs: number;
  actor?: string;
  status?: RequestStatus;
  digest?: string;
  amountMist?: string;
  recipient?: string;
  refunded?: boolean;
};
