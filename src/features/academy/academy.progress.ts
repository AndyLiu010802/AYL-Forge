import { ACADEMY_RANKS } from "./academy.config";
import type {
  AcademyProgress,
  CourseProgressMessage,
  CourseRecord,
  LearningCourse,
  ShopItem,
  ShopItemKind,
} from "./academy.types";

export const ACADEMY_STORAGE_KEY = "ayl-forge-progress-v1";
export const ACADEMY_PROGRESS_EVENT = "ayl-forge-progress";

export const EMPTY_ACADEMY_PROGRESS: AcademyProgress = {
  courses: {},
  crystals: 0,
  inventory: [],
  equipped: {},
};

function uniqueIntegers(value: unknown, maxExclusive = Number.POSITIVE_INFINITY): number[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(value.filter((item): item is number => Number.isInteger(item) && item >= 0 && item < maxExclusive)),
  ).sort((a, b) => a - b);
}

function uniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((item): item is string => typeof item === "string" && item.trim() !== "")));
}

function parseCourseRecord(value: unknown): CourseRecord | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<CourseRecord>;
  return {
    xp: typeof record.xp === "number" && Number.isFinite(record.xp) ? Math.max(0, record.xp) : 0,
    completed: uniqueIntegers(record.completed),
    rewards: uniqueStrings(record.rewards),
    totalLessons: typeof record.totalLessons === "number" && Number.isInteger(record.totalLessons) ? Math.max(0, record.totalLessons) : 0,
    lastSyncedAt: typeof record.lastSyncedAt === "string" ? record.lastSyncedAt : "",
  };
}

export function parseAcademyProgress(raw: string | null): AcademyProgress {
  if (!raw) return EMPTY_ACADEMY_PROGRESS;
  try {
    const value = JSON.parse(raw) as Partial<AcademyProgress>;
    const courses: Record<string, CourseRecord> = {};
    if (value.courses && typeof value.courses === "object") {
      for (const [id, course] of Object.entries(value.courses)) {
        const parsed = parseCourseRecord(course);
        if (parsed) courses[id] = parsed;
      }
    }
    const equipped: Partial<Record<ShopItemKind, string>> = {};
    if (value.equipped && typeof value.equipped === "object") {
      for (const kind of ["profile-frame", "trail", "title", "theme"] as const) {
        const item = value.equipped[kind];
        if (typeof item === "string") equipped[kind] = item;
      }
    }
    return {
      courses,
      crystals: typeof value.crystals === "number" && Number.isFinite(value.crystals) ? Math.max(0, value.crystals) : 0,
      inventory: uniqueStrings(value.inventory),
      equipped,
    };
  } catch {
    return EMPTY_ACADEMY_PROGRESS;
  }
}

export function totalAcademyXp(progress: AcademyProgress): number {
  return Object.values(progress.courses).reduce((total, course) => total + course.xp, 0);
}

export function rankForXp(xp: number) {
  return ACADEMY_RANKS.reduce((current, rank) => xp >= rank.xp ? rank : current, ACADEMY_RANKS[0]);
}

export function nextRankForXp(xp: number) {
  return ACADEMY_RANKS.find((rank) => rank.xp > xp) ?? null;
}

export function syncCourseProgress(
  current: AcademyProgress,
  message: CourseProgressMessage,
  course: Pick<
    LearningCourse,
    "id" | "protocolVersion" | "totalLessons" | "maxXp" | "allowedRewardIds"
  >,
  now = new Date().toISOString(),
): AcademyProgress {
  if (message.courseId !== course.id || message.protocolVersion !== course.protocolVersion) return current;
  const previous = current.courses[message.courseId];
  const previousXp = Math.min(
    course.maxXp,
    Math.max(0, Math.floor(previous?.xp ?? 0)),
  );
  const incomingXp = Number.isFinite(message.progress.xp)
    ? Math.min(course.maxXp, Math.max(0, Math.floor(message.progress.xp)))
    : 0;
  const acceptedXp = Math.max(previousXp, incomingXp);
  const previousCrystalMilestone = Math.floor(previousXp / 5);
  const nextCrystalMilestone = Math.floor(acceptedXp / 5);
  const allowedRewards = new Set(course.allowedRewardIds);
  const nextRecord: CourseRecord = {
    xp: acceptedXp,
    completed: uniqueIntegers(
      [...(previous?.completed ?? []), ...message.progress.completed],
      course.totalLessons,
    ),
    rewards: uniqueStrings(
      [...(previous?.rewards ?? []), ...message.progress.rewards]
        .filter((reward) => allowedRewards.has(reward)),
    ),
    totalLessons: course.totalLessons,
    lastSyncedAt: now,
  };
  return {
    ...current,
    courses: { ...current.courses, [message.courseId]: nextRecord },
    crystals: current.crystals + Math.max(0, nextCrystalMilestone - previousCrystalMilestone),
  };
}

export type PurchaseResult =
  | { readonly ok: true; readonly progress: AcademyProgress }
  | { readonly ok: false; readonly reason: "owned" | "level" | "funds" };

export function purchaseShopItem(current: AcademyProgress, item: ShopItem): PurchaseResult {
  if (current.inventory.includes(item.id)) return { ok: false, reason: "owned" };
  if (rankForXp(totalAcademyXp(current)).level < item.requiredLevel) return { ok: false, reason: "level" };
  if (current.crystals < item.cost) return { ok: false, reason: "funds" };
  return {
    ok: true,
    progress: {
      ...current,
      crystals: current.crystals - item.cost,
      inventory: [...current.inventory, item.id],
    },
  };
}

export function equipShopItem(current: AcademyProgress, item: ShopItem): AcademyProgress {
  if (!current.inventory.includes(item.id)) return current;
  return { ...current, equipped: { ...current.equipped, [item.kind]: item.id } };
}
