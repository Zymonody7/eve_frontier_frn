import type {
  EscrowRecord,
  HazardLevel,
  ProfileStats,
  RequestActivity,
  ServiceRequest
} from "@frn/shared";

export type MutationReceipt = {
  requestId: string;
  transport: "local" | "chain";
  reference: string;
};

export type CreateRescueRequestInput = {
  requester: string;
  startSystem: string;
  hazardLevel: HazardLevel;
  description: string;
  rewardMist: string;
  deadlineMs: number;
  needsFuel: boolean;
  needsEscortHome: boolean;
};

export type MyDashboardData = {
  postedRequests: ServiceRequest[];
  acceptedRequests: ServiceRequest[];
  recentActivity: RequestActivity[];
  stats: ProfileStats;
  earnedMist: string;
};

export interface ResponseNetworkAdapter {
  listRequests(): Promise<ServiceRequest[]>;
  listOpenRequests(): Promise<ServiceRequest[]>;
  getRequest(id: string): Promise<ServiceRequest | null>;
  getEscrow(id: string): Promise<EscrowRecord | null>;
  getRequestActivity(id: string): Promise<RequestActivity[]>;
  refreshChainReads(): Promise<void>;
  createRescueRequest(input: CreateRescueRequestInput): Promise<MutationReceipt>;
  acceptRequest(id: string, actor: string): Promise<MutationReceipt>;
  markInProgress(id: string, actor: string): Promise<MutationReceipt>;
  markAwaitingConfirmation(id: string, actor: string): Promise<MutationReceipt>;
  confirmCompletion(id: string, actor: string): Promise<MutationReceipt>;
  cancelOpenRequest(id: string, actor: string): Promise<MutationReceipt>;
  getMyDashboard(address: string): Promise<MyDashboardData>;
}
