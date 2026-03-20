import type { RequestActivity } from "@frn/shared";
import { CopyButton } from "./CopyButton";
import {
  buildSuiExplorerTransactionUrl,
  formatRequestActivityBody,
  formatRequestActivityTitle,
  formatTimestamp,
  shortDigest
} from "../features/requests/requestUtils";

type RequestActivityFeedProps = {
  activities: RequestActivity[];
  network: "mainnet" | "testnet" | "devnet";
};

export function RequestActivityFeed({ activities, network }: RequestActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <section className="empty-state">
        <h3>No activity recorded yet</h3>
        <p className="subtle-text">
          Once the mission starts moving, each chain step and settlement event will appear here.
        </p>
      </section>
    );
  }

  return (
    <ol className="activity-feed">
      {activities.map((activity) => (
        <li key={activity.id} className="activity-item">
          <div className="activity-item-head">
            <div>
              <p className="activity-title">{formatRequestActivityTitle(activity)}</p>
              <p className="subtle-text">{formatRequestActivityBody(activity)}</p>
            </div>
            <span className="inline-badge">{formatTimestamp(activity.timestampMs)}</span>
          </div>

          {activity.digest ? (
            <div className="activity-proof-row">
              <span className="subtle-text">Digest {shortDigest(activity.digest)}</span>
              <div className="button-row">
                <CopyButton idleLabel="Copy digest" value={activity.digest} />
                {activity.source === "chain" ? (
                  <a
                    className="button ghost"
                    href={buildSuiExplorerTransactionUrl(activity.digest, network)}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open digest
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
