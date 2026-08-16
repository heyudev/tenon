import type { OperatorId } from './platform'

// ── 资产层 ──────────────────────────────────────────────

export interface Resource {
  name: string
  origin: string
  path: string
  sink: string
  black: string
  analogy: string
}

export interface CraftCard {
  id: string
  kind: 'craft' | 'platform' | 'checklist' | 'role' | 'principle'
  category: string
  title: string
  summary: string | null
  body: string
  ord: number
}

// ── 项目层 ──────────────────────────────────────────────

/**
 * 运营商 id。这是**展示字段**，由 venue 派生。
 * 别拿它做逻辑判断——阵地参数（字数区间、爽点红线、健康线）一律从 VENUE_MAP[venue] 取，
 * 否则同一运营商下的男频女频、或第三家平台，会被硬编码的二值判断算错。
 */
export type Platform = OperatorId

export interface Project {
  id: string
  title: string
  /** 发布阵地 id（= 运营商 × 频道）。这是真相源 */
  venue: string
  /** 由 venue 派生，仅供展示 */
  platform: Platform
  /** 男频 / 女频：读者契约 */
  channel: string
  /** 类型 id：决定这本书走哪条路线 */
  genre: string | null
  logline: string | null
  status: string
  cover_note: string | null
  created_at: string
  updated_at: string
}

export type StageStatus = '未开始' | '进行中' | '待门禁' | '已通过'

export interface StageState {
  project_id: string
  stage_id: string
  status: StageStatus
  data: Record<string, unknown>
  gate: Record<string, boolean>
  updated_at: string
}

export interface Character {
  id: string
  project_id: string
  cid: string
  name: string
  aliases: string[]
  role: string
  stance: string | null
  faction: string | null
  motive_surface: string | null
  motive_deep: string | null
  attitude: string | null
  desire: string | null
  weakness: string | null
  resource_rel: string | null
  secrets: string | null
  status: string
  face_rank: number | null
  first_ch: string | null
  last_ch: string | null
  tic: string | null
  notes: string | null
  updated_at: string
}

export type ThreadStatus = '已埋设' | '已强化' | '已回收' | '已废弃'
export type ThreadLevel = '章级' | '卷级' | '书级'

export interface Thread {
  id: string
  project_id: string
  fid: string
  content: string
  clue: string | null
  truth: string | null
  level: ThreadLevel
  planted_ch: number | null
  plan_ch: number | null
  actual_ch: number | null
  reinforced: number[]
  status: ThreadStatus
  discard_why: string | null
  updated_at: string
}

export interface Volume {
  id: string
  project_id: string
  vid: string
  no: number
  title: string
  goal: string | null
  conflict: string | null
  climax: string | null
  reveal_layer: string | null
  power_track: string | null
  updated_at: string
}

export type Beat = '蓄能' | '过渡' | '微爽' | '中爽' | '大爽'
export type HookType = '危机钩' | '悬念钩' | '期待钩' | '反转钩'

export interface Chapter {
  id: string
  project_id: string
  volume_id: string | null
  no: number
  title: string | null
  event: string | null
  beat: Beat
  scene: string | null
  cast: string[]
  core_event: string | null
  twist: string | null
  hook_type: HookType | null
  hook_text: string | null
  body: string | null
  words: number
  summary: string | null
  info_gain: string | null
  plant: string[]
  harvest: string[]
  status: string
  gate: Record<string, boolean>
  review: string | null
  updated_at: string
}

export interface Metric {
  id: number
  project_id: string
  chapter_no: number
  date: string
  finish: number | null
  follow: number | null
  drop_off: number | null
  stay: number | null
  shelf: number | null
  sub_first: number | null
  sub_ratio: number | null
  note: string | null
}

export interface Decision {
  id: number
  project_id: string
  ts: string
  kind: string
  motion: string
  evidence: string
  precedent: string | null
  ruling: string | null
  signed: number
  locked: number
}

export interface AiRun {
  id: number
  project_id: string | null
  stage_id: string | null
  role: string
  provider: string
  model: string | null
  prompt: string
  output: string | null
  ok: number
  ms: number | null
  ts: string
}
