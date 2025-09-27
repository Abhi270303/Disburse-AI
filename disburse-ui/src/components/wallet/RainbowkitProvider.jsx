"use client";
import "@rainbow-me/rainbowkit/styles.css";
import {
  getDefaultConfig,
  RainbowKitProvider,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { polygonAmoy } from "viem/chains";

const queryClient = new QueryClient();

const wagmiConfig = getDefaultConfig({
  appName: "Stealth Wallet",
  projectId: process.env.NEXT_PUBLIC_REOWN_APP_ID || "wallet-app-id",
  chains: [polygonAmoy],
  ssr: true,
});

export function AppWalletProvider({ children }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme()}>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
