import { cast, chapters, locks, projects, stageStore, threads, volumes } from '../repo'
import type { Chapter, Project } from '../types'
import { VENUE_MAP } from '../platform'
import { CHANNELS } from '../genre'

/**
 * 分层记忆装配（11-AI引擎 L0–L4）。
 * 原则：不是"给更多"，是"给对的"。正文永不回读，连续性靠状态文件。
 */

const s = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const has = (v: unknown) => !!s(v)
const line = (label: string, v: unknown) => (has(v) ? `${label}：${s(v)}\n` : '')

type Rows = Record<string, string>[]
const rows = (v: unknown): Rows => (Array.isArray(v) ? (v as Rows) : [])

/** L0 创作圣经 · 不变层，每次必带 */
export function L0(projectId: string): string {
  const p = projects.get(projectId)!
  const st = stageStore.all(projectId)
  const core = st['b9-core'].data
  const hero = cast.list(projectId).find((c) => c.role === '主角')
  const bible = st['c6-bible'].data
  const power = st['c2-power'].data
  const lv = rows(power.levels)

  let out = `【L0 创作圣经】\n书名：${p.title}｜平台：${p.platform}\n`
  out += line('一句话卖点', p.logline)
  out += line('开场画面', core.scene)

  // 主角的欲望与阻碍是全书的发动机，每一次生成都要带
  if (hero) {
    out += `\n主角：${hero.cid} ${hero.name}\n`
    out += line('  他要什么', hero.motive_surface || core.want)
    out += line('  深层动机', hero.motive_deep)
    out += line('  什么挡着他', core.block)
    out += line('  软肋', hero.weakness)
  } else {
    out += line('他要什么', core.want)
    out += line('什么挡着他', core.block)
  }
  out += line('靠什么撑长篇', core.longform)

  if (lv.length) {
    out += `\n力量等级表（名称｜资源门槛｜规则权限｜社会身份）：\n`
    for (const l of lv) out += `  ${l.name}｜${l.cost}｜${l.perm}｜${l.social}\n`
  }
  if (has(power.price)) out += `代价机制：${s(power.price)}\n`

  if (has(bible.style)) out += `\n文风样例（照此语感写，不要模仿内容）：\n"""\n${s(bible.style)}\n"""\n`

  const banned = Array.isArray(bible.banned) ? (bible.banned as string[]).filter(Boolean) : []
  out += `\n禁用词（出现即返工）：${banned.length ? banned.join('、') : '不禁、缓缓、眼中闪过一丝、深深地、三连反问、总结式结尾'}\n`
  out += `毒点红线（一票否决）：不可逆损失（便当亲近配角/永久削金手指/绿帽擦边）、主角降智（忽略已展示的能力或信息）、蓄能超窗口、题材背刺、说教超过 3 句。\n`

  const lk = locks.list(projectId)
  if (lk.length) out += `\n锁定项（禁止修改）：\n${lk.map((l) => `  · ${l.item}${l.reason ? `（${l.reason}）` : ''}`).join('\n')}\n`

  return out
}

/** L1 世界观状态 · 低频变化，摘要带入 */
export function L1(projectId: string, volumeId?: string | null): string {
  const st = stageStore.all(projectId)
  const bible = st['c6-bible'].data
  const res = st['c1-resource'].data
  const vol = volumeId ? volumes.list(projectId).find((v) => v.id === volumeId) : null

  let out = `\n【L1 世界观状态】\n`

  const core = rows(res.core)
  if (core.length)
    out += `核心资源：${core.map((c) => `${c.name}（源头${c.origin}｜黑市${c.black}）`).join('；')}\n`

  const fac = rows(bible.factions)
  if (fac.length)
    out += `势力：\n${fac.map((f) => `  ${f.id || ''} ${f.name}｜要：${f.want}｜怕：${f.fear}`).join('\n')}\n`

  const terms = rows(bible.terms)
  if (terms.length) out += `术语：${terms.map((t) => `${t.term}=${t.mean}`).join('；')}\n`

  if (vol) {
    out += `\n当前卷 ${vol.vid}《${vol.title}》\n`
    out += line('  卷目标', vol.goal)
    out += line('  核心冲突', vol.conflict)
    out += line('  揭露层级', vol.reveal_layer)
    out += line('  力量轨道', vol.power_track)
  }
  return out
}

/** L2 人物状态表 · 出场人物按需带入 */
export function L2(projectId: string, castIds: string[]): string {
  const all = cast.list(projectId)
  const pick = castIds.length ? all.filter((c) => castIds.includes(c.id)) : all.filter((c) => c.role === '主角')
  if (!pick.length) return ''
  let out = `\n【L2 人物状态表】\n`
  for (const c of pick) {
    out += `${c.cid} ${c.name}（${c.role}${c.stance ? `·${c.stance}` : ''}｜${c.status}）\n`
    out += line('  当前目标', c.motive_surface || c.desire)
    out += line('  深层动机', c.motive_deep)
    out += line('  对规则的态度', c.attitude)
    out += line('  软肋', c.weakness)
    out += line('  与主角的资源关系', c.resource_rel)
    out += line('  ⚠ 知道的秘密', c.secrets)
    out += line('  口癖', c.tic)
  }
  return out
}

/** L3 剧情游标 · 高频变化，每章更新 */
export function L3(projectId: string, upToNo: number): string {
  const chs = chapters.list(projectId)
  const prev = chs.filter((c) => c.no < upToNo && c.summary).slice(-3)
  const th = threads.list(projectId).filter((t) => t.status === '已埋设' || t.status === '已强化')

  let out = `\n【L3 剧情游标】\n`
  if (prev.length) {
    out += `近 ${prev.length} 章摘要：\n`
    for (const c of prev) out += `  第${c.no}章${c.title ? `《${c.title}》` : ''}：${c.summary}\n`
  } else out += `（这是开篇，没有前情）\n`

  const lastHooks = chs.filter((c) => c.no < upToNo && c.hook_text).slice(-2)
  if (lastHooks.length)
    out += `未兑现钩子：\n${lastHooks.map((c) => `  第${c.no}章（${c.hook_type}）：${c.hook_text}`).join('\n')}\n`

  const recentTypes = chs.filter((c) => c.no < upToNo && c.hook_type).slice(-2).map((c) => c.hook_type)
  if (recentTypes.length) out += `前两章钩子型号：${recentTypes.join('、')}——本章不得同型。\n`

  if (th.length) {
    out += `进行中的伏笔（埋了未收）：\n`
    for (const t of th.slice(0, 14))
      out += `  ${t.fid}（${t.level}）${t.content}｜埋于第${t.planted_ch ?? '?'}章｜计划第${t.plan_ch ?? '?'}章回收\n`
  }
  return out
}

/** L4 本章 brief · 一次性 */
export function L4(ch: Chapter, projectId: string): string {
  const all = cast.list(projectId)
  const who = all.filter((c) => ch.cast.includes(c.id)).map((c) => `${c.cid}${c.name}`)
  let out = `\n【L4 本章 brief】第 ${ch.no} 章${ch.title ? `《${ch.title}》` : ''}\n`
  out += line('场景', ch.scene)
  out += who.length ? `人物：${who.join('、')}\n` : ''
  out += line('核心事件', ch.core_event || ch.event)
  out += line('本章反转', ch.twist)
  out += line('爽点节拍', ch.beat)
  out += line('章尾钩子型号', ch.hook_type)
  out += line('钩子内容', ch.hook_text)
  if (ch.plant.length) out += `本章须埋设伏笔：${ch.plant.join('、')}\n`
  if (ch.harvest.length) out += `本章须回收伏笔：${ch.harvest.join('、')}\n`
  return out
}

/** 阵地硬约束（进每一次生成与审校） */
export function platformRules(project: Project): string {
  const v = VENUE_MAP[project.venue ?? ''] ?? VENUE_MAP['fanqie-m']
  const ch = CHANNELS[v.channel]
  return `\n【阵地硬约束 · ${v.name}】
${v.hardRules.map((r) => `· ${r}`).join('\n')}
单章 ${v.words[0]}-${v.words[1]} 字（${v.wordsNote}）。
爽点红线：连续 ≥${v.maxBeatGap} 章无中爽及以上即超线；蓄能耐受窗口 ${v.tensionWindow} 章。
读者：${v.readers}

【频道读者契约 · ${v.channel}】
${ch.contract}
快感来源：${ch.pleasures.join('、')}
主轴：${ch.spine}
雷区（命中即掉数据）：${ch.mines.join('；')}
主角不可让渡：${ch.protagonist.join('；')}`
}

/** 完整上下文装配 */
export function assemble(
  projectId: string,
  opts: { chapterNo?: number; chapter?: Chapter; castIds?: string[]; volumeId?: string | null } = {},
): string {
  const p = projects.get(projectId)!
  const parts = [
    L0(projectId),
    L1(projectId, opts.volumeId ?? opts.chapter?.volume_id),
    L2(projectId, opts.castIds ?? opts.chapter?.cast ?? []),
  ]
  if (opts.chapterNo != null) parts.push(L3(projectId, opts.chapterNo))
  if (opts.chapter) parts.push(L4(opts.chapter, projectId))
  parts.push(platformRules(p))
  return parts.filter(Boolean).join('')
}
