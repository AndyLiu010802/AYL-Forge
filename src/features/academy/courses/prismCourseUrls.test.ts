import { afterEach, describe, expect, it, vi } from "vitest";
import { resolvePrismCourseUrls } from "./prismCourseUrls";

const DEFAULT_ZH = "https://andy-prism-portfolio.netlify.app/build-guide/";
const DEFAULT_EN = "https://andy-prism-portfolio.netlify.app/build-guide/en/";

describe("resolvePrismCourseUrls", () => {
  it("uses the stable production routes when deployment values are absent", () => {
    expect(resolvePrismCourseUrls({})).toEqual({
      launchUrls: { zh: DEFAULT_ZH, en: DEFAULT_EN },
      allowedOrigins: ["https://andy-prism-portfolio.netlify.app"],
    });
  });

  it("derives the English route from the backwards-compatible legacy value", () => {
    expect(resolvePrismCourseUrls({
      legacy: "https://preview.example/course/?draft=1#lesson",
    })).toEqual({
      launchUrls: {
        zh: "https://preview.example/course/?draft=1#lesson",
        en: "https://preview.example/course/en/",
      },
      allowedOrigins: ["https://preview.example"],
    });
  });

  it("keeps distinct valid localized URLs and their unique origins", () => {
    expect(resolvePrismCourseUrls({
      zh: " https://zh.example/guide/ ",
      en: "https://en.example/tutorial/",
    })).toEqual({
      launchUrls: {
        zh: "https://zh.example/guide/",
        en: "https://en.example/tutorial/",
      },
      allowedOrigins: ["https://zh.example", "https://en.example"],
    });
  });

  it("ignores empty and malformed values instead of throwing during prerender", () => {
    expect(() => resolvePrismCourseUrls({
      legacy: "",
      zh: "[course](https://example.com/course/)",
      en: "not-a-url",
    })).not.toThrow();

    expect(resolvePrismCourseUrls({
      legacy: "",
      zh: "[course](https://example.com/course/)",
      en: "not-a-url",
    }).launchUrls).toEqual({ zh: DEFAULT_ZH, en: DEFAULT_EN });
  });

  it("rejects unsafe protocols and credential-bearing URLs", () => {
    const result = resolvePrismCourseUrls({
      zh: "javascript:alert(1)",
      en: "https://user:password@example.com/course/en/",
    });

    expect(result.launchUrls).toEqual({ zh: DEFAULT_ZH, en: DEFAULT_EN });
  });

  it("falls back to legacy input and repairs a duplicate English route", () => {
    const result = resolvePrismCourseUrls({
      legacy: "https://preview.example/course/",
      zh: "invalid",
      en: "https://preview.example/course/",
    });

    expect(result.launchUrls).toEqual({
      zh: "https://preview.example/course/",
      en: "https://preview.example/course/en/",
    });
  });
});

describe("Prism course manifest initialization", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("remains importable when a deployment injects invalid public URLs", async () => {
    vi.stubEnv("NEXT_PUBLIC_PRISM_DASH_COURSE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_PRISM_DASH_COURSE_ZH_URL", "[course](https://example.com)");
    vi.stubEnv("NEXT_PUBLIC_PRISM_DASH_COURSE_EN_URL", "not-a-url");
    vi.resetModules();

    const { PRISM_DASH_COURSE } = await import("./prismDash.course");

    expect(() => new URL(PRISM_DASH_COURSE.launchUrls.zh)).not.toThrow();
    expect(() => new URL(PRISM_DASH_COURSE.launchUrls.en)).not.toThrow();
    expect(PRISM_DASH_COURSE.launchUrls.zh).not.toBe(
      PRISM_DASH_COURSE.launchUrls.en,
    );
  });
});
