"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "aimw-module-flow-expanded";

export function usePersistedModuleFlowExpanded(defaultExpanded = true) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v !== null) setExpanded(v === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const setExpandedPersist = useCallback((next: boolean) => {
    setExpanded(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    setExpandedPersist(!expanded);
  }, [expanded, setExpandedPersist]);

  return { expanded, setExpanded: setExpandedPersist, toggle };
}
