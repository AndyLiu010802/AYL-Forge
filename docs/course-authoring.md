# AYL Forge Course Contract v2：课程作者接入指南

这份指南面向第一次接触前端的新课程作者。目标不是让课程“看起来能打开”，而是让它能被 AYL Forge 安全地嵌入、切换中英文，并把学习进度可靠地同步回平台。

英文关键词会保留在括号里，方便你搜索文档：课程清单（manifest）、内嵌页面（iframe）、内容安全策略（Content Security Policy / CSP）、跨窗口消息（`postMessage`）、来源域（origin）。

## 先理解两边分别做什么

```text
AYL Forge（父页面 / parent）
  ├─ 读取课程 manifest 并显示课程卡片
  ├─ 用 iframe 打开课程的中文或英文 URL
  ├─ 发出“请给我当前进度”的请求
  └─ 验证并保存课程返回的进度
                ↕ postMessage（只发给明确的 origin）
课程网站（子页面 / child）
  ├─ 自己显示课程、关卡和代码
  ├─ 自己保存当前课程的完成状态
  ├─ 收到请求后返回进度
  └─ 每次完成关卡时主动返回新进度
```

课程仍然是一个可以独立部署、独立打开的网站。AYL Forge 不读取课程的 DOM，也不会替课程保存内部表单；双方只交换本指南定义的两种消息。

## 第 1 步：准备 Course Contract v2 manifest

manifest 是一张“课程身份证”。先在课程仓库中创建一个容易找到的文件，例如 `src/course/ayl-forge.manifest.ts`：

```ts
export const aylForgeCourseManifest = {
  protocolVersion: 2,
  id: "webgl-starter",
  title: {
    zh: "WebGL 入门实验室",
    en: "WebGL Starter Lab",
  },
  eyebrow: {
    zh: "完整项目课程 / 12 关",
    en: "FULL PROJECT COURSE / 12 LEVELS",
  },
  description: {
    zh: "从空画布开始制作一个可交互的 WebGL 场景。",
    en: "Build an interactive WebGL scene from an empty canvas.",
  },
  category: { zh: "实时图形", en: "Real-time Graphics" },
  difficulty: { zh: "零基础", en: "Beginner" },
  estimatedHours: 8,
  totalLessons: 12,
  status: "available",
  launchUrls: {
    zh: "https://course.example.com/build-guide/",
    en: "https://course.example.com/build-guide/en/",
  },
  allowedOrigins: ["https://course.example.com"],
  maxXp: 1200,
  allowedRewardIds: ["first-scene", "input-ready", "webgl-graduate"],
  featured: false,
  layoutHint: "standard",
  accent: "#7de6da",
  accentSecondary: "#c49bff",
  glyph: "WS",
} as const;
```

逐项检查：

| 字段 | 作用 | 规则 |
| --- | --- | --- |
| `protocolVersion` | 告诉平台消息协议版本 | v2 必须是数字 `2` |
| `id` | 平台、课程和进度共同使用的唯一 ID | 小写字母、数字和连字符；发布后不要改 |
| `title` 等双语字段 | 课程卡片的中文和英文内容 | `zh`、`en` 都必须有值 |
| `totalLessons` | 合法关卡编号的上限 | 12 关对应编号 `0` 到 `11` |
| `launchUrls.zh` | 中文入口 | 可直接打开并返回 HTTP 200 |
| `launchUrls.en` | 英文入口 | 不要只翻译导航，完整课程内容都应为英文 |
| `allowedOrigins` | 平台允许接收课程消息的来源 | 必须是由双语 URL 得出的规范 origin，不能含路径 |
| `maxXp` | 平台愿意接受的课程 XP 上限 | 非负安全整数；可用课程每关 XP 之和 |
| `allowedRewardIds` | 平台愿意接受的奖励 ID | 非空、无重复、与课程发出的 ID 完全一致 |
| `featured` | 是否作为平台重点课程展示 | 布尔值 `true` / `false` |
| `layoutHint` | 课程卡片布局建议 | `hero`、`standard` 或 `compact` |
| `status` | 是否能进入 | 完成接入后用 `available` |
| `accent` / `accentSecondary` | 平台课程卡片颜色 | 使用合法 CSS 颜色 |
| `glyph` | 课程卡片短标记 | 建议 2–3 个字符 |

当前课程注册由平台维护者审核后加入 registry；manifest 是作者与平台之间唯一的字段交接来源，不代表陌生网站可以自动注册进平台。`available` 课程必须同时提供两个入口、至少一个 `allowedOrigins`、大于零的 `maxXp` 和至少一个合法奖励 ID；尚未部署的 `coming-soon` 课程可以暂时留空 URL 与信任来源。

这里有两个方向相反的 allowlist，千万不要混淆：

```text
manifest.allowedOrigins   = AYL Forge 信任哪些“课程网站 origin”
adapter.platformOrigins   = 课程网站信任哪些“AYL Forge origin”
```

例如课程 URL 是 `https://course.example.com/build-guide/`，那么 manifest 写 `https://course.example.com`；平台 URL 是 `https://andy-ayl-forge.netlify.app/`，那么适配器写 `https://andy-ayl-forge.netlify.app`。

## 第 2 步：准备稳定的双语 URL（bilingual URLs）

推荐的路由结构是：

```text
https://course.example.com/build-guide/       # 中文
https://course.example.com/build-guide/en/    # English
```

两个 URL 都要满足：

1. 生产环境使用 HTTPS。
2. 刷新任意关卡不会返回 404。
3. 不要求先从首页点击才能访问。
4. 使用同一个 `courseId` 和同一套关卡编号。
5. 语言切换只改变语言，不清空进度。
6. URL 是课程入口，不是后台管理页、预览令牌或短期部署地址。

本地开发可以使用不同端口，例如平台是 `http://localhost:3000`，课程是 `http://localhost:3001/build-guide/`。不同端口就是不同的 origin，这正好能提前发现跨域接入问题。

## 第 3 步：允许 AYL Forge 使用 iframe 嵌入课程

浏览器是否允许嵌入由课程服务器的响应头决定。最重要的是 CSP 的 `frame-ancestors`：

```text
Content-Security-Policy: frame-ancestors https://andy-ayl-forge.netlify.app http://localhost:3000
```

这句话的意思是：“只有正式 AYL Forge 和本地开发平台可以把本课程放进 iframe”。把示例域名替换成真实平台 origin；origin 只包含协议、主机和端口，不包含 `/courses` 之类路径。

Netlify 可以在 `netlify.toml` 中设置：

```toml
[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "frame-ancestors https://andy-ayl-forge.netlify.app http://localhost:3000"
```

也可以使用静态站点的 `public/_headers`：

```text
/*
  Content-Security-Policy: frame-ancestors https://andy-ayl-forge.netlify.app http://localhost:3000
```

不要同时发送 `X-Frame-Options: DENY` 或 `X-Frame-Options: SAMEORIGIN`，它们会阻止跨域平台嵌入。旧式的 `ALLOW-FROM` 兼容性不足，不应替代 `frame-ancestors`。

AYL Forge 的播放器当前为课程 iframe 开放脚本、同源存储、表单和新标签页。如果课程需要相机、麦克风、剪贴板或其他浏览器权限，应在上线前单独说明；不要假设 iframe 默认拥有这些权限。

## 第 4 步：复制浏览器端适配器（browser adapter）

复制 [`course-adapter-template.ts`](../src/features/academy/course-adapter-template.ts) 到课程仓库，例如 `src/course/ayl-forge-adapter.ts`。它不是 AYL Forge 的服务端 SDK，而是运行在课程浏览器页面中的一个小型桥接器。

最小接法：

```ts
import { createAylForgeCourseAdapter } from "./ayl-forge-adapter";

const COURSE_PROGRESS_KEY = "webgl-starter-progress-v1";

function readProgress() {
  const fallback = { completed: [], xp: 0, rewards: [] };
  try {
    return JSON.parse(localStorage.getItem(COURSE_PROGRESS_KEY) ?? "null") ?? fallback;
  } catch {
    return fallback;
  }
}

export const aylForgeAdapter = createAylForgeCourseAdapter({
  courseId: "webgl-starter",
  platformOrigins: [
    "https://andy-ayl-forge.netlify.app",
    ...(location.hostname === "localhost" ? ["http://localhost:3000"] : []),
  ],
  getProgress: readProgress,
  subscribe(notify) {
    window.addEventListener("webgl-course-progress", notify);
    return () => window.removeEventListener("webgl-course-progress", notify);
  },
});
```

当用户完成一关时，课程先保存自己的状态，再通知适配器：

```ts
localStorage.setItem(COURSE_PROGRESS_KEY, JSON.stringify(nextProgress));
window.dispatchEvent(new Event("webgl-course-progress"));
```

如果你的状态管理库已经有 `subscribe`，直接把它传给适配器即可。课程卸载桥接器时调用 `aylForgeAdapter.destroy()`。

## 第 5 步：理解两种 postMessage 消息

### AYL Forge → 课程：请求当前进度

```ts
{
  type: "AYL_FORGE_REQUEST_PROGRESS",
  protocolVersion: 2,
  courseId: "webgl-starter",
}
```

平台会在 iframe 加载完成后发送它。课程必须同时检查：

- `protocolVersion === 2`
- `courseId` 等于自己的 ID
- `event.origin` 在明确的 AYL Forge allowlist 中
- `event.source === window.parent`

### 课程 → AYL Forge：返回完整进度快照

```ts
{
  type: "AYL_FORGE_COURSE_PROGRESS",
  protocolVersion: 2,
  courseId: "webgl-starter",
  progress: {
    completed: [0, 1, 2],
    xp: 120,
    rewards: ["first-scene", "input-ready"],
  },
}
```

字段含义：

- `completed`：已完成关卡的零基整数数组；不要发送百分比。
- `xp`：这门课程累计获得的 XP，不是本次增加值。
- `rewards`：课程内已获得奖励 ID；ID 发布后应保持稳定。

每次都发送完整快照（snapshot），而不是“加 20 XP”这样的增量事件。这样刷新、重复消息和网络延迟不会重复发奖。平台仍会校验、去重并限制关卡范围，课程端也应保持数据干净。

## 第 6 步：origin 安全为什么不能省略

`origin` 是 `https://host:port` 这部分。它不等于完整 URL：

```text
完整 URL: https://academy.example.com/courses/1
origin:   https://academy.example.com
```

发送消息时，`targetOrigin` 必须是明确的 AYL Forge origin。禁止使用通配目标，因为课程进度、奖励和学习记录不应被任意父页面接收。

接收消息时只检查 `event.data.type` 也不够：任何页面都能构造同名消息。必须再检查 `event.origin`、`event.source`、`courseId` 和 `protocolVersion`。模板已经执行这些检查，不要在复制后删掉。

适配器优先从可信 `document.referrer` 找到父页面 origin；如果 referrer 不可用，它会等待 AYL Forge 的合法请求消息完成握手。确认后的 origin 会保存在本标签页的 `sessionStorage`，用于课程内部跳转后的继续同步。

## 第 7 步：测试（testing）

### 7.1 先测试普通页面

分别直接打开中文和英文 URL，检查刷新、前进后退、完成关卡和本地存储。先保证课程自己正常，再测试 iframe。

### 7.2 用两个本地端口测试真实跨域

```text
AYL Forge: http://localhost:3000
课程站点:  http://localhost:3001
```

不要把两者都代理成同一个 origin；那样会掩盖 CSP 和消息来源错误。

### 7.3 在浏览器 DevTools 检查

1. 打开 AYL Forge，进入课程。
2. Console 不应出现 `Refused to frame`、CSP 或跨源错误。
3. Network 中课程入口返回 200。
4. 完成一关，平台课程卡片的完成数和 XP 更新。
5. 关闭课程再打开，平台会请求并恢复最新快照。
6. 切换英文，进入英文 URL，进度仍是同一份。

### 7.4 做三个负面安全测试

1. 从不在 allowlist 的测试父页面嵌入课程：不应向它发送进度。
2. 在课程 DevTools 手工派发错误 `courseId`：适配器应忽略。
3. 发送 `protocolVersion: 1` 或缺少版本：v2 适配器应忽略。

建议为课程自己的进度解析函数增加单元测试（unit tests）：非法 JSON、重复关卡、负 XP、越界关卡和重复奖励都应得到可预测结果。

## 第 8 步：提交给 AYL Forge 的接入材料

向平台维护者提供：

1. manifest 文件或完整内容。
2. 生产环境中文 URL 和英文 URL。
3. 课程生产 origin。
4. 已加入 CSP `frame-ancestors` 的证明（响应头截图或命令输出）。
5. `totalLessons`、`maxXp`、XP 规则和 `allowedRewardIds` 清单。
6. 本地/预览/生产环境需要加入的 AYL Forge origins。
7. 已通过下面验收表的结果。

## 最终验收清单（acceptance checklist）

- [ ] manifest 的 `protocolVersion` 是 `2`。
- [ ] manifest、适配器和平台 registry 的 `courseId` 完全一致。
- [ ] `totalLessons` 与实际关卡数一致，编号从 `0` 开始。
- [ ] `allowedOrigins` 是双语课程 URL 的规范 origin，不包含路径。
- [ ] `maxXp` 与课程累计 XP 上限一致，奖励 ID 都在 `allowedRewardIds` 中。
- [ ] 中文、英文入口可直接访问并返回 200。
- [ ] 课程响应头允许正式 AYL Forge origin 使用 iframe。
- [ ] 没有 `DENY` / `SAMEORIGIN` 与 CSP 冲突。
- [ ] 请求和进度消息都包含 `protocolVersion: 2`。
- [ ] 进度消息发送完整快照，而不是增量。
- [ ] 发送使用明确的 `targetOrigin`，没有通配目标。
- [ ] 接收同时校验 `origin`、`source`、`courseId`、`protocolVersion`。
- [ ] 完成关卡后平台进度更新，重复发送不会重复累计 XP。
- [ ] 关闭再打开课程后能恢复进度。
- [ ] 中英文切换后仍使用同一份学习记录。
- [ ] 非 allowlist 父页面无法收到课程进度。

通过全部项目后，课程才应从 `coming-soon` 切换为 `available`。
