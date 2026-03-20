import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { NewRequestPage } from "../pages/NewRequestPage";

let mockAdapter: {
  createRescueRequest: ReturnType<typeof vi.fn>;
};

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
  accountChains: ["sui:testnet"],
  currentAccount: {
    address: "0xrequester111111111111111111111111111111111111111111"
  },
  network: "testnet"
};

let mockWalletBalance = {
  data: {
    totalBalance: "1000000000"
  },
  isLoading: false
};

vi.mock("../features/requests/AdapterContext", () => ({
  useResponseNetworkAdapter: () => mockAdapter,
  useResponseNetworkRuntime: () => mockRuntime
}));

vi.mock("../features/wallet/useWalletSession", () => ({
  useWalletSession: () => mockWalletSession
}));

vi.mock("../features/wallet/useWalletBalance", () => ({
  useWalletBalance: () => mockWalletBalance
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
        <NewRequestPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("NewRequestPage", () => {
  beforeEach(() => {
    mockAdapter = {
      createRescueRequest: vi.fn().mockResolvedValue({
        requestId: "0xreq-1",
        reference: "digest-create",
        transport: "chain"
      })
    };
    mockRuntime = {
      ...mockRuntime,
      retryChainReads: vi.fn()
    };
    mockWalletSession = {
      accountChains: ["sui:testnet"],
      currentAccount: {
        address: "0xrequester111111111111111111111111111111111111111111"
      },
      network: "testnet"
    };
    mockWalletBalance = {
      data: {
        totalBalance: "1000000000"
      },
      isLoading: false
    };
  });

  it("blocks publish when the wallet cannot cover bounty plus gas", () => {
    renderPage();

    expect(
      screen.getByRole("button", { name: "Publish rescue request on-chain" })
    ).toBeDisabled();
    expect(screen.getByText("1 SUI available")).toBeInTheDocument();
    expect(screen.getByText("3.7 SUI")).toBeInTheDocument();
  });

  it("submits a valid request when preflight passes", async () => {
    mockWalletBalance = {
      data: {
        totalBalance: "9000000000"
      },
      isLoading: false
    };

    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Publish rescue request on-chain" }));

    await waitFor(() => {
      expect(mockAdapter.createRescueRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          requester: mockWalletSession.currentAccount.address,
          startSystem: "Nomad's Wake",
          rewardMist: "3500000000"
        })
      );
    });
  });
});
