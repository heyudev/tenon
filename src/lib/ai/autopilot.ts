/**
 * 自主续写：让整个委员会不经人手把排定的章节写完。
 *
 * ⚠ 这是**显式开启的选项**，不是默认路径。它有意绕过「AI 产出不自动落库」那条硬约束——
 * 作者知情并选择承担代价。为了让代价可控，引擎做三件事：
 *
 *   1. **开跑前拦一道**：大纲没到能动笔的程度就不许开（最小可动笔集合 + 已排定章节）。
 *      没有骨架的自主续写只会高速产出废稿。
 *   2. **门禁当刹车**：每章写完跑一遍系统自动判据，过不去就返修；连续过不去就停下等人。
 *      这不是额外加的限制，是这本书自己的标准。
 *   3. **全程留痕**：每一次模型调用、每一次落库都写进 ai_runs，role 前缀 `auto/`，
 *      事后能查是谁写的、写了什么、当时的提示词是什么。
 *
 * 「写完了」有明确判据，不靠猜：**排定章节全部定稿 且 没有逾期未回收的伏笔**。
 * 两个条件都能从库里算出来。
 */

import { buildChapterPrompt, type PipelineRole } from './prompts'
import { currentModel, currentProvider, runAI, type ProviderId } from './provider'
import { aiRuns, chapters, projects, stageStore } from '../repo'
import { autosOf } from '../gate-ctx'
import { MIN_VIABLE, gateProgress, STAGE_MAP } from '../stages'
import type { Chapter } from '../types'
import type { AutopilotEvent, AutopilotOpts } from './autopilot-types'

export { DEFAULT_OPTS } from './autopilot-types'
export type { AutopilotEvent, AutopilotOpts } from './autopilot-types'

/* ── 裁决解析 ──────────────────────────────────
   自由文本里挖不出可靠的信号，所以让角色在末尾单独给一行结构化裁决。
   走 extra 参数注入，不动手动路径的提示词。 */

const REVIEW_VERDICT = '\n\n最后另起一行单独输出裁决，格式严格为：\n裁决：通过\n或\n裁决：返修'
const GATE_STAGE = 'g4-gate' // 审校门禁环节。写错 id 只会静默失效，别猜

const READER_VERDICT = '\n\n最后另起一行单独输出裁决，格式严格为：\n裁决：追更\n或\n裁决：观望\n或\n裁决：弃书'

function parseVerdict(text: string, allowed: string[]): string | null {
  // 从后往前找，末尾那条才是结论
  const lines = text.trimEnd().split('\n').reverse()
  for (const ln of lines.slice(0, 6)) {
    const m = ln.match(/裁决\s*[:：]\s*(\S+)/)
    if (m && allowed.includes(m[1])) return m[1]
  }
  return null
}

/** 把结构化裁决那几行从正文里摘掉，别写进书里 */
function stripVerdict(text: string): string {
  return text.replace(/\n*裁决\s*[:：]\s*\S+\s*$/, '').trimEnd()
}

/* ── 前置检查 ────────────────────────────────── */

export function preflight(projectId: string): { ok: boolean; reasons: string[]; pending: Chapter[] } {
  const reasons: string[] = []
  const p = projects.get(projectId)
  if (!p) return { ok: false, reasons: ['作品不存在'], pending: [] }

  // 1. 最小可动笔集合必须齐 —— 没有卖点/主角/视角/文风就自主开写，等于高速产废稿
  const states = stageStore.all(projectId)
  const autos = autosOf(projectId)
  const missing = MIN_VIABLE.filter((s) => {
    const g = gateProgress(s, states[s.id]?.gate ?? {}, autos)
    return !g.passed
  })
  if (missing.length)
    reasons.push(
      `最小可动笔集合还差 ${missing.length} 项：${missing.map((s) => s.title).join('、')}`,
    )

  // 2. 得有排定好的章节骨架 —— 自主续写只填正文，不负责无中生有地编事件线
  const all = chapters.list(projectId)
  if (!all.length) reasons.push('还没有排定任何章节。先在「事件线与爽点排期」把章排出来')
  const pending = all.filter((c) => c.event || c.core_event || c.title)
  if (all.length && !pending.length)
    reasons.push('已排定的章都没有事件或标题，写手没有可依据的 brief')

  return { ok: reasons.length === 0, reasons, pending }
}

/** 全书是否已经写完：排定章节全部有正文 且 没有逾期未回收的伏笔 */
export function isComplete(projectId: string): { complete: boolean; detail: string } {
  const all = chapters.list(projectId)
  if (!all.length) return { complete: false, detail: '还没有排定章节' }
  const unwritten = all.filter((c) => !c.body?.trim())
  if (unwritten.length)
    return { complete: false, detail: `还有 ${unwritten.length} 章没有正文（最早：第 ${unwritten[0].no} 章）` }
  const overdue = autosOf(projectId)['threads-overdue']
  if (overdue && !overdue.pass) return { complete: false, detail: overdue.detail }
  return { complete: true, detail: '排定章节全部有正文，且没有逾期未回收的伏笔' }
}

/* ── 主循环 ──────────────────────────────────── */

export async function* autopilot(
  projectId: string,
  opts: AutopilotOpts,
  signal: AbortSignal,
  provider?: ProviderId,
): AsyncGenerator<AutopilotEvent> {
  const pre = preflight(projectId)
  if (!pre.ok) {
    yield { t: 'blocked', reasons: pre.reasons }
    return
  }

  const prov = provider ?? currentProvider()
  const model = currentModel(prov)

  /** 一次调用：跑模型 + 留痕 */
  const call = async (chapterId: string, role: PipelineRole, extra?: string) => {
    const s = buildChapterPrompt(projectId, chapterId, role, extra)
    const t0 = Date.now()
    let out = ''
    let ok = true
    try {
      const r = await runAI(s.prompt, { system: s.system, provider: prov, signal })
      out = r.text
    } catch (e) {
      ok = false
      out = (e as Error).message
      throw e
    } finally {
      aiRuns.log({
        project_id: projectId,
        role: `auto/${s.role}`, // 前缀标记：这一条是自主模式写的
        provider: prov,
        model,
        prompt: s.prompt,
        output: out,
        ok,
        ms: Date.now() - t0,
      })
    }
    return { text: out, ms: Date.now() - t0 }
  }

  // 本轮已经处理过的章。开了 overwrite 时"有没有正文"不再是筛选条件，
  // 光靠 todo()[0] 会永远取到同一章、把预算全烧在它身上——必须自己记游标。
  const seen = new Set<string>()

  const todo = () =>
    chapters
      .list(projectId)
      .filter(
        (c) =>
          (c.event || c.core_event || c.title) &&
          !seen.has(c.id) &&
          (opts.overwrite || !c.body?.trim()),
      )

  const pendingAll = todo()
  const budget = Math.min(opts.maxChapters, pendingAll.length)
  yield { t: 'start', pending: pendingAll.length, budget, provider: prov, model }

  let wrote = 0
  let stopReason = ''

  for (let i = 0; i < budget; i++) {
    if (signal.aborted) {
      stopReason = '被手动叫停'
      break
    }
    // 每轮重新取，因为上一轮已经落库改变了状态
    const ch = todo()[0]
    if (!ch) break
    seen.add(ch.id)

    yield { t: 'chapter', no: ch.no, title: ch.title ?? `第 ${ch.no} 章` }

    try {
      // ① 写手
      let r = await call(ch.id, '写手')
      let body = r.text.trim()
      yield { t: 'role', no: ch.no, role: '写手', ms: r.ms, chars: body.length }
      chapters.update(ch.id, { body, status: '已生成' })

      // ② 审稿人 ↔ 修订师，直到判通过或用尽返修预算
      let verdict = '返修'
      for (let round = 0; round < opts.maxRevisions; round++) {
        if (signal.aborted) break
        r = await call(ch.id, '审稿人', REVIEW_VERDICT)
        const issues = stripVerdict(r.text)
        verdict = parseVerdict(r.text, ['通过', '返修']) ?? '返修'
        yield { t: 'role', no: ch.no, role: '审稿人', ms: r.ms, chars: issues.length }
        yield { t: 'verdict', no: ch.no, role: '审稿人', verdict }
        chapters.update(ch.id, { review: issues, status: '审校中' })
        if (verdict === '通过') break

        r = await call(ch.id, '修订师', issues)
        body = r.text.trim()
        yield { t: 'role', no: ch.no, role: '修订师', ms: r.ms, chars: body.length }
        chapters.update(ch.id, { body })
      }

      // ③ 门禁：这本书自己的标准，不是我外加的
      const autos = autosOf(projectId)
      const stage = STAGE_MAP[GATE_STAGE]
      let failed: string[] = []
      if (stage) {
        const g = gateProgress(stage, stageStore.get(projectId, stage.id).gate ?? {}, autos)
        failed = stage.gate
          .filter((it) => it.auto && autos[it.auto] && !autos[it.auto]!.pass)
          .map((it) => `${it.text}（${autos[it.auto!]!.detail}）`)
        yield { t: 'gate', no: ch.no, passed: g.done, total: g.total, failed }
      }

      // ④ 记录员 → 摘要。这是唯一会污染真相源的一步，所以单独给开关
      r = await call(ch.id, '记录员')
      yield { t: 'role', no: ch.no, role: '记录员', ms: r.ms, chars: r.text.length }
      if (opts.autoSummary) {
        chapters.update(ch.id, { summary: r.text.trim() })
        yield { t: 'wrote', no: ch.no, field: 'summary', chars: r.text.trim().length }
      }

      chapters.update(ch.id, { status: '已通过' })
      yield { t: 'wrote', no: ch.no, field: 'body', chars: body.length }
      wrote++

      // ⑤ 读者模型：会不会弃书
      if (opts.stopOnReaderDrop) {
        r = await call(ch.id, '读者模型', READER_VERDICT)
        const v = parseVerdict(r.text, ['追更', '观望', '弃书']) ?? '观望'
        yield { t: 'role', no: ch.no, role: '读者模型', ms: r.ms, chars: r.text.length }
        yield { t: 'verdict', no: ch.no, role: '读者模型', verdict: v }
        if (v === '弃书') {
          yield { t: 'pause', no: ch.no, reason: '读者模型判定会弃书 —— 停下来等人看' }
          stopReason = `第 ${ch.no} 章被读者模型判弃书`
          break
        }
      }

      if (opts.stopOnGateFail && failed.length) {
        yield { t: 'pause', no: ch.no, reason: `门禁还有 ${failed.length} 项不过` }
        stopReason = `第 ${ch.no} 章门禁未过`
        break
      }
    } catch (e) {
      const msg = (e as Error).message
      yield { t: 'error', no: ch.no, msg }
      stopReason = `第 ${ch.no} 章出错：${msg}`
      break
    }
  }

  const done = isComplete(projectId)
  yield {
    t: 'done',
    wrote,
    reason: stopReason || (done.complete ? done.detail : `本次预算 ${budget} 章已用完`),
    complete: done.complete,
  }
}
