import { useEffect, useState } from "react";

const STORAGE_KEY = "urmeetings_overlay_mode";

export function useOverlayPreference() {
  const [isOverlay, setIsOverlay] = useState<boolean>(() => {
    // Initialize from localStorage if available, default to false
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : false;
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(isOverlay));
  }, [isOverlay]);

  return {
    isOverlay,
    setIsOverlay,
  };
}
