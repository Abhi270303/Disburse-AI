"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { formatUnits, parseAbi } from "viem";
import {
  getAuthState,
  getUsername,
  type BalanceData,
  type FundingStatsResponse,
} from "@/lib/utils";
import { BACKEND_URL } from "@/lib/constants";
import { usePrivy } from "@privy-io/react-auth";

interface UserData {
  username: string | null;
  isLoading: boolean;
  error: string | null;
}

interface WithdrawalData {
  balanceData: BalanceData[];
  isLoading: boolean;
  error: string | null;
}

interface UserDataContextType {
  userData: UserData;
  withdrawalData: WithdrawalData;
  refetchUsername: () => Promise<void>;
  refetchWithdrawals: () => Promise<void>;
}

const UserDataContext = createContext<UserDataContextType | undefined>(
  undefined
);

export const useUserData = () => {
  const context = useContext(UserDataContext);
  if (context === undefined) {
    throw new Error("useUserData must be used within a UserDataProvider");
  }
  return context;
};

interface UserDataProviderProps {
  children: React.ReactNode;
}

// ERC20 ABI for the functions we need
const erc20Abi = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
]);

// Common Multicall3 address (might work on Polygon Amoy)
const MULTICALL3_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11";

export const UserDataProvider: React.FC<UserDataProviderProps> = ({
  children,
}) => {
  const { user } = usePrivy();

  const address = user?.wallet?.address;

  const publicClient = usePublicClient();
  const authState = getAuthState();

  const [userData, setUserData] = useState<UserData>({
    username: null,
    isLoading: false,
    error: null,
  });

  const [withdrawalData, setWithdrawalData] = useState<WithdrawalData>({
    balanceData: [],
    isLoading: false,
    error: null,
  });

  const fetchUsername = async () => {
    if (!address || !authState.isLoggedIn) {
      setUserData({ username: null, isLoading: false, error: null });
      return;
    }

    setUserData((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const username = await getUsername(address);
      setUserData({
        username: username || null,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setUserData({
        username: null,
        isLoading: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch username",
      });
    }
  };

  const fetchWithdrawals = async () => {
    if (!userData.username || !publicClient || !authState.isLoggedIn) {
      setWithdrawalData({ balanceData: [], isLoading: false, error: null });
      return;
    }

    setWithdrawalData((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/user/${userData.username}/funding-stats`
      );
      const data: FundingStatsResponse = await response.json();
      console.log("Funding stats response:", data);

      const fundedAddresses = data.data.fundedAddresses || [];
      if (fundedAddresses.length === 0) {
        console.log("No funded addresses found.");
        setWithdrawalData({ balanceData: [], isLoading: false, error: null });
        return;
      }

      // Collect all address-token pairs that need to be checked
      const addressTokenPairs: Array<{
        walletAddress: string;
        tokenAddress: string;
        index: number;
        originalData: {
          fromAddress?: string;
          safeAddress: string;
          tokenAddress: string;
          nonce: number;
          transactionHash: string;
          stealthAddress: string;
        };
        isFunded: boolean;
      }> = [];

      fundedAddresses.forEach((funded, index) => {
        const fromAddress = funded.fromAddress;
        const safeAddress = funded.safeAddress;
        const tokenAddress = funded.tokenAddress;

        // Add fromAddress if it exists (funded addresses)
        if (fromAddress) {
          addressTokenPairs.push({
            walletAddress: safeAddress, // Check balance at safe address
            tokenAddress: tokenAddress,
            index: index,
            originalData: funded,
            isFunded: true,
          });
        }

        // Also add safeAddress for unfunded addresses
        if (!fromAddress && safeAddress) {
          addressTokenPairs.push({
            walletAddress: safeAddress,
            tokenAddress: tokenAddress,
            index: index,
            originalData: funded,
            isFunded: false,
          });
        }
      });

      console.log(
        `Checking ${addressTokenPairs.length} address-token pairs...`
      );

      // Use multicall to fetch all token data
      const contracts = addressTokenPairs.flatMap((pair) => [
        {
          address: pair.tokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [pair.walletAddress as `0x${string}`],
        },
        {
          address: pair.tokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: "decimals",
        },
        {
          address: pair.tokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: "symbol",
        },
      ]);

      const results = await publicClient.multicall({
        contracts,
        allowFailure: true,
        multicallAddress: MULTICALL3_ADDRESS as `0x${string}`,
      });

      console.log("✅ Multicall successful");

      // Process multicall results
      const finalBalanceData: BalanceData[] = [];

      for (let i = 0; i < addressTokenPairs.length; i++) {
        const balanceResult = results[i * 3];
        const decimalsResult = results[i * 3 + 1];
        const symbolResult = results[i * 3 + 2];
        const originalPair = addressTokenPairs[i];

        if (
          balanceResult?.status === "success" &&
          decimalsResult?.status === "success" &&
          symbolResult?.status === "success"
        ) {
          const rawBalance = BigInt(balanceResult.result as string | number);
          const decimals = decimalsResult.result as number;
          const symbol = symbolResult.result as string;

          const formattedBalance = formatUnits(rawBalance, decimals);

          if (rawBalance > BigInt(0)) {
            finalBalanceData.push({
              address: originalPair.isFunded
                ? originalPair.originalData.fromAddress ||
                  originalPair.walletAddress
                : originalPair.walletAddress,
              balance: formattedBalance,
              symbol: symbol,
              rawBalance: rawBalance.toString(),
              nonce: originalPair.originalData.nonce || 0,
              decimals: decimals,
              tokenAddress: originalPair.tokenAddress,
              transactionHash: originalPair.originalData.transactionHash,
              stealthAddress: originalPair.originalData.stealthAddress,
              safeAddress: originalPair.originalData.safeAddress,
              isFunded: originalPair.isFunded,
            });

            console.log(`💰 Found funds:`, {
              address: originalPair.walletAddress,
              balance: formattedBalance,
              symbol: symbol,
              isFunded: originalPair.isFunded,
            });
          }
        }
      }

      // Update the balance data state
      setWithdrawalData({
        balanceData: finalBalanceData,
        isLoading: false,
        error: null,
      });

      console.log(
        `✅ Balance check complete. Found ${finalBalanceData.length} addresses with balances.`
      );
    } catch (error) {
      console.error("Error fetching withdrawals:", error);
      setWithdrawalData({
        balanceData: [],
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch withdrawals",
      });
    }
  };

  const refetchUsername = async () => {
    await fetchUsername();
  };

  const refetchWithdrawals = async () => {
    await fetchWithdrawals();
  };

  useEffect(() => {
    if (authState.isLoggedIn) {
      fetchUsername();
    }
  }, [address, authState.isLoggedIn]);

  useEffect(() => {
    if (userData.username) {
      fetchWithdrawals();
    }
  }, [userData.username]);

  const value: UserDataContextType = {
    userData,
    withdrawalData,
    refetchUsername,
    refetchWithdrawals,
  };

  return (
    <UserDataContext.Provider value={value}>
      {children}
    </UserDataContext.Provider>
  );
};
