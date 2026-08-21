/**
 * 开书访谈 —— 把「填 30 个空」换成「答 4 个问题 + 审一版草稿」。
 *
 * 为什么值得单独做一层：最小可动笔集合有 30 个字段，但真正只有作者知道的只有 4 个
 * （开场画面 / 他要什么 / 什么挡着他 / 文风）。其余要么类型库里已经有（b2-genre 的一键带入），
 * 要么能从这 4 个推出来。对着空框写和对着草稿改，是两种完全不同的认知负担。
 *
 * ⚠ 不绕过「AI 产出不自动落库」：这里只负责**生成草稿**与**解析**，
 * 落库要人在复核屏上逐环节点采纳（见 actions.commitInterview）。
 */

import type { Project } from '../types'
import { STAGE_MAP } from '../stages'
import { VENUE_MAP } from '../platform'
import { CHANNELS, GENRE_MAP } from '../genre'

/* ── 只有作者知道的那几件事 ── */

export interface Question {
  id: 'scene' | 'want' | 'block' | 'style'
  label: string
  hint: string
  placeholder: string
  rows?: number
  /** 答不上来时，可以让 AI 先给候选 */
  canAssist?: boolean
}

export const QUESTIONS: Question[] = [
  {
    id: 'scene',
    label: '脑子里那个画面是什么？',
    hint: '写动作，不要写氛围。四件套：谁 ｜ 在哪 ｜ 握着什么 ｜ 正在做什么',
    placeholder: '阿澈 ｜ 医院缴费窗口 ｜ 握着余额 800 的卡 ｜ 第三次排到队首又退出来',
    rows: 2,
    canAssist: true,
  },
  {
    id: 'want',
    label: '他想要什么？',
    hint: '具体到能数出来。「想变强」「想活下去」这种不算',
    placeholder: '三天内凑齐妹妹手术费 47 万',
    rows: 2,
  },
  {
    id: 'block',
    label: '什么挡着他？',
    hint: '人、处境、还是他自己的某个东西。要他绕不开、也退不了的',
    placeholder: '唯一肯借钱的人，正是当年害死他父亲的那个',
    rows: 3,
  },
  {
    id: 'style',
    label: '想要什么样的文风？',
    hint: '有样例最好，贴 200 字你最想写成那样的段落；没有就描述感觉，AI 会拟一段给你挑',
    placeholder: '短句为主，对白多，不写内心戏，情绪靠动作带出来',
    rows: 4,
    canAssist: true,
  },
]

export type Answers = Record<Question['id'], string>

/* ── 草稿的形状 ── */

/** 访谈要起草的环节与字段。b2-genre 走一键带入，d1-hero 单独建人物 */
export const DRAFT_FIELDS: Record<string, string[]> = {
  'b9-core': ['push', 'longform'],
  'b7-concept': ['logline'],
  'c3-cheat': ['oneline', 'source', 'same', 'grow', 'price', 'risk', 'fit'],
  'e1-pov': ['person', 'count', 'distance', 'switch', 'info', 'cost'],
  'e2-style': ['sample', 'rhythm', 'ratio', 'density', 'emotion', 'banned'],
}

/** 主角卡：落到 characters 表，不是 stage_states */
export const HERO_FIELDS = ['name', 'stance', 'motive_surface', 'motive_deep', 'weakness', 'notes'] as const

export interface Draft {
  stages: Record<string, Record<string, unknown>>
  hero: Record<string, string>
}

/* ── 提示词 ── */

export function buildInterviewPrompt(p: Project, a: Answers): { system: string; prompt: string } {
  const v = VENUE_MAP[p.venue ?? ''] ?? VENUE_MAP['fanqie-m']
  const ch = CHANNELS[v.channel]
  const g = p.genre ? GENRE_MAP[p.genre] : null

  const field = (sid: string, fid: string) => {
    const st = STAGE_MAP[sid]
    const f = st?.fields.find((x) => x.id === fid)
    if (!f) return `${fid}`
    const opts = f.k === 'select' ? `（只能从这几个里选一个：${f.options.join(' / ')}）` : ''
    const hint = 'hint' in f && f.hint ? `——${f.hint}` : ''
    return `${fid}：${f.label}${opts}${hint}`
  }

  const section = (sid: string) =>
    `### ${sid}　${STAGE_MAP[sid]?.title ?? ''}\n` +
    DRAFT_FIELDS[sid].map((fid) => `${field(sid, fid)}`).join('\n')

  const system = `你在给一位作者做开书访谈的整理工作。他已经回答了最关键的几个问题，
你的任务是把这些答案展开成一份**可以直接开写的草稿**。

铁律：
· 你在补全，不是在发挥。所有产出必须能从作者给的答案推出来，不许另起炉灶换一个故事。
· 每一项都要具体到能写。写不出具体的就写「（想不出来，建议你自己定）」，不要用漂亮的空话占位。
· 作者会逐项审这份草稿，所以宁可给一个明确但可能被改的答案，也不要给模棱两可的。
· 严格按要求的格式输出，不要加寒暄、不要解释你的思路。`

  const prompt = `【这本书】
书名：${p.title}
阵地：${v.name}（${v.channel}）｜单章 ${v.words[0]}-${v.words[1]} 字
${g ? `类型：${g.name}——${g.contract}\n必备元素：${g.musts.join('、')}\n类型雷区：${g.mines.join('、')}` : '类型：未定'}
频道契约：${ch.contract}
频道雷区：${ch.mines.join('；')}
主角不可让渡：${ch.protagonist.join('；')}

【作者的回答】
开场画面：${a.scene}
他想要什么：${a.want}
什么挡着他：${a.block}
文风要求：${a.style}

【任务】
按下面的字段清单逐项起草。格式严格如下，每行 \`字段id：内容\`，不要加编号、不要加解释：

${Object.keys(DRAFT_FIELDS).map(section).join('\n\n')}

### hero　主角卡
name：主角姓名（从开场画面里那个人来；作者没起名就起一个好记的短名）
stance：他与阻碍的关系，只能选一个：局外人 / 内行人 / 执行者
motive_surface：表层动机，就是作者说的「他想要什么」，压成一句
motive_deep：深层动机，中期才觉醒的那个——他真正缺的东西，不是他嘴上要的
weakness：软肋，什么被威胁他就会做不理智的选择
notes：一句话人设

补充要求：
· e2-style 的 sample 要真写一段 200 字左右的正文示例，按作者要的文风写，用这本书的人物和处境，不要写成说明。
· e1-pov 的三个选择项必须原样使用给定选项之一，不要自创。
· e2-style 的 banned 给 6-10 个词，用「、」分隔在一行里。
· c3-cheat 如果作者的答案里没有超常设定，就按「他独有的能力或资源路径」来写，不必硬塞异能。`

  return { system, prompt }
}

/* ── 解析 ── */

const SELECT_FIELDS: Record<string, string[]> = {}
for (const [sid, fids] of Object.entries(DRAFT_FIELDS)) {
  for (const fid of fids) {
    const f = STAGE_MAP[sid]?.fields.find((x) => x.id === fid)
    if (f?.k === 'select') SELECT_FIELDS[`${sid}.${fid}`] = f.options
  }
}

/**
 * 字段 id → 它属于哪个环节。全库无重名，所以解析**不依赖段落标题**。
 * 小模型经常把 `### b9-core` 写成 `b9-core　核心创意成型`、`**b9-core**` 或者干脆不写，
 * 靠标题分段会整份解析失败；靠字段 id 反查则漏一行只丢一项。
 */
const OWNER: Record<string, string> = {}
for (const [sid, fids] of Object.entries(DRAFT_FIELDS)) for (const fid of fids) OWNER[fid] = sid
for (const fid of HERO_FIELDS) OWNER[fid] = 'hero'

/** 所有段落名，含 hero。用来判断"这一行是新段落的标题，不是上一个字段的续行" */
const SECTION_KEYS = [...Object.keys(DRAFT_FIELDS), 'hero']

/**
 * 把模型的回答对回给定选项。
 *
 * 不能直接 includes：模型会在选项里加空格、改标点、后面再缀一串解释，
 * 比如选项是「中距（写行为+少量内心）」，它写成「中距（写行为 + 少量内心，用动作带情绪）」，
 * 字面对不上就整项丢掉。所以先抹掉空白再比，最后退到括号前的短名（中距 / 贴身 / 远距）。
 */
function matchOption(options: string[], raw: string): string | null {
  if (!options.length) return null
  const flat = (s: string) => s.replace(/\s+/g, '')
  const r = flat(raw)
  return (
    options.find((o) => r.includes(flat(o))) ??
    options.find((o) => {
      const short = flat(o).split(/[（(]/)[0]
      return short.length >= 2 && r.includes(short)
    }) ??
    null
  )
}

/** 模型爱把字段标签抄进值里（`same：与核心差异的同源关系——他能…`），去掉这个前缀 */
function stripEchoedLabel(sid: string, fid: string, v: string): string {
  const label = STAGE_MAP[sid]?.fields.find((x) => x.id === fid)?.label
  if (!label) return v
  const re = new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[——:：-]+\\s*`)
  return v.replace(re, '').trim()
}

export function parseDraft(text: string): Draft {
  const stages: Record<string, Record<string, unknown>> = {}
  const hero: Record<string, string> = {}

  let key: string | null = null
  let buf: string[] = []

  const flush = () => {
    if (!key) return
    const sid = OWNER[key]
    let raw = buf.join('\n').trim()
    if (!raw || /^（?想不出来/.test(raw)) {
      key = null
      buf = []
      return
    }
    if (sid === 'hero') {
      hero[key] = raw
    } else {
      raw = stripEchoedLabel(sid, key, raw)
      stages[sid] ??= {}
      const f = STAGE_MAP[sid]?.fields.find((x) => x.id === key)
      if (f?.k === 'list') {
        // 去重：模型经常把同一个词吐两遍
        stages[sid][key] = [...new Set(raw.split(/[、,，\n]/).map((s) => s.trim()).filter(Boolean))]
      } else if (f?.k === 'select') {
        const hit = matchOption(SELECT_FIELDS[`${sid}.${key}`] ?? [], raw)
        if (hit) stages[sid][key] = hit // 对不上宁可丢弃，不往真相源塞脏值
      } else {
        stages[sid][key] = raw
      }
    }
    key = null
    buf = []
  }

  for (const line of text.split(/\r?\n/)) {
    // 允许 markdown 修饰：**oneline**：… / - oneline: … / 1. oneline：…
    const kv = line.match(/^\s*(?:[-*+]\s*|\d+[.、]\s*)?\*{0,2}([a-z_]+)\*{0,2}\s*[:：]\s*(.*)$/i)
    if (kv && OWNER[kv[1]]) {
      flush()
      key = kv[1]
      buf = [kv[2]]
    } else if (key) {
      // 段落标题不算续行，遇到就收尾。hero 也是一个段，漏了它就会被并进上一个字段
      if (/^\s*#{1,4}\s|^\s*\*{2}[a-z0-9-]+\*{2}\s*$/i.test(line) || SECTION_KEYS.some((s) => line.trim().startsWith(s))) {
        flush()
      } else {
        buf.push(line)
      }
    }
  }
  flush()

  return { stages, hero }
}

/** 草稿里实际拿到了多少字段——复核屏用它显示「AI 补了 N 项」 */
export function draftCount(d: Draft): number {
  return Object.values(d.stages).reduce((n, o) => n + Object.keys(o).length, 0) + Object.keys(d.hero).length
}
