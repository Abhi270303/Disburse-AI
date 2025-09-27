"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { X } from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { cn } from "@/lib/utils";

const TRANSITION = {
  type: "spring",
  bounce: 0.05,
  duration: 0.3,
};

function useClickOutside(ref, handler) {
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        handler();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [ref, handler]);
}

const DropdownContext = createContext(undefined);

function useDropdown() {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error("useDropdown must be used within a DropdownProvider");
  }
  return context;
}

function useDropdownLogic() {
  const uniqueId = useId();
  const [isOpen, setIsOpen] = useState(false);

  const openDropdown = () => setIsOpen(true);
  const closeDropdown = () => setIsOpen(false);

  return { isOpen, openDropdown, closeDropdown, uniqueId };
}

export function DropdownRoot({ children, className }) {
  const dropdownLogic = useDropdownLogic();

  return (
    <DropdownContext.Provider value={dropdownLogic}>
      <MotionConfig transition={TRANSITION}>
        <div
          className={cn(
            "relative flex items-center justify-center isolate",
            className
          )}
        >
          {children}
        </div>
      </MotionConfig>
    </DropdownContext.Provider>
  );
}

export function DropdownTrigger({ children, className }) {
  const { openDropdown, uniqueId } = useDropdown();

  return (
    <motion.button
      key="button"
      layoutId={`dropdown-${uniqueId}`}
      className={cn("flex items-center justify-center", className)}
      onClick={openDropdown}
    >
      {children}
    </motion.button>
  );
}

export function DropdownContent({ children, className }) {
  const { isOpen, closeDropdown, uniqueId } = useDropdown();
  const contentRef = useRef(null);

  useClickOutside(contentRef, closeDropdown);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeDropdown();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeDropdown]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={contentRef}
          layoutId={`dropdown-${uniqueId}`}
          className={cn(
            "absolute right-0 bottom-full mb-2 w-56 overflow-hidden rounded-xl border border-border/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-lg",
            className
          )}
          initial={{ opacity: 0, scale: 0.95, x: -20, y: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, x: -20, y: 20 }}
          transition={{
            ...TRANSITION,
            x: { type: "spring", bounce: 0.1, duration: 0.4 },
            y: { type: "spring", bounce: 0.1, duration: 0.4 },
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function DropdownItem({ children, className, onClick }) {
  return (
    <motion.button
      className={cn(
        "flex w-full items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-accent/20 transition-colors",
        className
      )}
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
    >
      {children}
    </motion.button>
  );
}

export function DropdownLabel({ children, className }) {
  return (
    <div
      className={cn(
        "px-4 py-2 text-sm font-medium text-muted-foreground",
        className
      )}
    >
      {children}
    </div>
  );
}

export function DropdownSeparator({ className }) {
  return <div className={cn("h-px bg-border/20 my-1", className)} />;
}

export function DropdownHeader({ children, className }) {
  return (
    <div
      className={cn(
        "px-4 py-2 font-semibold text-foreground border-b border-border/20",
        className
      )}
    >
      {children}
    </div>
  );
}

export function DropdownBody({ children, className }) {
  return <div className={cn("p-2", className)}>{children}</div>;
}

export function DropdownButton({ children, onClick, className }) {
  return (
    <motion.button
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent/20 transition-colors",
        className
      )}
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
    >
      {children}
    </motion.button>
  );
}
