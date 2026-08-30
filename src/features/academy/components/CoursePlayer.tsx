"use client";

import { useEffect, useMemo, useRef } from "react";
import { acceptCourseProgressEvent, courseProgressRequest } from "../courseBridge";
import type {
  AcademyLocale,
  CourseProgressMessage,
  LearningCourse,
  PendingRewardDrop,
} from "../academy.types";
import { RewardDropOverlay } from "./RewardDropOverlay";
import styles from "../styles/Academy.module.css";

interface CoursePlayerProps {
  readonly course: LearningCourse;
  readonly locale: AcademyLocale;
  readonly rewardDrop: PendingRewardDrop | null;
  readonly onClose: () => void;
  readonly onProgress: (message: CourseProgressMessage) => void;
  readonly onContinueReward: (dropId: string) => void;
  readonly onOpenShop: (dropId: string) => void;
  readonly onOpenProfile: (dropId: string) => void;
}

function localizedCourseUrl(course: LearningCourse, locale: AcademyLocale): string {
  return course.launchUrls[locale];
}

/** Secure iframe bridge for a course hosted on a separate origin. */
export function CoursePlayer({
  course,
  locale,
  rewardDrop,
  onClose,
  onProgress,
  onContinueReward,
  onOpenShop,
  onOpenProfile,
}: CoursePlayerProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const source = useMemo(() => localizedCourseUrl(course, locale), [course, locale]);
  const allowedOrigin = useMemo(() => new URL(source).origin, [source]);

  useEffect(() => {
    const receiveProgress = (event: MessageEvent<unknown>) => {
      const accepted = acceptCourseProgressEvent(event, frameRef.current?.contentWindow ?? null, course);
      if (accepted) onProgress(accepted);
    };
    window.addEventListener("message", receiveProgress);
    return () => window.removeEventListener("message", receiveProgress);
  }, [course, onProgress]);

  const requestProgress = () => {
    frameRef.current?.contentWindow?.postMessage(
      courseProgressRequest(course),
      allowedOrigin,
    );
  };

  return (
    <section className={styles.player} aria-label={locale === "zh" ? "嵌入课程播放器" : "Embedded course player"}>
      <header className={styles.playerBar}>
        <button type="button" onClick={onClose}>← {locale === "zh" ? "返回课程库" : "Back to library"}</button>
        <div><span>{course.eyebrow[locale]}</span><strong>{course.title[locale]}</strong></div>
        <a href={source} target="_blank" rel="noreferrer">{locale === "zh" ? "新标签打开" : "Open in new tab"} ↗</a>
      </header>
      <div className={styles.frameShell}>
        <div className={styles.frameLoading}><i /><p>{locale === "zh" ? "正在连接课程…" : "Connecting course…"}</p></div>
        <iframe
          ref={frameRef}
          src={source}
          title={course.title[locale]}
          onLoad={requestProgress}
          allow="fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        />
      </div>
      {rewardDrop ? (
        <RewardDropOverlay
          key={rewardDrop.id}
          drop={rewardDrop}
          course={course}
          locale={locale}
          onContinue={() => onContinueReward(rewardDrop.id)}
          onOpenShop={() => onOpenShop(rewardDrop.id)}
          onOpenProfile={() => onOpenProfile(rewardDrop.id)}
        />
      ) : null}
    </section>
  );
}
