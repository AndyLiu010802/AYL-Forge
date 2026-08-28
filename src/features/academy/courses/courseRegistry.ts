import type { AcademyLocale, LearningCourse, LocalizedText } from "../academy.types";
import { COURSE_PROTOCOL_VERSION } from "../academy.types";
import { MOTION_SYSTEMS_COURSE, SHADER_FOUNDRY_COURSE } from "./plannedCourses";
import { PRISM_DASH_COURSE } from "./prismDash.course";

const COURSE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HTTP_PROTOCOLS = new Set(["http:", "https:"]);
const LOCALES = ["zh", "en"] as const satisfies readonly AcademyLocale[];

export class CourseRegistryError extends Error {
  constructor(message: string) {
    super(`Invalid course registry: ${message}`);
    this.name = "CourseRegistryError";
  }
}

function fail(course: LearningCourse, field: string, reason: string): never {
  throw new CourseRegistryError(`${course.id}.${field} ${reason}`);
}

function assertPositiveInteger(course: LearningCourse, field: string, value: number): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    fail(course, field, "must be a positive safe integer");
  }
}

function assertLocalizedText(course: LearningCourse, field: string, value: LocalizedText): void {
  for (const locale of LOCALES) {
    if (typeof value[locale] !== "string" || !value[locale].trim()) {
      fail(course, `${field}.${locale}`, "must be non-empty");
    }
  }
}

function parseHttpUrl(course: LearningCourse, field: string, rawValue: string): URL {
  if (rawValue !== rawValue.trim() || !rawValue) {
    fail(course, field, "must be a non-empty, trimmed absolute URL");
  }

  let url: URL;
  try {
    url = new URL(rawValue);
  } catch {
    fail(course, field, "must be an absolute URL");
  }

  if (!HTTP_PROTOCOLS.has(url.protocol)) {
    fail(course, field, "must use http or https");
  }
  if (url.username || url.password) {
    fail(course, field, "must not contain credentials");
  }

  return url;
}

function assertRewardAllowlist(course: LearningCourse): void {
  const seen = new Set<string>();
  for (const rewardId of course.allowedRewardIds) {
    if (typeof rewardId !== "string" || !rewardId.trim() || rewardId !== rewardId.trim()) {
      fail(course, "allowedRewardIds", "must contain only non-empty, trimmed strings");
    }
    if (seen.has(rewardId)) {
      fail(course, "allowedRewardIds", `contains duplicate \"${rewardId}\"`);
    }
    seen.add(rewardId);
  }
}

function assertAllowedOrigins(course: LearningCourse): Set<string> {
  const origins = new Set<string>();
  for (const rawOrigin of course.allowedOrigins) {
    const url = parseHttpUrl(course, "allowedOrigins", rawOrigin);
    if (url.origin !== rawOrigin) {
      fail(course, "allowedOrigins", `must contain canonical origins, received \"${rawOrigin}\"`);
    }
    if (origins.has(rawOrigin)) {
      fail(course, "allowedOrigins", `contains duplicate \"${rawOrigin}\"`);
    }
    origins.add(rawOrigin);
  }
  return origins;
}

function assertCourseUrls(
  course: LearningCourse,
  allowedOrigins: ReadonlySet<string>,
  seenUrls: Map<string, string>,
): void {
  const rawUrls = LOCALES.map((locale) => course.launchUrls[locale]);
  const hasAnyUrl = rawUrls.some(Boolean);

  if (course.status === "available" && !rawUrls.every(Boolean)) {
    fail(course, "launchUrls", "must provide an entry point for zh and en");
  }
  if (course.status === "coming-soon" && hasAnyUrl && !rawUrls.every(Boolean)) {
    fail(course, "launchUrls", "must provide both localized URLs or neither");
  }
  if (!hasAnyUrl) {
    if (allowedOrigins.size) {
      fail(course, "allowedOrigins", "must be empty when a coming-soon course has no URLs");
    }
    return;
  }

  const normalizedUrls = LOCALES.map((locale) => {
    const field = `launchUrls.${locale}`;
    const url = parseHttpUrl(course, field, course.launchUrls[locale]);
    if (!allowedOrigins.has(url.origin)) {
      fail(course, field, `uses origin \"${url.origin}\" which is not allowed`);
    }

    const normalized = url.toString();
    const owner = seenUrls.get(normalized);
    if (owner) {
      fail(course, field, `duplicates the URL registered by ${owner}`);
    }
    seenUrls.set(normalized, `${course.id}.${locale}`);
    return normalized;
  });

  if (normalizedUrls[0] === normalizedUrls[1]) {
    fail(course, "launchUrls", "must use distinct zh and en entry points");
  }
}

function assertCourse(course: LearningCourse, seenUrls: Map<string, string>): void {
  if (!COURSE_ID_PATTERN.test(course.id)) {
    fail(course, "id", "must be a lowercase kebab-case identifier");
  }
  if (course.protocolVersion !== COURSE_PROTOCOL_VERSION) {
    fail(course, "protocolVersion", `must be ${COURSE_PROTOCOL_VERSION}`);
  }

  assertLocalizedText(course, "title", course.title);
  assertLocalizedText(course, "eyebrow", course.eyebrow);
  assertLocalizedText(course, "description", course.description);
  assertLocalizedText(course, "category", course.category);
  assertLocalizedText(course, "difficulty", course.difficulty);
  assertPositiveInteger(course, "totalLessons", course.totalLessons);

  if (!Number.isFinite(course.estimatedHours) || course.estimatedHours <= 0) {
    fail(course, "estimatedHours", "must be a positive finite number");
  }
  if (!Number.isSafeInteger(course.maxXp) || course.maxXp < 0) {
    fail(course, "maxXp", "must be a non-negative safe integer");
  }
  if (course.status === "available" && course.maxXp === 0) {
    fail(course, "maxXp", "must be greater than zero for an available course");
  }

  assertRewardAllowlist(course);
  if (course.status === "available" && course.allowedRewardIds.length === 0) {
    fail(course, "allowedRewardIds", "must not be empty for an available course");
  }

  const allowedOrigins = assertAllowedOrigins(course);
  assertCourseUrls(course, allowedOrigins, seenUrls);
}

/**
 * Validates external-course manifests before the UI or message bridge consumes
 * them. It intentionally fails at module load so a bad deployment cannot widen
 * the postMessage trust boundary silently.
 */
export function validateCourseRegistry<const Courses extends readonly LearningCourse[]>(
  courses: Courses,
): Courses {
  const ids = new Set<string>();
  const seenUrls = new Map<string, string>();

  for (const course of courses) {
    if (ids.has(course.id)) {
      throw new CourseRegistryError(`duplicate course id \"${course.id}\"`);
    }
    ids.add(course.id);
    assertCourse(course, seenUrls);
  }

  return courses;
}

export const LEARNING_COURSES = validateCourseRegistry([
  PRISM_DASH_COURSE,
  MOTION_SYSTEMS_COURSE,
  SHADER_FOUNDRY_COURSE,
] as const satisfies readonly LearningCourse[]);

export const COURSE_REGISTRY: ReadonlyMap<string, LearningCourse> = new Map(
  LEARNING_COURSES.map((course) => [course.id, course]),
);

export function courseById(courseId: string): LearningCourse | undefined {
  return COURSE_REGISTRY.get(courseId);
}
