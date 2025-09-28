"use client";

import { useState } from "react";
import axios from "axios";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader } from "lucide-react";

export function AccessCodeForm({ onSuccess }) {
  const [accessCode, setAccessCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCodeSubmit = async (e) => {
    e.preventDefault();

    if (accessCode.length !== 6) {
      setCodeError("Access code must be 6 characters");
      return;
    }

    setIsSubmitting(true);
    setCodeError("");

    try {
      const response = await axios.post(
        "https://v0-access-codes-pi.vercel.app/api/validate-code",
        {
          code: accessCode,
          userId: "user", // You can replace this with actual user ID if needed
        }
      );

      if (response.data.valid) {
        localStorage.setItem("access_token", accessCode);
        onSuccess();
      } else {
        setCodeError(response.data.error || "Invalid access code");
      }
    } catch (error) {
      console.error("Failed to validate code:", error);
      setCodeError("Error validating code");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-md w-full border shadow-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-semibold">
          Access Code Required
        </CardTitle>
        <CardDescription className="font-mono text-xs">
          Enter your 6-character code to access app
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleCodeSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-6 gap-2">
              {[...Array(6)].map((_, index) => (
                <Input
                  key={index}
                  type="text"
                  value={accessCode[index] || ""}
                  className="text-center text-lg font-mono h-12"
                  maxLength={1}
                  disabled={isSubmitting}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    if (value.length === 1 && /^[A-Z0-9]$/.test(value)) {
                      const newCode = accessCode.split("");
                      newCode[index] = value;
                      setAccessCode(newCode.join(""));
                      // Auto-focus next input
                      if (index < 5) {
                        const inputs = e.target
                          .closest("form")
                          .querySelectorAll("input");
                        if (inputs[index + 1]) {
                          inputs[index + 1].focus();
                        }
                      }
                    } else if (value === "") {
                      const newCode = accessCode.split("");
                      newCode[index] = "";
                      setAccessCode(newCode.join(""));
                    }
                  }}
                  onKeyDown={(e) => {
                    // Handle backspace to focus previous input
                    if (
                      e.key === "Backspace" &&
                      !accessCode[index] &&
                      index > 0
                    ) {
                      const inputs = e.target
                        .closest("form")
                        .querySelectorAll("input");
                      if (inputs[index - 1]) {
                        inputs[index - 1].focus();
                        const newCode = accessCode.split("");
                        newCode[index - 1] = "";
                        setAccessCode(newCode.join(""));
                      }
                    }
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const pastedText = e.clipboardData.getData("text");
                    const sanitized = pastedText
                      .replace(/[^A-Za-z0-9]/g, "")
                      .toUpperCase()
                      .slice(0, 6);

                    if (sanitized) {
                      // Split the sanitized text into an array and pad with empty strings if needed
                      const chars = sanitized.split("");
                      const paddedChars = chars.concat(
                        Array(6 - chars.length).fill("")
                      );
                      setAccessCode(paddedChars.join("").slice(0, 6));

                      // Focus the next empty input or the last input if all are filled
                      const nextIndex = Math.min(sanitized.length, 5);
                      const inputs = e.target
                        .closest("form")
                        .querySelectorAll("input");

                      if (inputs[nextIndex]) {
                        inputs[nextIndex].focus();
                      }
                    }
                  }}
                />
              ))}
            </div>
            {codeError && (
              <p className="text-sm text-destructive text-center">
                {codeError}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full font-semibold"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              "Continue"
            )}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex flex-col space-y-4 pt-2">
        <div className="text-sm text-center text-muted-foreground">
          Don&apos;t have a code? Contact us for access.
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={() =>
            window.open("https://twitter.com/AttenomicsLabs", "_blank")
          }
        >
          Contact @DisburseAI
        </Button>
      </CardFooter>
    </Card>
  );
}
