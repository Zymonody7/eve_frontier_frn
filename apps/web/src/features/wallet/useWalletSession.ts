import {
  useConnectWallet,
  useCurrentAccount,
  useCurrentWallet,
  useDisconnectWallet,
  useSuiClientContext,
  useWallets
} from "@mysten/dapp-kit";

export function useWalletSession() {
  const currentAccount = useCurrentAccount();
  const currentWallet = useCurrentWallet();
  const wallets = useWallets();
  const { mutateAsync: connectWallet, isPending: isConnecting } = useConnectWallet();
  const { mutateAsync: disconnectWallet, isPending: isDisconnecting } =
    useDisconnectWallet();
  const { network } = useSuiClientContext();

  return {
    currentAccount,
    currentWallet,
    wallets,
    accountChains: currentAccount?.chains ?? [],
    network,
    isConnected: Boolean(currentAccount?.address),
    isConnecting,
    isDisconnecting,
    connectWallet,
    disconnectWallet
  };
}
