import { useQuery } from "@tanstack/react-query";
import { RequestActivityFeed } from "../components/RequestActivityFeed";
import { RequestList } from "../components/RequestList";
import { WalletRequiredNotice } from "../components/WalletRequiredNotice";
import {
  useResponseNetworkAdapter,
  useResponseNetworkRuntime
} from "../features/requests/AdapterContext";
import { formatSui, shortAddress } from "../features/requests/requestUtils";
import { useWalletSession } from "../features/wallet/useWalletSession";

export function MePage() {
  const adapter = useResponseNetworkAdapter();
  const runtime = useResponseNetworkRuntime();
  const { currentAccount } = useWalletSession();
  const chainRefetchInterval =
    runtime.mode === "chain" && runtime.chainReady && !runtime.isReadDegraded ? 5_000 : false;
  const { data, isLoading } = useQuery({
    queryKey: ["me", currentAccount?.address],
    queryFn: () => adapter.getMyDashboard(currentAccount?.address ?? ""),
    enabled: Boolean(currentAccount?.address),
    refetchInterval: chainRefetchInterval,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true
  });

  if (!currentAccount) {
    return (
      <WalletRequiredNotice body="Connect a wallet to see the contracts you posted, the work you accepted, and the settlement history tied to your account." />
    );
  }

  if (isLoading || !data) {
    return <section className="panel">Loading your console...</section>;
  }

  return (
    <div className="stack-lg">
      <section className="panel">
        <p className="eyebrow">Pilot console</p>
        <div className="identity-stack">
          <h2 className="wallet-heading">{shortAddress(currentAccount.address)}</h2>
          <p className="wallet-address">{currentAccount.address}</p>
        </div>
        <p className="subtle-text">Everything below is scoped to the currently connected wallet.</p>
        <div className="triptych">
          <article>
            <span>Jobs posted</span>
            <strong>{data.stats.jobsPosted}</strong>
          </article>
          <article>
            <span>Jobs completed</span>
            <strong>{data.stats.jobsCompleted}</strong>
          </article>
          <article>
            <span>Earnings released</span>
            <strong>{formatSui(data.earnedMist)}</strong>
          </article>
        </div>
      </section>

      <section className="stack-md">
        <div className="section-head">
          <div>
            <p className="eyebrow">Posted contracts</p>
            <h3>Your published distress calls</h3>
          </div>
        </div>
        {data.postedRequests.length > 0 ? (
          <RequestList requests={data.postedRequests} />
        ) : (
          <section className="panel empty-state">
            <h3>No posted contracts yet</h3>
            <p className="subtle-text">Open your first SOS to populate this console.</p>
          </section>
        )}
      </section>

      <section className="stack-md">
        <div className="section-head">
          <div>
            <p className="eyebrow">Accepted contracts</p>
            <h3>Your active and settled rescue work</h3>
          </div>
        </div>
        {data.acceptedRequests.length > 0 ? (
          <RequestList requests={data.acceptedRequests} />
        ) : (
          <section className="panel empty-state">
            <h3>No accepted rescue work yet</h3>
            <p className="subtle-text">
              Accept an open contract from the board to start building service history.
            </p>
          </section>
        )}
      </section>

      <section className="stack-md">
        <div className="section-head">
          <div>
            <p className="eyebrow">Recent proofs</p>
            <h3>Latest contract activity tied to this wallet</h3>
            <p className="subtle-text">
              The newest publish, status, and settlement receipts across every mission you touched.
            </p>
          </div>
        </div>
        {data.recentActivity.length > 0 ? (
          <section className="panel">
            <RequestActivityFeed activities={data.recentActivity} network={runtime.network} />
          </section>
        ) : (
          <section className="panel empty-state">
            <h3>No recent activity yet</h3>
            <p className="subtle-text">
              Once you publish, accept, or settle a contract, the latest proof trail will appear
              here.
            </p>
          </section>
        )}
      </section>
    </div>
  );
}
