-- 榫 Tenon · 数据库结构
-- 分两层：资产层（跨书共享，只读为主）与项目层（每本书自包含）
-- 对应两个来源框架：小说创作引擎（资产/构建层）+ AI 创作委员会（生产/状态层）

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ════════════════════════════════════════════════════════════════
-- 资产层 · 跨书共享的引擎库存
-- ════════════════════════════════════════════════════════════════

-- 14 种核心资源的五要素
CREATE TABLE IF NOT EXISTS resources (
  name    TEXT PRIMARY KEY,
  origin  TEXT,  -- 产生源头
  path    TEXT,  -- 流动路径
  sink    TEXT,  -- 沉淀形态
  black   TEXT,  -- 黑市形态
  analogy TEXT   -- 世界观类比
);

-- 知识库卡片：技法 / 平台约束 / 检查清单 / 毒点红线（来自两个框架的方法论层）
CREATE TABLE IF NOT EXISTS craft_cards (
  id       TEXT PRIMARY KEY,
  kind     TEXT NOT NULL,   -- craft(技法) | platform(平台约束) | checklist(门禁清单) | role(委员会角色) | principle(原则)
  category TEXT NOT NULL,
  title    TEXT NOT NULL,
  summary  TEXT,
  body     TEXT NOT NULL,   -- markdown
  ord      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_craft_kind ON craft_cards(kind);

-- ════════════════════════════════════════════════════════════════
-- 项目层 · 每本书自包含
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS projects (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  venue      TEXT NOT NULL DEFAULT 'fanqie-m', -- 发布阵地 id（= 运营商 × 频道）。真相源
  platform   TEXT NOT NULL DEFAULT '番茄',   -- 运营商名，由 venue 派生，仅供展示
  channel    TEXT NOT NULL DEFAULT '男频',   -- 频道，由 venue 派生，仅供展示
  genre      TEXT,                            -- 类型 id：决定走哪条路线
  logline    TEXT,                            -- 一句话卖点 High Concept
  status     TEXT NOT NULL DEFAULT '立项中',  -- 立项中/构建中/连载中/完结/冻结
  cover_note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 环节产出物：全部环节的通用存储（声明式 stage 引擎的落盘，环节表见 lib/stages.ts）
CREATE TABLE IF NOT EXISTS stage_states (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage_id   TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT '未开始',  -- 未开始/进行中/待门禁/已通过
  data       TEXT NOT NULL DEFAULT '{}',      -- json：该环节的字段产出
  gate       TEXT NOT NULL DEFAULT '{}',      -- json：门禁勾选状态 {itemId: bool}
  updated_at TEXT NOT NULL,
  PRIMARY KEY (project_id, stage_id)
);

-- 人物档案（ID 规范 C-xxx）
-- cid / fid / vid 的编号由 repo.ts 的 nextSeq() 保证（现存最大序号 +1，不是 COUNT+1）。
-- 这里没有下 UNIQUE 约束：本文件在每次开库时 exec，若历史库里已存在重复编号，
-- 建唯一索引会直接让应用起不来；而自动重编号会破坏 chapters.plant/harvest 里的文本引用。
CREATE TABLE IF NOT EXISTS characters (
  id             TEXT PRIMARY KEY,
  project_id     TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  cid            TEXT NOT NULL,          -- C-001
  name           TEXT NOT NULL,
  aliases        TEXT NOT NULL DEFAULT '[]',
  role           TEXT NOT NULL DEFAULT '配角',  -- 主角/核心配角/反派/路人脸
  stance         TEXT,                   -- 主角与压着他的那套结构的关系：局外人/内行人/执行者
  faction        TEXT,
  motive_surface TEXT,                   -- 表层动机（小、具体）
  motive_deep    TEXT,                   -- 深层动机（中期觉醒）
  attitude       TEXT,                   -- 对规则的态度：敬畏/戏耍/憎恨/利用
  desire         TEXT,                   -- 配角三件套：他要什么
  weakness       TEXT,                   -- 他怕什么
  resource_rel   TEXT,                   -- 与主角的资源关系
  secrets        TEXT,                   -- 知道什么秘密（一致性闸的关键字段）
  status         TEXT NOT NULL DEFAULT '活跃',
  face_rank      INTEGER,                -- 打脸链级别（第几张脸）
  first_ch       TEXT,
  last_ch        TEXT,
  tic            TEXT,                   -- 口癖
  notes          TEXT,
  updated_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_char_project ON characters(project_id);

-- 伏笔 / 悬念账本（ID 规范 FS-xxx + 状态机）
CREATE TABLE IF NOT EXISTS threads (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  fid         TEXT NOT NULL,             -- FS-001
  content     TEXT NOT NULL,             -- 悬念内容
  clue        TEXT,                      -- 读者可见线索
  truth       TEXT,                      -- 真相
  level       TEXT NOT NULL DEFAULT '章级', -- 章级(70%)/卷级(25%)/书级(1-3个)
  planted_ch  INTEGER,                   -- 埋设章
  plan_ch     INTEGER,                   -- 计划回收章
  actual_ch   INTEGER,                   -- 实际回收章
  reinforced  TEXT NOT NULL DEFAULT '[]',-- json: 强化章号列表
  status      TEXT NOT NULL DEFAULT '已埋设', -- 已埋设/已强化/已回收/已废弃
  discard_why TEXT,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_thread_project ON threads(project_id);

-- 卷结构
CREATE TABLE IF NOT EXISTS volumes (
  id           TEXT PRIMARY KEY,
  project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  vid          TEXT NOT NULL,       -- V-01
  no           INTEGER NOT NULL,
  title        TEXT NOT NULL,
  goal         TEXT,                -- 单卷目标
  conflict     TEXT,                -- 核心冲突
  climax       TEXT,                -- 卷末大高潮
  reveal_layer TEXT,                -- 四层揭露：L1表层/L2隐藏结构/L3管理员/L4元规则
  power_track  TEXT,                -- 力量三轨：第一轨/第二轨/第三轨
  updated_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_vol_project ON volumes(project_id);

-- 章节：事件线 → brief → 正文 → 门禁 → 回写，全生命周期一行
CREATE TABLE IF NOT EXISTS chapters (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  volume_id   TEXT REFERENCES volumes(id) ON DELETE SET NULL,
  no          INTEGER NOT NULL,          -- 全书连号
  title       TEXT,
  -- 事件线粒度（09 故事引擎产出）
  event       TEXT,                      -- 本章事件：谁做了什么、导致什么
  beat        TEXT NOT NULL DEFAULT '微爽', -- 微爽/中爽/大爽/蓄能/过渡
  -- 章 brief（10 章节工程产出，人写的 5 行）
  scene       TEXT,
  cast        TEXT NOT NULL DEFAULT '[]',-- json: 人物 ID
  core_event  TEXT,
  twist       TEXT,                      -- 一次小反转
  hook_type   TEXT,                      -- 危机钩/悬念钩/期待钩/反转钩
  hook_text   TEXT,
  -- 产出
  body        TEXT,
  words       INTEGER NOT NULL DEFAULT 0,
  summary     TEXT,                      -- 给未来的 150 字摘要（L3 记忆）
  info_gain   TEXT,                      -- 本章信息增量（水章判据）
  plant       TEXT NOT NULL DEFAULT '[]',-- json: 埋设伏笔 FS-xxx
  harvest     TEXT NOT NULL DEFAULT '[]',-- json: 回收伏笔 FS-xxx
  status      TEXT NOT NULL DEFAULT '待规划', -- 待规划/已规划/已生成/审校中/已通过/已发布
  gate        TEXT NOT NULL DEFAULT '{}',-- json: 三闸门禁勾选
  review      TEXT,                      -- json: 审稿人问题列表
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ch_project ON chapters(project_id, no);

-- 发布后数据（12 数据迭代）
CREATE TABLE IF NOT EXISTS metrics (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  chapter_no INTEGER NOT NULL,
  date       TEXT NOT NULL,
  finish     REAL,   -- 完读率
  follow     REAL,   -- 追读率
  drop_off   REAL,   -- 章末流失
  stay       REAL,   -- 停留时长（分钟）
  shelf      REAL,   -- 加书架率 / 收藏转化
  sub_first  REAL,   -- 起点首订率
  sub_ratio  REAL,   -- 追订/均订比
  note       TEXT
);
CREATE INDEX IF NOT EXISTS idx_metrics_project ON metrics(project_id, chapter_no);

-- 决策留痕（委员会高风险决策流程：先例检索 + 证据分级 + 签字）
CREATE TABLE IF NOT EXISTS decisions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  ts         TEXT NOT NULL,
  kind       TEXT NOT NULL,   -- 回改已发布/推翻裁决/改共享引擎/动锁定项/常规
  motion     TEXT NOT NULL,   -- 动议
  evidence   TEXT NOT NULL,   -- 作者裁决/真实平台数据/既有仲裁先例/编辑清单命中/模拟角色观察
  precedent  TEXT,            -- 检索到的先例原文
  ruling     TEXT,            -- 结论
  signed     INTEGER NOT NULL DEFAULT 0,
  locked     INTEGER NOT NULL DEFAULT 0   -- 是否进入「禁止修改事项」
);

-- 锁定项（禁止修改事项）
CREATE TABLE IF NOT EXISTS locks (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  item       TEXT NOT NULL,
  reason     TEXT,
  since_ch   INTEGER,
  ts         TEXT NOT NULL
);

-- AI 运行留痕（流水线的每一次调用）
CREATE TABLE IF NOT EXISTS ai_runs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT,
  stage_id   TEXT,
  role       TEXT NOT NULL,   -- 架构师/写手/审稿人/修订师/记录员/推演/评审...
  provider   TEXT NOT NULL,
  model      TEXT,
  prompt     TEXT NOT NULL,
  output     TEXT,
  ok         INTEGER NOT NULL DEFAULT 1,
  ms         INTEGER,
  ts         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_airuns_project ON ai_runs(project_id, ts);

-- 全局设置（AI 后端切换等）
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
