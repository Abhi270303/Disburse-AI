"use client";
import React from "react";
import { motion } from "framer-motion";
import { FileIcon, X, FileText, Image, FileCode } from "lucide-react";

export const FilePreview = React.forwardRef((props, ref) => {
  const fileType =
    props.file.type ||
    (props.file.url && props.file.url.split(";")[0].split(":")[1]);
  const fileName = props.file.name || "File";

  const getFileIcon = () => {
    if (fileType?.startsWith("image/")) {
      return <Image className="h-6 w-6 text-foreground" />;
    }
    if (
      fileType?.startsWith("text/") ||
      fileName.endsWith(".txt") ||
      fileName.endsWith(".md")
    ) {
      return <FileText className="h-6 w-6 text-foreground" />;
    }
    if (
      fileType?.includes("code") ||
      fileName.endsWith(".js") ||
      fileName.endsWith(".ts") ||
      fileName.endsWith(".py")
    ) {
      return <FileCode className="h-6 w-6 text-foreground" />;
    }
    return <FileIcon className="h-6 w-6 text-foreground" />;
  };

  return (
    <motion.div
      ref={ref}
      className="relative flex max-w-[200px] rounded-md border p-1.5 pr-2 text-xs"
      layout
      initial={{ opacity: 0, y: "100%" }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: "100%" }}
    >
      <div className="flex w-full items-center space-x-2">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-sm border bg-muted">
          {getFileIcon()}
        </div>
        <span className="w-full truncate text-muted-foreground">
          {fileName}
        </span>
      </div>
      {props.onRemove ? (
        <button
          className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full border bg-background"
          type="button"
          onClick={props.onRemove}
          aria-label="Remove attachment"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      ) : null}
    </motion.div>
  );
});
FilePreview.displayName = "FilePreview";
