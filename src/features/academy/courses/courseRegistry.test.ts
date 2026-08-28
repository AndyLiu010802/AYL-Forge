import { describe, expect, it } from "vitest";
import { COURSE_PROTOCOL_VERSION, type LearningCourse } from "../academy.types";
import {
  COURSE_REGISTRY,
  CourseRegistryError,
  LEARNING_COURSES,
  courseById,
  validateCourseRegistry,
} from "./courseRegistry";
import { MOTION_SYSTEMS_COURSE } from "./plannedCourses";
import { PRISM_DASH_COURSE, PRISM_DASH_REWARD_IDS } from "./prismDash.course";

const SECOND_AVAILABLE_COURSE_FIXTURE = {
  id: "interface-lab",
  protocolVersion: COURSE_PROTOCOL_VERSION,
  title: { zh: "界面实验室", en: "Interface Lab" },
  eyebrow: { zh: "项目课程 / 6 关", en: "PROJECT COURSE / 6 LEVELS" },
  description: { zh: "通过六个关卡构建界面系统。", en: "Build an interface system in six levels." },
  category: { zh: "界面工程", en: "Interface Engineering" },
  difficulty: { zh: "入门", en: "Beginner" },
  estimatedHours: 4,
  totalLessons: 6,
  status: "available",
  launchUrls: {
    zh: "https://interface-course.example/guide/",
    en: "https://interface-course.example/guide/en/",
  },
  allowedOrigins: ["https://interface-course.example"],
  maxXp: 600,
  allowedRewardIds: ["interface-lab-01", "interface-lab-02"],
  featured: false,
  layoutHint: "standard",
  accent: "#86e7dd",
  accentSecondary: "#9f86ff",
  glyph: "IL",
} as const satisfies LearningCourse;

function changed(
  course: LearningCourse,
  overrides: Partial<LearningCourse>,
): LearningCourse {
  return { ...course, ...overrides };
}

describe("Course Contract v2 registry", () => {
  it("registers Prism with a fixed v2 security and reward contract", () => {
    expect(PRISM_DASH_COURSE.protocolVersion).toBe(2);
    expect(PRISM_DASH_COURSE.maxXp).toBe(1800);
    expect(PRISM_DASH_COURSE.launchUrls.zh).not.toBe(PRISM_DASH_COURSE.launchUrls.en);
    expect(PRISM_DASH_COURSE.allowedOrigins).toContain(
      new URL(PRISM_DASH_COURSE.launchUrls.zh).origin,
    );
    expect(PRISM_DASH_REWARD_IDS).toHaveLength(36);
    expect(new Set(PRISM_DASH_REWARD_IDS).size).toBe(36);
    expect(COURSE_REGISTRY.get("prism-dash")).toBe(PRISM_DASH_COURSE);
    expect(courseById("prism-dash")).toBe(PRISM_DASH_COURSE);
  });

  it("keeps a coming-soon manifest valid without opening a trust origin", () => {
    expect(() => validateCourseRegistry([MOTION_SYSTEMS_COURSE])).not.toThrow();
    expect(MOTION_SYSTEMS_COURSE.launchUrls).toEqual({ zh: "", en: "" });
    expect(MOTION_SYSTEMS_COURSE.allowedOrigins).toEqual([]);
  });

  it("accepts a second independent available course fixture", () => {
    const registry = validateCourseRegistry([
      PRISM_DASH_COURSE,
      SECOND_AVAILABLE_COURSE_FIXTURE,
    ] as const);

    expect(registry).toHaveLength(2);
    expect(registry[1].status).toBe("available");
    expect(registry[1].launchUrls.en).toContain("/en/");
  });

  it("rejects duplicate IDs and duplicate localized URLs", () => {
    expect(() => validateCourseRegistry([
      SECOND_AVAILABLE_COURSE_FIXTURE,
      changed(SECOND_AVAILABLE_COURSE_FIXTURE, {
        title: { zh: "另一个课程", en: "Another course" },
      }),
    ])).toThrow(/duplicate course id/);

    expect(() => validateCourseRegistry([
      SECOND_AVAILABLE_COURSE_FIXTURE,
      changed(SECOND_AVAILABLE_COURSE_FIXTURE, {
        id: "another-interface-lab",
      }),
    ])).toThrow(/duplicates the URL/);
  });

  it("rejects malformed IDs, URLs and non-canonical origins", () => {
    expect(() => validateCourseRegistry([
      changed(SECOND_AVAILABLE_COURSE_FIXTURE, { id: "Interface Lab" }),
    ])).toThrow(/kebab-case/);

    expect(() => validateCourseRegistry([
      changed(SECOND_AVAILABLE_COURSE_FIXTURE, {
        launchUrls: { zh: "/relative/", en: "https://interface-course.example/guide/en/" },
      }),
    ])).toThrow(/absolute URL/);

    expect(() => validateCourseRegistry([
      changed(SECOND_AVAILABLE_COURSE_FIXTURE, {
        allowedOrigins: ["https://interface-course.example/path"],
      }),
    ])).toThrow(/canonical origins/);
  });

  it("rejects URLs outside the manifest allowlist and the wrong protocol", () => {
    expect(() => validateCourseRegistry([
      changed(SECOND_AVAILABLE_COURSE_FIXTURE, {
        allowedOrigins: ["https://different.example"],
      }),
    ])).toThrow(/which is not allowed/);

    expect(() => validateCourseRegistry([
      changed(SECOND_AVAILABLE_COURSE_FIXTURE, {
        protocolVersion: 1 as 2,
      }),
    ])).toThrow(/protocolVersion must be 2/);
  });

  it("exports only validated manifests", () => {
    expect(() => validateCourseRegistry(LEARNING_COURSES)).not.toThrow();
    expect(LEARNING_COURSES.every((course) => course.protocolVersion === 2)).toBe(true);
    expect(() => validateCourseRegistry([
      changed(SECOND_AVAILABLE_COURSE_FIXTURE, { allowedRewardIds: ["duplicate", "duplicate"] }),
    ])).toThrow(CourseRegistryError);
  });
});
