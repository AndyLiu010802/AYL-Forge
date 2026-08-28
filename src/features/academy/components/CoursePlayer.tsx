"use client";

import { useEffect, useMemo, useRef } from "react";
import { isCourseProgressMessage } from "../academy.progress";
import type { AcademyLocale, CourseProgressMessage, LearningCourse } from "../academy.types";
import styles from "../styles/Academy.module.css";

interface CoursePlayerProps {
  readonly course: LearningCourse;
  readonly locale: AcademyLocale;
  readonly onClose: () => void;
  readonly onProgress: (message: CourseProgressMessage) => void;
}

function localizedCourseUrl(course: LearningCourse, locale: AcademyLocale): string {
  const url = new URL(course.launchUrl);
  if (locale === "en") url.pathname = `${url.pathname.replace(/\/$/, "")}/en`;
  return url.toString();
}

/** Secure iframe bridge for a course hosted on a separate origin. */
export function CoursePlayer({ course, locale, onClose, onProgress }: CoursePlayerProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const source = useMemo(() => localizedCourseUrl(course, locale), [course, locale]);
  const allowedOrigin = useMemo(() => new URL(course.launchUrl).origin, [course.launchUrl]);

  useEffect(() => {
    const receiveProgress = (event: MessageEvent<unknown>) => {
      if (event.origin !== allowedOrigin || event.source !== frameRef.current?.contentWindow) return;
      if (!isCourseProgressMessage(event.data) || event.data.courseId !== course.id) return;
      onProgress(event.data);
    };
    window.addEventListener("message", receiveProgress);
    return () => window.removeEventListener("message", receiveProgress);
  }, [allowedOrigin, course.id, onProgress]);

  const requestProgress = () => {
    frameRef.current?.contentWindow?.postMessage(
      { type: "AYL_FORGE_REQUEST_PROGRESS", courseId: course.id },
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
    </section>
  );
}
