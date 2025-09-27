import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import axios from "axios";
import { BACKEND_URL } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Authentication utilities
export const AUTH_STORAGE_KEY = "unwallet_auth_state";

export interface AuthState {
  isLoggedIn: boolean;
  user?: {
    username: string;
    walletType: "personal" | "merchant";
    websiteUri?: string;
    selectedTokens: string[];
  };
}

export const getAuthState = (): AuthState => {
  if (typeof window === "undefined") {
    return { isLoggedIn: false };
  }

  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    return stored ? JSON.parse(stored) : { isLoggedIn: false };
  } catch (error) {
    console.error("Error reading auth state:", error);
    return { isLoggedIn: false };
  }
};

export const setAuthState = (state: AuthState): void => {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Error setting auth state:", error);
  }
};

export const login = (userData: AuthState["user"]): void => {
  setAuthState({ isLoggedIn: true, user: userData });
};

export const logout = (): void => {
  setAuthState({ isLoggedIn: false });
};

export const getUsername = async (address: string) => {
  if (!address || !getAuthState().isLoggedIn) return;
  try {
    const { data } = await axios.post(
      `${BACKEND_URL}/api/user/resolve-username-by-eoa`,
      {
        eoaaddress: address,
      }
    );

    return data?.data?.username;
  } catch (error) {
    console.error("Error fetching username:", error);
  }
};

// Balance checking utilities
export interface BalanceData {
  address: string;
  balance: string;
  symbol: string;
  rawBalance: string;
  nonce: number;
  decimals: number;
  tokenAddress: string;
  transactionHash: string;
  stealthAddress: string;
  safeAddress: string;
  isFunded: boolean;
}

export interface FundingStatsResponse {
  data: {
    fundedAddresses: Array<{
      fromAddress?: string;
      safeAddress: string;
      tokenAddress: string;
      nonce: number;
      transactionHash: string;
      stealthAddress: string;
    }>;
  };
}
