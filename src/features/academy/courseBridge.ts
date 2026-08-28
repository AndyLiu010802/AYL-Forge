import type {
  CourseProgressMessage,
  CourseProgressRequest,
  LearningCourse,
} from "./academy.types";

export const COURSE_PROGRESS_MESSAGE = "AYL_FORGE_COURSE_PROGRESS";
export const COURSE_PROGRESS_REQUEST = "AYL_FORGE_REQUEST_PROGRESS";

interface CourseMessageEvent {
  readonly data: unknown;
  readonly origin: string;
  readonly source: MessageEventSource | null;
}

function uniqueLessonIndexes(value: readonly unknown[], totalLessons: number): number[] {
  return Array.from(
    new Set(
      value.filter(
        (item): item is number => typeof item === "number"
          && Number.isInteger(item)
          && item >= 0
          && item < totalLessons,
      ),
    ),
  ).sort((left, right) => left - right);
}

function allowedRewards(value: readonly unknown[], course: LearningCourse): string[] {
  const allowlist = new Set(course.allowedRewardIds);
  return Array.from(
    new Set(value.filter((item): item is string => typeof item === "string" && allowlist.has(item))),
  );
}

/**
 * Parses untrusted cross-origin course data into the narrow platform contract.
 * Invalid lesson indexes and rewards are removed; XP is clamped to the course cap.
 */
export function sanitizeCourseProgressMessage(
  value: unknown,
  course: LearningCourse,
): CourseProgressMessage | null {
  if (!value || typeof value !== "object") return null;
  const message = value as Partial<CourseProgressMessage>;
  const progress = message.progress;
  if (
    message.type !== COURSE_PROGRESS_MESSAGE
    || message.courseId !== course.id
    || message.protocolVersion !== course.protocolVersion
    || !progress
    || typeof progress !== "object"
    || typeof progress.xp !== "number"
    || !Number.isFinite(progress.xp)
    || !Array.isArray(progress.completed)
    || !Array.isArray(progress.rewards)
  ) {
    return null;
  }

  return {
    type: COURSE_PROGRESS_MESSAGE,
    courseId: course.id,
    protocolVersion: course.protocolVersion,
    progress: {
      completed: uniqueLessonIndexes(progress.completed, course.totalLessons),
      xp: Math.min(course.maxXp, Math.max(0, Math.floor(progress.xp))),
      rewards: allowedRewards(progress.rewards, course),
    },
  };
}

/**
 * Accepts a message only from the active iframe window and a manifest-approved
 * origin. Both checks are required: origin alone cannot identify the sender.
 */
export function acceptCourseProgressEvent(
  event: CourseMessageEvent,
  frameWindow: MessageEventSource | null,
  course: LearningCourse,
): CourseProgressMessage | null {
  if (!frameWindow || event.source !== frameWindow) return null;
  if (!course.allowedOrigins.includes(event.origin)) return null;
  return sanitizeCourseProgressMessage(event.data, course);
}

export function courseProgressRequest(course: LearningCourse): CourseProgressRequest {
  return {
    type: COURSE_PROGRESS_REQUEST,
    courseId: course.id,
    protocolVersion: course.protocolVersion,
  };
}
