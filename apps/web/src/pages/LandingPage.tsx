import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { appRoutes } from "../app/routes";
import { RequestCard } from "../components/RequestCard";
import {
  useResponseNetworkAdapter,
  useResponseNetworkRuntime
} from "../features/requests/AdapterContext";
import { formatNetworkLabel, shortAddress } from "../features/requests/requestUtils";

export function LandingPage() {
  const adapter = useResponseNetworkAdapter();
  const runtime = useResponseNetworkRuntime();
  const chainRefetchInterval =
    runtime.mode === "chain" && runtime.chainReady && !runtime.isReadDegraded ? 5_000 : false;
  const { data: requests = [] } = useQuery({
    queryKey: ["requests", "all"],
    queryFn: () => adapter.listRequests(),
    refetchInterval: chainRefetchInterval,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true
  });

  const liveContracts = requests.length;
  const activeContracts = requests.filter(
    (request) =>
      request.status === "accepted" ||
      request.status === "in_progress" ||
      request.status === "awaiting_confirmation"
  ).length;
  const settledContracts = requests.filter((request) => request.status === "completed").length;
  const responderCoverage = new Set(
    requests.map((request) => request.responder).filter(Boolean)
  ).size;

  return (
    <div className="marketing-shell">
      <header className="marketing-topbar">
        <Link className="marketing-brand" to={appRoutes.landing}>
          <div className="brand-mark">FRN</div>
          <div>
            <p className="eyebrow">Frontier Response Network</p>
            <h1 className="marketing-brand-title">Funded rescue contracts</h1>
          </div>
        </Link>

        <div className="marketing-topbar-actions">
          <Link className="button ghost" to={appRoutes.dashboardRequests}>
            Mission board
          </Link>
          <Link className="button primary" to={appRoutes.dashboard}>
            Open dashboard
          </Link>
        </div>
      </header>

      <section className="marketing-hero">
        <div className="marketing-hero-copy">
          <p className="eyebrow">Frontier rescue coordination</p>
          <h2 className="marketing-hero-title">Fund the mission first.</h2>
          <p className="marketing-hero-body">
            FRN turns rescue ops into one readable flow: funded upfront, claimed by a responder,
            released after confirmation.
          </p>

          <div className="button-row">
            <Link className="button primary" to={appRoutes.dashboard}>
              Open dashboard
            </Link>
            <Link className="button ghost" to={appRoutes.dashboardNewRequest}>
              Publish SOS
            </Link>
          </div>

          <div className="marketing-proof-strip">
            <article>
              <strong>Escrow first</strong>
              <p>No unfunded rescue work.</p>
            </article>
            <article>
              <strong>Clear state flow</strong>
              <p>Open to settled, with no mystery states.</p>
            </article>
            <article>
              <strong>Proof in the UI</strong>
              <p>Digests, ids, and explorer links stay visible.</p>
            </article>
          </div>
        </div>

        <aside className="marketing-signal-card">
          <p className="eyebrow">How it works</p>
          <h3>Three steps. No ambiguity.</h3>
          <div className="marketing-step-list">
            <article className="marketing-step">
              <strong className="marketing-step-number">1</strong>
              <div>
                <h3>Requester funds the mission</h3>
                <p>Reward, route, and deadline are set before signing.</p>
              </div>
            </article>
            <article className="marketing-step">
              <strong className="marketing-step-number">2</strong>
              <div>
                <h3>Responder claims funded work</h3>
                <p>No guessing whether the payout exists.</p>
              </div>
            </article>
            <article className="marketing-step">
              <strong className="marketing-step-number">3</strong>
              <div>
                <h3>Requester confirms release</h3>
                <p>The final payout follows the recorded settlement proof.</p>
              </div>
            </article>
          </div>

          <div className="marketing-stats-grid">
            <article>
              <span>Visible</span>
              <strong>{liveContracts}</strong>
            </article>
            <article>
              <span>Active</span>
              <strong>{activeContracts}</strong>
            </article>
            <article>
              <span>Responders</span>
              <strong>{responderCoverage}</strong>
            </article>
            <article>
              <span>Settled</span>
              <strong>{settledContracts}</strong>
            </article>
          </div>

          <p className="marketing-runtime-line">
            {formatNetworkLabel(runtime.network)} · {runtime.transportLabel}
          </p>
          <p className="marketing-runtime-line subtle-text">
            {runtime.isReadDegraded
              ? "Fallback mode is visible in the dashboard."
              : runtime.dataSourceLabel}
            {runtime.packageId ? ` · ${shortAddress(runtime.packageId)}` : ""}
          </p>
        </aside>
      </section>

      <section className="marketing-live-section" id="live">
        <div className="marketing-section-head">
          <div>
            <p className="eyebrow">Live missions</p>
            <h3>Recent contracts from the network</h3>
            <p className="subtle-text">A preview of what is live right now.</p>
          </div>
          <Link className="button ghost" to={appRoutes.dashboardRequests}>
            Open mission board
          </Link>
        </div>

        {requests.length > 0 ? (
          <div className="request-grid">
            {requests.slice(0, 3).map((request) => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>
        ) : (
          <section className="empty-state">
            <h3>No live rescue contracts yet</h3>
            <p className="subtle-text">
              Enter the dashboard and publish the first SOS to turn this landing page into a live
              operations surface.
            </p>
          </section>
        )}
      </section>
    </div>
  );
}
