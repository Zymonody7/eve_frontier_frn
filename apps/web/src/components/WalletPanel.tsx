import { useState } from "react";
import { CopyButton } from "./CopyButton";
import { useResponseNetworkRuntime } from "../features/requests/AdapterContext";
import {
  buildSuiExplorerObjectUrl,
  formatNetworkLabel,
  formatSui,
  shortAddress
} from "../features/requests/requestUtils";
import { GAS_RESERVE_MIST, REQUIRED_NETWORK } from "../features/wallet/networkConfig";
import { useWalletBalance } from "../features/wallet/useWalletBalance";
import { useWalletSession } from "../features/wallet/useWalletSession";

function ExplorerAnchor({ href, label }: { href: string; label: string }) {
  return (
    <a className="button ghost" href={href} rel="noreferrer" target="_blank">
      {label}
    </a>
  );
}

export function WalletPanel() {
  const {
    accountChains,
    currentAccount,
    currentWallet,
    wallets,
    network,
    isConnected,
    isConnecting,
    isDisconnecting,
    connectWallet,
    disconnectWallet
  } = useWalletSession();
  const runtime = useResponseNetworkRuntime();
  const { data: suiBalance, error: balanceError, isLoading: isBalanceLoading } = useWalletBalance(
    currentAccount?.address
  );
  const [error, setError] = useState<string | null>(null);
  const dappTargetsRequiredNetwork = network === REQUIRED_NETWORK;
  const walletSupportsTargetChain = currentAccount ? accountChains.includes(runtime.chainId) : true;
  const walletReadyForSigning = dappTargetsRequiredNetwork && walletSupportsTargetChain;

  async function handleConnect(walletName: string) {
    const wallet = wallets.find((item) => item.name === walletName);

    if (!wallet) {
      setError("Selected wallet is no longer available.");
      return;
    }

    try {
      setError(null);
      await connectWallet({ wallet });
    } catch (connectError) {
      setError(
        connectError instanceof Error ? connectError.message : "Wallet connection failed."
      );
    }
  }

  async function handleDisconnect() {
    try {
      setError(null);
      await disconnectWallet();
    } catch (disconnectError) {
      setError(
        disconnectError instanceof Error
          ? disconnectError.message
          : "Wallet disconnect failed."
      );
    }
  }

  return (
    <aside className="session-panel">
      <div className="session-panel-head">
        <div>
          <p className="eyebrow">Wallet</p>
          <h2 className="session-title">{isConnected ? "Connected" : "Connect wallet"}</h2>
        </div>
        <span className="data-mode-badge">{formatNetworkLabel(runtime.network)}</span>
      </div>

      {isConnected && currentAccount ? (
        <div className="session-card">
          <span className="subtle-text">Active address</span>
          <div className="identity-stack">
            <div>
              <p className="session-main">{shortAddress(currentAccount.address)}</p>
              <p className="wallet-address">{currentAccount.address}</p>
            </div>

            <div className="button-row">
              <CopyButton idleLabel="Copy address" value={currentAccount.address} />
              <button
                className="button ghost"
                disabled={isDisconnecting}
                onClick={handleDisconnect}
                type="button"
              >
                {isDisconnecting ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>
          </div>

          <dl className="metric-grid compact-grid">
            <div>
              <dt>Wallet</dt>
              <dd>{currentWallet.currentWallet?.name ?? "Wallet Standard"}</dd>
            </div>
            <div>
              <dt>Network</dt>
              <dd>{formatNetworkLabel(network)}</dd>
            </div>
            <div>
              <dt>SUI balance</dt>
              <dd>
                {isBalanceLoading
                  ? "Checking..."
                  : suiBalance
                    ? formatSui(suiBalance.totalBalance)
                    : "Unavailable"}
              </dd>
            </div>
            <div>
              <dt>Signing path</dt>
              <dd>{walletReadyForSigning ? "Ready for testnet signing" : "Switch network"}</dd>
            </div>
          </dl>

          {!walletReadyForSigning ? (
            <p className="error-text">Switch wallet network to Sui Testnet</p>
          ) : null}

          {balanceError ? (
            <p className="subtle-text">Balance unavailable right now.</p>
          ) : (
            <p className="subtle-text">
              Keep at least {formatSui(GAS_RESERVE_MIST)} free for gas on{" "}
              {formatNetworkLabel(REQUIRED_NETWORK)}.
            </p>
          )}
        </div>
      ) : (
        <div className="stack-md">
          <p className="subtle-text">Use any Sui Wallet Standard wallet.</p>

          {wallets.length > 0 ? (
            <div className="wallet-list">
              {wallets.map((wallet) => (
                <button
                  key={wallet.name}
                  className="wallet-option"
                  disabled={isConnecting}
                  onClick={() => handleConnect(wallet.name)}
                  type="button"
                >
                  <span>{wallet.name}</span>
                  <span className="subtle-text">Connect</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="session-card">
              <p className="session-main">No compatible wallet detected</p>
              <p className="subtle-text">
                Install `EVE Vault`, `Slush`, or another Sui wallet, then refresh.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="session-card">
        <div className="session-card-head">
          <span className="subtle-text">Runtime</span>
          <span className="inline-badge">{runtime.transportLabel}</span>
        </div>

        <div className="proof-stack">
          <div className="proof-item">
            <span className="subtle-text">Package ID</span>
            <p className="wallet-address">{runtime.packageId ?? "Package pending"}</p>
            {runtime.packageId ? (
              <div className="button-row">
                <CopyButton idleLabel="Copy package" value={runtime.packageId} />
                <ExplorerAnchor
                  href={buildSuiExplorerObjectUrl(runtime.packageId, runtime.network)}
                  label="Open package"
                />
              </div>
            ) : null}
          </div>

          <div className="proof-item">
            <span className="subtle-text">Registry ID</span>
            <p className="wallet-address">{runtime.registryObjectId ?? "Registry pending"}</p>
            {runtime.registryObjectId ? (
              <div className="button-row">
                <CopyButton idleLabel="Copy registry" value={runtime.registryObjectId} />
                <ExplorerAnchor
                  href={buildSuiExplorerObjectUrl(runtime.registryObjectId, runtime.network)}
                  label="Open registry"
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {error ? <p className="error-text">{error}</p> : null}
    </aside>
  );
}
