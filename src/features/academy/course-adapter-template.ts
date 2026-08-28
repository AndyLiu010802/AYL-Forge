/**
 * AYL Forge Course Contract v2 — course-side browser adapter template.
 *
 * Copy this file into a course repository. It deliberately has no dependency
 * on AYL Forge internals. Every outbound message uses a verified, explicit
 * platform origin.
 */

export const AYL_FORGE_PROTOCOL_VERSION = 2 as const;

export interface AylForgeProgressSnapshot {
  readonly completed: readonly number[];
  readonly xp: number;
  readonly rewards: readonly string[];
}

export interface AylForgeCourseAdapterOptions {
  /** Stable ID shared by the manifest, registry and every message. */
  readonly courseId: string;
  /** Exact platform origins, for example https://andy-ayl-forge.netlify.app. */
  readonly platformOrigins: readonly string[];
  /** Returns the course's complete current progress snapshot. */
  readonly getProgress: () => AylForgeProgressSnapshot;
  /** Optional course-store subscription. Return its cleanup function. */
  readonly subscribe?: (notify: () => void) => (() => void) | void;
}

export interface AylForgeCourseAdapter {
  /** Publishes the latest snapshot when a trusted platform parent is known. */
  readonly publish: () => boolean;
  /** Removes message and store listeners. Call when the course app unmounts. */
  readonly destroy: () => void;
  /** Useful for diagnostics; null means that no trusted parent is connected. */
  readonly getPlatformOrigin: () => string | null;
}

interface ProgressRequestV2 {
  readonly type: "AYL_FORGE_REQUEST_PROGRESS";
  readonly protocolVersion: typeof AYL_FORGE_PROTOCOL_VERSION;
  readonly courseId: string;
}

interface ProgressMessageV2 {
  readonly type: "AYL_FORGE_COURSE_PROGRESS";
  readonly protocolVersion: typeof AYL_FORGE_PROTOCOL_VERSION;
  readonly courseId: string;
  readonly progress: AylForgeProgressSnapshot;
}

const SESSION_ORIGIN_PREFIX = "ayl-forge-parent-origin-v2:";

function toHttpOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

function uniqueAllowedOrigins(values: readonly string[]): ReadonlySet<string> {
  const origins = new Set<string>();
  for (const value of values) {
    const origin = toHttpOrigin(value);
    if (origin) origins.add(origin);
  }
  if (origins.size === 0) {
    throw new Error("AYL Forge adapter requires at least one valid platform origin.");
  }
  return origins;
}

function isProgressRequest(value: unknown, courseId: string): value is ProgressRequestV2 {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<ProgressRequestV2>;
  return (
    message.type === "AYL_FORGE_REQUEST_PROGRESS" &&
    message.protocolVersion === AYL_FORGE_PROTOCOL_VERSION &&
    message.courseId === courseId
  );
}

function safeSessionRead(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSessionWrite(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Storage can be disabled in a private or sandboxed browser context.
  }
}

function cleanProgress(value: AylForgeProgressSnapshot): AylForgeProgressSnapshot {
  const completed = Array.from(
    new Set(value.completed.filter((item) => Number.isInteger(item) && item >= 0)),
  ).sort((a, b) => a - b);
  const rewards = Array.from(
    new Set(value.rewards.filter((item) => typeof item === "string" && item.trim() !== "")),
  );
  const xp = Number.isFinite(value.xp) ? Math.max(0, value.xp) : 0;
  return { completed, xp, rewards };
}

/**
 * Starts a secure bridge between an embedded course and its AYL Forge parent.
 * Call this in the browser after the course store is ready.
 */
export function createAylForgeCourseAdapter(
  options: AylForgeCourseAdapterOptions,
): AylForgeCourseAdapter {
  if (typeof window === "undefined") {
    throw new Error("AYL Forge course adapter must be created in a browser.");
  }
  if (!options.courseId.trim()) {
    throw new Error("AYL Forge adapter requires a non-empty courseId.");
  }

  const allowedOrigins = uniqueAllowedOrigins(options.platformOrigins);
  const sessionKey = `${SESSION_ORIGIN_PREFIX}${options.courseId}`;
  let platformOrigin: string | null = null;
  let destroyed = false;

  const rememberIfAllowed = (candidate: string | null): boolean => {
    if (!candidate || !allowedOrigins.has(candidate)) return false;
    platformOrigin = candidate;
    safeSessionWrite(sessionKey, candidate);
    return true;
  };

  const referrerOrigin = document.referrer ? toHttpOrigin(document.referrer) : null;
  const storedOrigin = toHttpOrigin(safeSessionRead(sessionKey) ?? "");
  if (!rememberIfAllowed(referrerOrigin)) rememberIfAllowed(storedOrigin);

  const publish = (): boolean => {
    if (destroyed || !platformOrigin || window.parent === window) return false;
    const message: ProgressMessageV2 = {
      type: "AYL_FORGE_COURSE_PROGRESS",
      protocolVersion: AYL_FORGE_PROTOCOL_VERSION,
      courseId: options.courseId,
      progress: cleanProgress(options.getProgress()),
    };
    window.parent.postMessage(message, platformOrigin);
    return true;
  };

  const receiveRequest = (event: MessageEvent<unknown>): void => {
    if (destroyed || event.source !== window.parent) return;
    if (!allowedOrigins.has(event.origin)) return;
    if (!isProgressRequest(event.data, options.courseId)) return;
    rememberIfAllowed(event.origin);
    publish();
  };

  window.addEventListener("message", receiveRequest);
  const unsubscribe = options.subscribe?.(() => {
    publish();
  });

  // If referrer/sessionStorage already established the parent, send the initial
  // snapshot without waiting for a second store update.
  publish();

  return {
    publish,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      window.removeEventListener("message", receiveRequest);
      if (typeof unsubscribe === "function") unsubscribe();
    },
    getPlatformOrigin: () => platformOrigin,
  };
}
