import type { EscrowRecord, RequestActivity, ServiceRequest } from "@frn/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RequestDetailPage } from "../pages/RequestDetailPage";

let mockRuntime = {
  mode: "chain" as const,
  network: "testnet" as const,
  chainId: "sui:testnet" as const,
  moduleName: "response_network",
  chainReady: true,
  dataSourceLabel: "Sui event + object read model",
  isReadChecking: false,
  isReadDegraded: false,
  readStatus: "healthy" as const,
  readStatusMessage: undefined,
  settlementLabel: "Signed Sui transactions",
  transportLabel: "Chain write mode",
  retryChainReads: vi.fn()
};

let mockWalletSession = {
  currentAccount: {
    address: "0xresponder222222222222222222222222222222222222222222"
  }
};

const requestState: {
  activities: RequestActivity[];
  escrow: EscrowRecord;
  request: ServiceRequest;
} = {
  request: {
    id: "0xrequest-1",
    jobType: "rescue",
    requester: "0xrequester111111111111111111111111111111111111111111",
    startSystem: "Nomad's Wake",
    hazardLevel: "high",
    title: "Rescue and escort needed from Nomad's Wake",
    description: "Fuel reserve fell below safe return threshold.",
    rewardMist: "3500000000",
    deadlineMs: Date.now() + 6 * 60 * 60 * 1000,
    status: "open",
    createdAtMs: Date.now(),
    updatedAtMs: Date.now(),
    lastTxDigest: "digest-create",
    needsFuel: true,
    needsEscortHome: true
  },
  escrow: {
    requestId: "0xrequest-1",
    depositor: "0xrequester111111111111111111111111111111111111111111",
    amountMist: "3500000000",
    tokenType: "SUI",
    state: "locked",
    txDigest: "digest-create",
    refunded: false
  },
  activities: [
    {
      id: "activity-created",
      requestId: "0xrequest-1",
      kind: "created",
      source: "chain",
      timestampMs: Date.now(),
      actor: "0xrequester111111111111111111111111111111111111111111",
      status: "open",
      digest: "digest-create",
      amountMist: "3500000000"
    }
  ]
};

const mockAdapter = {
  listRequests: vi.fn(),
  listOpenRequests: vi.fn(),
  getRequest: vi.fn(async () => ({ ...requestState.request })),
  getEscrow: vi.fn(async () => ({ ...requestState.escrow })),
  getRequestActivity: vi.fn(async () => [...requestState.activities]),
  refreshChainReads: vi.fn(),
  getMyDashboard: vi.fn(),
  createRescueRequest: vi.fn(),
  acceptRequest: vi.fn(async (_id: string, actor: string) => {
    requestState.request.status = "accepted";
    requestState.request.responder = actor;
    requestState.request.updatedAtMs += 1;
    requestState.request.lastTxDigest = "digest-accept";
    requestState.escrow.txDigest = "digest-accept";
    requestState.activities.push({
      id: "activity-accept",
      requestId: requestState.request.id,
      kind: "accepted",
      source: "chain",
      timestampMs: requestState.request.updatedAtMs,
      actor,
      status: "accepted",
      digest: "digest-accept"
    });
    return {
      requestId: requestState.request.id,
      reference: "digest-accept",
      transport: "chain" as const
    };
  }),
  markInProgress: vi.fn(async (_id: string, actor: string) => {
    requestState.request.status = "in_progress";
    requestState.request.updatedAtMs += 1;
    requestState.request.lastTxDigest = "digest-progress";
    requestState.escrow.txDigest = "digest-progress";
    requestState.activities.push({
      id: "activity-progress",
      requestId: requestState.request.id,
      kind: "in_progress",
      source: "chain",
      timestampMs: requestState.request.updatedAtMs,
      actor,
      status: "in_progress",
      digest: "digest-progress"
    });
    return {
      requestId: requestState.request.id,
      reference: "digest-progress",
      transport: "chain" as const
    };
  }),
  markAwaitingConfirmation: vi.fn(async (_id: string, actor: string) => {
    requestState.request.status = "awaiting_confirmation";
    requestState.request.updatedAtMs += 1;
    requestState.request.lastTxDigest = "digest-awaiting";
    requestState.escrow.txDigest = "digest-awaiting";
    requestState.activities.push({
      id: "activity-awaiting",
      requestId: requestState.request.id,
      kind: "awaiting_confirmation",
      source: "chain",
      timestampMs: requestState.request.updatedAtMs,
      actor,
      status: "awaiting_confirmation",
      digest: "digest-awaiting"
    });
    return {
      requestId: requestState.request.id,
      reference: "digest-awaiting",
      transport: "chain" as const
    };
  }),
  confirmCompletion: vi.fn(async (_id: string, actor: string) => {
    requestState.request.status = "completed";
    requestState.request.updatedAtMs += 1;
    requestState.request.lastTxDigest = "digest-confirm";
    requestState.escrow.state = "released";
    requestState.escrow.recipient = requestState.request.responder;
    requestState.escrow.refunded = false;
    requestState.escrow.txDigest = "digest-confirm";
    requestState.activities.push(
      {
        id: "activity-completed",
        requestId: requestState.request.id,
        kind: "completed",
        source: "chain",
        timestampMs: requestState.request.updatedAtMs,
        actor,
        status: "completed",
        digest: "digest-confirm"
      },
      {
        id: "activity-settled",
        requestId: requestState.request.id,
        kind: "settled_released",
        source: "chain",
        timestampMs: requestState.request.updatedAtMs + 1,
        digest: "digest-confirm",
        amountMist: requestState.escrow.amountMist,
        recipient: requestState.request.responder,
        refunded: false
      }
    );
    return {
      requestId: requestState.request.id,
      reference: "digest-confirm",
      transport: "chain" as const
    };
  }),
  cancelOpenRequest: vi.fn()
};

vi.mock("../features/requests/AdapterContext", () => ({
  useResponseNetworkAdapter: () => mockAdapter,
  useResponseNetworkRuntime: () => mockRuntime
}));

vi.mock("../features/wallet/useWalletSession", () => ({
  useWalletSession: () => mockWalletSession
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });

  const ui = (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
        initialEntries={["/requests/0xrequest-1"]}
      >
        <Routes>
          <Route path="/requests/:requestId" element={<RequestDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );

  return {
    queryClient,
    ...render(ui),
    rerenderWithRouter() {
      return render(ui);
    }
  };
}

describe("RequestDetailPage", () => {
  beforeEach(() => {
    requestState.request = {
      id: "0xrequest-1",
      jobType: "rescue",
      requester: "0xrequester111111111111111111111111111111111111111111",
      startSystem: "Nomad's Wake",
      hazardLevel: "high",
      title: "Rescue and escort needed from Nomad's Wake",
      description: "Fuel reserve fell below safe return threshold.",
      rewardMist: "3500000000",
      deadlineMs: Date.now() + 6 * 60 * 60 * 1000,
      status: "open",
      createdAtMs: Date.now(),
      updatedAtMs: Date.now(),
      lastTxDigest: "digest-create",
      needsFuel: true,
      needsEscortHome: true
    };
    requestState.escrow = {
      requestId: "0xrequest-1",
      depositor: "0xrequester111111111111111111111111111111111111111111",
      amountMist: "3500000000",
      tokenType: "SUI",
      state: "locked",
      txDigest: "digest-create",
      refunded: false
    };
    requestState.activities = [
      {
        id: "activity-created",
        requestId: "0xrequest-1",
        kind: "created",
        source: "chain",
        timestampMs: Date.now(),
        actor: "0xrequester111111111111111111111111111111111111111111",
        status: "open",
        digest: "digest-create",
        amountMist: "3500000000"
      }
    ];
    mockWalletSession = {
      currentAccount: {
        address: "0xresponder222222222222222222222222222222222222222222"
      }
    };
  });

  it("walks the contract from accept to settlement and renders the activity feed", async () => {
    const view = renderPage();

    await screen.findByText("Accept request");
    fireEvent.click(screen.getByRole("button", { name: "Accept request" }));

    await screen.findByText("Mark in progress");
    fireEvent.click(screen.getByRole("button", { name: "Mark in progress" }));

    await screen.findByText("Mark awaiting confirmation");
    fireEvent.click(screen.getByRole("button", { name: "Mark awaiting confirmation" }));
    const latestDigestProof = screen.getByText("Latest transaction digest").parentElement;
    expect(latestDigestProof).not.toBeNull();
    await waitFor(() => {
      expect(
        within(latestDigestProof as HTMLElement).getByText("digest-awaiting")
      ).toBeInTheDocument();
      expect(screen.getByText("Awaiting requester confirmation")).toBeInTheDocument();
    });

    mockWalletSession = {
      currentAccount: {
        address: "0xrequester111111111111111111111111111111111111111111"
      }
    };

    view.unmount();
    renderPage();

    await screen.findByText("Confirm completion");
    fireEvent.click(screen.getByRole("button", { name: "Confirm completion" }));

    await waitFor(() => {
      expect(screen.getByText("Released")).toBeInTheDocument();
      expect(screen.getByText("Escrow released bounty")).toBeInTheDocument();
      expect(screen.getByText("Responder accepted mission")).toBeInTheDocument();
      const updatedDigestProof = screen.getByText("Latest transaction digest").parentElement;
      expect(updatedDigestProof).not.toBeNull();
      expect(
        within(updatedDigestProof as HTMLElement).getByText("digest-confirm")
      ).toBeInTheDocument();
      expect(screen.getByText("Requester confirmed completion")).toBeInTheDocument();
    });
  });
});
