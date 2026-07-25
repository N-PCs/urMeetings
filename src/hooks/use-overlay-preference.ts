import { useEffect, useState } from "react";

const STORAGE_KEY = "urMeetings_overlay_state";

interface OverlayState {
  isOverlay: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  isMinimized: boolean;
  view: "live" | "notes" | "note-detail";
}

const DEFAULT_STATE: OverlayState = {
  isOverlay: false,
  position: { x: 20, y: 20 },
  size: { width: 500, height: 600 },
  isMinimized: false,
  view: "live",
};

export function useOverlayPreference() {
  const [state, setState] = useState<OverlayState>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          return { ...DEFAULT_STATE, ...JSON.parse(stored) };
        }
      } catch (e) {
        console.error("Failed to parse overlay state from localStorage", e);
      }
    }
    return DEFAULT_STATE;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setState((prev) => ({ ...prev, ...parsed }));
        } catch (err) {
          console.error("Error syncing overlay state across tabs:", err);
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const setIsOverlay = (value: boolean | ((prev: boolean) => boolean)) => {
    setState((prev) => ({
      ...prev,
      isOverlay: typeof value === "function" ? value(prev.isOverlay) : value,
    }));
  };

  const setPosition = (
    value: typeof state.position | ((prev: typeof state.position) => typeof state.position),
  ) => {
    setState((prev) => ({
      ...prev,
      position: typeof value === "function" ? value(prev.position) : value,
    }));
  };

  const setSize = (value: typeof state.size | ((prev: typeof state.size) => typeof state.size)) => {
    setState((prev) => ({
      ...prev,
      size: typeof value === "function" ? value(prev.size) : value,
    }));
  };

  const setIsMinimized = (value: boolean | ((prev: boolean) => boolean)) => {
    setState((prev) => ({
      ...prev,
      isMinimized: typeof value === "function" ? value(prev.isMinimized) : value,
    }));
  };

  const setView = (value: typeof state.view | ((prev: typeof state.view) => typeof state.view)) => {
    setState((prev) => ({
      ...prev,
      view: typeof value === "function" ? value(prev.view) : value,
    }));
  };

  return {
    isOverlay: state.isOverlay,
    position: state.position,
    size: state.size,
    isMinimized: state.isMinimized,
    view: state.view,
    setIsOverlay,
    setPosition,
    setSize,
    setIsMinimized,
    setView,
  };
}
