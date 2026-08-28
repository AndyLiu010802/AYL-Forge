import type { AcademyLocale, AcademyProgress, ShopItem } from "../academy.types";
import { rankForXp, totalAcademyXp } from "../academy.progress";
import styles from "../styles/Academy.module.css";

interface RewardShopProps {
  readonly items: readonly ShopItem[];
  readonly locale: AcademyLocale;
  readonly progress: AcademyProgress;
  readonly feedback: string;
  readonly onBuy: (item: ShopItem) => void;
  readonly onEquip: (item: ShopItem) => void;
}

export function RewardShop({ items, locale, progress, feedback, onBuy, onEquip }: RewardShopProps) {
  const level = rankForXp(totalAcademyXp(progress)).level;
  return (
    <section className={styles.shop} aria-labelledby="reward-shop-title">
      <header className={styles.sectionHero}>
        <div><p>REWARD VAULT / LEVEL-GATED</p><h1 id="reward-shop-title">{locale === "zh" ? "等级商店" : "Level shop"}</h1><p>{locale === "zh" ? "完成课程宝箱获得晶体。等级决定你能看见多远，晶体决定你现在带走什么。" : "Course chests award crystals. Your level unlocks the shelf; your balance decides what you take."}</p></div>
        <dl><div><dt>{locale === "zh" ? "当前等级" : "LEVEL"}</dt><dd>{level}</dd></div><div><dt>{locale === "zh" ? "晶体余额" : "CRYSTALS"}</dt><dd>◆ {progress.crystals}</dd></div><div><dt>{locale === "zh" ? "已拥有" : "OWNED"}</dt><dd>{progress.inventory.length}</dd></div></dl>
      </header>
      {feedback ? <p className={styles.shopFeedback} role="status">{feedback}</p> : null}
      <div className={styles.shopGrid}>
        {items.map((item) => {
          const owned = progress.inventory.includes(item.id);
          const equipped = progress.equipped[item.kind] === item.id;
          const unlocked = level >= item.requiredLevel;
          return (
            <article key={item.id} className={`${styles.shopItem} ${!unlocked ? styles.shopLocked : ""}`} style={{ "--item-accent": item.accent } as React.CSSProperties}>
              <div className={styles.itemVisual}><span>{item.glyph}</span><i /><b>{item.kind.replace("-", " ")}</b></div>
              <p>LEVEL {item.requiredLevel} / {item.kind.toUpperCase()}</p>
              <h2>{item.name[locale]}</h2><p>{item.description[locale]}</p>
              <footer><strong>◆ {item.cost}</strong>{owned ? <button type="button" onClick={() => onEquip(item)} disabled={equipped}>{equipped ? (locale === "zh" ? "已装备" : "Equipped") : (locale === "zh" ? "装备" : "Equip")}</button> : <button type="button" onClick={() => onBuy(item)} disabled={!unlocked}>{unlocked ? (locale === "zh" ? "兑换" : "Purchase") : `${locale === "zh" ? "需要等级" : "Requires level"} ${item.requiredLevel}`}</button>}</footer>
            </article>
          );
        })}
      </div>
    </section>
  );
}
