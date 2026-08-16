# 榫 Tenon · 仓库约定

AI 小说创作系统。Next.js 15 (App Router) + TypeScript + Tailwind v4 + better-sqlite3。
交流用中文；代码里的标识符、注释、commit 用英文以外的既有风格——本仓库注释是中文，跟随即可。

## ⛔ 正文边界（最高优先级）

**不要读、不要分析、不要引用任何一章的小说正文。** 作者只授权到大纲层：
卷纲、事件线、章标题、给未来的摘要、伏笔账本、人物档案、门禁与数据——这些可以读、可以分析。
`chapters.body` 是作者的地盘，系统给它留了位置，由作者自己填。

- 做需求时不要为了"理解这本书"去翻正文文件或 `body` 字段。
- 提取器默认不搬正文（`--with-body` 是作者显式的选择，不是默认路径）。
- 应用内的 AI 角色（写手/审稿人/读者模型）当然要读 `body`——那是**系统替作者跑**，与上面这条无关。

## 命令

```bash
npm run dev          # 开发（固定 3100，避开常被占用的 3000）
npm run seed         # 重建资产层（方法论卡片 + 核心资源参考；不碰任何项目数据）
npm run import -- "<目录>" [--dry]   # 从一个 markdown 小说项目提取成一本书
npm run typecheck    # tsc --noEmit
npm run build        # 生产构建
```

⚠ **不要在 dev server 跑着的时候执行 `npm run build`** —— 会覆盖 `.next`，导致 dev 报
`__webpack_modules__[moduleId] is not a function`。先停 dev，或构建后重启 dev。

## 结构

```
src/lib/
  schema.sql     数据库结构：资产层（跨书共享）+ 项目层（每本书自包含）
  stages.ts      ★ 系统脊柱：46 个环节的声明式定义（字段/门禁/方法论/AI 动作）。纯数据，客户端服务端共用
  checks.ts      门禁的可判定项：从库里算，三态（过/不过/数据不足）。gate-ctx.ts 是它的装配入口
  platform.ts    阵地全景（运营商 × 频道）；genre.ts 类型与频道契约；route.ts 按阵地×类型裁剪必经环节
  repo.ts        数据访问，服务端专用（引它的文件不能是 'use client'）
  actions.ts     server actions
  export.ts      导出成 markdown
  ai/
    provider.ts  三个后端：claude-cli / codex-cli / anthropic-api
    memory.ts    分层记忆 L0–L4 装配
    prompts.ts   角色系统提示词 + 每个环节/流水线角色的提示词构造
src/app/
  (hub)/         资产层页面：方法论库 / 阵地库 / 术语表 / 系统全貌 / 设置
  p/[id]/        项目工作区：总览 / s/[stage] 环节 / write 日更台
  api/ai         SSE 流式 AI 调用；api/export 导出
src/components/
  ui.tsx         设计原语；md.tsx 零依赖 markdown；stage/ 环节骨架与字段渲染
scripts/
  seed.mjs       资产层导入（只读 seed/assets.json）
  craft.mjs      方法论卡片：43 张（craft-extend.mjs 另有 16 张，合计 59，seed 时两份一起入库）
  import.mjs     从一个 markdown 小说项目目录提取成一本书
seed/
  assets.json    资产层种子：核心资源五要素。系统自有 schema
archive/
  rule-engine-snapshot.json   规则引擎退役前的快照（400 规则 / 105 因果边）。留底用，seed 不读它
```

## 加环节 / 改环节

改 `src/lib/stages.ts` 即可——新增 `Stage` 会自动出现在左轨、管线丝带、门禁盘、导出物里。
需要专属视图时给 `view` 一个新值，然后在 `src/app/p/[id]/s/[stage]/page.tsx` 的 switch 里接上，
视图组件放 `views/` 并复用 `StageFrame`（它统一管门禁、AI 面板、方法论抽屉）。
提示词写在 `src/lib/ai/prompts.ts` 的 `buildStagePrompt` switch 里，key 是 `环节id/动作id`。

## 样式

风格是**宋版书 × 控制台**：宣纸 / 墨的底 + 朱砂唯一强调色 + 宋体标题。
不往通用 SaaS（圆角卡片 + 彩色渐变）走，也不往温暖亲和 / 二次元暗黑走。

- **字号只有五档**：11 micro · 12 meta · 14 body · 18 title · 26 display。
  首页 hero 的 28/32/40 是例外。**要拉层级用字重 / 字色 / 间距，不要再切一档字号**——
  之前失控到 26 个档位、477 处 `text-[10.5px]` 这类值，正文小到看不清。
- **页面主标题加 `.display` 类**（globals.css 里，宋体 + 500 字重）。
- **自定义类一律写在 `@layer components` 里**。Tailwind v4 的工具类在 `@layer utilities`，
  优先级**低于**未分层的 CSS——`.field { width: 100% }` 写在层外会把 `w-[170px]` 这类全部压掉。
- **控件定高至少 `h-8`**。`.field` 纵向内边距 4px + 行高 1.5 = 内容 29px，
  `h-7`（可用 26px）装不下 14px 的字，会把字裁掉一截。
- **朱砂用块面不用描边**：`Chip tone="accent"`、门禁硬项这类是实心填充配 `--on-accent`；
  发丝线级别的朱砂在满屏 1px 边框里根本看不见。
- 底纹走 `--grain`（内联 SVG feTurbulence），深浅两套各一份，挂在 `body` 上。

**版框（方角，不用圆角卡片）**

- 顶层内容块用 `.frame` —— 文武边：外一道粗线、内一道细线、中间留一线白。
- 块内子卡用 `.frame-thin`（只有外面那一道）。**不要双线套双线**。
- 圆角只剩两档：控件 `rounded-[2px]`，圆点 / 刻度条 `rounded-full`。别再引入 `rounded-lg` 这类。
- 分栏竖线用 `.rules-2` / `.rules-3`（按列数选）。网格里不能用 `* + *` 加边框——
  那会给每行第一列也画上。

**两条语法各管一摊，别混**

- **版框 = 纸面**（页框、界栏、宋体、纸纹）：管「这是一页雕版书」
- **榫卯 = 结构**（形状 + 动效）：管「两个东西怎么咬在一起、什么时候算到位」

`<Tenon seated>` 在 `ui.tsx`：未过是一个开着口的卯，过了才有榫**滑进去**填实。
用在门禁勾选项（`Check`）、「最小可动笔集合」（左轨 + 环节页顶栏）上。
**只表示「完成 / 咬合」，别拿去当装饰**；logo 的 `Mark` 是同一套形。

**动效：全站只有「入榫」一种**

榫卯是刚体——**不淡入、不缩放、不回弹**，只有沿一根轴推进去、到位硬停。

- `--ease-seat`（推进到位）和 `--ease-part`（拔出）是仅有的两条曲线，
  `--ease-out-soft` 已删。装和拆不是同一条曲线。
- 入场统一用 `.seat`（默认从左）／`.seat-r`（右侧栏往左坐进去）／`.seat-y`（自上而下）。
  **不要再写 `fade`**——透明度只在前 40% 帮一把，观感必须来自位移。
- 时长：小构件 0.18–0.26s，面板 0.28s，条状推进 0.3–0.32s。**不要 500ms 以上**。
- 选中态是「坐进槽里」不是「浮起来」：`Segmented` 的滑块用 `inset` 描边，不用投影。
- `prefers-reduced-motion` 下全局把 transition 压到 0.01ms，别单独再写一份。

**两栏页的骨架**（方法论库 / 阵地库 / 术语表都是这个形）

```
<div className="flex h-full flex-col">            ← 不要 h-dvh，外层 main 已经定高
  <header className="flex-none …">               ← 标题行要 flex-wrap，否则窄屏中文标题会竖排
  <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
    <主区 className="min-h-[55vh] … lg:min-h-0">   ← 窄屏堆叠时主区要给实高
    <aside className="w-full … lg:w-[360px] lg:border-l lg:border-t-0">
```

侧栏用 `<SideShell>`（`components/shell/`）：宽屏常驻，窄屏收成抽屉，跳转后自动收起。
**不要再写死宽度并排 + `h-dvh`**——手机上主区会被挤没。

**可达性（新增交互时照做）**

- 可点的东西必须是 `<button>` / `<a>`。**不许在 `<button>` 里塞 `onClick` 的 `<span>`**——
  非法嵌套且键盘到不了。要两个动作就并列两个按钮。
- SVG 里的可点元素：`role="button" tabIndex={0}` + `onKeyDown` 收 Enter/Space + `aria-label`。
- 纯图标按钮补 `aria-label`（`title` 不算，读屏不一定念）。
- 只靠颜色区分的量表不合格 —— 两把尺子做成了不同形状：
  `<Ticks>` 是递增阶梯（潜力＝天花板），`<Rung>` 是推平的实条（可写＝地板）。
- 焦点环在 globals.css 的 `:focus-visible`，别各自再写。

## 硬约束（改代码时不要破坏）

1. **AI 产出不自动落库（默认路径）。** 一律经 `AiOutput` 的「采纳」按钮由人确认——状态库写错一次，
   错误会被后续生成当事实延续。
   **唯一例外是「自主续写」**（`lib/ai/autopilot.ts`，日更台左栏切「自主」）：作者显式开启后
   引擎直接落库。它靠三件事兜底，改这块时不要拆掉——
   开跑前查最小可动笔集合与章节骨架、每章跑 `g4-gate` 的自动判据当刹车、
   全部调用写 `ai_runs` 且 role 带 `auto/` 前缀可审计。
   客户端要用的类型和默认值放 `autopilot-types.ts`（不许引 repo）。
2. **门禁的硬项（`hard: true`）不可绕过。** `gateProgress` 的 `passed` 必须全勾才为 true。
3. **正文不回读。** `memory.ts` 的 L3 只取近 3 章**摘要**，不要改成读正文原文。
4. **provider 的 CLI 分支必须走 `cliEnv()`**，它会摘掉父进程里可能存在的、属于别的 agent 会话的
   鉴权变量；直接透传 `process.env` 会让 CLI 401。
5. **提取器宁可少导也不猜。** 解析不出来的字段留空并在报告里说明，不要用启发式往真相源里灌内容。
6. **系统自立。** 不许出现指向仓库外的路径、默认目录或运行时读取；不许把别处的文档整段搬进
   `craft.mjs`——那一层只放提取出来的可执行判据（阈值 / 判据 / 决策流程 / 失效模式）。
   写不成判据的内容不进系统。

## 数据

`data/tenon.db`（gitignore）。资产层用 `npm run seed` 幂等重建，种子在 `seed/assets.json`；
项目层是用户数据，只由应用与 `import.mjs` 写入。
`npm run seed` 只覆盖资产层两张表（`resources` / `craft_cards`），不碰任何项目数据。
