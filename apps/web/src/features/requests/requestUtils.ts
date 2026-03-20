import type {
  HazardLevel,
  RequestActivity,
  RequestStatus,
  ServiceRequest
} from "@frn/shared";
import type { MutationReceipt } from "./adapter";

const MIST_PER_SUI = BigInt(1_000_000_000);
const SUI_AMOUNT_PATTERN = /^\d+(?:\.\d{0,9})?$/;

type ExplorerNetwork = "mainnet" | "testnet" | "devnet";

export function shortAddress(address: string) {
  if (address.length <= 18) {
    return address;
  }

  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

export function shortDigest(digest: string) {
  if (digest.length <= 18) {
    return digest;
  }

  return `${digest.slice(0, 10)}...${digest.slice(-8)}`;
}

export function formatSui(mist: string) {
  const amount = BigInt(mist);
  const whole = amount / MIST_PER_SUI;
  const remainder = amount % MIST_PER_SUI;
  const remainderText = remainder.toString().padStart(9, "0").replace(/0+$/, "");
  return remainderText ? `${whole}.${remainderText} SUI` : `${whole} SUI`;
}

export function parseSuiToMist(value: string) {
  const normalized = value.trim();

  if (!SUI_AMOUNT_PATTERN.test(normalized)) {
    throw new Error("Invalid SUI amount");
  }

  const [wholePart, fractionPart = ""] = normalized.split(".");
  const safeWhole = wholePart === "" ? "0" : wholePart;
  const safeFraction = `${fractionPart}000000000`.slice(0, 9);
  return (BigInt(safeWhole) * MIST_PER_SUI + BigInt(safeFraction || "0")).toString();
}

export function formatStatusLabel(status: RequestStatus) {
  const labels: Record<RequestStatus, string> = {
    draft: "Draft",
    open: "Open",
    accepted: "Accepted",
    in_progress: "In progress",
    awaiting_confirmation: "Awaiting confirmation",
    completed: "Completed",
    cancelled: "Cancelled",
    expired: "Expired",
    disputed: "Disputed"
  };

  return labels[status];
}

export function formatHazardLabel(hazard: HazardLevel) {
  return `${hazard} risk`;
}

export function formatEscrowStateLabel(state: "locked" | "released" | "refunded") {
  switch (state) {
    case "locked":
      return "Locked";
    case "released":
      return "Released";
    case "refunded":
      return "Refunded";
    default:
      return state;
  }
}

export function formatNetworkLabel(network: ExplorerNetwork | string) {
  if (network === "testnet") {
    return "Sui Testnet";
  }

  if (network === "mainnet") {
    return "Sui Mainnet";
  }

  if (network === "devnet") {
    return "Sui Devnet";
  }

  return network;
}

export function formatDeadline(deadlineMs: number) {
  const diff = deadlineMs - Date.now();

  if (diff <= 0) {
    return "Expired";
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (hours >= 24) {
    const days = Math.ceil(hours / 24);
    return `${days} day${days === 1 ? "" : "s"} left`;
  }

  if (hours >= 1) {
    return `${hours} hour${hours === 1 ? "" : "s"} left`;
  }

  const minutes = Math.max(1, Math.floor(diff / (1000 * 60)));
  return `${minutes} minute${minutes === 1 ? "" : "s"} left`;
}

export function formatTimestamp(timestampMs: number) {
  if (!timestampMs) {
    return "Timestamp unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(timestampMs);
}

export function formatMutationReceiptLabel(receipt: MutationReceipt) {
  return receipt.transport === "chain"
    ? `On-chain transaction confirmed: ${shortDigest(receipt.reference)}`
    : `Local fallback receipt recorded: ${receipt.reference}`;
}

export function isRequester(request: ServiceRequest, address: string) {
  return request.requester === address;
}

export function isResponder(request: ServiceRequest, address: string) {
  return request.responder === address;
}

export function buildSuiExplorerObjectUrl(objectId: string, network: ExplorerNetwork) {
  const networkPath = network === "mainnet" ? "" : `/${network}`;
  return `https://suiscan.xyz${networkPath}/object/${objectId}`;
}

export function buildSuiExplorerTransactionUrl(digest: string, network: ExplorerNetwork) {
  const networkPath = network === "mainnet" ? "" : `/${network}`;
  return `https://suiscan.xyz${networkPath}/tx/${digest}`;
}

export function formatRequestActivityTitle(activity: RequestActivity) {
  switch (activity.kind) {
    case "created":
      return "SOS published";
    case "accepted":
      return "Responder accepted mission";
    case "in_progress":
      return "Mission marked in progress";
    case "awaiting_confirmation":
      return "Awaiting requester confirmation";
    case "completed":
      return "Requester confirmed completion";
    case "cancelled":
      return "Requester cancelled contract";
    case "settled_released":
      return "Escrow released bounty";
    case "settled_refunded":
      return "Escrow refunded requester";
    default:
      return "Contract activity";
  }
}

export function formatRequestActivityBody(activity: RequestActivity) {
  switch (activity.kind) {
    case "created":
      return `${activity.actor ? shortAddress(activity.actor) : "Requester"} opened the mission and locked ${
        activity.amountMist ? formatSui(activity.amountMist) : "the reward"
      }.`;
    case "accepted":
      return `${activity.actor ? shortAddress(activity.actor) : "Responder"} claimed the mission.`;
    case "in_progress":
      return `${activity.actor ? shortAddress(activity.actor) : "Responder"} reported active rescue work.`;
    case "awaiting_confirmation":
      return `${activity.actor ? shortAddress(activity.actor) : "Responder"} marked the rescue complete and is waiting for requester sign-off.`;
    case "completed":
      return `${activity.actor ? shortAddress(activity.actor) : "Requester"} confirmed the mission result on-chain.`;
    case "cancelled":
      return `${activity.actor ? shortAddress(activity.actor) : "Requester"} cancelled before settlement completed.`;
    case "settled_released":
      return `${activity.amountMist ? formatSui(activity.amountMist) : "Reward"} moved to ${
        activity.recipient ? shortAddress(activity.recipient) : "the responder"
      }.`;
    case "settled_refunded":
      return `${activity.amountMist ? formatSui(activity.amountMist) : "Reward"} returned to ${
        activity.recipient ? shortAddress(activity.recipient) : "the requester"
      }.`;
    default:
      return "Contract activity recorded.";
  }
}

export async function copyTextToClipboard(value: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  if (typeof document === "undefined") {
    throw new Error("Clipboard is unavailable in this environment.");
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}
