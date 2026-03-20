import type { ServiceRequest } from "@frn/shared";
import { Link } from "react-router-dom";
import { dashboardRequestDetailPath } from "../app/routes";
import {
  formatDeadline,
  formatHazardLabel,
  formatStatusLabel,
  formatSui,
  shortAddress
} from "../features/requests/requestUtils";

type RequestCardProps = {
  request: ServiceRequest;
};

export function RequestCard({ request }: RequestCardProps) {
  return (
    <article className="request-card">
      <div className="request-card-head">
        <div>
          <p className="request-card-type">{request.jobType}</p>
          <h3>{request.title}</h3>
        </div>
        <span className={`status-badge status-${request.status}`}>
          {formatStatusLabel(request.status)}
        </span>
      </div>

      <p className="request-card-copy">{request.description}</p>

      <dl className="metric-grid">
        <div>
          <dt>Reward</dt>
          <dd>{formatSui(request.rewardMist)}</dd>
        </div>
        <div>
          <dt>Hazard</dt>
          <dd>{formatHazardLabel(request.hazardLevel)}</dd>
        </div>
        <div>
          <dt>Start</dt>
          <dd>{request.startSystem}</dd>
        </div>
        <div>
          <dt>Requester</dt>
          <dd>{shortAddress(request.requester)}</dd>
        </div>
      </dl>

      <div className="request-card-footer">
        <span className="subtle-text">{formatDeadline(request.deadlineMs)}</span>
        <Link className="button ghost" to={dashboardRequestDetailPath(request.id)}>
          View request
        </Link>
      </div>
    </article>
  );
}
