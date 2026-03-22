import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { CopyButton } from "../components/CopyButton";
import { RequestActivityFeed } from "../components/RequestActivityFeed";
import { RequestTimeline } from "../components/RequestTimeline";
import { WalletRequiredNotice } from "../components/WalletRequiredNotice";
import type { MutationReceipt } from "../features/requests/adapter";
import {
  useResponseNetworkAdapter,
  useResponseNetworkRuntime
} from "../features/requests/AdapterContext";
import {
  buildSuiExplorerObjectUrl,
  buildSuiExplorerTransactionUrl,
  formatDeadline,
  formatEscrowStateLabel,
  formatHazardLabel,
  formatMutationReceiptLabel,
  formatSui,
  formatStatusLabel,
  isRequester,
  isResponder,
  shortAddress,
  shortDigest
} from "../features/requests/requestUtils";
import { useWalletSession } from "../features/wallet/useWalletSession";

function ExplorerAnchor({ href, label }: { href: string; label: string }) {
  return (
    <a className="button ghost" href={href} rel="noreferrer" target="_blank">
      {label}
    </a>
  );
}

export function RequestDetailPage() {
  const { requestId = "" } = useParams();
  const adapter = useResponseNetworkAdapter();
  const runtime = useResponseNetworkRuntime();
  const queryClient = useQueryClient();
  const { currentAccount } = useWalletSession();
  const [lastReceipt, setLastReceipt] = useState<MutationReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const chainRefetchInterval =
    runtime.mode === "chain" && runtime.chainReady && !runtime.isReadDegraded ? 5_000 : false;

  const { data: request, isLoading } = useQuery({
    queryKey: ["requests", "detail", requestId],
    queryFn: () => adapter.getRequest(requestId),
    refetchInterval: chainRefetchInterval,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true
  });

  const { data: escrow } = useQuery({
    queryKey: ["escrow", requestId],
    queryFn: () => adapter.getEscrow(requestId),
    enabled: Boolean(requestId),
    refetchInterval: chainRefetchInterval,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true
  });
  const { data: activities = [] } = useQuery({
    queryKey: ["requests", "activity", requestId],
    queryFn: () => adapter.getRequestActivity(requestId),
    enabled: Boolean(requestId),
    refetchInterval: chainRefetchInterval,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true
  });

  const actionMutation = useMutation({
    mutationFn: async (action: "accept" | "progress" | "awaiting" | "confirm" | "cancel") => {
      const actor = currentAccount?.address;

      if (!actor) {
        throw new Error("Connect a wallet before performing request actions.");
      }

      switch (action) {
        case "accept":
          return adapter.acceptRequest(requestId, actor);
        case "progress":
          return adapter.markInProgress(requestId, actor);
        case "awaiting":
          return adapter.markAwaitingConfirmation(requestId, actor);
        case "confirm":
          return adapter.confirmCompletion(requestId, actor);
        case "cancel":
          return adapter.cancelOpenRequest(requestId, actor);
      }
    },
    onSuccess: async (result) => {
      setError(null);
      setLastReceipt(result);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["requests"] }),
        queryClient.invalidateQueries({ queryKey: ["requests", "activity", requestId] }),
        queryClient.invalidateQueries({ queryKey: ["me"] }),
        queryClient.invalidateQueries({ queryKey: ["escrow", requestId] })
      ]);
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "Unexpected error");
    }
  });

  if (isLoading) {
    return <section className="panel">Loading request...</section>;
  }

  if (!request) {
    return (
      <section className="panel">
        <h2>Request not found</h2>
        <p className="subtle-text">It may have expired or the id is incorrect.</p>
      </section>
    );
  }

  const viewerAddress = currentAccount?.address;
  const viewerIsRequester = viewerAddress ? isRequester(request, viewerAddress) : false;
  const viewerIsResponder = viewerAddress ? isResponder(request, viewerAddress) : false;
  const viewerRole = viewerIsRequester
    ? "Requester"
    : viewerIsResponder
      ? "Responder"
      : "Observer";
  const viewerSummary = viewerIsRequester
    ? request.status === "open"
      ? "You can cancel this SOS before a responder accepts it."
      : request.status === "awaiting_confirmation"
        ? "You control the final settlement release."
        : "You are the payout sponsor and final confirmer for this contract."
    : viewerIsResponder
      ? request.status === "open"
        ? "You can accept this mission from this page."
        : "You can advance the rescue until requester confirmation."
      : "Switch to the requester or responder wallet to continue the mission flow.";
  const latestDigest =
    (lastReceipt?.transport === "chain" ? lastReceipt.reference : undefined) ??
    request.lastTxDigest ??
    escrow?.txDigest ??
    null;
  const requestExplorerUrl =
    runtime.mode === "chain" && request.id.startsWith("0x")
      ? buildSuiExplorerObjectUrl(request.id, runtime.network)
      : null;
  const digestExplorerUrl = latestDigest
    ? runtime.mode === "chain"
      ? buildSuiExplorerTransactionUrl(latestDigest, runtime.network)
      : null
    : null;
  const settlementRecipient =
    escrow?.recipient ??
    (request.status === "completed"
      ? request.responder
      : request.status === "cancelled"
        ? request.requester
        : undefined);
  const isRefunded = escrow?.refunded ?? request.status === "cancelled";
  const canAccept = request.status === "open" && Boolean(currentAccount) && !viewerIsRequester;
  const canMarkInProgress =
    request.status === "accepted" && Boolean(currentAccount) && viewerIsResponder;
  const canMarkAwaitingConfirmation =
    (request.status === "accepted" || request.status === "in_progress") &&
    Boolean(currentAccount) &&
    viewerIsResponder;
  const canConfirmCompletion =
    request.status === "awaiting_confirmation" && Boolean(currentAccount) && viewerIsRequester;
  const canCancel = request.status === "open" && Boolean(currentAccount) && viewerIsRequester;
  const canTakeAction =
    canAccept ||
    canMarkInProgress ||
    canMarkAwaitingConfirmation ||
    canConfirmCompletion ||
    canCancel;
  const actionHint = !currentAccount
    ? null
    : request.status === "awaiting_confirmation"
      ? viewerIsRequester
        ? "Confirm completion to release the escrowed reward to the responder."
        : "Switch back to the requester wallet to finish this contract."
      : request.status === "completed"
        ? "This contract is already completed and the escrow has been released."
        : request.status === "cancelled"
          ? "This contract has already been cancelled and refunded."
          : viewerIsRequester
            ? "Wait for a responder to advance the mission before the next requester action."
            : viewerIsResponder
              ? "Advance the mission from this wallet when you are ready."
              : "Switch to the requester or responder wallet to continue this mission.";

  return (
    <div className="stack-lg">
      <section className="panel request-detail-head">
        <div>
          <p className="eyebrow">{request.jobType} contract</p>
          <h2>{request.title}</h2>
          <p className="subtle-text">{request.description}</p>
        </div>
        <span className={`status-badge status-${request.status}`}>
          {formatStatusLabel(request.status)}
        </span>
      </section>

      <section className="detail-grid">
        <article className="panel">
          <p className="eyebrow">Mission overview</p>
          <dl className="metric-grid">
            <div>
              <dt>Requester</dt>
              <dd>{shortAddress(request.requester)}</dd>
            </div>
            <div>
              <dt>Responder</dt>
              <dd>{request.responder ? shortAddress(request.responder) : "Unassigned"}</dd>
            </div>
            <div>
              <dt>Reward locked</dt>
              <dd>{formatSui(request.rewardMist)}</dd>
            </div>
            <div>
              <dt>Hazard</dt>
              <dd>{formatHazardLabel(request.hazardLevel)}</dd>
            </div>
            <div>
              <dt>System</dt>
              <dd>{request.startSystem}</dd>
            </div>
            <div>
              <dt>Deadline</dt>
              <dd>{formatDeadline(request.deadlineMs)}</dd>
            </div>
          </dl>

          <div className="detail-proof-grid">
            <div className="proof-item">
              <span className="subtle-text">Request ID</span>
              <p className="wallet-address">{request.id}</p>
              <div className="button-row">
                <CopyButton idleLabel="Copy request id" value={request.id} />
                {requestExplorerUrl ? (
                  <ExplorerAnchor href={requestExplorerUrl} label="Open request" />
                ) : null}
              </div>
            </div>

            <div className="proof-item">
              <span className="subtle-text">Latest transaction digest</span>
              <p className="wallet-address">{latestDigest ?? "No transaction proof yet."}</p>
              {latestDigest ? (
                <div className="button-row">
                  <CopyButton idleLabel="Copy digest" value={latestDigest} />
                  {digestExplorerUrl ? (
                    <ExplorerAnchor href={digestExplorerUrl} label="Open digest" />
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </article>

        <article className="panel">
          <p className="eyebrow">Settlement status</p>
          <h3>Escrow and payout posture</h3>
          <dl className="metric-grid">
            <div>
              <dt>Escrow state</dt>
              <dd>{escrow ? formatEscrowStateLabel(escrow.state) : "Pending read"}</dd>
            </div>
            <div>
              <dt>Locked amount</dt>
              <dd>{escrow ? formatSui(escrow.amountMist) : formatSui(request.rewardMist)}</dd>
            </div>
            <div>
              <dt>Recipient</dt>
              <dd>{settlementRecipient ? shortAddress(settlementRecipient) : "Not settled yet"}</dd>
            </div>
            <div>
              <dt>Refunded</dt>
              <dd>{isRefunded ? "Yes" : "No"}</dd>
            </div>
          </dl>

          <div className="callout">
            <strong>Settlement narrative</strong>
            <p className="subtle-text">
              {escrow
                ? `${formatSui(escrow.amountMist)} is ${formatEscrowStateLabel(
                    escrow.state
                  ).toLowerCase()} right now.`
                : `${formatSui(request.rewardMist)} is reserved for this contract path.`}{" "}
              {request.status === "completed"
                ? "Completion has been confirmed and the responder is the payout recipient."
                : request.status === "cancelled"
                  ? "The requester cancelled before assignment, so the escrow returned to the requester."
                  : "Funds remain locked until the mission is either confirmed or cancelled."}
            </p>
          </div>
        </article>
      </section>

      <section className="detail-grid">
        <article className="panel">
          <p className="eyebrow">Role view</p>
          <h3>{viewerRole} controls</h3>
          <div className="role-panel">
            <div className="role-badge-row">
              <span className="inline-badge is-accent">{viewerRole}</span>
              {latestDigest ? <span className="inline-badge">{shortDigest(latestDigest)}</span> : null}
            </div>
            <p className="subtle-text">{viewerSummary}</p>
          </div>

          <p className="eyebrow">Status timeline</p>
          <RequestTimeline currentStatus={request.status} />
        </article>

        <article className="panel">
          <p className="eyebrow">Actions</p>
          <h3>Advance the contract</h3>

          <div className="stack-md">
            {currentAccount ? (
              <p className="subtle-text">Current actor: {shortAddress(currentAccount.address)}</p>
            ) : (
              <WalletRequiredNotice body="Connect a wallet to accept work, update status, or confirm completion." />
            )}

            <div className="button-row">
              {canAccept ? (
                <button
                  className="button primary"
                  disabled={actionMutation.isPending}
                  onClick={() => actionMutation.mutate("accept")}
                  type="button"
                >
                  Accept request
                </button>
              ) : null}

              {canMarkInProgress ? (
                <button
                  className="button primary"
                  disabled={actionMutation.isPending}
                  onClick={() => actionMutation.mutate("progress")}
                  type="button"
                >
                  Mark in progress
                </button>
              ) : null}

              {canMarkAwaitingConfirmation ? (
                <button
                  className="button primary"
                  disabled={actionMutation.isPending}
                  onClick={() => actionMutation.mutate("awaiting")}
                  type="button"
                >
                  Mark awaiting confirmation
                </button>
              ) : null}

              {canConfirmCompletion ? (
                <button
                  className="button primary"
                  disabled={actionMutation.isPending}
                  onClick={() => actionMutation.mutate("confirm")}
                  type="button"
                >
                  Confirm completion
                </button>
              ) : null}

              {canCancel ? (
                <button
                  className="button ghost"
                  disabled={actionMutation.isPending}
                  onClick={() => actionMutation.mutate("cancel")}
                  type="button"
                >
                  Cancel request
                </button>
              ) : null}
            </div>

            {currentAccount && !canTakeAction ? <p className="subtle-text">{actionHint}</p> : null}
            {lastReceipt ? (
              <p className="success-text">{formatMutationReceiptLabel(lastReceipt)}</p>
            ) : null}
            {error ? <p className="error-text">{error}</p> : null}
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Transaction timeline</p>
            <h3>Every proof point for this mission</h3>
            <p className="subtle-text">
              This feed combines publish, status changes, and final settlement receipts so judges can
              follow the whole contract path without leaving the page.
            </p>
          </div>
          <span className="inline-badge">{activities.length} recorded steps</span>
        </div>

        <RequestActivityFeed activities={activities} network={runtime.network} />
      </section>
    </div>
  );
}
