import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  generateKeysFromSignature,
  extractViewingPrivateKeyNode,
} from "@fluidkey/stealth-account-kit";
import { useAccount, useWalletClient } from "wagmi";
import { secp256k1 } from "ethereum-cryptography/secp256k1";
import axios from "axios";
import {
  BACKEND_URL,
  WHITELISTED_NETWORKS,
  STEALTH_ADDRESS_GENERATION_MESSAGE,
} from "@/lib/constants";
import { login as saveAuthState } from "@/lib/utils";
import { useUser } from "./use-user-data";

interface FormData {
  username: string;
  websiteUri: string;
  walletType: "personal" | "merchant";
}

const FORM_DATA_KEY = "register_form_data";
const SELECTED_TOKENS_KEY = "register_selected_tokens";

export const useRegisterForm = () => {
  const [selectedTokens, setSelectedTokens] = useState<Set<string>>(
    new Set(["polygon-amoy-testnet-usdc"])
  );

  const { refetchWithdrawals, refetch } = useUser();
  const [registrationResult, setRegistrationResult] = useState<{
    success: boolean;
    data: {
      user: {
        id: string;
        username: string;
        email: string;
        apiKey?: string;
        isMerchant?: boolean;
      };
      token?: string;
      testStealthAddress?: {
        address: string;
        chainId: number;
        chainName: string;
      };
      instructions?: {
        apiKey?: string;
        token?: string;
        endpoint?: string;
        note?: string;
      };
    };
    message: string;
  } | null>(null);
  const [formData, setFormData] = useState<FormData>({
    username: "",
    websiteUri: "",
    walletType: "personal",
  });

  const { authenticated, ready, user } = usePrivy();
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();

  useEffect(() => {
    const savedFormData = localStorage.getItem(FORM_DATA_KEY);
    const savedSelectedTokens = localStorage.getItem(SELECTED_TOKENS_KEY);

    if (savedFormData) {
      try {
        const parsedFormData = JSON.parse(savedFormData);
        setFormData(parsedFormData);
      } catch (error) {
        console.error("Error parsing saved form data:", error);
      }
    }

    if (savedSelectedTokens) {
      try {
        const parsedSelectedTokens = JSON.parse(savedSelectedTokens);
        setSelectedTokens(new Set(parsedSelectedTokens));
      } catch (error) {
        console.error("Error parsing saved selected tokens:", error);
      }
    }
  }, []);

  const clearFormData = () => {
    localStorage.removeItem(FORM_DATA_KEY);
    localStorage.removeItem(SELECTED_TOKENS_KEY);
    setFormData({
      username: "",
      websiteUri: "",
      walletType: "personal",
    });
    setSelectedTokens(new Set(["polygon-amoy-testnet-usdc"]));
  };

  // Remove the login hook since user is already authenticated

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Validation functions
  const validateUsername = (username: string) => {
    return (
      username.trim().length >= 3 &&
      username.trim().length <= 10 &&
      /^[a-zA-Z0-9_]+$/.test(username.trim())
    );
  };

  const validateWebsiteUri = (uri: string) => {
    try {
      const url = new URL(uri);
      return url.protocol === "https:" && uri.trim().length > 0;
    } catch {
      return false;
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    const newFormData = {
      ...formData,
      [field]: value,
    };

    setFormData(newFormData);

    // Persist to localStorage
    localStorage.setItem(FORM_DATA_KEY, JSON.stringify(newFormData));
  };

  const handleTokenToggle = (tokenId: string) => {
    const newSelection = new Set(selectedTokens);
    if (newSelection.has(tokenId)) {
      newSelection.delete(tokenId);
    } else {
      newSelection.add(tokenId);
    }
    setSelectedTokens(newSelection);

    // Persist to localStorage
    localStorage.setItem(
      SELECTED_TOKENS_KEY,
      JSON.stringify(Array.from(newSelection))
    );
  };

  const handleWalletTypeChange = (walletType: "personal" | "merchant") => {
    const newFormData = {
      ...formData,
      walletType,
      // Clear websiteUri if switching to personal
      websiteUri: walletType === "personal" ? "" : formData.websiteUri,
    };

    setFormData(newFormData);

    // Persist to localStorage
    localStorage.setItem(FORM_DATA_KEY, JSON.stringify(newFormData));
  };

  const isFormValid =
    validateUsername(formData.username) &&
    (formData.walletType === "personal" ||
      validateWebsiteUri(formData.websiteUri)) &&
    selectedTokens.size > 0;

  const handleSubmit = async () => {
    console.log("ready", ready);
    console.log("authenticated", authenticated);

    if (!ready || !authenticated) return null;

    console.log("Form submitted:", {
      username: formData.username,
      websiteUri: formData.websiteUri,
      selectedTokens: Array.from(selectedTokens),
    });

    setIsLoggingIn(true);

    try {
      const message = STEALTH_ADDRESS_GENERATION_MESSAGE;
      const signature = await walletClient?.signMessage({
        message: message,
      });

      console.log("signature", signature);

      if (!signature) {
        throw new Error("Failed to sign message");
      }

      const keys = generateKeysFromSignature(signature);

      const viewKeyNodeNumber = 0;
      const viewingPrivateKeyNode = extractViewingPrivateKeyNode(
        keys.viewingPrivateKey,
        viewKeyNodeNumber
      );

      const privateKeyBuffer = Buffer.from(
        keys.spendingPrivateKey.slice(2),
        "hex"
      );
      const spendingPublicKey = `0x${Buffer.from(
        secp256k1.getPublicKey(privateKeyBuffer, false)
      ).toString("hex")}`;

      const merchantKeys = {
        spendingPrivateKey: keys.spendingPrivateKey,
        viewingPrivateKey: keys.viewingPrivateKey,
        spendingPublicKey,
        viewingPrivateKeyNode,
        userAddress: user?.wallet?.address,
      };

      console.log("merchantKeys", merchantKeys);

      const chains = [
        {
          chainId: WHITELISTED_NETWORKS[0].chainId,
          name: WHITELISTED_NETWORKS[0].name,
          tokenAddresses: WHITELISTED_NETWORKS[0].tokens.map(
            (token) => token.address
          ),
        },
      ];

      const registrationData = {
        username: formData.username,
        email: user?.google?.email,
        eoaaddress: address,
        viewingPrivateKey: merchantKeys.viewingPrivateKey,
        spendingPublicKey: merchantKeys.spendingPublicKey,
        isMerchant: formData.walletType === "merchant",
        chains: chains,
      };

      console.log("registrationData", registrationData);

      const { data } = await axios.post(
        `${BACKEND_URL}/api/user/register`,
        registrationData
      );

      console.log("response", data);

      // Store the registration result to show success message
      setRegistrationResult(data);

      // Store merchant data in localStorage for dashboard access
      if (data.data.user.apiKey) {
        const merchantData = {
          username: data.data.user.username,
          email: data.data.user.email,
          apiKey: data.data.user.apiKey,
          isLive: false, // Start in test mode
        };
        localStorage.setItem("merchantData", JSON.stringify(merchantData));
      }

      // Create user data for auth state using actual registration data
      const userData = {
        username: formData.username,
        walletType: formData.walletType,
        websiteUri:
          formData.walletType === "merchant" ? formData.websiteUri : undefined,
        selectedTokens: Array.from(selectedTokens),
      };

      // Save auth state
     await saveAuthState(userData);

      //2sec delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      await refetch();
      await refetchWithdrawals();

      clearFormData();
      setIsLoggingIn(false);

      // Return the user data so the parent component can handle the auth state update
      return userData;
    } catch (error) {
      console.error("Registration failed:", error);
      setIsLoggingIn(false);
    }
  };

  return {
    formData,
    selectedTokens,
    validateUsername,
    validateWebsiteUri,
    handleInputChange,
    handleTokenToggle,
    handleWalletTypeChange,
    isFormValid,
    handleSubmit,
    registrationResult,
    setRegistrationResult,
    authenticated,
    ready,
    user,
    isLoggingIn,
    walletAddress: user?.wallet?.address,
  };
};
