"use client";
import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/utils";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { Button } from "@/components/ui/button";

export function CopyButton({ content, copyMessage }) {
  const { isCopied, handleCopy } = useCopyToClipboard({
    text: content,
    copyMessage,
  });

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 px-2 hover:bg-transparent hover:text-foreground"
      aria-label="Copy to clipboard"
      onClick={handleCopy}
    >
      <div className="flex items-center gap-1.5">
        {isCopied ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
        <span className="text-xs">{isCopied ? "Copied" : "Copy"}</span>
      </div>
    </Button>
  );
}
