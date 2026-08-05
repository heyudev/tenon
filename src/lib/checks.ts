// 自动门禁判定
//
// 门禁分两类：
//   **可判定项** —— 系统从数据里算，人勾不了也不用勾。新手不必知道标准，老手不必自己数。
//   **主观项**   —— 风味、狠度、"愿不愿意点下一章"，只有人能判。
//
// 判定结果三态：通过 / 不通过 / 数据不足（还没填到能判的程度，不算不通过）。

import type { Chapter, Character, Metric, Project, ProjectRule, Thread, Volume } from './types'
import { VENUE_MAP, type Venue } from './platform'

export interface CheckCtx {
  project: Project
  /** stageId → 该环节的字段产出 */
  data: Record<string, Record<string, unknown>>
  chapters: Chapter[]
  threads: Thread[]
  cast: Character[]
  volumes: Volume[]
  rules: ProjectRule[]
  metrics: Metric[]
}

export interface CheckResult {
  pass: boolean
  /** 一句话说清为什么过 / 为什么不过 —— 新手靠这句话学标准 */
  detail: string
}

/** null = 数据不足，无法判定（不算不通过，也不算通过） */
export type Check = (c: CheckCtx) => CheckResult | null

const rows = (v: unknown): Record<string, string>[] => (Array.isArray(v) ? (v as Record<string, string>[]) : [])
const list = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]).filter(Boolean) : [])
const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')
const flags = (v: unknown): Record<string, boolean> => (v && typeof v === 'object' ? (v as Record<string, boolean>) : {})
const nums = (v: unknown): Record<string, number> => (v && typeof v === 'object' ? (v as Record<string, number>) : {})

const ok = (detail: string): CheckResult => ({ pass: true, detail })
const no = (detail: string): CheckResult => ({ pass: false, detail })

const venue = (c: CheckCtx): Venue => VENUE_MAP[c.project.venue ?? ''] ?? VENUE_MAP['fanqie-m']

export const CHECKS: Record<string, Check> = {
  /* ── 立项 ── */
  'genre-set': (c) =>
    c.project.genre
      ? ok(`已定：${c.project.platform} · ${c.project.channel} · 类型已选`)
      : no('类型还没选。类型决定这本书走哪条路线，不定就没法裁剪必经环节'),

  'rules-market': (c) => {
    if (!c.rules.length) return null
    const bad = c.rules.filter((r) => r.rule?.market === '未评估')
    return bad.length
      ? no(`${bad.map((r) => r.rule?.name).join('、')} 还是「未评估」——未评估不等于安全，只等于没查过`)
      : ok(`${c.rules.length} 条规则的市场占用都已评估`)
  },

  'rules-count': (c) => {
    if (!c.rules.length) return null
    const main = c.rules.filter((r) => r.role === '主规则').length
    const aux = c.rules.length - main
    if (main !== 1) return no(`主规则 ${main} 条。只能有 1 条——双主规则＝两本书硬挤一本，理解门槛翻倍`)
    if (aux > 2) return no(`辅规则 ${aux} 条，超过 2 条。3 条以上就是事故现场`)
    return ok(`主规则 1 条，辅规则 ${aux} 条`)
  },

  'rules-embodiable': (c) => {
    if (!c.rules.length) return null
    return c.rules.some((r) => r.rule?.embodiable)
      ? ok('整组有可具身化的规则，主角手里有能握住的东西')
      : no('整组没有一条可具身化——主角手里没有能握住的东西，第一章会落不了笔')
  },

  'operator-one': (c) => {
    const main = c.rules.find((r) => r.role === '主规则')
    if (!main) return null
    return main.operator ? ok(`主规则用了「${main.operator}」`) : no('主规则还没定改写算子')
  },

  'diff-oneline': (c) => {
    const d = str(c.data['b4-operator']?.diff)
    if (!d) return no('规则差还没写成一句话')
    return d.length > 80 ? no(`${d.length} 字，太长了。一句话说不清，读者就复述不了`) : ok(`${d.length} 字，能一句话说清`)
  },

  'loop-brake': (c) => {
    const pos = str(c.data['b5-graph']?.loop_pos)
    const neg = str(c.data['b5-graph']?.loop_neg)
    if (!pos) return null
    return neg
      ? ok('正反馈环配了刹车')
      : no('只有正反馈环没有负反馈环——任何扰动都会指数发散，世界三卷内必崩')
  },

  'six-black': (c) => {
    const six = rows(c.data['b6-civ']?.six)
    if (!six.length) return null
    const black = six.find((r) => /黑市/.test(r.k ?? ''))
    return black?.v
      ? ok('黑市写得出来，稀缺性与代价设计站得住')
      : no('六件套里没有黑市——没有黑市的架空文明一定是假的，说明稀缺性或代价设计有问题')
  },

  'score-14': (c) => {
    const m = nums(c.data['b7-concept']?.score)
    const filled = Object.keys(m).length
    if (filled < 10) return null
    const total = Object.values(m).reduce((a, b) => a + (Number(b) || 0), 0)
    return total >= 14
      ? ok(`${total}/20 分，达到立项线`)
      : no(`${total}/20 分。${total >= 10 ? '10-13 分应修改后重测' : '低于 10 分应该弃掉重来'}`)
  },

  'mines-clear': (c) => {
    const f = flags(c.data['b7-concept']?.mines)
    const hit = Object.entries(f).filter(([, v]) => v).map(([k]) => k)
    const NAMES: Record<string, string> = {
      clash: '撞车雷', reg: '监管雷', cash: '兑现雷', ladder: '递进雷', moral: '道德雷', adapt: '改编雷',
    }
    return hit.length
      ? no(`命中 ${hit.map((h) => NAMES[h] ?? h).join('、')}——命中任一即回炉`)
      : ok('排雷六项全过')
  },

  'title-count': (c) => {
    const t = list(c.data['b8-package']?.titles)
    if (!t.length) return null
    return t.length >= 3 ? ok(`${t.length} 个候选`) : no(`只有 ${t.length} 个候选。书名要备 3-5 个，这是能 AB 测的少数东西之一`)
  },

  /* ── 世界 ── */
  'resource-black': (c) => {
    const core = rows(c.data['c1-resource']?.core).filter((r) => r.name)
    if (!core.length) return null
    const bad = core.filter((r) => !r.black)
    return bad.length
      ? no(`${bad.map((r) => r.name).join('、')} 没写黑市形态——黑市是自洽性的试金石`)
      : ok(`${core.length} 种核心资源的五要素齐全`)
  },

  'power-columns': (c) => {
    const lv = rows(c.data['c2-power']?.levels).filter((r) => r.name)
    if (!lv.length) return null
    const bad = lv.filter((r) => !r.cost || !r.perm || !r.social)
    return bad.length
      ? no(`${bad.length} 个等级缺列（${bad.map((r) => r.name).join('、')}）——缺列的等级不可审计`)
      : ok(`${lv.length} 级，四列全部对齐`)
  },

  'power-count': (c) => {
    const lv = rows(c.data['c2-power']?.levels).filter((r) => r.name)
    const vols = c.volumes.length
    if (!lv.length || !vols) return null
    const want = Math.round(vols * 1.5)
    return Math.abs(lv.length - want) <= Math.max(3, want * 0.4)
      ? ok(`${lv.length} 级 / ${vols} 卷，密度合理`)
      : no(`${lv.length} 级配 ${vols} 卷。建议 ≈ 卷数 × 1.5（约 ${want} 级）——过密则廉价，过疏则窒息`)
  },

  'cheat-brakes': (c) => {
    const b = rows(c.data['c3-cheat']?.brakes).filter((r) => r.brake)
    if (!b.length) return null
    const withBenefit = b.filter((r) => r.benefit)
    if (b.length < 2) return no(`只有 ${b.length} 种刹车。至少两种，否则剧情提前结束`)
    return withBenefit.length === b.length
      ? ok(`${b.length} 种刹车，每种都写清了带来什么剧情`)
      : no(`${b.length - withBenefit.length} 种刹车没写剧情红利——只写在设定里而剧情中不生效的刹车等于没有`)
  },

  'cheat-price': (c) => {
    const p = str(c.data['c3-cheat']?.price)
    if (!str(c.data['c3-cheat']?.oneline)) return null
    return p ? ok('代价已定') : no('金手指没有代价——没有代价的力量没有重量')
  },

  'faction-want': (c) => {
    const f = rows(c.data['c4-geo']?.factions).filter((r) => r.name)
    if (!f.length) return null
    const bad = f.filter((r) => !r.want || !r.fear)
    return bad.length
      ? no(`${bad.map((r) => r.name).join('、')} 缺「想要的」或「怕失去的」——冲突就长不出来`)
      : ok(`${f.length} 个势力都有欲望与恐惧，冲突可以查表`)
  },

  'history-gap': (c) => {
    const e = rows(c.data['c5-history']?.events).filter((r) => r.what)
    if (!e.length) return null
    const diff = e.filter((r) => r.official && r.truth && r.official !== r.truth)
    return diff.length
      ? ok(`${diff.length} 个事件的官方说法与真相不同，反转有空间`)
      : no('没有一个事件的「官方说法」与「真相」不同——浪费了最大的反转资源')
  },

  'terms-limit': (c) => {
    const t = rows(c.data['c6-bible']?.terms).filter((r) => r.term)
    if (!t.length) return null
    return t.length <= 7
      ? ok(`${t.length} 个术语，在前十章的承受范围内`)
      : no(`${t.length} 个术语，超过 7 个——读者会在前十章被淹没`)
  },

  'style-sample': (c) => {
    const s = str(c.data['e2-style']?.sample) || str(c.data['c6-bible']?.style)
    if (!s) return no('文风样例还没写。不给样例，生成出来的就是训练分布的均值')
    return s.length >= 150 ? ok(`${s.length} 字样例`) : no(`只有 ${s.length} 字。样例要 200 字左右才定得住语感`)
  },

  /* ── 人物 ── */
  'hero-stance': (c) => {
    const hero = c.cast.find((x) => x.role === '主角')
    if (!hero) return null
    return hero.stance
      ? ok(`主角站位：${hero.stance}`)
      : no('主角还没定站位。例外者／套利者／执法者三选一，这决定天然剧情与代入方式')
  },

  'hero-motive': (c) => {
    const hero = c.cast.find((x) => x.role === '主角')
    if (!hero) return null
    if (!hero.motive_surface) return no('主角没有表层动机——读者代入不进去')
    return hero.motive_deep
      ? ok('双层动机齐备')
      : no('只有表层动机，没有深层动机。长篇会在中期失去升维空间')
  },

  'villain-win': (c) => {
    const v = c.cast.filter((x) => x.role === '反派')
    if (!v.length) return null
    return ok(`${v.length} 个反派已建档。"每个主要反派都赢过一次"需要在事件线里排，这里只统计人数`)
  },

  'cast-triple': (c) => {
    const sup = c.cast.filter((x) => x.role !== '主角' && x.role !== '路人脸')
    if (!sup.length) return null
    const bad = sup.filter((x) => !x.desire || !x.weakness || !x.resource_rel)
    return bad.length
      ? no(`${bad.length} 人三件套未填齐（${bad.slice(0, 4).map((x) => x.name).join('、')}${bad.length > 4 ? '…' : ''}）——填不完就会写到中期人物行为开始飘`)
      : ok(`${sup.length} 个配角三件套齐全，反应可推导`)
  },

  'faces-ten': (c) => {
    const f = c.cast.filter((x) => x.face_rank != null)
    if (!f.length) return null
    return f.length >= 10
      ? ok(`打脸链 ${f.length} 张脸`)
      : no(`只排了 ${f.length} 张脸。立项时应排满前 10 张，每 20-30 章消耗一张`)
  },

  'romance-beats': (c) => {
    if (c.project.channel !== '女频') return null
    const b = rows(c.data['d4-relation']?.beats).filter((r) => r.ch)
    if (!b.length) return no('情感节拍还没排到章。女频情感线长期停滞＝掉追读，这是硬指标')
    const chs = b.map((r) => Number(r.ch)).filter((n) => n > 0).sort((a, b2) => a - b2)
    let worst = 0
    for (let i = 1; i < chs.length; i++) worst = Math.max(worst, chs[i] - chs[i - 1])
    return worst <= 8
      ? ok(`${b.length} 个节拍，最大间隔 ${worst} 章`)
      : no(`最大间隔 ${worst} 章，超过 8 章。女频每 5-8 章必须有一次关系状态变化`)
  },

  /* ── 叙事 ── */
  'pov-locked': (c) => {
    const d = c.data['e1-pov'] ?? {}
    const need = [
      ['person', '人称'],
      ['count', '视角数'],
      ['distance', '叙事距离'],
    ] as const
    const miss = need.filter(([k]) => !str(d[k])).map(([, l]) => l)
    if (miss.length === 3) return null
    return miss.length
      ? no(`${miss.join('、')} 还没定。视角定错要推倒重写，是全书最贵的决策`)
      : ok(`${str(d.person)} · ${str(d.count)} · ${str(d.distance)}`)
  },

  'lines-weight': (c) => {
    const l = rows(c.data['e3-lines']?.lines).filter((r) => r.name)
    if (!l.length) return null
    if (l.length > 3) return no(`${l.length} 条线，超过 3 条（主线+2）。每条都会推不动`)
    const cross = rows(c.data['e3-lines']?.cross).filter((r) => r.which)
    return cross.length >= l.length - 1
      ? ok(`${l.length} 条线，${cross.length} 个交汇点`)
      : no('有副线没有与主线的交汇点——从不交汇的副线不是副线，是另一本书')
  },

  'opening-variants': (c) => {
    const v = rows(c.data['e4-opening']?.variants).filter((r) => r.text)
    if (!v.length) return null
    return v.length >= 3
      ? ok(`${v.length} 个开篇候选`)
      : no(`只写了 ${v.length} 版。开篇要 3-5 版比着选——这是全书投入产出比最高的地方`)
  },

  /* ── 结构 ── */
  'threads-open': (c) => {
    if (!c.threads.length) return null
    const book = c.threads.filter((t) => t.level === '书级').length
    if (c.threads.length < 10) return no(`只有 ${c.threads.length} 条。开户建议 10-15 条`)
    if (book < 1 || book > 3) return no(`书级悬念 ${book} 条，应为 1-3 条${book > 3 ? '——太多读者记不住' : ''}`)
    return ok(`${c.threads.length} 条，书级 ${book} 条`)
  },

  'threads-plan': (c) => {
    if (!c.threads.length) return null
    const bad = c.threads.filter((t) => t.status !== '已废弃' && !t.plan_ch)
    return bad.length
      ? no(`${bad.length} 条没有计划回收章（${bad.slice(0, 5).map((t) => t.fid).join('、')}${bad.length > 5 ? '…' : ''}）——禁止"埋了但没记回收计划"`)
      : ok(`${c.threads.length} 条全部有计划回收章`)
  },

  'threads-overdue': (c) => {
    const done = c.chapters.filter((ch) => ch.status === '已发布').length
    if (!c.threads.length || !done) return null
    const over = c.threads.filter(
      (t) => (t.status === '已埋设' || t.status === '已强化') && t.plan_ch != null && done > t.plan_ch,
    )
    return over.length
      ? no(`${over.map((t) => t.fid).join('、')} 已过计划回收章还没收——这是老读者的头号差评来源`)
      : ok('没有逾期未收的伏笔')
  },

  'threads-closed': (c) => {
    if (!c.threads.length) return null
    const open = c.threads.filter((t) => t.status === '已埋设' || t.status === '已强化')
    return open.length
      ? no(`还有 ${open.length} 条没有归宿（${open.slice(0, 5).map((t) => t.fid).join('、')}${open.length > 5 ? '…' : ''}）。完结时每条都要么回收、要么明确废弃`)
      : ok('伏笔全账已清')
  },

  /** 旗舰判据：最大爽点间隔 */
  'beat-gap': (c) => {
    const chs = [...c.chapters].sort((a, b) => a.no - b.no)
    if (chs.length < 5) return null
    const limit = venue(c).maxBeatGap
    let gap = 0
    let worst = { len: 0, from: 0, to: 0 }
    let start = chs[0].no
    for (const ch of chs) {
      if (ch.beat === '中爽' || ch.beat === '大爽') {
        if (gap > worst.len) worst = { len: gap, from: start, to: ch.no }
        gap = 0
        start = ch.no
      } else gap++
    }
    if (gap > worst.len) worst = { len: gap, from: start, to: chs.at(-1)!.no }
    return worst.len < limit
      ? ok(`最大间隔 ${worst.len} 章，未超「${venue(c).name}」红线（${limit}）`)
      : no(`第 ${worst.from}-${worst.to} 章之间空了 ${worst.len} 章无中爽及以上，超「${venue(c).name}」红线（${limit}）。总量达标不等于分布达标——低谷藏在两个中爽之间`)
  },

  'hook-variety': (c) => {
    const chs = [...c.chapters].sort((a, b) => a.no - b.no).filter((x) => x.hook_type)
    if (chs.length < 3) return null
    const bad: number[] = []
    for (let i = 2; i < chs.length; i++)
      if (chs[i].hook_type === chs[i - 1].hook_type && chs[i].hook_type === chs[i - 2].hook_type)
        bad.push(chs[i].no)
    return bad.length
      ? no(`第 ${bad.slice(0, 6).join('、')} 章连续 3 章同型钩子——读者会审美疲劳`)
      : ok(`${chs.length} 章的钩子型号无连续同型`)
  },

  'face-streak': (c) => {
    const faces = c.cast.filter((x) => x.face_rank != null)
    const chs = c.chapters.length
    if (!faces.length || chs < 30) return null
    const perFace = chs / faces.length
    return perFace <= 30
      ? ok(`${chs} 章 / ${faces.length} 张脸 ≈ 每 ${Math.round(perFace)} 章一张`)
      : no(`${chs} 章只有 ${faces.length} 张脸 ≈ 每 ${Math.round(perFace)} 章一张，超过 30 章即断档`)
  },

  'volume-goal': (c) => {
    if (!c.volumes.length) return null
    const bad = c.volumes.filter((v) => !v.goal || !v.climax)
    return bad.length
      ? no(`${bad.map((v) => v.vid).join('、')} 缺卷目标或卷末高潮`)
      : ok(`${c.volumes.length} 卷都有目标与高潮`)
  },

  'climax-converge': (c) => {
    const cl = rows(c.data['f5-climax']?.climaxes).filter((r) => r.vol)
    if (!cl.length) return null
    const bad = cl.filter((r) => !r.converge || !r.stake)
    return bad.length
      ? no(`${bad.length} 个高潮缺「线汇聚」或「赌注」——只有战力对比不算高潮`)
      : ok(`${cl.length} 个高潮都有汇聚与赌注`)
  },

  'scene-change': (c) => {
    const sc = rows(c.data['f6-scene']?.scenes).filter((r) => r.who)
    if (!sc.length) return null
    const bad = sc.filter((r) => !r.change)
    return bad.length
      ? no(`${bad.length} 个场景没写「什么变了」——没有变化的场景就该删`)
      : ok(`${sc.length} 个场景都有明确的变化`)
  },

  /* ── 生产 ── */
  'chapter-words': (c) => {
    const withBody = c.chapters.filter((ch) => ch.words > 0)
    if (!withBody.length) return null
    const [lo, hi] = venue(c).words
    const bad = withBody.filter((ch) => ch.words < lo || ch.words > hi * 1.3)
    return bad.length
      ? no(`${bad.length} 章不在 ${lo}-${hi} 区间（第 ${bad.slice(0, 5).map((x) => x.no).join('、')} 章）`)
      : ok(`${withBody.length} 章字数都在 ${lo}-${hi} 区间`)
  },

  'chapter-summary': (c) => {
    const done = c.chapters.filter((ch) => ch.words > 0 || ch.status === '已发布')
    if (!done.length) return null
    const bad = done.filter((ch) => !ch.summary)
    return bad.length
      ? no(`${bad.length} 章没有回写摘要——漏回写的那一章之后，连续性就开始腐烂`)
      : ok(`${done.length} 章全部已回写摘要`)
  },

  'stock-floor': (c) => {
    const floor = Number(str(c.data['g6-stock']?.floor).replace(/\D/g, ''))
    const cur = Number(str(c.data['g6-stock']?.current).replace(/\D/g, ''))
    if (!floor || !cur) return null
    return cur >= floor
      ? ok(`存稿 ${cur} ≥ 下限 ${floor}`)
      : no(`存稿 ${cur} 已跌破下限 ${floor}——现在应该降速，硬撑的结局是先降质再断更`)
  },

  /* ── 运营 / 收尾 ── */
  'metrics-entered': (c) => {
    if (!c.chapters.length) return null
    return c.metrics.length
      ? ok(`${c.metrics.length} 章已录数据`)
      : no('还没有录入任何章级数据')
  },

  'seeds-bloom': (c) => {
    const seeds = str(c.data['f1-outline']?.seeds)
    if (!seeds) return no('还没指出第一卷里的终局种子——规则守恒的检验过不了')
    return ok('第一卷的终局种子已列出')
  },
}

/** 一次算完一本书的全部自动判定 */
export function runChecks(ctx: CheckCtx): Record<string, CheckResult | null> {
  const out: Record<string, CheckResult | null> = {}
  for (const [id, fn] of Object.entries(CHECKS)) {
    try {
      out[id] = fn(ctx)
    } catch {
      out[id] = null
    }
  }
  return out
}
