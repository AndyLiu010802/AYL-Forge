import { describe, expect, it } from "vitest";
import { LEARNING_COURSES, SHOP_ITEMS } from "./academy.config";
import {
  EMPTY_ACADEMY_PROGRESS,
  acknowledgeRewardDrop,
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

  it("loads a legacy save without a settlement queue", () => {
    const legacy = JSON.stringify({
      courses: {
        "prism-dash": {
          xp: 25,
          completed: [0],
          rewards: [],
          totalLessons: 18,
          lastSyncedAt: "2026-01-01T00:00:00.000Z",
        },
      },
      crystals: 5,
      inventory: [],
      equipped: {},
    });

    expect(parseAcademyProgress(legacy)).toMatchObject({
      pendingDrops: [],
      crystals: 5,
      courses: { "prism-dash": { xp: 25 } },
    });
  });

  it("strictly cleans malformed and duplicate persisted drops", () => {
    const validDrop = {
      id: "drop-01",
      courseId: "prism-dash",
      createdAt: "2026-01-01T00:00:00.000Z",
      newLessons: [2, 1, 2, -1, 1.5],
      xpEarned: 20,
      crystalsEarned: 4,
      rewardIds: [" badge-01 ", "badge-01", ""],
      rankBefore: 1,
      rankAfter: 2,
    };
    const parsed = parseAcademyProgress(JSON.stringify({
      ...EMPTY_ACADEMY_PROGRESS,
      pendingDrops: [
        validDrop,
        validDrop,
        { ...validDrop, id: "drop-invalid-time", createdAt: "yesterday" },
        { ...validDrop, id: "drop-empty", newLessons: [], xpEarned: 0, crystalsEarned: 0, rewardIds: [] },
        { ...validDrop, id: "drop-rank-regression", rankBefore: 3, rankAfter: 2 },
      ],
    }));

    expect(parsed.pendingDrops).toEqual([{
      ...validDrop,
      newLessons: [1, 2],
      rewardIds: ["badge-01"],
    }]);
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
    expect(first.pendingDrops).toHaveLength(1);
    expect(repeated.pendingDrops).toEqual(first.pendingDrops);
  });

  it("settles the exact cumulative delta into assets and one reward drop", () => {
    const firstReward = prismCourse.allowedRewardIds[0];
    const secondReward = prismCourse.allowedRewardIds[1];
    const current = {
      ...EMPTY_ACADEMY_PROGRESS,
      crystals: 10,
      courses: {
        [prismCourse.id]: {
          xp: 4,
          completed: [0],
          rewards: [firstReward],
          totalLessons: prismCourse.totalLessons,
          lastSyncedAt: "2026-01-01T00:00:00.000Z",
        },
      },
    };

    const next = syncCourseProgress(current, {
      type: "AYL_FORGE_COURSE_PROGRESS",
      courseId: prismCourse.id,
      protocolVersion: 2,
      progress: {
        completed: [0, 1, 2],
        xp: 12,
        rewards: [firstReward, secondReward],
      },
    }, prismCourse, "2026-01-02T00:00:00.000Z");

    expect(next.crystals).toBe(12);
    expect(next.courses[prismCourse.id]).toMatchObject({
      xp: 12,
      completed: [0, 1, 2],
      rewards: [firstReward, secondReward],
    });
    expect(next.pendingDrops).toHaveLength(1);
    expect(next.pendingDrops[0]).toMatchObject({
      courseId: prismCourse.id,
      createdAt: "2026-01-02T00:00:00.000Z",
      newLessons: [1, 2],
      xpEarned: 8,
      crystalsEarned: 2,
      rewardIds: [secondReward],
      rankBefore: 1,
      rankAfter: 1,
    });
  });

  it("queues consecutive settlements in order with unique deterministic IDs", () => {
    const message = (xp: number, completed: number[]) => ({
      type: "AYL_FORGE_COURSE_PROGRESS" as const,
      courseId: prismCourse.id,
      protocolVersion: 2 as const,
      progress: { completed, xp, rewards: [] as string[] },
    });
    const first = syncCourseProgress(
      EMPTY_ACADEMY_PROGRESS,
      message(5, [0]),
      prismCourse,
      "2026-01-01T00:00:00.000Z",
    );
    const second = syncCourseProgress(
      first,
      message(10, [0, 1]),
      prismCourse,
      "2026-01-02T00:00:00.000Z",
    );

    expect(second.pendingDrops).toHaveLength(2);
    expect(second.pendingDrops.map((drop) => drop.createdAt)).toEqual([
      "2026-01-01T00:00:00.000Z",
      "2026-01-02T00:00:00.000Z",
    ]);
    expect(new Set(second.pendingDrops.map((drop) => drop.id)).size).toBe(2);
    expect(syncCourseProgress(
      EMPTY_ACADEMY_PROGRESS,
      message(5, [0]),
      prismCourse,
      "2030-01-01T00:00:00.000Z",
    ).pendingDrops[0].id).toBe(first.pendingDrops[0].id);
  });

  it("acknowledges a drop without changing earned progress or assets", () => {
    const settled = syncCourseProgress(EMPTY_ACADEMY_PROGRESS, {
      type: "AYL_FORGE_COURSE_PROGRESS",
      courseId: prismCourse.id,
      protocolVersion: 2,
      progress: { completed: [0], xp: 5, rewards: [] },
    }, prismCourse, "2026-01-01T00:00:00.000Z");
    const acknowledged = acknowledgeRewardDrop(settled, settled.pendingDrops[0].id);

    expect(acknowledged.pendingDrops).toEqual([]);
    expect(acknowledged.courses).toEqual(settled.courses);
    expect(acknowledged.crystals).toBe(settled.crystals);
    expect(acknowledged.inventory).toEqual(settled.inventory);
    expect(acknowledged.equipped).toEqual(settled.equipped);
    expect(acknowledgeRewardDrop(acknowledged, "missing")).toBe(acknowledged);
  });

  it("records a rank transition against academy-wide XP", () => {
    const next = syncCourseProgress(EMPTY_ACADEMY_PROGRESS, {
      type: "AYL_FORGE_COURSE_PROGRESS",
      courseId: prismCourse.id,
      protocolVersion: 2,
      progress: { completed: [0, 1], xp: 150, rewards: [] },
    }, prismCourse, "2026-01-01T00:00:00.000Z");

    expect(next.pendingDrops[0]).toMatchObject({
      xpEarned: 150,
      crystalsEarned: 30,
      rankBefore: 1,
      rankAfter: 2,
    });
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
