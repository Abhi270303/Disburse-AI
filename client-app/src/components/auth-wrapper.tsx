"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  getAuthState,
  logout as removeAuthState,
  type AuthState,
} from "@/lib/utils";
import GetStarted from "./home/get-started";
import AuthPage from "./login";
import Navbar from "./navbar";
import { useLogout, usePrivy, useLogin } from "@privy-io/react-auth";

type AuthView = "get-started" | "signup" | "login";

interface AuthWrapperProps {
  children: React.ReactNode;
}

const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({ isLoggedIn: false });
  const [currentView, setCurrentView] = useState<AuthView>("get-started");
  const [isLoading, setIsLoading] = useState(true);

  const { ready, authenticated } = usePrivy();

  const { login } = useLogin();

  const { logout } = useLogout({
    onSuccess: () => {
      console.log("Logout complete");
      handleLogout();
    },
  });

  useEffect(() => {
    // Load auth state from localStorage on mount
    const state = getAuthState();
    setAuthState(state);
    setIsLoading(false);
  }, []);

  const handleLogin = (userData: AuthState["user"]) => {
    setAuthState({ isLoggedIn: true, user: userData });
  };

  const handleLogout = () => {
    removeAuthState();
    setAuthState({ isLoggedIn: false });
    setCurrentView("get-started");
  };

  const handleViewChange = (view: AuthView) => {
    setCurrentView(view);
  };

  // Show loading state while checking auth
  if (isLoading || !ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // If not authenticated with Privy, show authentication screen
  if (!authenticated) {
    return (
      <div className="flex min-h-screen h-full items-center justify-center p-4">
        {/* Centered Content */}
        <div className="w-full max-w-xl mx-auto border rounded-none p-3 bg-muted/10 p-12">
          <div className="flex flex-col">
            {/* Logo */}
            <div className="flex items-center gap-2 mb-16 justify-center">
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

            {/* Connect Wallet Content */}
            <div className="flex flex-col justify-center">
              <div className="space-y-6">
                <div>
                  <p className="text-muted-foreground text-sm text-center">
                    Connect your wallet to get started
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Connect Wallet Option */}
                  <button
                    className="w-full p-6 bg-card border border-border rounded-none text-left hover:border-primary hover:bg-accent/50 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] group"
                    onClick={() => login()}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-card-foreground group-hover:text-primary transition-colors font-mono">
                          Connect Wallet
                        </h3>
                        <div className="w-8 h-8 bg-primary rounded-none flex items-center justify-center group-hover:bg-primary/80 transition-colors">
                          <svg
                            className="w-4 h-4 text-primary-foreground"
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
                      </div>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        Connect your wallet and authenticate with Privy to
                        access Disburse AI
                      </p>
                    </div>
                  </button>
                </div>

                <p className="text-muted-foreground text-xs text-center">
                  By using Disburse AI, you agree to the{" "}
                  <a
                    href="#"
                    className="text-primary hover:text-primary/80 transition-colors"
                  >
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a
                    href="#"
                    className="text-primary hover:text-primary/80 transition-colors"
                  >
                    Privacy Policy
                  </a>
                  , including{" "}
                  <a
                    href="#"
                    className="text-primary hover:text-primary/80 transition-colors"
                  >
                    Cookie Use
                  </a>
                  .
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-16 pt-8">
              <p className="text-muted-foreground text-xs text-center">
                © Copyright Disburse AI 2025
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If authenticated but not logged in to our app, show auth components
  if (!authState.isLoggedIn) {
    return (
      <div className="min-h-screen bg-background text-foreground overflow-hidden">
        {/* Subtle gradient background */}
        <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-accent/5 pointer-events-none" />
        <div className="fixed top-[-200px] right-[-200px] w-[600px] h-[600px] bg-foreground/5 blur-3xl pointer-events-none" />
        <div className="fixed bottom-[-200px] left-[-200px] w-[600px] h-[600px] bg-accent/10 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          {currentView === "get-started" && (
            <GetStarted
              onSignIn={() => handleViewChange("login")}
              onCreateWallet={() => handleViewChange("signup")}
            />
          )}
          {currentView === "signup" && (
            <AuthPage
              onLogin={handleLogin}
              onBackToGetStarted={() => handleViewChange("get-started")}
              isLoginMode={false}
            />
          )}
          {currentView === "login" && (
            <AuthPage
              onLogin={handleLogin}
              onBackToGetStarted={() => handleViewChange("get-started")}
              isLoginMode={true}
            />
          )}
        </div>
      </div>
    );
  }

  // If logged in, show the main app with navbar
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-accent/5 pointer-events-none" />
      <div className="fixed top-[-200px] right-[-200px] w-[600px] h-[600px] bg-foreground/5 blur-3xl pointer-events-none" />
      <div className="fixed bottom-[-200px] left-[-200px] w-[600px] h-[600px] bg-accent/10 blur-3xl pointer-events-none" />
      <div className="relative z-10">
        <Navbar onLogout={() => logout()} user={authState.user} />
        {children}
      </div>
    </div>
  );
};

export default AuthWrapper;
