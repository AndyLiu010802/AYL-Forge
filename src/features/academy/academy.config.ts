import type { LearningCourse, ShopItem } from "./academy.types";

const prismCourseUrl =
  process.env.NEXT_PUBLIC_PRISM_DASH_COURSE_URL ??
  "https://andy-prism-portfolio.netlify.app/build-guide/";

/** Adding another project course only requires another registry record. */
export const LEARNING_COURSES = [
  {
    id: "prism-dash",
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
    launchUrl: prismCourseUrl,
    accent: "#7de6da",
    accentSecondary: "#c49bff",
    glyph: "PD",
  },
  {
    id: "motion-systems",
    title: { zh: "Motion Systems 动效系统", en: "Motion Systems" },
    eyebrow: { zh: "下一项目 / 规划中", en: "NEXT PROJECT / PLANNED" },
    description: {
      zh: "把交互动效拆成时间线、状态和可复用节拍的专项项目。",
      en: "A focused project for reusable timelines, interaction states and motion rhythm.",
    },
    category: { zh: "交互动效", en: "Interaction Motion" },
    difficulty: { zh: "中级", en: "Intermediate" },
    estimatedHours: 8,
    totalLessons: 12,
    status: "coming-soon",
    launchUrl: "",
    accent: "#d7f57c",
    accentSecondary: "#78baff",
    glyph: "MS",
  },
  {
    id: "shader-foundry",
    title: { zh: "Shader Foundry 着色器工坊", en: "Shader Foundry" },
    eyebrow: { zh: "未来项目 / 规划中", en: "FUTURE PROJECT / PLANNED" },
    description: {
      zh: "从 UV、uniform 到完整棱镜材质，建立可观察的 GPU 学习实验室。",
      en: "A visible GPU laboratory from UVs and uniforms to a complete prism material.",
    },
    category: { zh: "实时图形", en: "Real-time Graphics" },
    difficulty: { zh: "进阶", en: "Advanced" },
    estimatedHours: 10,
    totalLessons: 14,
    status: "coming-soon",
    launchUrl: "",
    accent: "#ff9bd5",
    accentSecondary: "#866dff",
    glyph: "SF",
  },
] as const satisfies readonly LearningCourse[];

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
