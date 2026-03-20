#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONTRACT_DIR="$ROOT_DIR/contracts/response-network"
OUTPUT_FILE="$(mktemp)"

cleanup() {
  rm -f "$OUTPUT_FILE"
}

trap cleanup EXIT

if ! command -v sui >/dev/null 2>&1; then
  echo "sui CLI is required but was not found in PATH." >&2
  echo "Install it first, then rerun this script." >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required to extract package and registry ids from publish output." >&2
  exit 1
fi

echo "Publishing response-network package from $CONTRACT_DIR"

(
  cd "$CONTRACT_DIR"
  sui client publish --json . >"$OUTPUT_FILE"
)

PACKAGE_ID="$(
  jq -r '.objectChanges[] | select(.type=="published") | .packageId' "$OUTPUT_FILE" | tail -n 1
)"

REGISTRY_ID="$(
  jq -r '
    .objectChanges[]
    | select(.type=="created")
    | select(.objectType | endswith("::response_network::Registry"))
    | .objectId
  ' "$OUTPUT_FILE" | tail -n 1
)"

if [[ -z "$PACKAGE_ID" || "$PACKAGE_ID" == "null" ]]; then
  echo "Failed to extract package id from publish output." >&2
  cat "$OUTPUT_FILE"
  exit 1
fi

if [[ -z "$REGISTRY_ID" || "$REGISTRY_ID" == "null" ]]; then
  echo "Failed to extract registry id from publish output." >&2
  cat "$OUTPUT_FILE"
  exit 1
fi

echo
echo "Publish succeeded."
echo "Package id:  $PACKAGE_ID"
echo "Registry id: $REGISTRY_ID"
echo
echo "Set these frontend env vars:"
echo "VITE_RESPONSE_NETWORK_MODE=chain"
echo "VITE_RESPONSE_NETWORK_PACKAGE_ID=$PACKAGE_ID"
echo "VITE_RESPONSE_NETWORK_REGISTRY_ID=$REGISTRY_ID"
echo
echo "Raw publish output saved to: $OUTPUT_FILE"
trap - EXIT
