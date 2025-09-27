"use client";

import { useState, useEffect } from "react";
import { AccessCodeForm } from "./access-code-form";

export function AuthWrapper({ children }) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for access token on mount
    const accessToken = localStorage.getItem("access_token");
    if (accessToken) {
      setIsAuthorized(true);
    }
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <AccessCodeForm onSuccess={() => setIsAuthorized(true)} />
      </div>
    );
  }

  return children;
}
