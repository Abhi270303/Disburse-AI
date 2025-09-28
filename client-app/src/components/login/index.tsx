import React, { useState } from "react";
import Image from "next/image";
import { Check, Search, X, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { WHITELISTED_NETWORKS } from "@/lib/constants";
import { type AuthState } from "@/lib/utils";
import { useRegisterForm } from "@/hooks/use-register-form";
import { usePrivy } from "@privy-io/react-auth";
import { useWalletClient } from "wagmi";
import { login as saveAuthState } from "@/lib/utils";

interface AuthPageProps {
  onLogin: (userData: AuthState["user"]) => void;
  onBackToGetStarted: () => void;
  isLoginMode: boolean;
}

export default function AuthPage({
  onLogin,
  onBackToGetStarted,
  isLoginMode,
}: AuthPageProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  // Use the registration hook for account creation
  const {
    formData,
    selectedTokens,
    handleInputChange,
    handleTokenToggle,
    handleWalletTypeChange,
    handleSubmit: handleRegisterSubmit,
    isLoggingIn,
  } = useRegisterForm();

  // Extract values from formData for backward compatibility
  const { username, websiteUri, walletType } = formData;

  // Privy hooks for authentication
  const { } = usePrivy();
  const { data: walletClient } = useWalletClient();

  // Remove login hook since user is already authenticated

  // Dynamic chains from constants
  const chains = WHITELISTED_NETWORKS.map((network) => ({
    id: network.name.toLowerCase().replace(/\s+/g, "-"),
    name: network.name,
    logo: network.logo,
    chainId: network.chainId,
  }));

  // Dynamic tokens from constants - flatten all tokens from all networks
  const tokens = WHITELISTED_NETWORKS.flatMap((network) =>
    network.tokens.map((token) => ({
      id: token.symbol.toLowerCase(),
      name: token.name,
      symbol: token.symbol,
      logo: token.iconUri,
      address: token.address,
      networkName: network.name,
      enabled: token.enabled,
      networkChainId: network.chainId,
    }))
  );

  const tokenOptions = chains.flatMap((chain) =>
    tokens
      .filter((token) => token.networkChainId === chain.chainId)
      .map((token) => ({
        id: `${chain.id}-${token.id}`,
        chainId: chain.id,
        chainName: chain.name,
        chainLogo: chain.logo,
        tokenId: token.id,
        tokenName: token.name,
        tokenSymbol: token.symbol,
        tokenLogo: token.logo,
        tokenAddress: token.address,
        enabled: token.enabled,
        searchTerms:
          `${token.name} ${token.symbol} ${chain.name}`.toLowerCase(),
      }))
  );

  // Filter tokens based on search - handle multiple search terms
  const filteredTokens = tokenOptions.filter((option) => {
    if (!searchQuery) return true;

    // Split search query into individual terms
    const searchTerms = searchQuery
      .toLowerCase()
      .split(/\s+/)
      .filter((term) => term);

    // Check if ALL search terms are found in the option's searchable text
    return searchTerms.every((term) => option.searchTerms.includes(term));
  });

  const totalSteps = isLoginMode ? 1 : 4; // No wallet connection step needed since user is already authenticated

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreateAccount = async () => {
    // Use the registration hook's submit function
    const userData = await handleRegisterSubmit();
    if (userData) {
      // Call the onLogin callback to update auth state
      onLogin(userData);
    }
  };

  const handleLogin = async () => {
    // Execute login logic directly since user is already authenticated
    try {
      const message = "I_WANT_TO_LOGIN";
      const signature = await walletClient?.signMessage({
        message: message,
      });

      if (!signature) {
        throw new Error("Failed to sign message");
      }

      console.log("Login message signed successfully:", signature);

      // Create user data for existing user
      const userData = {
        username: "existing_user",
        walletType: "personal" as const,
        selectedTokens: ["polygon-amoy-testnet-usdc"],
      };

      // Save auth state
      saveAuthState(userData);
      onLogin(userData);
    } catch (error) {
      console.error("Error during login process:", error);
    }
  };

  const renderStep = () => {
    if (isLoginMode) {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button
              onClick={onBackToGetStarted}
              className="flex items-center gap-2 text-muted-foreground hover:text-card-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-2xl font-semibold text-card-foreground mb-1 font-mono">
                Sign In
              </h2>
              <p className="text-muted-foreground text-sm">
                Access your existing wallet and manage your stealth addresses
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-6 border border-border rounded-none bg-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-card-foreground">
                    Wallet Connected
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Ready to sign in
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Click the button below to sign in to your existing wallet and
                manage your stealth addresses.
              </p>
            </div>
          </div>
        </div>
      );
    }

    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <button
                onClick={onBackToGetStarted}
                className="flex items-center gap-2 text-muted-foreground hover:text-card-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-2xl font-semibold text-card-foreground mb-1 font-mono">
                  Create Account
                </h2>
                <p className="text-muted-foreground text-sm">
                  Set up your wallet to get started
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-medium text-card-foreground">
                Wallet Type
              </label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <button
                  type="button"
                  onClick={() => handleWalletTypeChange("personal")}
                  className={`p-4 border rounded-none text-left transition-all duration-200 ${
                    walletType === "personal"
                      ? "border-primary bg-accent/50"
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  <div className="space-y-2">
                    <h3 className="font-semibold text-card-foreground">
                      Personal
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      For personal use
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleWalletTypeChange("merchant")}
                  className={`p-4 border rounded-none text-left transition-all duration-200 ${
                    walletType === "merchant"
                      ? "border-primary bg-accent/50"
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  <div className="space-y-2">
                    <h3 className="font-semibold text-card-foreground">
                      Merchant
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Get API access
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-muted-foreground hover:text-card-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-2xl font-semibold text-card-foreground mb-1 font-mono">
                  Account Details
                </h2>
                <p className="text-muted-foreground text-sm">
                  Step {currentStep} of {totalSteps}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-card-foreground">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => handleInputChange("username", e.target.value)}
                placeholder="Enter username (3-10 chars, alphanumeric)"
                className="w-full p-3 border border-border rounded-none bg-card text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            {walletType === "merchant" && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-card-foreground">
                  Website URI <span className="text-destructive">*</span>
                </label>
                <input
                  type="url"
                  value={websiteUri}
                  onChange={(e) =>
                    handleInputChange("websiteUri", e.target.value)
                  }
                  placeholder="https://your-website.com"
                  className="w-full p-3 border border-border rounded-none bg-card text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-muted-foreground hover:text-card-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-2xl font-semibold text-card-foreground mb-1 font-mono">
                  Select Tokens
                </h2>
                <p className="text-muted-foreground text-sm">
                  Choose tokens to accept • {selectedTokens.size} selected
                </p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tokens or chains..."
                className="w-full pl-10 pr-10 py-2 border border-border rounded-none bg-card text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-card-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  // Select all enabled tokens
                  tokenOptions.forEach((option) => {
                    if (option.enabled && !selectedTokens.has(option.id)) {
                      handleTokenToggle(option.id);
                    }
                  });
                }}
                className="text-xs text-primary hover:text-primary/80 transition-colors"
              >
                Select all
              </button>
              <button
                onClick={() => {
                  // Clear all tokens by toggling each one off
                  selectedTokens.forEach((tokenId) => {
                    handleTokenToggle(tokenId);
                  });
                }}
                className="text-xs text-primary hover:text-primary/80 transition-colors"
              >
                Clear all
              </button>
            </div>

            {/* Token Grid */}
            <div className="grid grid-cols-3 gap-2 max-h-[280px] overflow-y-auto pr-1">
              {filteredTokens.length === 0 ? (
                <div className="col-span-3 text-center py-8 text-muted-foreground text-sm">
                  No tokens found matching &quot;{searchQuery}&quot;
                </div>
              ) : (
                filteredTokens.map((option) => {
                  const isSelected = selectedTokens.has(option.id);
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleTokenToggle(option.id)}
                      disabled={!option.enabled}
                      className={`relative p-3 border rounded-none transition-all duration-200 ${
                        isSelected
                          ? "border-primary bg-accent/30"
                          : "border-border bg-card hover:border-primary/50"
                      } ${
                        !option.enabled ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      {/* Selected Indicator */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}

                      {/* Token Logo with Chain Badge */}
                      <div className="flex flex-col items-center space-y-2">
                        <div className="relative">
                          <Image
                            src={option.tokenLogo}
                            alt={option.tokenName}
                            width={32}
                            height={32}
                            className="rounded-full"
                          />
                          <Image
                            src={option.chainLogo}
                            alt={option.chainName}
                            width={14}
                            height={14}
                            className="absolute -bottom-1 -right-1 rounded-full bg-background border border-border"
                          />
                        </div>

                        {/* Token Info */}
                        <div className="text-center">
                          <div className="text-xs font-medium text-card-foreground">
                            {option.tokenName}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            on {option.chainName}
                          </div>
                          {!option.enabled && (
                            <div className="text-[10px] text-muted-foreground">
                              Coming soon
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-muted-foreground hover:text-card-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-2xl font-semibold text-card-foreground mb-1 font-mono">
                  Review & Create
                </h2>
                <p className="text-muted-foreground text-sm">
                  Step {currentStep} of {totalSteps}
                </p>
              </div>
            </div>

            {/* Compact Review Card */}
            <div className="space-y-4">
              <div className="p-4 border rounded-none space-y-3">
                {/* Account Info */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Username
                  </span>
                  <span className="text-sm font-medium">@{username}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Type</span>
                  <Badge variant="secondary" className="capitalize">
                    {walletType}
                  </Badge>
                </div>

                {walletType === "merchant" && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Website
                    </span>
                    <span className="text-sm font-mono text-primary">
                      {websiteUri}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tokens</span>
                  <span className="text-sm font-medium">
                    {selectedTokens.size} selected
                  </span>
                </div>
              </div>

              {/* Selected Tokens Display */}
              {selectedTokens.size > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Accepting payments in:
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from(selectedTokens).map((tokenId) => {
                      const option = tokenOptions.find((t) => t.id === tokenId);
                      if (!option) return null;

                      return (
                        <div
                          key={tokenId}
                          className="flex items-center gap-2 p-2 bg-secondary/50 border border-border rounded-none"
                        >
                          <div className="relative">
                            <Image
                              src={option.tokenLogo}
                              alt={option.tokenName}
                              width={20}
                              height={20}
                              className="rounded-full"
                            />
                            <Image
                              src={option.chainLogo}
                              alt={option.chainName}
                              width={10}
                              height={10}
                              className="absolute -bottom-0.5 -right-0.5 rounded-full bg-background border border-border"
                            />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-medium">
                              {option.tokenName}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {option.chainName}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-muted-foreground hover:text-card-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-2xl font-semibold text-card-foreground mb-1 font-mono">
                  Review & Create
                </h2>
                <p className="text-muted-foreground text-sm">
                  Step {currentStep} of {totalSteps}
                </p>
              </div>
            </div>

            {/* Compact Review Card */}
            <div className="space-y-4">
              <div className="p-4 border rounded-none space-y-3">
                {/* Account Info */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Username
                  </span>
                  <span className="text-sm font-medium">@{username}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Type</span>
                  <Badge variant="secondary" className="capitalize">
                    {walletType}
                  </Badge>
                </div>

                {walletType === "merchant" && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Website
                    </span>
                    <span className="text-sm font-mono text-primary">
                      {websiteUri}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tokens</span>
                  <span className="text-sm font-medium">
                    {selectedTokens.size} selected
                  </span>
                </div>
              </div>

              {/* Selected Tokens Display */}
              {selectedTokens.size > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Accepting payments in:
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from(selectedTokens).map((tokenId) => {
                      const option = tokenOptions.find((t) => t.id === tokenId);
                      if (!option) return null;

                      return (
                        <div
                          key={tokenId}
                          className="flex items-center gap-2 p-2 bg-secondary/50 border border-border rounded-none"
                        >
                          <div className="relative">
                            <Image
                              src={option.tokenLogo}
                              alt={option.tokenName}
                              width={20}
                              height={20}
                              className="rounded-full"
                            />
                            <Image
                              src={option.chainLogo}
                              alt={option.chainName}
                              width={10}
                              height={10}
                              className="absolute -bottom-0.5 -right-0.5 rounded-full bg-background border border-border"
                            />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-medium">
                              {option.tokenName}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {option.chainName}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen h-screen overflow-hidden">
      {/* Left Panel - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-8 lg:p-12 overflow-hidden">
        <div className="flex flex-col flex-grow max-w-md mx-auto w-full">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-12">
            <Image
              src="/logo/logo-dark.svg"
              alt="Unwallet"
              width={40}
              height={40}
            />
            <span className="text-card-foreground font-semibold text-2xl font-mono">
              Disburse AI
            </span>
          </div>

          {/* Form Content */}
          <div className="flex-grow flex flex-col justify-center pb-24">
            {renderStep()}

            {/* Navigation Buttons */}
            <div className="flex justify-end mt-8">
              {isLoginMode ? (
                <button
                  onClick={handleLogin}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-none font-medium hover:bg-primary/90 transition-colors"
                >
                  Sign In
                </button>
              ) : currentStep < totalSteps ? (
                <button
                  onClick={handleNext}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-none font-medium hover:bg-primary/90 transition-colors"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleCreateAccount}
                  disabled={isLoggingIn}
                  className={`px-6 py-3 rounded-none font-medium transition-colors ${
                    !isLoggingIn
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  }`}
                >
                  {isLoggingIn ? "Creating Account..." : "Create Account"}
                </button>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8">
            <p className="text-muted-foreground text-xs">
              © Copyright Unwallet 2025
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel Container with Padding */}
      <div className="hidden lg:block lg:w-1/2 p-6 h-screen overflow-hidden">
        <div className="relative w-full h-full rounded-none overflow-hidden">
          {/* Base Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500 via-blue-500 to-cyan-400">
            <div className="absolute inset-0 bg-gradient-to-t from-blue-600/40 via-transparent to-purple-500/30" />
          </div>

          {/* Intense White Vignette Effect - Multiple Layers */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/40 via-transparent to-white/40" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/50 via-transparent to-white/30" />
          <div className="absolute inset-0 bg-gradient-to-tr from-white/30 via-transparent to-white/50" />
          <div className="absolute inset-0 bg-gradient-to-bl from-white/35 via-transparent to-white/40" />

          {/* Strong corner vignettes for intense glow effect */}
          <div className="absolute inset-0">
            <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-gradient-to-br from-white/40 to-transparent" />
            <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-bl from-white/35 to-transparent" />
            <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-gradient-to-tr from-white/30 to-transparent" />
            <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-gradient-to-tl from-white/35 to-transparent" />
          </div>

          {/* Edge highlight overlay */}
          <div
            className="absolute inset-0 rounded-3xl"
            style={{
              background:
                "radial-gradient(ellipse at center, transparent 40%, rgba(255,255,255,0.15) 100%)",
            }}
          />

          {/* Extra edge glow for intense vignette */}
          <div
            className="absolute inset-0 rounded-3xl"
            style={{
              boxShadow: "inset 0 0 100px 50px rgba(255,255,255,0.2)",
            }}
          />

          {/* Grain/Noise Effect */}
          <div
            className="absolute inset-0 opacity-50 mix-blend-multiply"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
              backgroundRepeat: "repeat",
            }}
          />

          {/* Additional texture overlay */}
          <div
            className="absolute inset-0 opacity-[0.15]"
            style={{
              backgroundImage: `
                repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,.1) 3px, rgba(255,255,255,.1) 6px),
                repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(255,255,255,.05) 3px, rgba(255,255,255,.05) 6px)
              `,
            }}
          />

          {/* Top outlined text */}
          <div className="absolute -top-12 left-0 right-0 flex justify-center pointer-events-none">
            <div
              className="text-[160px] font-black text-transparent leading-none select-none opacity-60"
              style={{
                WebkitTextStroke: "2px rgba(255,255,255,0.3)",
              }}
            >
              UNWALLET
            </div>
          </div>

          {/* Content */}
          <div className="relative z-10 h-full flex flex-col items-center justify-center p-12 text-center">
            <div className="max-w-lg space-y-8">
              <div className="space-y-4">
                <h2
                  className="text-2xl font-medium text-foreground/95 leading drop-shadow-lg"
                  style={{
                    WebkitTextStroke: "2px rgba(255,255,255,0.3)",
                  }}
                >
                  <span className="font-semibold">Unwallet</span> is a one
                  wallet for payments on any chain which is built for agents,
                  merchants, and users.
                </h2>
              </div>
            </div>
          </div>

          {/* Bottom large text with outline */}
          <div className="absolute inset-x-0 -bottom-12 flex items-end justify-center pointer-events-none overflow-hidden">
            <div
              className="text-[180px] font-black text-transparent leading-none tracking-tighter select-none"
              style={{
                WebkitTextStroke: "3px rgba(255,255,255,0.25)",
              }}
            >
              Disburse AI
            </div>
          </div>

          {/* Decorative elements with stronger white glows */}
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-white/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-white/20 rounded-full blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/[0.08] rounded-full blur-[120px]" />
        </div>
      </div>
    </div>
  );
}
