import { describe, expect, it } from "vitest";
import { SHOP_ITEMS } from "./academy.config";
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
  it("recovers from malformed local data", () => {
    expect(parseAcademyProgress(null)).toEqual(EMPTY_ACADEMY_PROGRESS);
    expect(parseAcademyProgress("broken")).toEqual(EMPTY_ACADEMY_PROGRESS);
  });

  it("syncs course XP idempotently and grants crystals only for new XP", () => {
    const message = {
      type: "AYL_FORGE_COURSE_PROGRESS" as const,
      courseId: "prism-dash",
      progress: { completed: [0, 1], xp: 200, rewards: ["A", "B"] },
    };
    const first = syncCourseProgress(EMPTY_ACADEMY_PROGRESS, message, 18, "2026-01-01T00:00:00.000Z");
    const repeated = syncCourseProgress(first, message, 18, "2026-01-02T00:00:00.000Z");
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
        progress: { completed: [-1, 0, 17, 18, 99], xp: Number.NaN, rewards: [] },
      },
      18,
      "2026-01-01T00:00:00.000Z",
    );

    expect(next.courses["prism-dash"].xp).toBe(0);
    expect(next.courses["prism-dash"].completed).toEqual([0, 17]);
    expect(next.crystals).toBe(0);
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
