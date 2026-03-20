import { Link, NavLink, useLocation } from "react-router-dom";
import type { PropsWithChildren } from "react";
import { WalletPanel } from "./WalletPanel";
import { useResponseNetworkRuntime } from "../features/requests/AdapterContext";
import { appRoutes } from "../app/routes";

export function AppShell({ children }: PropsWithChildren) {
  const location = useLocation();
  const runtime = useResponseNetworkRuntime();
  const pathname = location.pathname;
  const isNewRequest =
    pathname === appRoutes.dashboardNewRequest || pathname === "/requests/new";
  const isRequestDetail =
    (pathname.startsWith(`${appRoutes.dashboardRequests}/`) &&
      pathname !== appRoutes.dashboardRequests &&
      pathname !== appRoutes.dashboardNewRequest) ||
    (pathname.startsWith("/requests/") && pathname !== "/requests" && pathname !== "/requests/new");
  const isRequestsBoard =
    pathname === appRoutes.dashboardRequests || pathname === "/requests";
  const isMePage = pathname === appRoutes.dashboardMe || pathname === "/me";
  const pageMeta = isNewRequest
    ? {
        title: "Post SOS"
      }
    : isRequestDetail
      ? {
          title: "Mission detail"
        }
      : isRequestsBoard
        ? {
            title: "Mission board"
          }
        : isMePage
          ? {
              title: "My activity"
            }
          : {
              title: "Operator dashboard"
            };

  return (
    <div className="app-shell">
      <header className="shell-card app-header">
        <div className="app-header-main">
          <Link className="app-header-brand" to={appRoutes.dashboard}>
            <div className="brand-mark">FRN</div>
            <div>
              <p className="eyebrow">Frontier Response Network</p>
            </div>
          </Link>

          <div className="app-header-copy">
            <h2 className="page-title">{pageMeta.title}</h2>
          </div>

          <div className="app-header-side">
            <div className="topbar-meta">
              <span className="inline-badge">{runtime.network}</span>
              <span className={`inline-badge ${runtime.mode === "chain" ? "is-accent" : ""}`}>
                {runtime.transportLabel}
              </span>
            </div>

            <Link className="button primary" to={appRoutes.dashboardNewRequest}>
              New SOS
            </Link>
          </div>
        </div>

        <nav className="app-header-nav" aria-label="Primary">
          <NavLink className="nav-link" end to={appRoutes.dashboard}>
            Overview
          </NavLink>
          <NavLink className="nav-link" end to={appRoutes.dashboardRequests}>
            Missions
          </NavLink>
          <NavLink className="nav-link" to={appRoutes.dashboardNewRequest}>
            Post SOS
          </NavLink>
          <NavLink className="nav-link" to={appRoutes.dashboardMe}>
            My activity
          </NavLink>
        </nav>
      </header>

      <div className="app-body">
        <aside className="app-sidebar">
          <WalletPanel />
        </aside>

        <div className="app-main">
          {runtime.isReadDegraded || runtime.isReadChecking ? (
            <section
              className={`chain-read-banner panel panel-tight ${
                runtime.isReadDegraded ? "is-degraded" : ""
              }`}
            >
              <div>
                <p className="eyebrow">Read status</p>
                <h3>{runtime.isReadDegraded ? "Chain read unavailable" : "Retrying chain read"}</h3>
                <p className="subtle-text">
                  {runtime.isReadDegraded
                    ? "Showing local mirror fallback until Sui reads recover."
                    : "Refreshing the on-chain read model for all visible request data."}
                  {runtime.readStatusMessage ? ` ${runtime.readStatusMessage}` : ""}
                </p>
              </div>
              <div className="button-row">
                <button
                  className="button primary"
                  disabled={runtime.isReadChecking}
                  onClick={() => void runtime.retryChainReads()}
                  type="button"
                >
                  {runtime.isReadChecking ? "Retrying..." : "Retry chain read"}
                </button>
              </div>
            </section>
          ) : null}

          <main className="page-shell">{children}</main>
        </div>
      </div>
    </div>
  );
}
