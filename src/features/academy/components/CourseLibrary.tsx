import type { AcademyLocale, AcademyProgress, LearningCourse } from "../academy.types";
import { rankForXp, totalAcademyXp } from "../academy.progress";
import { ACADEMY_RANKS } from "../academy.config";
import styles from "../styles/Academy.module.css";

interface CourseLibraryProps {
  readonly courses: readonly LearningCourse[];
  readonly locale: AcademyLocale;
  readonly progress: AcademyProgress;
  readonly onLaunch: (course: LearningCourse) => void;
}

export function CourseLibrary({ courses, locale, progress, onLaunch }: CourseLibraryProps) {
  const xp = totalAcademyXp(progress);
  const rank = rankForXp(xp);
  const nextRank = ACADEMY_RANKS.find((candidate) => candidate.xp > xp);
  const rankProgress = nextRank
    ? Math.round(((xp - rank.xp) / (nextRank.xp - rank.xp)) * 100)
    : 100;

  return (
    <>
      <section className={styles.hero} aria-labelledby="academy-hero-title">
        <div>
          <p>AYL FORGE / PROJECT LEARNING NETWORK</p>
          <h1 id="academy-hero-title">
            {locale === "zh" ? <>用真实项目升级，<em>不是只看教程。</em></> : <>Level up through real projects, <em>not passive tutorials.</em></>}
          </h1>
          <p>{locale === "zh" ? "完成关卡获得 XP 与晶体，在等级商店解锁档案装饰；每一门新项目课程都会加入同一个成长记录。" : "Complete levels to earn XP and crystals, unlock profile rewards, and carry one progression record across every future project course."}</p>
        </div>
        <aside>
          <span>{locale === "zh" ? "当前等级" : "CURRENT RANK"}</span>
          <strong>LV.{String(rank.level).padStart(2, "0")}</strong>
          <h2>{rank.name[locale]}</h2>
          <div><i style={{ width: `${rankProgress}%` }} /></div>
          <p>{nextRank ? `${xp} / ${nextRank.xp} XP` : `${xp} XP / MAX`}</p>
        </aside>
      </section>

      <section className={styles.library} aria-labelledby="course-library-title">
        <header><div><p>PROJECT INDEX / {String(courses.length).padStart(2, "0")}</p><h2 id="course-library-title">{locale === "zh" ? "项目课程库" : "Project course library"}</h2></div><p>{locale === "zh" ? "每个项目都是一条可完成的制作路线。" : "Every project is a complete build path."}</p></header>
        <div className={styles.courseGrid}>
          {courses.map((course, index) => {
            const record = progress.courses[course.id];
            const completed = record?.completed.length ?? 0;
            const percentage = Math.round((completed / course.totalLessons) * 100);
            const pendingRewards = progress.pendingDrops.filter(
              (drop) => drop.courseId === course.id,
            ).length;
            const layoutClass = {
              hero: styles.courseHero,
              standard: styles.courseStandard,
              compact: styles.courseCompact,
            }[course.layoutHint];
            return (
              <article
                key={course.id}
                className={`${styles.courseCard} ${layoutClass} ${course.status === "coming-soon" ? styles.courseLocked : ""}`}
                style={{ "--course-accent": course.accent, "--course-accent-2": course.accentSecondary } as React.CSSProperties}
              >
                <div className={styles.courseVisual}><span>{course.glyph}</span><i /><b>{String(index + 1).padStart(2, "0")}</b></div>
                <div className={styles.courseCopy}>
                  <p>{course.eyebrow[locale]}</p><h3>{course.title[locale]}</h3><p>{course.description[locale]}</p>
                  <dl><div><dt>{locale === "zh" ? "领域" : "FIELD"}</dt><dd>{course.category[locale]}</dd></div><div><dt>{locale === "zh" ? "难度" : "LEVEL"}</dt><dd>{course.difficulty[locale]}</dd></div><div><dt>{locale === "zh" ? "预计" : "TIME"}</dt><dd>{course.estimatedHours}H</dd></div></dl>
                </div>
                <footer>
                  <div>
                    <span>{completed} / {course.totalLessons}</span>
                    {pendingRewards ? (
                      <small className={styles.pendingReward}>
                        ◆ {pendingRewards} {locale === "zh" ? "个结算待领取" : "reward drop pending"}
                      </small>
                    ) : null}
                    <i><b style={{ width: `${percentage}%` }} /></i>
                  </div>
                  {course.status === "available" ? (
                    <button type="button" onClick={() => onLaunch(course)}>
                      {pendingRewards
                        ? (locale === "zh" ? "领取结算" : "Claim reward")
                        : completed
                          ? (locale === "zh" ? "继续项目" : "Continue")
                          : (locale === "zh" ? "开始项目" : "Start project")}
                      <span>→</span>
                    </button>
                  ) : <span>{locale === "zh" ? "开发中" : "IN DEVELOPMENT"}</span>}
                </footer>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
