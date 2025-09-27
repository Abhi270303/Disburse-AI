"use client";
import React from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { LogoutButton } from "./LogoutButton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function WalletGate({ children }) {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Card className="w-full max-w-sm p-6 flex flex-col items-center gap-4">
          <h2 className="text-lg font-medium">Connect your wallet</h2>
          <p className="text-sm text-muted-foreground text-center">
            Please connect a wallet to continue.
          </p>
          <div className="mt-2">
            <ConnectButton showBalance={false} chainStatus="icon" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <>
      <LogoutButton />
      {children}
    </>
  );
}
