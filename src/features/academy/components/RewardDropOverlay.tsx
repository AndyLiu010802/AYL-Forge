"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import type {
  AcademyLocale,
  LearningCourse,
  PendingRewardDrop,
} from "../academy.types";
import styles from "../styles/Academy.module.css";

interface RewardDropOverlayProps {
  readonly drop: PendingRewardDrop;
  readonly course: LearningCourse;
  readonly locale: AcademyLocale;
  readonly onContinue: () => void;
  readonly onOpenShop: () => void;
  readonly onOpenProfile: () => void;
}

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function focusableChildren(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter((element) => element.getAttribute("aria-hidden") !== "true");
}

function formatRank(level: number): string {
  return `LV.${String(Math.max(0, level)).padStart(2, "0")}`;
}

/**
 * Keyboard-safe reward ceremony shown above a course iframe. The iframe stays
 * mounted behind this layer, so continuing never forces the course to reload.
 */
export function RewardDropOverlay({
  drop,
  course,
  locale,
  onContinue,
  onOpenShop,
  onOpenProfile,
}: RewardDropOverlayProps) {
  const [revealState, setRevealState] = useState({ dropId: "", revealed: false });
  const dialogRef = useRef<HTMLElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const continueButtonRef = useRef<HTMLButtonElement>(null);
  const revealed = revealState.dropId === drop.id && revealState.revealed;
  const lessonCount = drop.newLessons.length;

  const copy = locale === "zh"
    ? {
        sealedEyebrow: "关卡结算 / 奖励待确认",
        sealedTitle: "一枚新的棱晶宝箱已经抵达",
        sealedDescription: lessonCount
          ? `你在《${course.title.zh}》中推进了 ${lessonCount} 关。打开宝箱查看这次成长记录。`
          : `《${course.title.zh}》传来了新的成长记录。打开宝箱查看本次 XP 与奖励。`,
        open: "打开棱晶宝箱",
        openHint: "按 Enter 打开 · 按 Esc 返回课程",
        revealedEyebrow: "奖励已验证 / 已写入档案",
        revealedTitle: "关卡结算完成",
        revealedDescription: "这次进度已安全同步到 AYL Forge，并会保留在你的本地学习档案中。",
        lessons: "新完成关卡",
        crystals: "获得晶体",
        badges: "新徽章",
        rank: "等级传输",
        noBadges: "本次没有新增徽章",
        continue: "继续课程",
        shop: "前往等级商店",
        profile: "查看学习档案",
      }
    : {
        sealedEyebrow: "LEVEL CLEAR / DROP PENDING",
        sealedTitle: "A new prism chest has arrived",
        sealedDescription: lessonCount
          ? `You advanced ${lessonCount} level${lessonCount === 1 ? "" : "s"} in ${course.title.en}. Open the chest to inspect this progress drop.`
          : `${course.title.en} sent a new progress record. Open the chest to inspect its XP and rewards.`,
        open: "Open prism chest",
        openHint: "Press Enter to open · Esc to return",
        revealedEyebrow: "REWARD VERIFIED / PROFILE SYNCED",
        revealedTitle: "Level settlement complete",
        revealedDescription: "This progress is safely synced to AYL Forge and remains in your local learner profile.",
        lessons: "Levels cleared",
        crystals: "Crystals earned",
        badges: "New badges",
        rank: "Rank transfer",
        noBadges: "No new badge in this drop",
        continue: "Continue course",
        shop: "Open level shop",
        profile: "View learner profile",
      };

  useEffect(() => {
    const target = revealed ? continueButtonRef.current : openButtonRef.current;
    const animationFrame = window.requestAnimationFrame(() => target?.focus());
    return () => window.cancelAnimationFrame(animationFrame);
  }, [drop.id, revealed]);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onContinue();
      return;
    }

    if (event.key !== "Tab" || !dialogRef.current) return;
    const focusable = focusableChildren(dialogRef.current);
    if (!focusable.length) {
      event.preventDefault();
      dialogRef.current.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !dialogRef.current.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !dialogRef.current.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className={styles.rewardDropBackdrop}>
      <section
        ref={dialogRef}
        className={styles.rewardDropDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reward-drop-title"
        aria-describedby="reward-drop-description"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        style={{
          "--reward-accent": course.accent,
          "--reward-accent-secondary": course.accentSecondary,
        } as React.CSSProperties}
      >
        <span className={styles.rewardDropCorner} aria-hidden="true" />
        <span className={styles.rewardDropScanline} aria-hidden="true" />

        {!revealed ? (
          <div className={styles.rewardDropSealedContent} aria-live="polite">
            <header className={styles.rewardDropHeading}>
              <p>{copy.sealedEyebrow}</p>
              <h2 id="reward-drop-title">{copy.sealedTitle}</h2>
              <p id="reward-drop-description">{copy.sealedDescription}</p>
            </header>

            <button
              ref={openButtonRef}
              className={styles.rewardChestButton}
              type="button"
              onClick={() => setRevealState({ dropId: drop.id, revealed: true })}
              aria-describedby="reward-drop-open-hint"
            >
              <span className={styles.rewardChestOrbit} aria-hidden="true">
                <span className={styles.rewardChestPrism}>
                  <i /><i /><i />
                  <b>{course.glyph}</b>
                </span>
              </span>
              <strong>{copy.open}</strong>
              <small id="reward-drop-open-hint">{copy.openHint}</small>
            </button>

            <div className={styles.rewardDropSignal} aria-hidden="true">
              <i /><span>{lessonCount ? `${String(lessonCount).padStart(2, "0")} LEVEL DATA` : "XP / REWARD DATA"}</span><i />
            </div>
          </div>
        ) : (
          <div className={styles.rewardDropRevealContent} aria-live="polite" aria-atomic="true">
            <header className={styles.rewardDropHeading}>
              <p>{copy.revealedEyebrow}</p>
              <h2 id="reward-drop-title">{copy.revealedTitle}</h2>
              <p id="reward-drop-description">{copy.revealedDescription}</p>
            </header>

            <div className={styles.rewardDropSummary}>
              <div className={styles.rewardDropGlyph} aria-hidden="true">
                <span>{course.glyph}</span><i />
              </div>
              <dl className={styles.rewardDropStats}>
                <div><dt>{copy.lessons}</dt><dd>+{lessonCount}</dd></div>
                <div><dt>XP</dt><dd>+{drop.xpEarned}</dd></div>
                <div><dt>{copy.crystals}</dt><dd>◆ +{drop.crystalsEarned}</dd></div>
              </dl>
            </div>

            <div className={styles.rewardRankTransfer} aria-label={`${copy.rank}: ${formatRank(drop.rankBefore)} to ${formatRank(drop.rankAfter)}`}>
              <span><small>{copy.rank}</small><strong>{formatRank(drop.rankBefore)}</strong></span>
              <i aria-hidden="true">→</i>
              <span><small>{drop.rankAfter > drop.rankBefore ? "RANK UP" : "CURRENT"}</small><strong>{formatRank(drop.rankAfter)}</strong></span>
            </div>

            <section className={styles.rewardBadgeSection} aria-labelledby="reward-badges-title">
              <h3 id="reward-badges-title">{copy.badges}</h3>
              {drop.rewardIds.length ? (
                <ul>{drop.rewardIds.map((reward) => <li key={reward}><span aria-hidden="true">◆</span>{reward}</li>)}</ul>
              ) : <p>{copy.noBadges}</p>}
            </section>

            <footer className={styles.rewardDropActions}>
              <button ref={continueButtonRef} type="button" onClick={onContinue}>{copy.continue}<span aria-hidden="true">→</span></button>
              <button type="button" onClick={onOpenShop}>{copy.shop}<span aria-hidden="true">◆</span></button>
              <button type="button" onClick={onOpenProfile}>{copy.profile}<span aria-hidden="true">↗</span></button>
            </footer>
          </div>
        )}
      </section>
    </div>
  );
}
