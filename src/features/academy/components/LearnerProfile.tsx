import { ACADEMY_RANKS, LEARNING_COURSES, SHOP_ITEMS } from "../academy.config";
import type { AcademyLocale, AcademyProgress } from "../academy.types";
import { nextRankForXp, rankForXp, totalAcademyXp } from "../academy.progress";
import styles from "../styles/Academy.module.css";

interface LearnerProfileProps {
  readonly locale: AcademyLocale;
  readonly progress: AcademyProgress;
}

export function LearnerProfile({ locale, progress }: LearnerProfileProps) {
  const xp = totalAcademyXp(progress);
  const rank = rankForXp(xp);
  const next = nextRankForXp(xp);
  const earnedRewards = Array.from(
    new Set(Object.values(progress.courses).flatMap((course) => course.rewards)),
  );
  const equippedItems = SHOP_ITEMS.filter((item) => progress.equipped[item.kind] === item.id);

  return (
    <section className={styles.profile} aria-labelledby="profile-title">
      <header className={styles.profileHero}>
        <div className={styles.profileMark}><span>AYL</span><i>LV.{rank.level}</i></div>
        <div><p>LEARNER DOSSIER / LOCAL PROFILE</p><h1 id="profile-title">{rank.name[locale]}</h1><p>{locale === "zh" ? "所有数据仅保存在这台设备。未来课程会继续累计同一份等级、奖励和库存。" : "Stored on this device only. Future courses will continue the same rank, reward and inventory record."}</p></div>
        <dl><div><dt>XP</dt><dd>{xp}</dd></div><div><dt>{locale === "zh" ? "晶体" : "CRYSTALS"}</dt><dd>◆ {progress.crystals}</dd></div><div><dt>{locale === "zh" ? "徽章" : "BADGES"}</dt><dd>{earnedRewards.length}</dd></div></dl>
      </header>

      <div className={styles.profileGrid}>
        <article className={styles.rankTrack}><p>RANK PROTOCOL</p><h2>{locale === "zh" ? "等级路线" : "Rank route"}</h2><ol>{ACADEMY_RANKS.map((candidate) => <li key={candidate.level} className={candidate.level <= rank.level ? styles.rankReached : ""}><span>{String(candidate.level).padStart(2, "0")}</span><div><strong>{candidate.name[locale]}</strong><small>{candidate.xp} XP</small></div><i>{candidate.level < rank.level ? "✓" : candidate.level === rank.level ? "●" : "◆"}</i></li>)}</ol>{next ? <p>{next.xp - xp} XP {locale === "zh" ? "后升级" : "to next rank"}</p> : <p>MAX RANK</p>}</article>

        <article className={styles.courseRecords}><p>COURSE RECORDS</p><h2>{locale === "zh" ? "项目记录" : "Project records"}</h2>{LEARNING_COURSES.map((course) => { const record = progress.courses[course.id]; const completed = record?.completed.length ?? 0; return <div key={course.id}><span style={{ background: course.accent }}>{course.glyph}</span><div><strong>{course.title[locale]}</strong><small>{completed} / {course.totalLessons} {locale === "zh" ? "关" : "levels"} · {record?.xp ?? 0} XP</small></div><i>{Math.round((completed / course.totalLessons) * 100)}%</i></div>; })}</article>

        <article className={styles.inventory}><p>LOADOUT</p><h2>{locale === "zh" ? "已装备奖励" : "Equipped rewards"}</h2>{equippedItems.length ? <ul>{equippedItems.map((item) => <li key={item.id}><span style={{ borderColor: item.accent }}>{item.glyph}</span><div><strong>{item.name[locale]}</strong><small>{item.kind}</small></div></li>)}</ul> : <p>{locale === "zh" ? "还没有装备物品。去等级商店看看。" : "No equipped items yet. Visit the level shop."}</p>}<h3>{locale === "zh" ? "课程徽章" : "Course badges"}</h3>{earnedRewards.length ? <div className={styles.badges}>{earnedRewards.map((reward) => <span key={reward}>◆ {reward}</span>)}</div> : <p>{locale === "zh" ? "完成第一关并打开宝箱后，徽章会出现在这里。" : "Complete a level and open its chest to earn your first badge."}</p>}</article>
      </div>
    </section>
  );
}
