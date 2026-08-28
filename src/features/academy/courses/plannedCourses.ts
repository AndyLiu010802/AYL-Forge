import { COURSE_PROTOCOL_VERSION, type LearningCourse } from "../academy.types";

/** Planned manifests deliberately have no trust origins until a course is live. */
export const MOTION_SYSTEMS_COURSE = {
  id: "motion-systems",
  protocolVersion: COURSE_PROTOCOL_VERSION,
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
  launchUrls: { zh: "", en: "" },
  allowedOrigins: [],
  maxXp: 0,
  allowedRewardIds: [],
  featured: false,
  layoutHint: "standard",
  accent: "#d7f57c",
  accentSecondary: "#78baff",
  glyph: "MS",
} as const satisfies LearningCourse;

export const SHADER_FOUNDRY_COURSE = {
  id: "shader-foundry",
  protocolVersion: COURSE_PROTOCOL_VERSION,
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
  launchUrls: { zh: "", en: "" },
  allowedOrigins: [],
  maxXp: 0,
  allowedRewardIds: [],
  featured: false,
  layoutHint: "compact",
  accent: "#ff9bd5",
  accentSecondary: "#866dff",
  glyph: "SF",
} as const satisfies LearningCourse;
