import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppShell } from "../components/AppShell";

const retrySpy = vi.fn();

let mockRuntime = {
  mode: "chain" as const,
  network: "testnet" as const,
  chainId: "sui:testnet" as const,
  moduleName: "response_network",
  chainReady: true,
  dataSourceLabel: "Local mirror fallback",
  isReadChecking: false,
  isReadDegraded: true,
  readStatus: "degraded" as const,
  readStatusMessage: "RPC timeout",
  settlementLabel: "Signed Sui transactions",
  transportLabel: "Chain write mode",
  retryChainReads: retrySpy
};

vi.mock("../features/requests/AdapterContext", () => ({
  useResponseNetworkRuntime: () => mockRuntime
}));

vi.mock("../components/WalletPanel", () => ({
  WalletPanel: () => <div>Wallet rail</div>
}));

describe("AppShell", () => {
  beforeEach(() => {
    retrySpy.mockReset();
  });

  it("shows the degraded read banner and exposes retry", () => {
    render(
      <MemoryRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
        initialEntries={["/requests"]}
      >
        <AppShell>
          <div>Content</div>
        </AppShell>
      </MemoryRouter>
    );

    expect(screen.getByText("Chain read unavailable")).toBeInTheDocument();
    screen.getByRole("button", { name: "Retry chain read" }).click();
    expect(retrySpy).toHaveBeenCalledTimes(1);
  });
});
