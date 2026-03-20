import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { RequestList } from "../components/RequestList";
import { appRoutes } from "../app/routes";
import {
  useResponseNetworkAdapter,
  useResponseNetworkRuntime
} from "../features/requests/AdapterContext";
import { formatNetworkLabel, shortAddress } from "../features/requests/requestUtils";
import { useWalletSession } from "../features/wallet/useWalletSession";

export function DashboardOverviewPage() {
  const adapter = useResponseNetworkAdapter();
  const runtime = useResponseNetworkRuntime();
  const { currentAccount, network } = useWalletSession();
  const chainRefetchInterval =
    runtime.mode === "chain" && runtime.chainReady && !runtime.isReadDegraded ? 15_000 : false;
  const { data: requests = [] } = useQuery({
    queryKey: ["requests", "all"],
    queryFn: () => adapter.listRequests(),
    refetchInterval: chainRefetchInterval,
    refetchIntervalInBackground: true
  });

  const openRequests = requests.filter((request) => request.status === "open");
  const activeRequests = requests.filter(
    (request) => request.status === "accepted" || request.status === "in_progress"
  );
  const awaitingRequests = requests.filter(
    (request) => request.status === "awaiting_confirmation"
  );
  const settledRequests = requests.filter((request) => request.status === "completed");
  const responseCoverage = new Set(
    requests.flatMap((request) => [request.requester, request.responder].filter(Boolean))
  ).size;
  const walletStateLabel = currentAccount
    ? shortAddress(currentAccount.address)
    : "Wallet not connected";

  return (
    <div className="stack-xl">
      <section className="panel overview-hero">
        <div className="section-head">
          <div>
            <p className="eyebrow">Overview</p>
            <h2>Mission pulse</h2>
            <p className="subtle-text">The current state of funded rescue work.</p>
          </div>
          <div className="overview-note">
            <span className={`inline-badge ${currentAccount ? "is-accent" : ""}`}>
              {walletStateLabel}
            </span>
            <p className="subtle-text">
              {currentAccount
                ? "Ready to act on missions tied to this wallet."
                : "Browse first, connect when you need to act."}
            </p>
          </div>
        </div>

        <div className="overview-stat-grid">
          <article className="stat-card">
            <span>Open queue</span>
            <strong>{openRequests.length}</strong>
            <p className="subtle-text">Waiting for a responder.</p>
          </article>
          <article className="stat-card">
            <span>Active missions</span>
            <strong>{activeRequests.length}</strong>
            <p className="subtle-text">{awaitingRequests.length} awaiting confirmation.</p>
          </article>
          <article className="stat-card">
            <span>Network target</span>
            <strong>{formatNetworkLabel(network)}</strong>
            <p className="subtle-text">
              {runtime.chainReady
                ? runtime.transportLabel
                : "Chain wiring still needs setup."}
            </p>
          </article>
          <article className="stat-card">
            <span>Visible pilots</span>
            <strong>{responseCoverage}</strong>
            <p className="subtle-text">{settledRequests.length} settled missions.</p>
          </article>
        </div>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Live board</p>
            <h3>Recent rescue work</h3>
            <p className="subtle-text">Open a mission to inspect proof and status.</p>
          </div>
          <Link className="button ghost" to={appRoutes.dashboardRequests}>
            Open full board
          </Link>
        </div>

        {requests.length > 0 ? (
          <RequestList requests={requests.slice(0, 6)} />
        ) : (
          <section className="empty-state">
            <h3>No requests yet</h3>
            <p className="subtle-text">
              Connect a wallet and publish the first contract to turn the board live.
            </p>
          </section>
        )}
      </section>
    </div>
  );
}
