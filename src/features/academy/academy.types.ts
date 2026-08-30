export type AcademyLocale = "zh" | "en";
export const COURSE_PROTOCOL_VERSION = 2 as const;
export type CourseProtocolVersion = typeof COURSE_PROTOCOL_VERSION;
export type CourseStatus = "available" | "coming-soon";
export type CourseLayoutHint = "hero" | "standard" | "compact";
export type ShopItemKind = "profile-frame" | "trail" | "title" | "theme";

export interface LocalizedText {
  readonly zh: string;
  readonly en: string;
}

export type LocalizedCourseUrls = Readonly<Record<AcademyLocale, string>>;

export interface LearningCourse {
  readonly id: string;
  /** Version of the cross-origin progress contract implemented by the course. */
  readonly protocolVersion: CourseProtocolVersion;
  readonly title: LocalizedText;
  readonly eyebrow: LocalizedText;
  readonly description: LocalizedText;
  readonly category: LocalizedText;
  readonly difficulty: LocalizedText;
  readonly estimatedHours: number;
  readonly totalLessons: number;
  readonly status: CourseStatus;
  /** Explicit entry point for every language; available courses must provide both. */
  readonly launchUrls: LocalizedCourseUrls;
  /** Exact origins allowed to send progress messages from the active course iframe. */
  readonly allowedOrigins: readonly string[];
  /** Upper bound accepted from an untrusted course progress message. */
  readonly maxXp: number;
  /** Course-owned reward identifiers accepted by the platform bridge. */
  readonly allowedRewardIds: readonly string[];
  readonly featured: boolean;
  readonly layoutHint: CourseLayoutHint;
  readonly accent: string;
  readonly accentSecondary: string;
  readonly glyph: string;
}

export interface ShopItem {
  readonly id: string;
  readonly name: LocalizedText;
  readonly description: LocalizedText;
  readonly kind: ShopItemKind;
  readonly cost: number;
  readonly requiredLevel: number;
  readonly accent: string;
  readonly glyph: string;
}

export interface CourseRecord {
  readonly xp: number;
  readonly completed: readonly number[];
  readonly rewards: readonly string[];
  readonly totalLessons: number;
  readonly lastSyncedAt: string;
}

/**
 * One unacknowledged settlement created from an increase in a course's
 * cumulative progress snapshot. Assets are already committed when this record
 * is created; acknowledging it only dismisses the learner-facing notification.
 */
export interface PendingRewardDrop {
  readonly id: string;
  readonly courseId: string;
  readonly createdAt: string;
  readonly newLessons: readonly number[];
  readonly xpEarned: number;
  readonly crystalsEarned: number;
  readonly rewardIds: readonly string[];
  readonly rankBefore: number;
  readonly rankAfter: number;
}

export interface AcademyProgress {
  readonly courses: Readonly<Record<string, CourseRecord>>;
  readonly pendingDrops: readonly PendingRewardDrop[];
  readonly crystals: number;
  readonly inventory: readonly string[];
  readonly equipped: Readonly<Partial<Record<ShopItemKind, string>>>;
}

export interface CourseProgressMessage {
  readonly type: "AYL_FORGE_COURSE_PROGRESS";
  readonly courseId: string;
  readonly protocolVersion: CourseProtocolVersion;
  readonly progress: {
    readonly completed: readonly number[];
    readonly xp: number;
    readonly rewards: readonly string[];
  };
}

export interface CourseProgressRequest {
  readonly type: "AYL_FORGE_REQUEST_PROGRESS";
  readonly courseId: string;
  readonly protocolVersion: CourseProtocolVersion;
}
