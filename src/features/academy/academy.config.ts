import type { ShopItem } from "./academy.types";

// Course manifests live beside their validation contract; this re-export keeps
// existing academy consumers independent from the registry's file structure.
export { LEARNING_COURSES } from "./courses/courseRegistry";

export const SHOP_ITEMS = [
  {
    id: "cyan-initiate-frame",
    name: { zh: "青色学员框", en: "Cyan Initiate Frame" },
    description: { zh: "为档案头像装上一圈轻微发光的青色边框。", en: "A soft cyan signal frame for your learner profile." },
    kind: "profile-frame",
    cost: 35,
    requiredLevel: 1,
    accent: "#7de6da",
    glyph: "01",
  },
  {
    id: "violet-route-trail",
    name: { zh: "紫晶路线尾迹", en: "Violet Route Trail" },
    description: { zh: "让已完成课程节点留下紫色能量轨迹。", en: "Leaves a violet energy trace behind completed course nodes." },
    kind: "trail",
    cost: 70,
    requiredLevel: 2,
    accent: "#c49bff",
    glyph: "02",
  },
  {
    id: "system-runner-title",
    name: { zh: "SYSTEM RUNNER 称号", en: "SYSTEM RUNNER Title" },
    description: { zh: "在学习档案中展示已掌握状态与输入系统。", en: "A profile title for mastering state and input systems." },
    kind: "title",
    cost: 105,
    requiredLevel: 3,
    accent: "#d7f57c",
    glyph: "03",
  },
  {
    id: "deep-space-theme",
    name: { zh: "深空控制台主题", en: "Deep Space Console" },
    description: { zh: "为平台切换更深的蓝紫控制台外观。", en: "A deeper blue-violet console skin for the platform." },
    kind: "theme",
    cost: 145,
    requiredLevel: 4,
    accent: "#7395ff",
    glyph: "04",
  },
  {
    id: "prism-architect-frame",
    name: { zh: "棱镜架构师框", en: "Prism Architect Frame" },
    description: { zh: "最高等级的多层折射档案框。", en: "A multi-layer refracted frame reserved for advanced builders." },
    kind: "profile-frame",
    cost: 220,
    requiredLevel: 5,
    accent: "#ffd58c",
    glyph: "05",
  },
] as const satisfies readonly ShopItem[];

export const ACADEMY_RANKS = [
  { level: 1, xp: 0, name: { zh: "信号学员", en: "Signal Initiate" } },
  { level: 2, xp: 150, name: { zh: "界面探索者", en: "Interface Scout" } },
  { level: 3, xp: 400, name: { zh: "系统奔跑者", en: "System Runner" } },
  { level: 4, xp: 800, name: { zh: "棱镜工程师", en: "Prism Engineer" } },
  { level: 5, xp: 1400, name: { zh: "体验架构师", en: "Experience Architect" } },
  { level: 6, xp: 2200, name: { zh: "Forge 大师", en: "Forge Master" } },
] as const;
