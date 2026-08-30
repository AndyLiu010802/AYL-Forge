import { ACADEMY_RANKS } from "./academy.config";
import type {
  AcademyProgress,
  CourseProgressMessage,
  CourseRecord,
  LearningCourse,
  PendingRewardDrop,
  ShopItem,
  ShopItemKind,
} from "./academy.types";

export const ACADEMY_STORAGE_KEY = "ayl-forge-progress-v1";
export const ACADEMY_PROGRESS_EVENT = "ayl-forge-progress";

export const EMPTY_ACADEMY_PROGRESS: AcademyProgress = {
  courses: {},
  pendingDrops: [],
  crystals: 0,
  inventory: [],
  equipped: {},
};

function uniqueIntegers(value: unknown, maxExclusive = Number.POSITIVE_INFINITY): number[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(value.filter((item): item is number => Number.isSafeInteger(item) && item >= 0 && item < maxExclusive)),
  ).sort((a, b) => a - b);
}

function uniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((item): item is string => typeof item === "string" && item.trim() !== "")));
}

function uniqueTrimmedStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(
    value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean),
  ));
}

function nonNegativeSafeInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}

function positiveSafeInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : null;
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || !value || value !== value.trim()) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

/** Drops are transient UI instructions, so malformed entries are discarded. */
function parsePendingRewardDrop(value: unknown): PendingRewardDrop | null {
  if (!value || typeof value !== "object") return null;
  const drop = value as Partial<PendingRewardDrop>;
  const xpEarned = nonNegativeSafeInteger(drop.xpEarned);
  const crystalsEarned = nonNegativeSafeInteger(drop.crystalsEarned);
  const rankBefore = positiveSafeInteger(drop.rankBefore);
  const rankAfter = positiveSafeInteger(drop.rankAfter);

  if (
    typeof drop.id !== "string"
    || !drop.id.trim()
    || drop.id !== drop.id.trim()
    || typeof drop.courseId !== "string"
    || !drop.courseId.trim()
    || drop.courseId !== drop.courseId.trim()
    || !isIsoTimestamp(drop.createdAt)
    || !Array.isArray(drop.newLessons)
    || !Array.isArray(drop.rewardIds)
    || xpEarned === null
    || crystalsEarned === null
    || rankBefore === null
    || rankAfter === null
    || rankAfter < rankBefore
  ) {
    return null;
  }

  const newLessons = uniqueIntegers(drop.newLessons);
  const rewardIds = uniqueTrimmedStrings(drop.rewardIds);
  if (
    newLessons.length === 0
    && xpEarned === 0
    && crystalsEarned === 0
    && rewardIds.length === 0
  ) {
    return null;
  }

  return {
    id: drop.id,
    courseId: drop.courseId,
    createdAt: drop.createdAt,
    newLessons,
    xpEarned,
    crystalsEarned,
    rewardIds,
    rankBefore,
    rankAfter,
  };
}

function parsePendingRewardDrops(value: unknown): PendingRewardDrop[] {
  if (!Array.isArray(value)) return [];
  const seenIds = new Set<string>();
  const drops: PendingRewardDrop[] = [];

  for (const valueDrop of value) {
    const drop = parsePendingRewardDrop(valueDrop);
    if (!drop || seenIds.has(drop.id)) continue;
    seenIds.add(drop.id);
    drops.push(drop);
  }

  return drops;
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
      pendingDrops: parsePendingRewardDrops(value.pendingDrops),
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

function rewardDropId(course: Pick<LearningCourse, "id">, record: CourseRecord): string {
  const canonicalState = JSON.stringify([
    record.xp,
    record.completed,
    [...record.rewards].sort(),
  ]);
  return `reward-drop:${encodeURIComponent(course.id)}:${encodeURIComponent(canonicalState)}`;
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
  const crystalsEarned = Math.max(0, nextCrystalMilestone - previousCrystalMilestone);
  const allowedRewards = new Set(course.allowedRewardIds);
  const previousLessons = uniqueIntegers(previous?.completed ?? [], course.totalLessons);
  const previousRewards = uniqueStrings(previous?.rewards ?? [])
    .filter((reward) => allowedRewards.has(reward));
  const nextRecord: CourseRecord = {
    xp: acceptedXp,
    completed: uniqueIntegers(
      [...previousLessons, ...message.progress.completed],
      course.totalLessons,
    ),
    rewards: uniqueStrings(
      [...previousRewards, ...message.progress.rewards]
        .filter((reward) => allowedRewards.has(reward)),
    ),
    totalLessons: course.totalLessons,
    lastSyncedAt: now,
  };
  const previousLessonSet = new Set(previousLessons);
  const previousRewardSet = new Set(previousRewards);
  const newLessons = nextRecord.completed.filter((lesson) => !previousLessonSet.has(lesson));
  const rewardIds = nextRecord.rewards.filter((reward) => !previousRewardSet.has(reward));
  const xpEarned = acceptedXp - previousXp;
  const pendingDrops = current.pendingDrops ?? [];
  const settled: AcademyProgress = {
    ...current,
    courses: { ...current.courses, [message.courseId]: nextRecord },
    pendingDrops,
    crystals: current.crystals + crystalsEarned,
  };

  if (
    newLessons.length === 0
    && xpEarned === 0
    && rewardIds.length === 0
    && crystalsEarned === 0
  ) {
    return settled;
  }

  const dropId = rewardDropId(course, nextRecord);
  if (pendingDrops.some((drop) => drop.id === dropId)) return settled;

  const rewardDrop: PendingRewardDrop = {
    id: dropId,
    courseId: course.id,
    createdAt: now,
    newLessons,
    xpEarned,
    crystalsEarned,
    rewardIds,
    rankBefore: rankForXp(totalAcademyXp(current)).level,
    rankAfter: rankForXp(totalAcademyXp(settled)).level,
  };

  return { ...settled, pendingDrops: [...pendingDrops, rewardDrop] };
}

/** Dismisses a settlement notification without touching earned assets. */
export function acknowledgeRewardDrop(current: AcademyProgress, id: string): AcademyProgress {
  const pendingDrops = current.pendingDrops ?? [];
  const remaining = pendingDrops.filter((drop) => drop.id !== id);
  return remaining.length === pendingDrops.length
    ? current
    : { ...current, pendingDrops: remaining };
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
