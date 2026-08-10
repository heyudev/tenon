/**
 * 自主续写的契约层：选项、默认值、事件类型。
 * 纯数据，**不许引 repo** —— 客户端组件要 import 这个文件，
 * 引了 repo 就会把 better-sqlite3 拖进浏览器包里。引擎在 autopilot.ts。
 */

export interface AutopilotOpts {
  /** 本次最多写几章。预算，不是目标——到了就停，人看过再续 */
  maxChapters: number
  /** 每章最多返修几轮。审稿人判通过就提前结束 */
  maxRevisions: number
  /** 覆盖已经有正文的章。默认关——不碰作者已经写过的地盘 */
  overwrite: boolean
  /** 记录员的摘要自动落库。关掉的话只生成不写入，留给人确认 */
  autoSummary: boolean
  /** 返修用尽仍有门禁项不过就停下 */
  stopOnGateFail: boolean
  /** 读者模型判「弃书」就停下 */
  stopOnReaderDrop: boolean
}

export const DEFAULT_OPTS: AutopilotOpts = {
  maxChapters: 5,
  maxRevisions: 2,
  overwrite: false,
  autoSummary: true,
  stopOnGateFail: true,
  stopOnReaderDrop: true,
}

export type AutopilotEvent =
  | { t: 'blocked'; reasons: string[] }
  | { t: 'start'; pending: number; budget: number; provider: string; model: string }
  | { t: 'chapter'; no: number; title: string }
  | { t: 'role'; no: number; role: string; ms: number; chars: number }
  | { t: 'verdict'; no: number; role: string; verdict: string }
  | { t: 'gate'; no: number; passed: number; total: number; failed: string[] }
  | { t: 'wrote'; no: number; field: string; chars: number }
  | { t: 'pause'; no: number; reason: string }
  | { t: 'done'; wrote: number; reason: string; complete: boolean }
  | { t: 'error'; no: number | null; msg: string }
