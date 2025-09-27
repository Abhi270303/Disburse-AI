"use client";
import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUp,
  Info,
  Loader2,
  Mic,
  Paperclip,
  Square,
  Send,
} from "lucide-react";
import { omit } from "remeda";

import { cn } from "@/lib/utils";
import { useAudioRecording } from "@/hooks/use-audio-recording";
import { useAutosizeTextArea } from "@/hooks/use-autosize-textarea";
import { AudioVisualizer } from "@/components/ui/audio-visualizer";
import { Button } from "@/components/ui/button";
import { FilePreview } from "@/components/ui/file-preview";
import { InterruptPrompt } from "@/components/ui/interrupt-prompt";

export function MessageInput({
  placeholder = "Ask AI...",
  className,
  onKeyDown: onKeyDownProp,
  submitOnEnter = true,
  stop,
  isGenerating,
  enableInterrupt = true,
  transcribeAudio,
  chatMode = "free",
  onChatModeChange,
  ...props
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [showInterruptPrompt, setShowInterruptPrompt] = useState(false);

  const {
    isListening,
    isSpeechSupported,
    isRecording,
    isTranscribing,
    audioStream,
    toggleListening,
    stopRecording,
  } = useAudioRecording({
    transcribeAudio,
    onTranscriptionComplete: (text) => {
      props.onChange?.({
        target: { value: text },
      });
    },
  });

  useEffect(() => {
    if (!isGenerating) {
      setShowInterruptPrompt(false);
    }
  }, [isGenerating]);

  const addFiles = (files) => {
    if (props.allowAttachments) {
      console.log("Adding files to message input:", files);
      props.setFiles((currentFiles) => {
        const newFiles = Array.from(files);
        const currentCount = currentFiles?.length || 0;
        console.log("Current files count:", currentCount);

        // If adding these files would exceed the limit, only take what we can
        if (currentCount + newFiles.length > 4) {
          const remainingSlots = 4 - currentCount;
          if (remainingSlots <= 0) return currentFiles;
          const result = [
            ...(currentFiles || []),
            ...newFiles.slice(0, remainingSlots),
          ];
          console.log("Files after limit check:", result);
          return result;
        }

        if (!currentFiles) {
          console.log("No current files, returning new files");
          return newFiles;
        }
        const result = [...currentFiles, ...newFiles];
        console.log("Combined files:", result);
        return result;
      });
    }
  };

  const onDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const onDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const onDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const dataTransfer = event.dataTransfer;
    console.log("Files dropped:", dataTransfer.files);
    if (dataTransfer.files.length) {
      const dataURLs = await filesToDataURLs(Array.from(dataTransfer.files));
      props.onSubmit?.(
        { preventDefault: () => {} },
        { experimental_attachments: dataURLs }
      );
    }
  };

  const onPaste = async (event) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    const text = event.clipboardData.getData("text");
    if (text && text.length > 500) {
      event.preventDefault();
      const blob = new Blob([text], { type: "text/plain" });
      const file = new File([blob], "Pasted text.txt", {
        type: "text/plain",
        lastModified: Date.now(),
      });
      console.log("Created file from pasted text:", file);
      const dataURLs = await filesToDataURLs([file]);
      props.onSubmit?.(
        { preventDefault: () => {} },
        { experimental_attachments: dataURLs }
      );
      return;
    }

    const files = Array.from(items)
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter((file) => file !== null);

    if (files.length > 0) {
      console.log("Files pasted:", files);
      event.preventDefault();
      const dataURLs = await filesToDataURLs(files);
      props.onSubmit?.(
        { preventDefault: () => {} },
        { experimental_attachments: dataURLs }
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("MessageInput handleSubmit called");

    try {
      if (props.allowAttachments && props.files?.length) {
        console.log("Converting files to data URLs:", props.files);
        const dataURLs = await filesToDataURLs(props.files);
        console.log("Converted files:", dataURLs);
        props.onSubmit?.(e, { experimental_attachments: dataURLs });
      } else {
        console.log("Submitting without attachments");
        props.onSubmit?.(e);
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error);
    }
  };

  const onKeyDown = async (event) => {
    if (submitOnEnter && event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      try {
        if (isGenerating && stop && enableInterrupt) {
          if (showInterruptPrompt) {
            stop();
            setShowInterruptPrompt(false);
            props.onSubmit?.(event);
          } else if (
            props.value ||
            (props.allowAttachments && props.files?.length)
          ) {
            setShowInterruptPrompt(true);
            return;
          }
        }

        if (props.allowAttachments && props.files?.length) {
          console.log("Converting files to data URLs:", props.files);
          const dataURLs = await filesToDataURLs(props.files);
          console.log("Converted files:", dataURLs);
          props.onSubmit?.(event, { experimental_attachments: dataURLs });
        } else {
          console.log("Submitting without attachments");
          props.onSubmit?.(event);
        }
      } catch (error) {
        console.error("Error in onKeyDown:", error);
      }
    }

    onKeyDownProp?.(event);
  };

  const textAreaRef = useRef(null);
  const [textAreaHeight, setTextAreaHeight] = useState(0);

  useEffect(() => {
    if (textAreaRef.current) {
      setTextAreaHeight(textAreaRef.current.offsetHeight);
    }
  }, [props.value]);

  const showFileList =
    props.allowAttachments && props.files && props.files.length > 0;

  useAutosizeTextArea({
    ref: textAreaRef,
    maxHeight: 240,
    borderWidth: 1,
    dependencies: [props.value, showFileList],
  });

  return (
    <div className="relative">
      <div
        className="relative flex flex-col min-h-[60px] w-full rounded-md bg-background px-3 py-2 text-sm"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {props.files && props.files.length > 0 && (
          <div className="flex w-full overflow-x-auto py-1.5">
            <div className="flex flex-wrap gap-2 min-w-0">
              <AnimatePresence mode="popLayout">
                {props.files?.map((file) => (
                  <motion.div
                    key={`${file.name}-${file.lastModified}-${file.size}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="flex-shrink-0"
                  >
                    <FilePreview
                      file={file}
                      onRemove={() => {
                        props.setFiles((files) => {
                          if (!files) return null;
                          const filtered = files.filter((f) => f !== file);
                          return filtered.length === 0 ? null : filtered;
                        });
                      }}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
        <div className="relative flex-1 flex items-center">
          {/* Mode Switcher */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 z-[9999] flex items-center gap-1">
            <button
              type="button"
              onClick={() => onChatModeChange?.("free")}
              className={cn(
                "px-2 py-1 text-xs font-medium rounded-md transition-colors",
                chatMode === "free"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              🆓 Free
            </button>
            <button
              type="button"
              onClick={() => onChatModeChange?.("pro")}
              className={cn(
                "px-2 py-1 text-xs font-medium rounded-md transition-colors",
                chatMode === "pro"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              ⚡ Pro
            </button>
          </div>

          <textarea
            ref={textAreaRef}
            className="flex w-full resize-none bg-transparent px-6 py-4 pl-32 pr-24 text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 rounded-xl border border-border/20 focus:border-primary/50 focus:ring-0 transition-colors duration-200"
            placeholder={
              chatMode === "free"
                ? "Ask anything (Free)..."
                : "Ask anything (Pro - $0.01 USDC)..."
            }
            value={props.value}
            onChange={props.onChange}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            onFocus={() => setIsDragging(false)}
            onBlur={() => setIsDragging(false)}
            style={{
              height: "24px",
              minHeight: "24px",
              maxHeight: "200px",
            }}
            disabled={props.disabled}
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 z-[9999] flex gap-1.5">
            {/* File attachment button - more subtle */}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className={cn(
                "h-8 w-8 hover:bg-muted/50 rounded-full transition-all duration-200",
                "group relative"
              )}
              aria-label="Attach a file"
              onClick={async () => {
                const files = await showFileUploadDialog();
                if (files && files.length > 0) {
                  const dataURLs = await filesToDataURLs(files);
                  props.onSubmit?.(
                    { preventDefault: () => {} },
                    { experimental_attachments: dataURLs }
                  );
                }
              }}
            >
              <Paperclip className="h-3 w-3 transition-transform group-hover:scale-110" />
            </Button>

            {isSpeechSupported && (
              <Button
                type="button"
                variant="ghost"
                className={cn(
                  "h-9 w-9 hover:bg-muted/50 rounded-full transition-all duration-200",
                  isListening && "text-primary bg-primary/10",
                  "group relative"
                )}
                aria-label="Voice input"
                size="icon"
                onClick={toggleListening}
              >
                <Mic className="h-4 w-4 transition-transform group-hover:scale-110" />
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Voice input
                </span>
              </Button>
            )}
            {isGenerating && stop ? (
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className="h-9 w-9 rounded-full hover:bg-destructive/90 transition-colors"
                aria-label="Stop generating"
                onClick={stop}
              >
                <Square className="h-3 w-3 animate-pulse" fill="currentColor" />
              </Button>
            ) : (
              <Button
                type="button"
                size="icon"
                className={cn(
                  "h-9 w-9 bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200",
                  "group relative",
                  !props.value.trim() &&
                    !props.files?.length &&
                    "opacity-50 cursor-not-allowed"
                )}
                disabled={
                  (!props.value.trim() && !props.files?.length) ||
                  props.disabled
                }
                onClick={handleSubmit}
              >
                <Send className="h-4 w-4 transition-transform group-hover:scale-110" />
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Send message
                </span>
              </Button>
            )}
          </div>
        </div>
        <FileUploadOverlay isDragging={isDragging} />
        <RecordingControls
          isRecording={isRecording}
          isTranscribing={isTranscribing}
          audioStream={audioStream}
          textAreaHeight={textAreaHeight}
          onStopRecording={stopRecording}
        />
      </div>
    </div>
  );
}
MessageInput.displayName = "MessageInput";

function FileUploadOverlay({ isDragging }) {
  return (
    <AnimatePresence>
      {isDragging && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center space-x-2 rounded-xl border border-dashed border-border bg-background text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          aria-hidden
        >
          <Paperclip className="h-4 w-4" />
          <span>Drop your files here to attach them.</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function showFileUploadDialog() {
  const input = document.createElement("input");

  input.type = "file";
  input.multiple = true;
  input.accept = "*/*";
  input.click();

  return new Promise((resolve) => {
    input.onchange = (e) => {
      const files = e.currentTarget.files;

      if (files) {
        resolve(Array.from(files));
        return;
      }

      resolve(null);
    };
  });
}

// Function to convert a File to a data URL
async function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Function to convert multiple files to data URLs
async function filesToDataURLs(files) {
  if (!files || !files.length) return [];
  return Promise.all(
    files.map(async (file) => ({
      name: file.name,
      type: file.type,
      url: await fileToDataURL(file),
    }))
  );
}

function TranscribingOverlay() {
  return (
    <motion.div
      className="flex h-full w-full flex-col items-center justify-center rounded-xl bg-background/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="relative">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <motion.div
          className="absolute inset-0 h-8 w-8 animate-pulse rounded-full bg-primary/20"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1.2, opacity: 1 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
        />
      </div>
      <p className="mt-4 text-sm font-medium text-muted-foreground">
        Transcribing audio...
      </p>
    </motion.div>
  );
}

function RecordingPrompt({ isVisible, onStopRecording }) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ top: 0, filter: "blur(5px)" }}
          animate={{
            top: -40,
            filter: "blur(0px)",
            transition: {
              type: "spring",
              filter: { type: "tween" },
            },
          }}
          exit={{ top: 0, filter: "blur(5px)" }}
          className="absolute left-1/2 flex -translate-x-1/2 cursor-pointer overflow-hidden whitespace-nowrap rounded-full border bg-background py-1 text-center text-sm text-muted-foreground"
          onClick={onStopRecording}
        >
          <span className="mx-2.5 flex items-center">
            <Info className="mr-2 h-3 w-3" />
            Click to finish recording
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function RecordingControls({
  isRecording,
  isTranscribing,
  audioStream,
  textAreaHeight,
  onStopRecording,
}) {
  if (isRecording) {
    return (
      <div
        className="absolute inset-[1px] z-50 overflow-hidden rounded-xl"
        style={{ height: textAreaHeight - 2 }}
      >
        <AudioVisualizer
          stream={audioStream}
          isRecording={isRecording}
          onClick={onStopRecording}
        />
      </div>
    );
  }

  if (isTranscribing) {
    return (
      <div
        className="absolute inset-[1px] z-50 overflow-hidden rounded-xl"
        style={{ height: textAreaHeight - 2 }}
      >
        <TranscribingOverlay />
      </div>
    );
  }

  return null;
}
