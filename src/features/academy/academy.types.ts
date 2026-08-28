export type AcademyLocale = "zh" | "en";
export type CourseStatus = "available" | "coming-soon";
export type ShopItemKind = "profile-frame" | "trail" | "title" | "theme";

export interface LocalizedText {
  readonly zh: string;
  readonly en: string;
}

export interface LearningCourse {
  readonly id: string;
  readonly title: LocalizedText;
  readonly eyebrow: LocalizedText;
  readonly description: LocalizedText;
  readonly category: LocalizedText;
  readonly difficulty: LocalizedText;
  readonly estimatedHours: number;
  readonly totalLessons: number;
  readonly status: CourseStatus;
  readonly launchUrl: string;
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

export interface AcademyProgress {
  readonly courses: Readonly<Record<string, CourseRecord>>;
  readonly crystals: number;
  readonly inventory: readonly string[];
  readonly equipped: Readonly<Partial<Record<ShopItemKind, string>>>;
}

export interface CourseProgressMessage {
  readonly type: "AYL_FORGE_COURSE_PROGRESS";
  readonly courseId: string;
  readonly progress: {
    readonly completed: readonly number[];
    readonly xp: number;
    readonly rewards: readonly string[];
  };
}
