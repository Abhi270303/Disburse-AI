"use client";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { Button } from "./ui/button";
import {
  LogOut,
  Wallet,
  Copy,
  ChevronDown,
  User,
  Check,
  ExternalLink,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getAddressExplorerUrl } from "@/lib/constants";
import { type AuthState } from "@/lib/utils";
import { useUser } from "@/hooks/use-user-data";
import { UsernameSkeleton } from "./ui/loading-skeletons";
import { usePrivy } from "@privy-io/react-auth";

interface NavbarProps {
  onLogout: () => void;
  user?: AuthState["user"];
}

const Navbar: React.FC<NavbarProps> = ({ onLogout }) => {
  const { username, isLoading } = useUser();
  const [copied, setCopied] = React.useState(false);
  const { user } = usePrivy();

  const walletAddress = user?.wallet?.address || "";
  const shortAddress = `${walletAddress.slice(0, 6)}...${walletAddress.slice(
    -4
  )}`;

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    // You might want to add a toast notification here
  };

  const pathname = usePathname();

  const navItems = [
    {
      label: "Withdraw",
      href: "/",
    },
    {
      label: "Dashboard",
      href: "/dashboard",
    },
    {
      label: "Revenue",
      href: "/revenue",
    },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <div className="flex items-center gap-32 p-4 md:max-w-screen-2xl mx-auto">
      <div className="flex items-center gap-2">
        <Image
          src="/logo/logo-dark.svg"
          alt="Unwallet"
          width={40}
          height={40}
        />
      </div>

      <div className="md:max-w-6xl w-full flex items-center justify-between">
        <nav className="flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 text-primary transition-colors hover:text-primary/80 hover:font-mono",
                isActive(item.href) ? "font-mono font-semibold" : ""
              )}
            >
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {isLoading ? (
              <UsernameSkeleton />
            ) : (
              <Button variant="outline" className="gap-2">
                <User className="h-4 w-4" />
                <span className="font-medium">{username}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{username}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  Connected Wallet
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <div className="px-2 py-2">
              <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={getAddressExplorerUrl(walletAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-sm hover:text-primary transition-colors flex items-center gap-1"
                  >
                    {shortAddress}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-1 hover:bg-transparent"
                  onClick={handleCopyAddress}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4 text-muted-foreground hover:text-primary" />
                  )}
                </Button>
              </div>
            </div>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="gap-2 text-destructive focus:text-destructive cursor-pointer"
              onClick={onLogout}
            >
              <LogOut className="h-4 w-4" />
              Disconnect
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* <div className="hidden md:block"></div> */}

      {/*  */}
    </div>
  );
};

export default Navbar;
