"use client";

import React from "react";
import type { PrivyClientConfig } from "@privy-io/react-auth";
import { PrivyProvider as PrivyProviderComponent } from "@privy-io/react-auth";
import { WagmiProvider, createConfig } from "@privy-io/wagmi";
import type { Chain } from "viem";
import {
  getViemTransports,
  getViemChains,
  WHITELISTED_NETWORKS,
} from "@/lib/constants";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export default function PrivyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const networks = WHITELISTED_NETWORKS;

  const viemTransports = getViemTransports(networks);
  const viemChains = getViemChains(networks);

  const wagmiConfig = createConfig({
    chains: viemChains as [Chain, ...Chain[]],
    transports: viemTransports,
  });

  const privyConfig: PrivyClientConfig = {
    embeddedWallets: {
      createOnLogin: "users-without-wallets",
    },
    loginMethods: ["google"],
    supportedChains: viemChains,
    defaultChain: viemChains[0],
    appearance: {
      showWalletLoginFirst: true,
    },
  };

  const queryClient = new QueryClient();

  return (
    <PrivyProviderComponent
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID as string}
      config={privyConfig}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProviderComponent>
  );
}
