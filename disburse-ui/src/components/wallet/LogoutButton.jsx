"use client";
import React from "react";
import { useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const { disconnect } = useDisconnect();

  const handleLogout = () => {
    try {
      localStorage.removeItem("access_token");
    } catch {}
    disconnect();
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleLogout}
      className="fixed top-3 right-3 z-50"
      aria-label="Logout"
    >
      Logout
    </Button>
  );
}
