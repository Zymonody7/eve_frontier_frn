import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { dashboardRequestDetailPath } from "../app/routes";
import { WalletRequiredNotice } from "../components/WalletRequiredNotice";
import {
  useResponseNetworkAdapter,
  useResponseNetworkRuntime
} from "../features/requests/AdapterContext";
import {
  formatNetworkLabel,
  formatSui,
  parseSuiToMist
} from "../features/requests/requestUtils";
import { GAS_RESERVE_MIST, REQUIRED_NETWORK } from "../features/wallet/networkConfig";
import { useWalletBalance } from "../features/wallet/useWalletBalance";
import { useWalletSession } from "../features/wallet/useWalletSession";

export function NewRequestPage() {
  const adapter = useResponseNetworkAdapter();
  const runtime = useResponseNetworkRuntime();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { accountChains, currentAccount } = useWalletSession();
  const { data: suiBalance, isLoading: isBalanceLoading } = useWalletBalance(
    currentAccount?.address
  );
  const [form, setForm] = useState({
    startSystem: "Nomad's Wake",
    hazardLevel: "high",
    bountySui: "3.5",
    hoursUntilDeadline: "6",
    description:
      "Fuel reserve fell below safe return threshold. Need emergency fuel and a short escort back to a refuge.",
    needsFuel: true,
    needsEscortHome: true
  });
  const [error, setError] = useState<string | null>(null);

  const previewReward = useMemo(() => {
    try {
      return parseSuiToMist(form.bountySui);
    } catch {
      return null;
    }
  }, [form.bountySui]);
  const deadlineHours = Number(form.hoursUntilDeadline);
  const dappTargetsRequiredNetwork = runtime.network === REQUIRED_NETWORK;
  const walletSupportsTargetChain = currentAccount ? accountChains.includes(runtime.chainId) : false;
  const walletReadyForSigning = dappTargetsRequiredNetwork && walletSupportsTargetChain;
  const requiredBalanceMist =
    previewReward !== null ? (BigInt(previewReward) + BigInt(GAS_RESERVE_MIST)).toString() : null;
  const hasEnoughBalance =
    previewReward !== null && suiBalance
      ? BigInt(suiBalance.totalBalance) >= BigInt(previewReward) + BigInt(GAS_RESERVE_MIST)
      : false;
  const chainPublishReady = runtime.mode !== "chain" || runtime.chainReady;
  const preflightBlocked =
    !chainPublishReady ||
    (runtime.mode === "chain" && !walletReadyForSigning) ||
    previewReward === null ||
    previewReward === "0" ||
    !Number.isFinite(deadlineHours) ||
    deadlineHours <= 0 ||
    (runtime.mode === "chain" && !isBalanceLoading && !hasEnoughBalance);

  const mutation = useMutation({
    mutationFn: async () =>
      adapter.createRescueRequest({
        requester: currentAccount?.address ?? "",
        startSystem: form.startSystem,
        hazardLevel: form.hazardLevel as "low" | "medium" | "high",
        description: form.description,
        rewardMist: parseSuiToMist(form.bountySui),
        deadlineMs: Date.now() + Number(form.hoursUntilDeadline) * 60 * 60 * 1000,
        needsFuel: form.needsFuel,
        needsEscortHome: form.needsEscortHome
      }),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["requests"] }),
        queryClient.invalidateQueries({ queryKey: ["me"] }),
        queryClient.invalidateQueries({ queryKey: ["wallet-balance", currentAccount?.address] })
      ]);
      navigate(dashboardRequestDetailPath(result.requestId));
    }
  });

  if (!currentAccount) {
    return (
      <WalletRequiredNotice
        title="Connect a wallet before opening a rescue contract"
        body="The connected wallet becomes the requester identity. Once connected, you can create rescue jobs without any fake seeded actor."
      />
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!form.startSystem.trim()) {
      setError("Start system is required.");
      return;
    }

    if (!form.description.trim()) {
      setError("Describe the rescue situation.");
      return;
    }

    if (!chainPublishReady) {
      setError("Chain mode is selected, but package or registry ids are still missing.");
      return;
    }

    if (!walletReadyForSigning) {
      setError("Switch wallet network to Sui Testnet");
      return;
    }

    let bountyMist: string;

    try {
      bountyMist = parseSuiToMist(form.bountySui);
    } catch {
      setError("Bounty must be a valid SUI amount.");
      return;
    }

    if (BigInt(bountyMist) <= 0n) {
      setError("Bounty must be greater than 0 SUI.");
      return;
    }

    if (!Number.isFinite(deadlineHours) || deadlineHours <= 0) {
      setError("Deadline must be greater than 0 hours.");
      return;
    }

    if (runtime.mode === "chain") {
      if (isBalanceLoading || !suiBalance) {
        setError("Still checking wallet balance. Please wait a moment.");
        return;
      }

      if (BigInt(suiBalance.totalBalance) < BigInt(bountyMist) + BigInt(GAS_RESERVE_MIST)) {
        setError("Insufficient SUI for bounty and gas");
        return;
      }
    }

    mutation.mutate();
  }

  return (
    <div className="stack-lg">
      <section className="panel panel-tight">
        <p className="eyebrow">Post SOS</p>
        <h2>Create a rescue contract</h2>
        <p className="subtle-text">
          Your connected wallet becomes the requester identity. Publishing targets{" "}
          {formatNetworkLabel(runtime.network)} and checks balance before the wallet signing step.
        </p>
      </section>

      <form className="panel form-grid" onSubmit={handleSubmit}>
        <label>
          Current system
          <input
            value={form.startSystem}
            onChange={(event) => setForm((current) => ({ ...current, startSystem: event.target.value }))}
          />
        </label>

        <label>
          Hazard level
          <select
            value={form.hazardLevel}
            onChange={(event) => setForm((current) => ({ ...current, hazardLevel: event.target.value }))}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>

        <label>
          Reward (SUI)
          <input
            inputMode="decimal"
            value={form.bountySui}
            onChange={(event) => setForm((current) => ({ ...current, bountySui: event.target.value }))}
          />
        </label>

        <label>
          Deadline in hours
          <input
            inputMode="numeric"
            value={form.hoursUntilDeadline}
            onChange={(event) =>
              setForm((current) => ({ ...current, hoursUntilDeadline: event.target.value }))
            }
          />
        </label>

        <label className="full-span">
          Distress details
          <textarea
            rows={5}
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          />
        </label>

        <div className="toggle-row full-span">
          <label className="toggle">
            <input
              checked={form.needsFuel}
              type="checkbox"
              onChange={(event) => setForm((current) => ({ ...current, needsFuel: event.target.checked }))}
            />
            Fuel delivery required
          </label>
          <label className="toggle">
            <input
              checked={form.needsEscortHome}
              type="checkbox"
              onChange={(event) =>
                setForm((current) => ({ ...current, needsEscortHome: event.target.checked }))
              }
            />
            Escort home required
          </label>
        </div>

        <section className="summary-panel full-span">
          <p className="eyebrow">Settlement preview</p>
          <h3>Publish preflight</h3>
          <div className="preflight-list">
            <div className="preflight-item">
              <span>Network target</span>
              <strong>
                {walletSupportsTargetChain
                  ? dappTargetsRequiredNetwork
                    ? `${formatNetworkLabel(REQUIRED_NETWORK)} ready`
                    : "Switch app to Sui Testnet"
                  : "Switch wallet network to Sui Testnet"}
              </strong>
            </div>
            <div className="preflight-item">
              <span>Wallet balance</span>
              <strong>
                {isBalanceLoading
                  ? "Checking balance..."
                  : suiBalance
                    ? `${formatSui(suiBalance.totalBalance)} available`
                    : "Balance unavailable"}
              </strong>
            </div>
            <div className="preflight-item">
              <span>Required to publish</span>
              <strong>
                {requiredBalanceMist ? formatSui(requiredBalanceMist) : "Enter a valid reward"}
              </strong>
            </div>
            <div className="preflight-item">
              <span>Deadline</span>
              <strong>
                {Number.isFinite(deadlineHours) && deadlineHours > 0
                  ? `${deadlineHours} hour${deadlineHours === 1 ? "" : "s"}`
                  : "Deadline must be greater than 0"}
              </strong>
            </div>
          </div>

          <p className="subtle-text">
            {previewReward
              ? runtime.mode === "chain"
                ? `${form.bountySui} SUI will be locked on-chain, with ${formatSui(
                    GAS_RESERVE_MIST
                  )} reserved for gas headroom.`
                : `${form.bountySui} SUI will stay in local draft mode until chain mode is enabled.`
              : "Enter a valid reward amount before publishing."}
          </p>
        </section>

        {error ? <p className="error-text full-span">{error}</p> : null}

        <div className="button-row full-span">
          <button
            className="button primary"
            disabled={mutation.isPending || (runtime.mode === "chain" && isBalanceLoading) || preflightBlocked}
            type="submit"
          >
            {mutation.isPending
              ? "Publishing..."
              : runtime.mode === "chain"
                ? "Publish rescue request on-chain"
                : "Publish rescue request"}
          </button>
        </div>
      </form>
    </div>
  );
}
