"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  ExternalLink,
  CheckCircle,
  ArrowRight,
  Eye,
  Download,
} from "lucide-react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { useUser } from "@/hooks/use-user-data";
import { Skeleton } from "@/components/ui/skeleton";

const Page = () => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { exportWallet, user } = usePrivy();
  const { username, isLoading } = useUser();

  const address = user?.wallet?.address;

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  const truncateAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleExportWallet = async () => {
    try {
      await exportWallet();
    } catch (error) {
      console.error("Failed to export wallet:", error);
    }
  };

  const paymentUrl = username
    ? `http://localhost:3001/${username}/qrcode`
    : "http://localhost:3001/0xabhii/qrcode";
  const apiKey = "sk_test_1234567890abcdef";
  const integrationCode = `<!-- Add this div where you want the payment widget -->
<div id="crypto-payment" 
     data-unwallet-payment 
     data-merchant="vwaa"
     data-amount="99.99"
     data-product="Your Product Name"
     data-description="Product description"></div>

<!-- Include the Unwallet payment widget script -->
<script src="https://cdn.unwallet.io/widget/v1/merchant-widget.js"></script>

<!-- Listen for successful payments -->
<script>
document.addEventListener('unwallet-payment-success', (event) => {
    const { amount, token, stealthData } = event.detail;
    console.log('Payment received:', amount, token.symbol);
    
    // Your success logic here
    alert('Payment successful! Order confirmed.');
    window.location.href = '/order-success';
});
</script>`;

  return (
    <div className="text-foreground overflow-hidden">
      <div className="relative max-w-6xl mx-auto py-10">
        <div className="container mx-auto">
          {/* Bento Grid Layout */}
          <div className="grid grid-cols-12 gap-4 auto-rows-[200px] mb-8">
            {/* Payment URL - Large Card */}
            <div className="col-span-12 md:col-span-8 row-span-2 group relative bg-accent/10 backdrop-blur rounded-none p-8 border border-border/50 hover:border-foreground/20 transition-all duration-500 overflow-hidden">
              <div className="relative z-10">
                <p className="text-sm text-muted-foreground mb-4 font-mono">
                  PAYMENT URL
                </p>
                <h3 className="text-2xl font-light mb-4">Direct Link</h3>

                {/* User Address Section */}
                {address && (
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground mb-2 font-mono">
                      WALLET ADDRESS
                    </p>
                    <div className="flex items-center gap-3 p-3 bg-muted/30 border border-border/50 rounded-none">
                      <code className="text-sm font-mono flex-1">
                        {truncateAddress(address)}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(address, "address")}
                        className="shrink-0 rounded-none"
                      >
                        {copiedField === "address" ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 p-4 bg-muted/30 border border-border/50 rounded-none">
                  {isLoading ? (
                    <Skeleton className="h-4 flex-1" />
                  ) : (
                    <code className="text-sm font-mono flex-1 break-all">
                      {paymentUrl}
                    </code>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(paymentUrl, "url")}
                    className="shrink-0 rounded-none"
                    disabled={isLoading}
                  >
                    {copiedField === "url" ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <div className="flex gap-3 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-none"
                    onClick={() => window.open(paymentUrl, "_blank")}
                    disabled={isLoading}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Test URL
                  </Button>

                  {address && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportWallet}
                      className="rounded-none"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export Wallet
                    </Button>
                  )}
                </div>
              </div>
              {/* Animated gradient line */}
              <div className="absolute bottom-0 left-0 h-[1px] bg-gradient-to-r from-transparent via-foreground to-transparent w-full transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            </div>

            {/* API Key - Medium Card */}
            <div className="col-span-12 md:col-span-4 row-span-2 bg-foreground text-background rounded-none p-8 relative overflow-hidden">
              <div className="flex flex-col justify-between h-full">
                <div>
                  <p className="text-background/60 text-sm mb-4 font-mono">
                    API KEY
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-background/10 border border-background/20 rounded-none">
                      <code className="text-xs font-mono flex-1 truncate">
                        {apiKey}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(apiKey, "api")}
                        className="shrink-0 rounded-none text-background hover:bg-background/20"
                      >
                        {copiedField === "api" ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    <Badge
                      variant="secondary"
                      className="w-fit rounded-none bg-background/20 text-background border-background/30"
                    >
                      Test Mode
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-background animate-pulse" />
                  <span className="text-xs text-background/60 font-mono">
                    Active
                  </span>
                </div>
              </div>
              {/* Sharp geometric pattern */}
              <div className="absolute top-0 right-0 w-32 h-32 border border-background/10 -translate-y-1/2 translate-x-1/2" />
            </div>

            {/* Quick Integration - Large Card - FIXED OVERFLOW */}
            <div className="col-span-12 md:col-span-6 row-span-2 bg-muted/30 backdrop-blur rounded-none p-8 border border-border/50 hover:border-foreground/20 transition-all duration-300">
              <div className="flex flex-col h-full">
                <div>
                  <p className="text-sm text-muted-foreground mb-4 font-mono">
                    QUICK START
                  </p>
                  <h3 className="text-xl font-light mb-4">Integration Code</h3>
                  <div className="relative">
                    <pre className="text-xs bg-foreground text-background p-4 rounded-none overflow-x-auto overflow-y-auto max-h-[240px] font-mono">
                      <code>{integrationCode}</code>
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(integrationCode, "code")}
                      className="absolute top-2 right-2 rounded-none bg-background/20 text-background hover:bg-background/30"
                    >
                      {copiedField === "code" ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full rounded-none mt-4"
                >
                  Copy Code
                </Button>
              </div>
            </div>

            {/* Features - Medium Card */}
            <div className="col-span-12 md:col-span-6 row-span-2 bg-accent/10 backdrop-blur rounded-none p-8 border border-border/50 hover:border-foreground/20 transition-all duration-300">
              <div className="flex flex-col justify-between h-full">
                <div>
                  <p className="text-sm text-muted-foreground mb-4 font-mono">
                    FEATURES
                  </p>
                  <h3 className="text-xl font-light mb-6">What this does</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 bg-foreground rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">
                        Creates a &ldquo;Pay with Crypto&rdquo; button
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 bg-foreground rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">
                        Generates unique payment addresses
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 bg-foreground rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">
                        Shows QR codes for mobile payments
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 bg-foreground rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">
                        Handles payment confirmations
                      </span>
                    </li>
                  </ul>
                </div>
                <div className="flex items-center space-x-2">
                  <Eye className="w-4 h-4 text-foreground/50" />
                  <span className="text-xs text-muted-foreground font-mono">
                    Privacy focused
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Custom Integration */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-6 bg-muted/50 backdrop-blur rounded-none p-8 border border-border/50 hover:border-foreground/20 transition-all duration-300">
              <div className="flex items-center justify-between h-full">
                <div>
                  <p className="text-sm text-muted-foreground mb-2 font-mono">
                    ADVANCED
                  </p>
                  <h3 className="text-xl font-light">Custom Integration</h3>
                  <p className="text-sm text-muted-foreground font-mono">
                    Advanced customization
                  </p>
                </div>
                <Link href="https://docs.unwallet.io" target="_blank">
                  <Button variant="outline" className="rounded-none group">
                    Documentation
                    <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="col-span-12 md:col-span-6 bg-accent/10 backdrop-blur rounded-none p-8 border border-border/50 hover:border-foreground/20 transition-all duration-300">
              <div className="flex items-center justify-between h-full">
                <div>
                  <span className="text-xs bg-foreground text-background px-2 py-1 rounded-none font-mono inline-block mb-2">
                    NEW
                  </span>
                  <h3 className="text-xl font-light">Analytics</h3>
                  <p className="text-sm text-muted-foreground font-mono">
                    Payment insights
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;
