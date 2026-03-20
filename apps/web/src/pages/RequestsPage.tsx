import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { HazardLevel, ServiceRequest } from "@frn/shared";
import { RequestList } from "../components/RequestList";
import {
  useResponseNetworkAdapter,
  useResponseNetworkRuntime
} from "../features/requests/AdapterContext";

export function RequestsPage() {
  const adapter = useResponseNetworkAdapter();
  const runtime = useResponseNetworkRuntime();
  const chainRefetchInterval =
    runtime.mode === "chain" && runtime.chainReady && !runtime.isReadDegraded ? 15_000 : false;
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["requests", "all"],
    queryFn: () => adapter.listRequests(),
    refetchInterval: chainRefetchInterval,
    refetchIntervalInBackground: true
  });
  const [hazard, setHazard] = useState<"all" | HazardLevel>("all");
  const [status, setStatus] = useState<"all" | ServiceRequest["status"]>("all");

  const filtered = useMemo(() => {
    return requests.filter((request) => {
      if (hazard !== "all" && request.hazardLevel !== hazard) {
        return false;
      }

      if (status !== "all" && request.status !== status) {
        return false;
      }

      return true;
    });
  }, [hazard, requests, status]);

  return (
    <div className="stack-lg">
      <section className="panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Request board</p>
            <h2>Open rescue missions and recent settlements</h2>
            <p className="subtle-text">
              Reads currently come from {runtime.dataSourceLabel.toLowerCase()} with wallet
              actions driving status changes.
            </p>
          </div>
          <p className="subtle-text">{filtered.length} visible requests</p>
        </div>

        <div className="mini-stat-grid">
          <article>
            <span>Open</span>
            <strong>{requests.filter((request) => request.status === "open").length}</strong>
          </article>
          <article>
            <span>Active</span>
            <strong>
              {
                requests.filter(
                  (request) =>
                    request.status === "accepted" || request.status === "in_progress"
                ).length
              }
            </strong>
          </article>
          <article>
            <span>Awaiting confirmation</span>
            <strong>
              {
                requests.filter((request) => request.status === "awaiting_confirmation").length
              }
            </strong>
          </article>
          <article>
            <span>Completed</span>
            <strong>{requests.filter((request) => request.status === "completed").length}</strong>
          </article>
        </div>

        <div className="filters">
          <label>
            Hazard
            <select value={hazard} onChange={(event) => setHazard(event.target.value as typeof hazard)}>
              <option value="all">All</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <label>
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
              <option value="all">All</option>
              <option value="open">Open</option>
              <option value="accepted">Accepted</option>
              <option value="in_progress">In progress</option>
              <option value="awaiting_confirmation">Awaiting confirmation</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
        </div>
      </section>

      {isLoading ? <p className="panel">Loading requests...</p> : null}

      {filtered.length > 0 ? <RequestList requests={filtered} /> : null}

      {!isLoading && filtered.length === 0 ? (
        <section className="panel empty-state">
          <h3>No requests match the current filters</h3>
          <p className="subtle-text">
            If the board is empty, connect a wallet and publish the first rescue contract.
          </p>
        </section>
      ) : null}
    </div>
  );
}
