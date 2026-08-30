"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { LEARNING_COURSES, SHOP_ITEMS } from "../academy.config";
import {
  acknowledgeRewardDrop,
  equipShopItem,
  purchaseShopItem,
  syncCourseProgress,
} from "../academy.progress";
import type { AcademyLocale, CourseProgressMessage, LearningCourse, ShopItem } from "../academy.types";
import { useAcademyProgress } from "../useAcademyProgress";
import { CourseLibrary } from "./CourseLibrary";
import { CoursePlayer } from "./CoursePlayer";
import { LearnerProfile } from "./LearnerProfile";
import { RewardShop } from "./RewardShop";
import styles from "../styles/Academy.module.css";

type AcademyView = "courses" | "shop" | "profile";
const LOCALE_KEY = "ayl-forge-locale";
const LOCALE_EVENT = "ayl-forge-locale-change";

function subscribeLocale(onChange: () => void) { window.addEventListener("storage", onChange); window.addEventListener(LOCALE_EVENT, onChange); return () => { window.removeEventListener("storage", onChange); window.removeEventListener(LOCALE_EVENT, onChange); }; }
function readLocale(): string { return window.localStorage.getItem(LOCALE_KEY) ?? "zh"; }
function readServerLocale(): string { return "zh"; }

export function AcademyApp() {
  const storedLocale = useSyncExternalStore(subscribeLocale, readLocale, readServerLocale);
  const locale: AcademyLocale = storedLocale === "en" ? "en" : "zh";
  const [view, setView] = useState<AcademyView>("courses");
  const [activeCourse, setActiveCourse] = useState<LearningCourse | null>(null);
  const [feedback, setFeedback] = useState("");
  const [progress, commit] = useAcademyProgress();

  const changeLocale = (next: AcademyLocale) => {
    window.localStorage.setItem(LOCALE_KEY, next);
    window.dispatchEvent(new Event(LOCALE_EVENT));
  };

  const receiveCourseProgress = useCallback((message: CourseProgressMessage) => {
    const course = LEARNING_COURSES.find((candidate) => candidate.id === message.courseId);
    if (!course) return;
    commit((current) => syncCourseProgress(current, message, course));
  }, [commit]);

  const buyItem = (item: ShopItem) => {
    let nextFeedback = "";
    commit((current) => {
      const result = purchaseShopItem(current, item);
      if (result.ok) {
        nextFeedback = locale === "zh"
          ? `已兑换：${item.name.zh}`
          : `Purchased: ${item.name.en}`;
        return result.progress;
      }
      nextFeedback = {
        owned: locale === "zh" ? "你已经拥有这个奖励。" : "You already own this reward.",
        level: locale === "zh" ? "等级还没有达到解锁要求。" : "Your rank is not high enough yet.",
        funds: locale === "zh" ? "晶体不足，继续完成课程宝箱。" : "Not enough crystals. Complete more course chests.",
      }[result.reason];
      return current;
    });
    setFeedback(nextFeedback);
  };

  const equipItem = (item: ShopItem) => {
    commit((current) => equipShopItem(current, item));
    setFeedback(locale === "zh" ? `已装备：${item.name.zh}` : `Equipped: ${item.name.en}`);
  };

  const acknowledgeDrop = (dropId: string) => {
    commit((current) => acknowledgeRewardDrop(current, dropId));
  };

  const leaveCourseFor = (nextView: "shop" | "profile", dropId: string) => {
    acknowledgeDrop(dropId);
    setActiveCourse(null);
    setView(nextView);
  };

  if (activeCourse) {
    const rewardDrop = progress.pendingDrops.find(
      (drop) => drop.courseId === activeCourse.id,
    ) ?? null;

    return (
      <CoursePlayer
        course={activeCourse}
        locale={locale}
        rewardDrop={rewardDrop}
        onClose={() => setActiveCourse(null)}
        onProgress={receiveCourseProgress}
        onContinueReward={acknowledgeDrop}
        onOpenShop={(dropId) => leaveCourseFor("shop", dropId)}
        onOpenProfile={(dropId) => leaveCourseFor("profile", dropId)}
      />
    );
  }

  return (
    <main className={`${styles.app} ${progress.equipped.theme ? styles.equippedTheme : ""}`} lang={locale === "zh" ? "zh-CN" : "en"}>
      <div className={styles.ambient} aria-hidden="true"><i /><i /><i /><i /></div>
      <header className={styles.topBar}>
        <button className={styles.brand} type="button" onClick={() => setView("courses")}><span>A</span><div><strong>AYL FORGE</strong><small>PROJECT LEARNING NETWORK</small></div></button>
        <nav aria-label={locale === "zh" ? "平台导航" : "Platform navigation"}>
          <button type="button" className={view === "courses" ? styles.activeNav : ""} onClick={() => setView("courses")}>{locale === "zh" ? "课程" : "Courses"}</button>
          <button type="button" className={view === "shop" ? styles.activeNav : ""} onClick={() => setView("shop")}>{locale === "zh" ? "等级商店" : "Level shop"}</button>
          <button type="button" className={view === "profile" ? styles.activeNav : ""} onClick={() => setView("profile")}>{locale === "zh" ? "档案" : "Profile"}</button>
        </nav>
        <div className={styles.headerTools}><span>◆ {progress.crystals}</span><div><button type="button" className={locale === "zh" ? styles.activeLocale : ""} onClick={() => changeLocale("zh")}>中</button><button type="button" className={locale === "en" ? styles.activeLocale : ""} onClick={() => changeLocale("en")}>EN</button></div></div>
      </header>
      <div className={styles.content}>
        {view === "courses" ? <CourseLibrary courses={LEARNING_COURSES} locale={locale} progress={progress} onLaunch={setActiveCourse} /> : null}
        {view === "shop" ? <RewardShop items={SHOP_ITEMS} locale={locale} progress={progress} feedback={feedback} onBuy={buyItem} onEquip={equipItem} /> : null}
        {view === "profile" ? <LearnerProfile locale={locale} progress={progress} /> : null}
      </div>
      <footer className={styles.footer}><p>AYL FORGE / LOCAL-FIRST LEARNING PROFILE</p><span>{locale === "zh" ? "课程进度与商店库存仅保存在此设备" : "Course progress and inventory stay on this device"}</span></footer>
    </main>
  );
}
