import { describe, expect, it } from "vitest";
import { LEARNING_COURSES, SHOP_ITEMS } from "./academy.config";
import {
  EMPTY_ACADEMY_PROGRESS,
  equipShopItem,
  parseAcademyProgress,
  purchaseShopItem,
  rankForXp,
  syncCourseProgress,
  totalAcademyXp,
} from "./academy.progress";

describe("AYL Forge progression", () => {
  const prismCourse = LEARNING_COURSES[0];

  it("recovers from malformed local data", () => {
    expect(parseAcademyProgress(null)).toEqual(EMPTY_ACADEMY_PROGRESS);
    expect(parseAcademyProgress("broken")).toEqual(EMPTY_ACADEMY_PROGRESS);
  });

  it("syncs course XP idempotently and grants crystals only for new XP", () => {
    const message = {
      type: "AYL_FORGE_COURSE_PROGRESS" as const,
      courseId: "prism-dash",
      protocolVersion: 2 as const,
      progress: { completed: [0, 1], xp: 200, rewards: [prismCourse.allowedRewardIds[0]] },
    };
    const first = syncCourseProgress(EMPTY_ACADEMY_PROGRESS, message, prismCourse, "2026-01-01T00:00:00.000Z");
    const repeated = syncCourseProgress(first, message, prismCourse, "2026-01-02T00:00:00.000Z");
    expect(first.crystals).toBe(40);
    expect(repeated.crystals).toBe(40);
    expect(totalAcademyXp(repeated)).toBe(200);
    expect(repeated.courses["prism-dash"].completed).toEqual([0, 1]);
  });

  it("rejects invalid XP and clamps completed lesson indexes", () => {
    const next = syncCourseProgress(
      EMPTY_ACADEMY_PROGRESS,
      {
        type: "AYL_FORGE_COURSE_PROGRESS",
        courseId: "prism-dash",
        protocolVersion: 2,
        progress: { completed: [-1, 0, 17, 18, 99], xp: Number.NaN, rewards: [] },
      },
      prismCourse,
      "2026-01-01T00:00:00.000Z",
    );

    expect(next.courses["prism-dash"].xp).toBe(0);
    expect(next.courses["prism-dash"].completed).toEqual([0, 17]);
    expect(next.crystals).toBe(0);
  });

  it("awards the same crystals for fragmented and single XP syncs", () => {
    const baseMessage = {
      type: "AYL_FORGE_COURSE_PROGRESS" as const,
      courseId: prismCourse.id,
      protocolVersion: 2 as const,
      progress: { completed: [] as number[], xp: 2, rewards: [] as string[] },
    };
    const first = syncCourseProgress(EMPTY_ACADEMY_PROGRESS, baseMessage, prismCourse);
    const fragmented = syncCourseProgress(first, {
      ...baseMessage,
      progress: { ...baseMessage.progress, xp: 7 },
    }, prismCourse);
    const single = syncCourseProgress(EMPTY_ACADEMY_PROGRESS, {
      ...baseMessage,
      progress: { ...baseMessage.progress, xp: 7 },
    }, prismCourse);

    expect(fragmented.crystals).toBe(1);
    expect(fragmented.crystals).toBe(single.crystals);
  });

  it("enforces the course XP cap and reward allowlist", () => {
    const next = syncCourseProgress(EMPTY_ACADEMY_PROGRESS, {
      type: "AYL_FORGE_COURSE_PROGRESS",
      courseId: prismCourse.id,
      protocolVersion: 2,
      progress: {
        completed: [0],
        xp: prismCourse.maxXp * 10,
        rewards: [prismCourse.allowedRewardIds[0], "forged-reward"],
      },
    }, prismCourse);

    expect(next.courses[prismCourse.id].xp).toBe(prismCourse.maxXp);
    expect(next.courses[prismCourse.id].rewards).toEqual([prismCourse.allowedRewardIds[0]]);
  });

  it("gates purchases by rank and funds, then allows equipping owned items", () => {
    const item = SHOP_ITEMS[0];
    expect(purchaseShopItem(EMPTY_ACADEMY_PROGRESS, item)).toEqual({ ok: false, reason: "funds" });
    const funded = { ...EMPTY_ACADEMY_PROGRESS, crystals: 100 };
    const purchase = purchaseShopItem(funded, item);
    expect(purchase.ok).toBe(true);
    if (!purchase.ok) return;
    expect(purchase.progress.crystals).toBe(65);
    expect(equipShopItem(purchase.progress, item).equipped["profile-frame"]).toBe(item.id);
  });

  it("derives stable rank thresholds", () => {
    expect(rankForXp(0).level).toBe(1);
    expect(rankForXp(399).level).toBe(2);
    expect(rankForXp(400).level).toBe(3);
    expect(rankForXp(99999).level).toBe(6);
  });
});
