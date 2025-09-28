import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { ExternalLink } from "lucide-react";
import {
  getTransactionExplorerUrl,
  getAddressExplorerUrl,
  BACKEND_URL,
  STEALTH_ADDRESS_GENERATION_MESSAGE,
  getCurrentNetwork,
  WHITELISTED_NETWORKS,
  SAFE_ABI,
  USDC_ABI,
  RPC_CONFIG,
} from "@/lib/constants";
import { useUser } from "@/hooks/use-user-data";
import { WithdrawalTableSkeleton } from "@/components/ui/loading-skeletons";
import {
  useWalletClient,
  usePublicClient,
  useSwitchChain,
} from "wagmi";
import { privateKeyToAccount } from "viem/accounts";
import { parseUnits } from "viem";
import {
  predictSafeAddress,
  buildSafeTransaction,
  safeSignTypedData,
} from "@/lib/safe-utils";
import { getContractNetworks } from "@/lib/safe-contracts";
import {
  generateEphemeralPrivateKey,
  extractViewingPrivateKeyNode,
  generateKeysFromSignature,
  generateStealthPrivateKey,
} from "@fluidkey/stealth-account-kit";
import Safe from "@safe-global/protocol-kit";
import { createWalletClient, http, encodeFunctionData } from "viem";

const Withdraw = () => {
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [recipientAddress, setRecipientAddress] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const withdrawalsPerPage = 8;
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<
    (typeof tableData)[0] | null
  >(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [redeemingPayments, setRedeemingPayments] = useState<Set<number>>(
    new Set()
  );
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const { switchChainAsync } = useSwitchChain();

  const {
    withdrawals,
    isWithdrawalsLoading,
    withdrawalError,
    refetchWithdrawals,
    hasWithdrawalError,
    username,
  } = useUser();

  const currentNetwork = getCurrentNetwork(WHITELISTED_NETWORKS);
  const currentChain = {
    id: currentNetwork?.chainId || 80002,
    name: currentNetwork?.name || "Polygon Amoy Testnet",
    nativeCurrency: currentNetwork?.nativeCurrency || {
      name: "POL",
      symbol: "POL",
      decimals: 18,
    },
    rpcUrls: { default: { http: [currentNetwork?.rpcUrl || ""] } },
  };

  // Transform withdrawal data to table format with proper USDC formatting
  const tableData = withdrawals.map((withdrawal, index) => {
    // Ensure rawBalance is a string and handle potential errors
    const balance = withdrawal.balance || "0";

    let amount = 0;
    try {
      amount = parseFloat(balance);
    } catch (error) {
      console.error("Error formatting amount:", error);
      amount = 0;
    }

    return {
      id: index + 1,
      amount,
      token: withdrawal.symbol,
      network: "Polygon Amoy Testnet",
      chainId: 80002,
      txHash: withdrawal.transactionHash,
      from: withdrawal.address,
      isFunded: withdrawal.isFunded,
      stealthAddress: withdrawal.stealthAddress,
      safeAddress: withdrawal.safeAddress,
      tokenAddress: withdrawal.tokenAddress,
      rawBalance: withdrawal.rawBalance,
      decimals: withdrawal.decimals,
      nonce: withdrawal.nonce,
    };
  });

  // Pagination logic
  const totalPages = Math.ceil(tableData.length / withdrawalsPerPage);
  const startIndex = (currentPage - 1) * withdrawalsPerPage;
  const endIndex = startIndex + withdrawalsPerPage;
  const currentData = tableData.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Reset pagination when data changes
  useEffect(() => {
    setCurrentPage(1);
    setSelectedRows([]);
  }, [tableData.length]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(tableData.map((row) => row.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (rowId: number, checked: boolean) => {
    if (checked) {
      setSelectedRows([...selectedRows, rowId]);
    } else {
      setSelectedRows(selectedRows.filter((id) => id !== rowId));
    }
  };

  const handleWithdraw = (id: number) => {
    const row = tableData.find((r) => r.id === id);
    if (row) {
      setSelectedWithdrawal(row);
      setWithdrawAmount(row.amount);
      setIsWithdrawDialogOpen(true);
    }
  };

  const handleWithdrawSelected = () => {
    if (selectedRows.length === 0) {
      alert("Please select at least one withdrawal");
      return;
    }

    // Set the total amount and open the dialog
    setWithdrawAmount(selectedTotal);
    setIsWithdrawDialogOpen(true);
  };

  const generateInitialKeysOnClient = async (uniqueNonces: number[]) => {
    if (!walletClient) {
      throw new Error("Wallet client not available");
    }

    // STEP 1: Create a deterministic message for signing
    const message = STEALTH_ADDRESS_GENERATION_MESSAGE;

    const signature = await walletClient.signMessage({ message });

    const keys = generateKeysFromSignature(signature);

    // STEP 5: Extract the viewing key node (used for address generation)
    const viewKeyNodeNumber = 0; // Use the first node
    const viewingPrivateKeyNode = extractViewingPrivateKeyNode(
      keys.viewingPrivateKey,
      viewKeyNodeNumber
    );

    const processedKeys = uniqueNonces.map((nonce) => {
      const ephemeralPrivateKey = generateEphemeralPrivateKey({
        viewingPrivateKeyNode: viewingPrivateKeyNode,
        nonce: BigInt(nonce.toString()), // convert to bigint
        chainId: 80002, // Polygon Amoy Testnet
      });

      const ephemeralPrivateKeyRaw = ephemeralPrivateKey;
      console.log("ephemeralPrivateKeyRaw", ephemeralPrivateKeyRaw);

      const ephemeralPrivateKeyHex = ephemeralPrivateKey.ephemeralPrivateKey;

      console.log("ephemeralPrivateKeyHex", ephemeralPrivateKeyHex);

      // Ensure it's in the correct format (0x prefixed hex string)
      const formattedEphemeralPrivateKey =
        `${ephemeralPrivateKeyHex}` as `0x${string}`;

      console.log("formattedEphemeralPrivateKey", formattedEphemeralPrivateKey);

      // Generate the ephemeral public key
      const ephemeralPublicKey = privateKeyToAccount(
        formattedEphemeralPrivateKey
      ).publicKey;

      console.log("ephemeralPublicKey", ephemeralPublicKey);

      // Generate spending private key for this nonce
      const spendingPrivateKey = generateStealthPrivateKey({
        spendingPrivateKey: keys.spendingPrivateKey,
        ephemeralPublicKey: ephemeralPublicKey,
      });

      // Handle the case where spendingPrivateKey might be an object, Uint8Array, or string
      const spendingPrivateKeyRaw =
        (spendingPrivateKey as { stealthPrivateKey?: string })
          .stealthPrivateKey ||
        (spendingPrivateKey as { privateKey?: string }).privateKey ||
        (spendingPrivateKey as { spendingPrivateKey?: string })
          .spendingPrivateKey ||
        (spendingPrivateKey as { key?: string }).key ||
        (spendingPrivateKey as { value?: string }).value ||
        spendingPrivateKey;

      let formattedSpendingPrivateKey;
      if (
        (typeof spendingPrivateKeyRaw === "object" &&
          "byteLength" in spendingPrivateKeyRaw) ||
        (typeof Buffer !== "undefined" &&
          Buffer.isBuffer(spendingPrivateKeyRaw))
      ) {
        const spendingPrivateKeyHex = Array.from(
          spendingPrivateKeyRaw as Uint8Array
        )
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        formattedSpendingPrivateKey =
          `0x${spendingPrivateKeyHex}` as `0x${string}`;
      } else if (typeof spendingPrivateKeyRaw === "string") {
        const cleanHex = spendingPrivateKeyRaw.replace("0x", "");
        formattedSpendingPrivateKey = `0x${cleanHex}` as `0x${string}`;
      } else {
        // If we still have an object, try to find the actual key
        console.error(
          "Unable to extract private key from:",
          spendingPrivateKeyRaw
        );
        throw new Error(
          "Cannot extract private key from spendingPrivateKey object"
        );
      }

      return formattedSpendingPrivateKey;
    });

    return processedKeys;
  };

  const executeTransactionWithGasSponsorship = async (
    multicallData: Array<{
      target: string;
      allowFailure: boolean;
      callData: string;
    }>,
    metadata: Record<string, unknown> = {}
  ) => {
    try {
      console.log("🌟 Requesting gas sponsorship for transaction...");
      console.log("📋 Multicall data:", {
        numberOfCalls: multicallData.length,
        calls: multicallData.map((call, index) => ({
          index: index + 1,
          target: call.target,
          allowFailure: call.allowFailure,
          dataLength: call.callData.length,
        })),
      });

      // Make request to gas sponsorship endpoint
      const response = await fetch(
        `${BACKEND_URL}/api/user/${username}/gas-sponsorship`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            multicallData,
            metadata: {
              ...metadata,
              userAgent: navigator.userAgent,
              timestamp: new Date().toISOString(),
              requestId: `${Date.now()}-${Math.random()
                .toString(36)
                .substr(2, 9)}`,
            },
          }),
        }
      );

      const result = await response.json();
      console.log("📄 Backend response:", result);

      if (!response.ok) {
        throw new Error(
          result.message || result.error || "Gas sponsorship request failed"
        );
      }

      if (!result.success) {
        throw new Error(
          result.message || "Gas sponsorship service returned failure"
        );
      }

      console.log("✅ Gas sponsored transaction completed successfully!");
      console.log("📊 Transaction details:", result);

      // Handle the backend response structure
      const txHash = result.data?.transactionHash || "pending";
      const explorerUrl =
        result.data?.executionDetails?.explorerUrl ||
        `https://amoy.polygonscan.com/tx/${txHash}`;

      return {
        success: true,
        txHash: txHash,
        blockNumber: result.data?.blockNumber || 0,
        gasUsed: result.data?.gasUsed || "N/A",
        gasCost: result.data?.gasCost || "N/A",
        explorerUrl: explorerUrl,
        receipt: {
          status: "success",
          transactionHash: txHash,
          blockNumber: BigInt(result.data?.blockNumber || 0),
          gasUsed: BigInt(result.data?.gasUsed || 0),
        },
        sponsorDetails: {
          sponsorAddress: result.data?.sponsorAddress || "Unknown",
          chainName: result.data?.executionDetails?.chainName || "Polygon Amoy Testnet",
        },
      };
    } catch (error) {
      console.error("❌ Gas sponsorship request failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      throw new Error(`Gas sponsorship failed: ${errorMessage}`);
    }
  };

  const processSingleRedemptionWithSponsorship = async (
    index: number,
    nonce: number
  ) => {
    await switchChainAsync({
      chainId: currentNetwork?.chainId as number,
    });

    // Set this specific payment as redeeming
    setRedeemingPayments((prev) => new Set([...prev, index]));
    const payment = tableData[index];

    try {
      console.log("🚀 Starting sponsored redemption process...");
      console.log("📋 Payment details:", payment);
      console.log("🔢 Nonce:", nonce);

      // Generate stealth private key (same as before)
      const keys = await generateInitialKeysOnClient([nonce]);
      const spendingPrivateKey = keys[0];
      const stealthAddress = privateKeyToAccount(spendingPrivateKey).address;

      console.log("🔐 Stealth address derived:", stealthAddress);

      // Predict Safe address using centralized RPC configuration
      const predictedSafeAddress = await predictSafeAddress(
        stealthAddress,
        RPC_CONFIG.POLYGON_AMOY_TESTNET.primary
      );
      console.log("🏦 Predicted Safe address:", predictedSafeAddress);

      const predictedSafe = {
        safeAccountConfig: {
          owners: [stealthAddress],
          threshold: 1,
        },
        safeDeploymentConfig: {
          saltNonce: "0",
        },
      };

      const RPC_URL = RPC_CONFIG.POLYGON_AMOY_TESTNET.primary;

      console.log("currentNetwork", currentNetwork);

      // Get custom contract networks configuration for the current network
      const contractNetworks = getContractNetworks(
        currentNetwork?.chainId || 80002
      );

      console.log("🔧 Using custom contract networks for current network:", {
        chainId: currentNetwork?.chainId || 80002,
        contractNetworks,
      });

      console.log({
        provider: RPC_URL as string,
        signer: stealthAddress,
        predictedSafe,
        contractNetworks,
      });

      const protocolKit = await Safe.init({
        provider: RPC_URL as string,
        signer: stealthAddress,
        predictedSafe,
        contractNetworks,
      });

      const isSafeDeployed = await protocolKit.isSafeDeployed();
      console.log("isSafeDeployed", isSafeDeployed);

      let deploymentTransaction;
      let safeNonce = 0;

      if (!isSafeDeployed) {
        console.log("🔄 Safe needs to be deployed first");
        deploymentTransaction =
          await protocolKit.createSafeDeploymentTransaction();
        console.log(
          "✅ Safe deployment transaction created",
          deploymentTransaction
        );
      } else {
        console.log("✅ Safe is already deployed, getting current nonce...");
        // Get the current nonce from the deployed Safe
        if (!publicClient) {
          throw new Error("Public client not available");
        }

        const safeNonceData = encodeFunctionData({
          abi: [
            {
              inputs: [],
              name: "nonce",
              outputs: [{ name: "", type: "uint256" }],
              stateMutability: "view",
              type: "function",
            },
          ],
          functionName: "nonce",
        });

        let safeNonceResult;
        try {
          safeNonceResult = await publicClient.call({
            to: predictedSafeAddress as `0x${string}`,
            data: safeNonceData,
          });
        } catch (error) {
          console.warn("⚠️ RPC call failed, retrying with delay...", error);
          // Wait a bit and retry
          await new Promise((resolve) => setTimeout(resolve, 1000));
          safeNonceResult = await publicClient.call({
            to: predictedSafeAddress as `0x${string}`,
            data: safeNonceData,
          });
        }

        safeNonce = Number(BigInt(safeNonceResult.data || "0x0"));
        console.log("🔢 Safe nonce:", safeNonce);
      }

      // Create USDC transfer transaction (same as before)
      console.log("💸 Creating USDC transfer transaction from Safe...");

      // Create wallet client with spending private key
      const spendingWalletClient = createWalletClient({
        account: privateKeyToAccount(spendingPrivateKey as `0x${string}`),
        chain: currentChain,
        transport: http(RPC_URL),
      });

      // Encode USDC transfer function data
      const transferData = encodeFunctionData({
        abi: [
          {
            inputs: [
              { name: "to", type: "address" },
              { name: "amount", type: "uint256" },
            ],
            name: "transfer",
            outputs: [{ name: "", type: "bool" }],
            stateMutability: "nonpayable",
            type: "function",
          },
        ],
        functionName: "transfer",
        args: [
          recipientAddress as `0x${string}`,
          parseUnits(payment.amount.toString(), payment.decimals),
        ],
      });

      // Build Safe transaction with correct nonce
      const safeTransaction = buildSafeTransaction({
        to: payment.tokenAddress,
        value: "0",
        data: transferData,
        operation: 0,
        safeTxGas: "0",
        nonce: safeNonce,
      });

      // Sign the Safe transaction with proper account type
      const account = privateKeyToAccount(spendingPrivateKey);
      const signature = await safeSignTypedData(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        spendingWalletClient as any,
        account,
        predictedSafeAddress as `0x${string}`,
        safeTransaction
      );

      console.log("✅ Safe transaction signed successfully");

      // Encode execTransaction call (same as before)
      const execTransactionData = encodeFunctionData({
        abi: SAFE_ABI,
        functionName: "execTransaction",
        args: [
          safeTransaction.to as `0x${string}`,
          BigInt(safeTransaction.value || "0"),
          safeTransaction.data as `0x${string}`,
          safeTransaction.operation,
          BigInt(safeTransaction.safeTxGas || "0"),
          BigInt(safeTransaction.baseGas || "0"),
          BigInt(safeTransaction.gasPrice || "0"),
          (safeTransaction.gasToken ||
            "0x0000000000000000000000000000000000000000") as `0x${string}`,
          (safeTransaction.refundReceiver ||
            "0x0000000000000000000000000000000000000000") as `0x${string}`,
          signature as `0x${string}`,
        ],
      });

      console.log("✅ execTransaction data encoded");

      console.log(
        "🔄 Deploying Safe AND executing transfer in single multicall..."
      );

      let multicallData = [];

      if (isSafeDeployed) {
        // Safe is already deployed, only do the transfer
        console.log("✅ Safe is already deployed - executing transfer only...");
        multicallData = [
          {
            target: predictedSafeAddress,
            allowFailure: false,
            callData: execTransactionData,
          },
        ];
      } else if (deploymentTransaction) {
        // Safe needs to be deployed, do both deployment and transfer
        console.log(
          "🔄 Safe not deployed - Deploying Safe AND executing transfer in single multicall..."
        );
        multicallData = [
          // Step 1: Deploy the Safe
          {
            target: deploymentTransaction.to,
            allowFailure: false,
            callData: deploymentTransaction.data,
          },
          // Step 2: Execute the USDC transfer from Safe (in same transaction)
          {
            target: predictedSafeAddress,
            allowFailure: false,
            callData: execTransactionData,
          },
        ];
      } else {
        throw new Error("Failed to create Safe deployment transaction");
      }

      console.log("📋 Combined multicall data:", {
        multicallLength: multicallData.length,
        calls: multicallData.map((call, i) => ({
          index: i,
          target: call.target,
          allowFailure: call.allowFailure,
          dataLength: call.callData.length,
          operation: i === 0 ? "Safe Deployment" : "USDC Transfer",
        })),
      });

      const sponsorshipResult = await executeTransactionWithGasSponsorship(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        multicallData as any,
        {
          operationType: "safe_deployment_and_transfer",
          paymentIndex: index,
          nonce: nonce,
          stealthAddress: stealthAddress,
          safeAddress: predictedSafeAddress,
          recipientAddress: recipientAddress,
          tokenAddress: payment.tokenAddress,
          amount: payment.amount.toString(),
          symbol: payment.token,
        }
      );

      console.log(
        "✅ Safe deployment AND transfer completed in single transaction:",
        sponsorshipResult.txHash
      );

      console.log("✅ Gas sponsored transaction completed successfully!");

      // Verify the transfer worked (enhanced with sponsorship details)
      console.log("🔍 Verifying USDT transfer results...");

      let recipientBalanceFormatted = "0.00";

      try {
        // Check recipient balance
        const recipientBalanceData = encodeFunctionData({
          abi: USDC_ABI,
          functionName: "balanceOf",
          args: [recipientAddress as `0x${string}`],
        });

        if (!publicClient) {
          throw new Error("Public client not available");
        }

        console.log("🔍 Checking recipient balance at:", {
          recipientAddress,
          tokenAddress: payment.tokenAddress,
        });

        const recipientBalanceResult = await publicClient.call({
          to: payment.tokenAddress as `0x${string}`,
          data: recipientBalanceData,
        });

        const recipientBalance = BigInt(recipientBalanceResult.data || "0x0");
        recipientBalanceFormatted = (
          Number(recipientBalance) / Math.pow(10, payment.decimals)
        ).toFixed(2);

        console.log("✅ Balance check successful:", {
          recipientBalance: recipientBalance.toString(),
          recipientBalanceFormatted,
        });
      } catch (balanceError) {
        console.warn(
          "⚠️ Balance verification failed, but transaction was successful:",
          balanceError
        );
        // Don't fail the entire process if balance check fails
        // The transaction was successful, so we'll continue
      }

      console.log("✅ Gas sponsored transfer verification:", {
        recipient: recipientAddress,
        receivedAmount: `${recipientBalanceFormatted} ${payment.token}`,
        transactionHash: sponsorshipResult.txHash,
        explorerUrl: sponsorshipResult.explorerUrl,
        sponsorAddress: sponsorshipResult.sponsorDetails.sponsorAddress,
        gasUsed: sponsorshipResult.gasUsed,
        gasCost: sponsorshipResult.gasCost,
      });

      // Update UI state
      const newRedeemed = new Set(selectedRows);
      newRedeemed.add(index);
      setSelectedRows(Array.from(newRedeemed));

      // Remove from redeeming state
      setRedeemingPayments((prev) => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });

      // Close dialog and reset state
      setIsWithdrawDialogOpen(false);
      setRecipientAddress("");
      setWithdrawAmount(0);
      setSelectedWithdrawal(null);

      // Refresh withdrawal data
      await refetchWithdrawals();

      // 🎉 Enhanced success response with sponsorship details
      return {
        success: true,
        deploymentTransaction,
        safeTransaction,
        signature,
        txHash: sponsorshipResult.txHash,
        gasUsed: sponsorshipResult.gasUsed,
        gasCost: sponsorshipResult.gasCost,
        explorerUrl: sponsorshipResult.explorerUrl,
        sponsorDetails: sponsorshipResult.sponsorDetails,
        summary: {
          stealthAddress,
          safeAddress: predictedSafeAddress,
          recipient: recipientAddress,
          multicallCalls: isSafeDeployed ? 1 : 2, // 1 for transfer, 2 for deploy + transfer
          executed: true,
          txHash: sponsorshipResult.txHash,
          recipientBalance: `${recipientBalanceFormatted} ${payment.token}`,
          sponsoredBy: sponsorshipResult.sponsorDetails.sponsorAddress,
          gasUsed: sponsorshipResult.gasUsed,
          explorerUrl: sponsorshipResult.explorerUrl,
        },
      };
    } catch (error) {
      console.error("❌ Sponsored redemption failed:", error);

      // Log detailed error information
      if (error instanceof Error) {
        console.error("Error details:", {
          message: error.message,
          stack: error.stack,
          name: error.name,
        });
      } else {
        console.error("Unknown error type:", typeof error, error);
      }

      // Remove from redeeming state on error
      setRedeemingPayments((prev) => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });

      // Re-throw with more context
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Withdrawal failed: ${errorMessage}`);
    }
  };

  // Batch processing function for multiple withdrawals
  const processBatchRedemptionWithSponsorship = async (
    selectedIndices: number[],
    recipientAddress: string
  ) => {
    console.log("🚀 Starting batch redemption process...");
    console.log("📋 Selected indices:", selectedIndices);
    console.log("🎯 Recipient address:", recipientAddress);

    // Set all selected payments as redeeming
    setRedeemingPayments((prev) => new Set([...prev, ...selectedIndices]));
    setIsBatchProcessing(true);

    try {
      // Generate stealth keys for all selected payments
      const nonces = selectedIndices.map((index) => tableData[index].nonce);
      console.log("🔢 Nonces for batch:", nonces);

      const keys = await generateInitialKeysOnClient(nonces);
      console.log(`🔐 Generated ${keys.length} stealth keys`);

      // Prepare multicall data for all transactions
      const allMulticallData = [];
      const batchMetadata = [];

      for (let i = 0; i < selectedIndices.length; i++) {
        const index = selectedIndices[i];
        const payment = tableData[index];
        const spendingPrivateKey = keys[i];
        const stealthAddress = privateKeyToAccount(spendingPrivateKey).address;

        console.log(
          `\n🔍 Processing payment ${i + 1}/${selectedIndices.length}:`
        );
        console.log(`   - Index: ${index}`);
        console.log(`   - Stealth Address: ${stealthAddress}`);
        console.log(`   - Amount: ${payment.amount} ${payment.token}`);

        // Predict Safe address
        const predictedSafeAddress = await predictSafeAddress(
          stealthAddress,
          RPC_CONFIG.POLYGON_AMOY_TESTNET.primary
        );
        console.log(`   - Predicted Safe: ${predictedSafeAddress}`);

        // Initialize Safe Protocol Kit
        const predictedSafe = {
          safeAccountConfig: {
            owners: [stealthAddress],
            threshold: 1,
          },
          safeDeploymentConfig: {
            saltNonce: "0",
          },
        };

        const RPC_URL = RPC_CONFIG.POLYGON_AMOY_TESTNET.primary;
        const contractNetworks = getContractNetworks(
          currentNetwork?.chainId || 80002
        );

        const protocolKit = await Safe.init({
          provider: RPC_URL,
          signer: stealthAddress,
          predictedSafe,
          contractNetworks,
        });

        // Check if Safe is deployed
        const isSafeDeployed = await protocolKit.isSafeDeployed();
        console.log(`   - Safe deployed: ${isSafeDeployed}`);

        let deploymentTransaction;
        let safeNonce = 0;

        if (!isSafeDeployed) {
          console.log("   - Creating Safe deployment transaction...");
          deploymentTransaction =
            await protocolKit.createSafeDeploymentTransaction();
        } else {
          console.log("   - Getting Safe nonce...");
          if (!publicClient) {
            throw new Error("Public client not available");
          }

          const safeNonceData = encodeFunctionData({
            abi: [
              {
                inputs: [],
                name: "nonce",
                outputs: [{ name: "", type: "uint256" }],
                stateMutability: "view",
                type: "function",
              },
            ],
            functionName: "nonce",
          });

          const safeNonceResult = await publicClient.call({
            to: predictedSafeAddress as `0x${string}`,
            data: safeNonceData,
          });

          safeNonce = Number(BigInt(safeNonceResult.data || "0x0"));
          console.log(`   - Safe nonce: ${safeNonce}`);
        }

        // Create wallet client and transfer data
        const spendingWalletClient = createWalletClient({
          account: privateKeyToAccount(spendingPrivateKey as `0x${string}`),
          chain: currentChain,
          transport: http(RPC_URL),
        });

        const transferData = encodeFunctionData({
          abi: [
            {
              inputs: [
                { name: "to", type: "address" },
                { name: "amount", type: "uint256" },
              ],
              name: "transfer",
              outputs: [{ name: "", type: "bool" }],
              stateMutability: "nonpayable",
              type: "function",
            },
          ],
          functionName: "transfer",
          args: [
            recipientAddress as `0x${string}`,
            parseUnits(payment.amount.toString(), payment.decimals),
          ],
        });

        // Build and sign Safe transaction
        const safeTransaction = buildSafeTransaction({
          to: payment.tokenAddress,
          value: "0",
          data: transferData,
          operation: 0,
          safeTxGas: "0",
          nonce: safeNonce,
        });

        const account = privateKeyToAccount(spendingPrivateKey);
        const signature = await safeSignTypedData(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          spendingWalletClient as any,
          account,
          predictedSafeAddress as `0x${string}`,
          safeTransaction
        );

        // Encode execTransaction call
        const execTransactionData = encodeFunctionData({
          abi: SAFE_ABI,
          functionName: "execTransaction",
          args: [
            safeTransaction.to as `0x${string}`,
            BigInt(safeTransaction.value || "0"),
            safeTransaction.data as `0x${string}`,
            safeTransaction.operation,
            BigInt(safeTransaction.safeTxGas || "0"),
            BigInt(safeTransaction.baseGas || "0"),
            BigInt(safeTransaction.gasPrice || "0"),
            (safeTransaction.gasToken ||
              "0x0000000000000000000000000000000000000000") as `0x${string}`,
            (safeTransaction.refundReceiver ||
              "0x0000000000000000000000000000000000000000") as `0x${string}`,
            signature as `0x${string}`,
          ],
        });

        // Add transactions to multicall data
        if (!isSafeDeployed && deploymentTransaction) {
          allMulticallData.push({
            target: deploymentTransaction.to,
            allowFailure: false,
            callData: deploymentTransaction.data,
          });
          console.log(`   - Added Safe deployment for payment ${i + 1}`);
        }

        allMulticallData.push({
          target: predictedSafeAddress,
          allowFailure: false,
          callData: execTransactionData,
        });
        console.log(`   - Added transfer for payment ${i + 1}`);

        // Store metadata for this payment
        batchMetadata.push({
          index,
          stealthAddress,
          predictedSafeAddress,
          amount: payment.amount,
          token: payment.token,
          isSafeDeployed,
        });
      }

      console.log("\n📋 Batch multicall data prepared:", {
        totalPayments: selectedIndices.length,
        totalCalls: allMulticallData.length,
        calls: allMulticallData.map((call, i) => ({
          index: i + 1,
          target: call.target,
          allowFailure: call.allowFailure,
          dataLength: call.callData.length,
        })),
      });

      // Execute batch transaction with gas sponsorship
      console.log("🌟 Executing batch transaction with gas sponsorship...");

      const sponsorshipResult = await executeTransactionWithGasSponsorship(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        allMulticallData as any,
        {
          operationType: "batch_redemption",
          paymentCount: selectedIndices.length,
          nonces: nonces,
          recipientAddress: recipientAddress,
          tokenAddress: tableData[selectedIndices[0]].tokenAddress, // All should be same token
          symbol: tableData[selectedIndices[0]].token,
          batchMetadata: batchMetadata,
        }
      );

      console.log("✅ Batch redemption completed successfully!");

      // Update UI state
      const newSelectedRows = selectedRows.filter(
        (id) => !selectedIndices.includes(id - 1)
      );
      setSelectedRows(newSelectedRows);

      // Remove from redeeming state
      setRedeemingPayments((prev) => {
        const newSet = new Set(prev);
        selectedIndices.forEach((index) => newSet.delete(index));
        return newSet;
      });

      // Refresh withdrawal data
      await refetchWithdrawals();

      return {
        success: true,
        txHash: sponsorshipResult.txHash,
        gasUsed: sponsorshipResult.gasUsed,
        gasCost: sponsorshipResult.gasCost,
        explorerUrl: sponsorshipResult.explorerUrl,
        sponsorDetails: sponsorshipResult.sponsorDetails,
        summary: {
          totalPayments: selectedIndices.length,
          totalAmount: selectedIndices.reduce(
            (sum, index) => sum + tableData[index].amount,
            0
          ),
          recipient: recipientAddress,
          multicallCalls: allMulticallData.length,
          executed: true,
          txHash: sponsorshipResult.txHash,
          sponsoredBy: sponsorshipResult.sponsorDetails.sponsorAddress,
          gasUsed: sponsorshipResult.gasUsed,
          explorerUrl: sponsorshipResult.explorerUrl,
        },
      };
    } catch (error) {
      console.error("❌ Batch redemption failed:", error);

      // Log detailed error information
      if (error instanceof Error) {
        console.error("Error details:", {
          message: error.message,
          stack: error.stack,
          name: error.name,
        });
      } else {
        console.error("Unknown error type:", typeof error, error);
      }

      // Remove from redeeming state on error
      setRedeemingPayments((prev) => {
        const newSet = new Set(prev);
        selectedIndices.forEach((index) => newSet.delete(index));
        return newSet;
      });

      // Re-throw with more context
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Batch withdrawal failed: ${errorMessage}`);
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const [dialogError, setDialogError] = useState<string | null>(null);

  const handleConfirmWithdrawal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!recipientAddress.trim()) {
      setDialogError("Please enter a recipient address");
      return;
    }

    // Clear any previous errors
    setDialogError(null);
    setIsWithdrawing(true);

    try {
      if (selectedWithdrawal) {
        // Single withdrawal
        if (!selectedWithdrawal) {
          setDialogError("No withdrawal selected");
          return;
        }

        // Find the index of the selected withdrawal in tableData
        const withdrawalIndex = tableData.findIndex(
          (w) => w.id === selectedWithdrawal.id
        );
        if (withdrawalIndex === -1) {
          throw new Error("Selected withdrawal not found");
        }

        await processSingleRedemptionWithSponsorship(
          withdrawalIndex,
          selectedWithdrawal.nonce
        );
        console.log("Single withdrawal successful!");

        // Close dialog and reset state on success
        setIsWithdrawDialogOpen(false);
        setRecipientAddress("");
        setWithdrawAmount(0);
        setSelectedWithdrawal(null);
        setDialogError(null);
      } else if (selectedRows.length > 0) {
        // Batch withdrawal
        const selectedIndices = selectedRows.map((id) => id - 1);

        await processBatchRedemptionWithSponsorship(
          selectedIndices,
          recipientAddress
        );
        console.log("Batch withdrawal successful!");

        // Close dialog and reset state on success
        setIsWithdrawDialogOpen(false);
        setRecipientAddress("");
        setWithdrawAmount(0);
        setSelectedRows([]);
        setDialogError(null);
      } else {
        setDialogError("No withdrawal selected");
        return;
      }
    } catch (error) {
      console.error("Withdrawal failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setDialogError(`An error occurred: ${errorMessage}`);
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleCancelWithdrawal = () => {
    setIsWithdrawDialogOpen(false);
    setRecipientAddress("");
    setWithdrawAmount(0);
    setSelectedWithdrawal(null);
    setDialogError(null);
  };

  const isAllSelected =
    selectedRows.length === tableData.length && tableData.length > 0;

  const selectedTotal = tableData
    .filter((row) => selectedRows.includes(row.id))
    .reduce((sum, row) => sum + row.amount, 0);

  // Show loading state
  if (isWithdrawalsLoading) {
    return (
      <div className="max-w-6xl mx-auto py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground mb-1">
            Pending withdrawals
          </h1>
          <p className="text-sm text-muted-foreground">
            Loading your withdrawal data...
          </p>
        </div>
        <WithdrawalTableSkeleton />
      </div>
    );
  }

  // Show error state
  if (hasWithdrawalError) {
    return (
      <div className="max-w-6xl mx-auto py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground mb-1">
            Pending withdrawals
          </h1>
          <p className="text-sm text-muted-foreground">
            Error loading withdrawal data
          </p>
        </div>
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
          <p className="text-destructive mb-4">{withdrawalError}</p>
          <Button onClick={refetchWithdrawals} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="">
      <div className="max-w-6xl mx-auto py-10">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-1">
              Pending withdrawals
            </h1>
            <p className="text-sm text-muted-foreground">
              You have {tableData.length} transactions ready to withdraw
            </p>
          </div>
          <Button onClick={refetchWithdrawals} variant="ghost" size="sm">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Main content */}
        <div className="overflow-hidden space-y-4">
          {/* Action bar - updated styling */}
          <div className="flex items-center justify-between px-6 py-3.5 bg-accent/10 border border-border/50 rounded-none">
            <p className="text-sm font-mono">
              <span className="font-medium">{selectedRows.length}</span>
              <span className="text-muted-foreground ml-1">
                {selectedRows.length === 1 ? "item" : "items"} • $
                {selectedTotal.toFixed(2)} total
              </span>
            </p>

            <div className="flex items-center gap-2">
              {isBatchProcessing && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  Processing batch...
                </div>
              )}
              <Button
                onClick={() => setSelectedRows([])}
                variant="ghost"
                size="sm"
                disabled={selectedRows.length === 0 || isBatchProcessing}
                className="text-muted-foreground hover:text-foreground rounded-none font-mono"
              >
                Clear
              </Button>
              <Button
                onClick={handleWithdrawSelected}
                size="sm"
                disabled={selectedRows.length === 0 || isBatchProcessing}
                className="rounded-none"
              >
                {isBatchProcessing ? "Processing..." : "Withdraw Selected"}
              </Button>
            </div>
          </div>

          {/* Table - updated styling */}
          <div className="bg-background border border-border/50 rounded-none overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="font-mono py-4">Amount</TableHead>
                  <TableHead className="font-mono py-4">Token</TableHead>
                  <TableHead className="font-mono py-4">Chain</TableHead>
                  <TableHead className="font-mono py-4">Tx Hash</TableHead>
                  <TableHead className="font-mono py-4">From</TableHead>
                  <TableHead className="font-mono py-4 text-right">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentData.map((row, index) => (
                  <TableRow
                    key={row.id}
                    className={
                      index === currentData.length - 1
                        ? "border-b-0"
                        : "border-border/50"
                    }
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedRows.includes(row.id)}
                        onCheckedChange={(checked: boolean) =>
                          handleSelectRow(row.id, checked)
                        }
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      ${row.amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono">
                      {row.token}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm font-mono">
                      {row.network}
                    </TableCell>
                    <TableCell>
                      <a
                        href={getTransactionExplorerUrl(
                          row.txHash,
                          row.network,
                          row.chainId
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground text-sm font-mono transition-colors flex items-center gap-1"
                        title={row.txHash}
                      >
                        {`${row.txHash.slice(0, 8)}...${row.txHash.slice(-6)}`}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </TableCell>
                    <TableCell>
                      <a
                        href={getAddressExplorerUrl(
                          row.from,
                          row.network,
                          row.chainId
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground text-sm font-mono transition-colors flex items-center gap-1"
                        title={row.from}
                      >
                        {`${row.from.slice(0, 6)}...${row.from.slice(-4)}`}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        onClick={() => handleWithdraw(row.id)}
                        variant="outline"
                        size="sm"
                        className="font-normal rounded-none font-mono"
                      >
                        Withdraw
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {currentData.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-32 text-center text-muted-foreground font-mono"
                    >
                      No transactions yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-muted-foreground font-mono">
              Showing {startIndex + 1} to {Math.min(endIndex, tableData.length)}{" "}
              of {tableData.length} results
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-none font-mono"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-none font-mono"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      className="rounded-none font-mono w-8 h-8 p-0"
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </Button>
                  )
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="rounded-none font-mono"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-none font-mono"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Withdrawal Confirmation Dialog */}
      <Dialog
        open={isWithdrawDialogOpen}
        onOpenChange={setIsWithdrawDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
              {selectedWithdrawal
                ? "Confirm Single Withdrawal"
                : "Confirm Batch Withdrawal"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recipient-address">Recipient Address</Label>
              <Input
                id="recipient-address"
                placeholder="0x..."
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className="font-mono"
              />
            </div>

            <div className="bg-muted/50 rounded-lg p-3">
              {selectedWithdrawal ? (
                // Single withdrawal
                <p className="text-sm">
                  <span className="text-muted-foreground">
                    Withdrawing payment of
                  </span>
                  <span className="font-semibold ml-1">
                    ${withdrawAmount.toFixed(2)}
                  </span>
                </p>
              ) : selectedRows.length > 0 ? (
                // Batch withdrawal
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Withdrawing</span>
                    <span className="font-semibold ml-1">
                      {selectedRows.length} payments
                    </span>
                    <span className="text-muted-foreground ml-1">totaling</span>
                    <span className="font-semibold ml-1">
                      ${withdrawAmount.toFixed(2)}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    All selected payments will be processed in a single
                    transaction
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No withdrawal selected
                </p>
              )}
            </div>

            {recipientAddress.trim() && (
              <p className="text-sm text-muted-foreground">
                Funds will be transferred to the address you specify below. This
                action cannot be undone.
              </p>
            )}

            {dialogError && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-sm text-destructive">{dialogError}</p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleCancelWithdrawal}
              disabled={isWithdrawing}
            >
              Cancel
            </Button>
            <Button
              // @ts-expect-error - TODO: fix this
              onClick={handleConfirmWithdrawal}
              disabled={
                isWithdrawing || !recipientAddress.trim() || !!dialogError
              }
            >
              {isWithdrawing
                ? "Processing..."
                : selectedWithdrawal
                ? "Confirm Single Withdrawal"
                : "Confirm Batch Withdrawal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Withdraw;
