import { useUserData } from "@/context/user-data-provider";

export const useUser = () => {
  const { userData, withdrawalData, refetchUsername, refetchWithdrawals } =
    useUserData();

  return {
    // Username data
    username: userData.username,
    isLoading: userData.isLoading,
    error: userData.error,
    refetch: refetchUsername,
    hasError: !!userData.error,
    isReady: !userData.isLoading && !userData.error,

    // Withdrawal data
    withdrawals: withdrawalData.balanceData,
    isWithdrawalsLoading: withdrawalData.isLoading,
    withdrawalError: withdrawalData.error,
    refetchWithdrawals,
    hasWithdrawalError: !!withdrawalData.error,
    isWithdrawalsReady: !withdrawalData.isLoading && !withdrawalData.error,
  };
};
