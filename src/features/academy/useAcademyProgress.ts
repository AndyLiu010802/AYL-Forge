"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { AcademyProgress } from "./academy.types";
import {
  ACADEMY_PROGRESS_EVENT,
  ACADEMY_STORAGE_KEY,
  parseAcademyProgress,
} from "./academy.progress";

type AcademyProgressUpdater = AcademyProgress | ((current: AcademyProgress) => AcademyProgress);

// Browsers can disable localStorage in strict privacy contexts. Keep the app usable
// for that session instead of crashing the entire learning platform.
let volatileSnapshot: string | null = null;

function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(ACADEMY_PROGRESS_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(ACADEMY_PROGRESS_EVENT, onStoreChange);
  };
}

function readSnapshot(): string | null {
  try {
    return window.localStorage.getItem(ACADEMY_STORAGE_KEY) ?? volatileSnapshot;
  } catch {
    return volatileSnapshot;
  }
}

function readServerSnapshot(): null {
  return null;
}

/** One local account store shared by courses, shop and profile. */
export function useAcademyProgress(): readonly [AcademyProgress, (updater: AcademyProgressUpdater) => void] {
  const raw = useSyncExternalStore(subscribe, readSnapshot, readServerSnapshot);
  const progress = useMemo(() => parseAcademyProgress(raw), [raw]);
  const commit = useCallback((updater: AcademyProgressUpdater) => {
    const current = parseAcademyProgress(readSnapshot());
    const next = typeof updater === "function" ? updater(current) : updater;
    volatileSnapshot = JSON.stringify(next);
    try {
      window.localStorage.setItem(ACADEMY_STORAGE_KEY, volatileSnapshot);
    } catch {
      // The in-memory snapshot above still keeps this browser session functional.
    }
    window.dispatchEvent(new Event(ACADEMY_PROGRESS_EVENT));
  }, []);
  return [progress, commit] as const;
}
