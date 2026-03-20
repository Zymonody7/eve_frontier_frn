import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { AdapterProvider } from "../features/requests/AdapterContext";
import { AppRoutes } from "./AppRoutes";
import { DEFAULT_NETWORK, networkConfig } from "../features/wallet/networkConfig";

export function App() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10_000,
            refetchOnWindowFocus: false
          }
        }
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider defaultNetwork={DEFAULT_NETWORK} networks={networkConfig}>
        <WalletProvider autoConnect>
          <AdapterProvider>
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true
              }}
            >
              <AppRoutes />
            </BrowserRouter>
          </AdapterProvider>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
