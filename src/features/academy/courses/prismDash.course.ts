import { COURSE_PROTOCOL_VERSION, type LearningCourse } from "../academy.types";
import { resolvePrismCourseUrls } from "./prismCourseUrls";

const prismCourseUrls = resolvePrismCourseUrls({
  legacy: process.env.NEXT_PUBLIC_PRISM_DASH_COURSE_URL,
  zh: process.env.NEXT_PUBLIC_PRISM_DASH_COURSE_ZH_URL,
  en: process.env.NEXT_PUBLIC_PRISM_DASH_COURSE_EN_URL,
});

/**
 * Prism currently stores the localized badge labels in its progress payload.
 * Both language sets remain allowlisted during the v2 migration so the learner
 * profile can keep showing human-readable names instead of raw identifiers.
 */
export const PRISM_DASH_REWARD_IDS = [
  "空间制图员",
  "工具链启动器",
  "组件学徒",
  "棱镜调色师",
  "数据整理员",
  "章节建筑师",
  "状态守门员",
  "输入协调员",
  "世界点火者",
  "镜头领航员",
  "节拍编导",
  "Viewmodel 工程师",
  "光谱铸造师",
  "安全预览员",
  "晶体轨道师",
  "无障碍守护者",
  "性能炼金师",
  "棱镜发布者",
  "Spatial Cartographer",
  "Toolchain Starter",
  "Component Apprentice",
  "Prism Colourist",
  "Data Curator",
  "Section Architect",
  "State Gatekeeper",
  "Input Coordinator",
  "World Igniter",
  "Camera Navigator",
  "Motion Director",
  "Viewmodel Engineer",
  "Spectral Smith",
  "Safe Previewer",
  "Crystal Orbitalist",
  "Accessibility Guardian",
  "Performance Alchemist",
  "Prism Publisher",
] as const;

export const PRISM_DASH_COURSE = {
  id: "prism-dash",
  protocolVersion: COURSE_PROTOCOL_VERSION,
  title: { zh: "Prism Dash 棱镜作品集", en: "Prism Dash Portfolio" },
  eyebrow: { zh: "完整项目课程 / 18 关", en: "FULL PROJECT COURSE / 18 LEVELS" },
  description: {
    zh: "从空项目开始，逐关完成界面、状态机、第一人称 3D、棱镜特效、性能优化与静态发布。",
    en: "Build a complete first-person prism portfolio: interface, state machine, 3D, effects, performance and launch.",
  },
  category: { zh: "创意前端", en: "Creative Frontend" },
  difficulty: { zh: "零基础至进阶", en: "Beginner to Advanced" },
  estimatedHours: 14,
  totalLessons: 18,
  status: "available",
  launchUrls: prismCourseUrls.launchUrls,
  allowedOrigins: prismCourseUrls.allowedOrigins,
  maxXp: 1800,
  allowedRewardIds: PRISM_DASH_REWARD_IDS,
  featured: true,
  layoutHint: "hero",
  accent: "#7de6da",
  accentSecondary: "#c49bff",
  glyph: "PD",
} as const satisfies LearningCourse;
