import type { ServiceRequest } from "@frn/shared";
import { Link } from "react-router-dom";
import { dashboardRequestDetailPath } from "../app/routes";
import {
  formatCompactStatusLabel,
  formatDeadline,
  formatHazardLabel,
  formatStatusLabel,
  formatSui,
  shortAddress,
  shortDigest
} from "../features/requests/requestUtils";

type RequestListProps = {
  requests: ServiceRequest[];
};

export function RequestList({ requests }: RequestListProps) {
  return (
    <div className="request-list-shell">
      <div className="request-list">
        <div className="request-list-head">
          <span>Mission</span>
          <span>Reward</span>
          <span>Hazard</span>
          <span>Requester</span>
          <span>Status</span>
          <span>Deadline</span>
        </div>

        {requests.map((request) => (
          <Link
            key={request.id}
            className="request-row"
            to={dashboardRequestDetailPath(request.id)}
          >
            <div className="request-row-primary" data-label="Mission">
              <p className="request-row-title">{request.title}</p>
              <div className="request-row-copy-stack">
                <p className="request-row-copy">{request.startSystem}</p>
                {request.lastTxDigest ? (
                  <p className="request-row-proof">Latest proof {shortDigest(request.lastTxDigest)}</p>
                ) : null}
              </div>
            </div>
            <span data-label="Reward">{formatSui(request.rewardMist)}</span>
            <span data-label="Hazard">{formatHazardLabel(request.hazardLevel)}</span>
            <span data-label="Requester">{shortAddress(request.requester)}</span>
            <span
              className={`status-badge status-${request.status}`}
              data-label="Status"
              title={formatStatusLabel(request.status)}
            >
              {formatCompactStatusLabel(request.status)}
            </span>
            <span data-label="Deadline">{formatDeadline(request.deadlineMs)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
