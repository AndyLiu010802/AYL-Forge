import { describe, expect, it } from "vitest";
import type { LearningCourse } from "./academy.types";
import {
  acceptCourseProgressEvent,
  courseProgressRequest,
  sanitizeCourseProgressMessage,
} from "./courseBridge";

const course = {
  id: "fixture-course",
  protocolVersion: 2,
  title: { zh: "测试课程", en: "Fixture Course" },
  eyebrow: { zh: "测试", en: "FIXTURE" },
  description: { zh: "用于协议测试。", en: "Used by contract tests." },
  category: { zh: "测试", en: "Testing" },
  difficulty: { zh: "入门", en: "Beginner" },
  estimatedHours: 1,
  launchUrls: {
    zh: "https://course.example/guide/",
    en: "https://course.example/guide/en/",
  },
  allowedOrigins: ["https://course.example"],
  maxXp: 500,
  allowedRewardIds: ["badge-01", "badge-02"],
  totalLessons: 3,
  status: "available",
  featured: false,
  layoutHint: "standard",
  accent: "#7de6da",
  accentSecondary: "#c49bff",
  glyph: "FX",
} satisfies LearningCourse;

function progressMessage(overrides: Record<string, unknown> = {}) {
  return {
    type: "AYL_FORGE_COURSE_PROGRESS",
    courseId: course.id,
    protocolVersion: 2,
    progress: {
      completed: [0, 2],
      xp: 120,
      rewards: ["badge-01"],
    },
    ...overrides,
  };
}

describe("Course Contract v2 bridge", () => {
  it("clamps XP and filters lessons and rewards against the manifest", () => {
    expect(sanitizeCourseProgressMessage(progressMessage({
      progress: {
        completed: [-1, 0, 2, 3, 99, 2],
        xp: 50_000,
        rewards: ["badge-01", "unknown", "badge-01"],
      },
    }), course)?.progress).toEqual({
      completed: [0, 2],
      xp: 500,
      rewards: ["badge-01"],
    });
  });

  it("rejects the wrong course or protocol version", () => {
    expect(sanitizeCourseProgressMessage(progressMessage({ courseId: "other" }), course)).toBeNull();
    expect(sanitizeCourseProgressMessage(progressMessage({ protocolVersion: 1 }), course)).toBeNull();
  });

  it("requires both the approved origin and the active iframe window", () => {
    const frameWindow = {} as MessageEventSource;
    const message = progressMessage();
    expect(acceptCourseProgressEvent({
      data: message,
      origin: "https://course.example",
      source: frameWindow,
    }, frameWindow, course)).not.toBeNull();
    expect(acceptCourseProgressEvent({
      data: message,
      origin: "https://evil.example",
      source: frameWindow,
    }, frameWindow, course)).toBeNull();
    expect(acceptCourseProgressEvent({
      data: message,
      origin: "https://course.example",
      source: {} as MessageEventSource,
    }, frameWindow, course)).toBeNull();
  });

  it("builds a versioned request without a wildcard target", () => {
    expect(courseProgressRequest(course)).toEqual({
      type: "AYL_FORGE_REQUEST_PROGRESS",
      courseId: course.id,
      protocolVersion: 2,
    });
  });
});
