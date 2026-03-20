import type { RequestActivity } from "@frn/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MePage } from "../pages/MePage";

const recentActivity: RequestActivity[] = [
  {
    id: "activity-settled",
    requestId: "0xrequest-1",
    kind: "settled_released",
    source: "chain",
    timestampMs: Date.now(),
    digest: "digest-confirm",
    amountMist: "3500000000",
    recipient: "0xresponder222222222222222222222222222222222222222222",
    refunded: false
  }
];

const mockAdapter = {
  getMyDashboard: vi.fn(async () => ({
    postedRequests: [],
    acceptedRequests: [],
    recentActivity,
    stats: {
      wallet: "0xrequester111111111111111111111111111111111111111111",
      jobsPosted: 1,
      jobsCompleted: 0,
      jobsCancelled: 0,
      jobsFailed: 0
    },
    earnedMist: "0"
  }))
};

const mockRuntime = {
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

const mockWalletSession = {
  currentAccount: {
    address: "0xrequester111111111111111111111111111111111111111111"
  }
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

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <MePage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("MePage", () => {
  it("renders the recent proof feed for the connected wallet", async () => {
    renderPage();

    await screen.findByText("Latest contract activity tied to this wallet");
    expect(screen.getByText("Escrow released bounty")).toBeInTheDocument();
    expect(screen.getByText(/digest-confirm/)).toBeInTheDocument();
  });
});
