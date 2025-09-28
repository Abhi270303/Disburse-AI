import { useCallback, useEffect, useRef, useState } from "react";
import scrollIntoView from "scroll-into-view";

// How many pixels from the bottom of the container to enable auto-scroll
const ACTIVATION_THRESHOLD = 50;
// Minimum pixels of scroll-up movement required to disable auto-scroll
const MIN_SCROLL_UP_THRESHOLD = 10;
// Debounce time for scroll events in milliseconds
const SCROLL_DEBOUNCE = 100;

export function useAutoScroll(dependencies = []) {
  const containerRef = useRef(null);
  const bottomRef = useRef(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const lastScrollHeight = useRef(0);
  const isUserScrolling = useRef(false);
  const scrollTimeout = useRef(null);

  const scrollToBottom = useCallback(
    (force = false) => {
      if (!containerRef.current || (!shouldAutoScroll && !force)) return;

      // Clear any existing timeout
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }

      // Use a small timeout to ensure the DOM has updated
      scrollTimeout.current = setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTo({
            top: containerRef.current.scrollHeight,
            behavior: "smooth",
          });
        }
      }, 100);
    },
    [shouldAutoScroll]
  );

  const handleScroll = useCallback((e) => {
    if (!containerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

    // Only update shouldAutoScroll if the user has manually scrolled
    if (isUserScrolling.current) {
      setShouldAutoScroll(isNearBottom);
    }

    // Reset user scrolling flag after a delay
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }
    scrollTimeout.current = setTimeout(() => {
      isUserScrolling.current = false;
    }, 150);
  }, []);

  const handleTouchStart = useCallback(() => {
    isUserScrolling.current = true;
  }, []);

  // Handle scroll on dependencies change
  useEffect(() => {
    if (!containerRef.current) return;

    const currentScrollHeight = containerRef.current.scrollHeight;
    const hasNewContent = currentScrollHeight > lastScrollHeight.current;

    if (hasNewContent) {
      scrollToBottom();
      lastScrollHeight.current = currentScrollHeight;
    }
  }, [...dependencies, scrollToBottom]);

  return {
    containerRef,
    bottomRef,
    scrollToBottom,
    handleScroll,
    shouldAutoScroll,
    handleTouchStart,
  };
}
