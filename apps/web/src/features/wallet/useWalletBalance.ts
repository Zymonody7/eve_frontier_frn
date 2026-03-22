import { useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import { SUI_COIN_TYPE } from "./networkConfig";

export function useWalletBalance(address?: string) {
  const client = useSuiClient();

  return useQuery({
    queryKey: ["wallet-balance", address],
    enabled: Boolean(address),
    staleTime: 15_000,
    refetchInterval: 5_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      return client.getBalance({
        owner: address!,
        coinType: SUI_COIN_TYPE
      });
    }
  });
}
