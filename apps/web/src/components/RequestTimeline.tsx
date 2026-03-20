import type { RequestStatus } from "@frn/shared";
import { formatStatusLabel } from "../features/requests/requestUtils";

const timelineSteps: Array<{
  description: string;
  status: RequestStatus;
}> = [
  {
    status: "open",
    description: "Requester locks the bounty and publishes the SOS."
  },
  {
    status: "accepted",
    description: "Responder claims the mission and becomes the active pilot."
  },
  {
    status: "in_progress",
    description: "Responder is en route or already performing the rescue."
  },
  {
    status: "awaiting_confirmation",
    description: "Responder reports completion and waits for requester sign-off."
  },
  {
    status: "completed",
    description: "Requester confirms completion and escrow releases the reward."
  }
];

type RequestTimelineProps = {
  currentStatus: RequestStatus;
};

export function RequestTimeline({ currentStatus }: RequestTimelineProps) {
  const currentIndex = timelineSteps.findIndex((step) => step.status === currentStatus);
  const visibleSteps =
    currentStatus === "cancelled"
      ? [
          ...timelineSteps.slice(0, 1),
          {
            status: "cancelled" as const,
            description: "Requester cancels before assignment and the escrow refund is unlocked."
          }
        ]
      : timelineSteps;

  return (
    <ol className="timeline">
      {visibleSteps.map((step, index) => {
        const reached =
          currentStatus === "cancelled" ? index === 0 || step.status === "cancelled" : currentIndex >= index;

        return (
          <li
            key={step.status}
            className={`timeline-item ${reached ? "is-reached" : ""} ${
              step.status === currentStatus ? "is-current" : ""
            }`}
          >
            <span className="timeline-dot" />
            <div className="timeline-copy">
              <strong>{formatStatusLabel(step.status)}</strong>
              <p>{step.description}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
