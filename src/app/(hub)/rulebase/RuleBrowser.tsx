'use client'

import { useMemo, useState } from 'react'
import type { Project, Rule } from '@/lib/types'
import { Button, Chip, Empty, Eyebrow, Rung, Ticks, cx } from '@/components/ui'
import { pickRule, setRuleMarket } from '@/lib/actions'

const TAG_NAMES = ['可量化', '稀缺', '可竞争', '有代价', '影响所有人']
const MARKETS = ['空白', '零星', '密集', '红海', '未评估'] as const
const MARKET_TONE: Record<string, 'good' | 'neutral' | 'warn' | 'accent' | 'mute'> = {
  空白: 'good',
  零星: 'neutral',
  密集: 'warn',
  红海: 'accent',
  未评估: 'mute',
}

type Preset = 'all' | 'w5' | 'trap' | 'undervalued' | 'hot' | 'clashed' | 'deep'

const PRESETS: { id: Preset; label: string; hint: string }[] = [
  { id: 'all', label: '全部', hint: '400 条完整库存' },
  { id: 'w5', label: '可写性五星', hint: '开局章直接能落笔——新书优先从这里挑主规则' },
  { id: 'hot', label: '高星未开发', hint: '★≥4 且尚无深度推演。注意：高星 ≈ 高撞车' },
  { id: 'trap', label: '陷阱清单', hint: '★≥4 但 ✍≤2：推演惊艳，第一章落不了笔' },
  { id: 'undervalued', label: '被低估', hint: '★≤3 但 ✍5：贴身可握，做辅规则性价比最高' },
  { id: 'deep', label: '已深推', hint: '已完成五问推演的规则' },
  { id: 'clashed', label: '已验证撞车', hint: '花过代价验证的结论，立项前先排除' },
]

export default function RuleBrowser({
  rules,
  domains,
  books,
}: {
  rules: Rule[]
  domains: { name: string; tip: string }[]
  books: Project[]
}) {
  const [q, setQ] = useState('')
  const [domain, setDomain] = useState('')
  const [minStar, setMinStar] = useState(0)
  const [minW, setMinW] = useState(0)
  const [embod, setEmbod] = useState(false)
  const [allTags, setAllTags] = useState(false)
  const [preset, setPreset] = useState<Preset>('all')
  const [sel, setSel] = useState<number | null>(null)
  const [slots, setSlots] = useState<number[]>([])

  const list = useMemo(() => {
    const kw = q.trim().toLowerCase()
    return rules.filter((r) => {
      if (kw && ![r.name, r.change, r.real, r.hook ?? '', r.concepts.join('')].some((s) => s.toLowerCase().includes(kw)))
        return false
      if (domain && r.domain !== domain) return false
      if (r.star < minStar || r.writability < minW) return false
      if (embod && !r.embodiable) return false
      if (allTags && !r.tags.every(Boolean)) return false
      switch (preset) {
        case 'w5':
          return r.writability === 5 && r.embodiable
        case 'trap':
          return r.star >= 4 && r.writability <= 2
        case 'undervalued':
          return r.star <= 3 && r.writability === 5
        case 'hot':
          return r.star >= 4 && !r.deep
        case 'clashed':
          return r.market === '红海' || r.market === '密集'
        case 'deep':
          return !!r.deep
        default:
          return true
      }
    })
  }, [rules, q, domain, minStar, minW, embod, allTags, preset])

  const current = sel != null ? rules.find((r) => r.id === sel) ?? null : null
  const slotRules = slots.map((id) => rules.find((r) => r.id === id)!).filter(Boolean)

  // 组合合法性：两条规则必须共享 ≥1 个概念节点，否则世界会散装
  const shared = useMemo<string[]>(() => {
    if (slotRules.length < 2) return []
    const inter = slotRules
      .map((r) => new Set(r.concepts))
      .reduce((a, b) => new Set([...a].filter((x) => b.has(x))))
    return [...inter]
  }, [slotRules])
  const hasEmbodiable = slotRules.some((r) => r.embodiable)

  const toggleSlot = (id: number) =>
    setSlots((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 3 ? s : [...s, id]))

  return (
    <div className="flex h-full flex-col">
      {/* 筛选条 */}
      <header className="flex-none border-b border-[var(--line-soft)] px-8 pb-4 pt-6">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="display flex-none whitespace-nowrap text-[26px] tracking-tight">规则库</h1>
          <span className="text-[14px] text-[var(--text-faint)]">
            创意的搜索空间 —— 400 条现实底层规则，可枚举、可改写、可评分
          </span>
          <span className="num ml-auto text-[14px] text-[var(--text-faint)]">
            {list.length} / {rules.length}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPreset(p.id)}
              title={p.hint}
              className={cx(
                'rounded-[2px] px-2.5 py-[5px] text-[14px] transition-colors',
                preset === p.id
                  ? 'bg-[var(--accent)]/12 text-[var(--accent)] font-medium'
                  : 'text-[var(--text-dim)] hover:bg-[var(--bg-sunk)]',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜规则名 / 改写方向 / 概念"
            className="field h-8 w-[240px]"
          />
          <select value={domain} onChange={(e) => setDomain(e.target.value)} className="field h-8 w-[150px] cursor-pointer">
            <option value="">全部领域</option>
            {domains.map((d) => (
              <option key={d.name} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
          <Ruler label="潜力★" value={minStar} onChange={setMinStar} tone="accent" />
          <Ruler label="可写✍" value={minW} onChange={setMinW} tone="good" />
          <label className="flex cursor-pointer items-center gap-1.5 text-[14px] text-[var(--text-dim)]">
            <input type="checkbox" checked={embod} onChange={(e) => setEmbod(e.target.checked)} className="accent-[var(--accent)]" />
            仅可具身化
          </label>
          <label className="flex cursor-pointer items-center gap-1.5 text-[14px] text-[var(--text-dim)]">
            <input type="checkbox" checked={allTags} onChange={(e) => setAllTags(e.target.checked)} className="accent-[var(--accent)]" />
            五标签全中
          </label>
        </div>

        <p className="mt-3 text-[12px] leading-relaxed text-[var(--text-faint)]">
          {PRESETS.find((p) => p.id === preset)?.hint}
          {' · '}
          两把尺子正交，别混用：<span className="text-[var(--accent)]">★</span> 量世界观天花板，
          <span className="text-[var(--color-celadon)]">✍</span> 量第一章的地板。
        </p>
      </header>

      {/* 列表 + 详情 */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="min-h-[55vh] min-w-0 flex-1 overflow-y-auto lg:min-h-0">
          {list.length === 0 ? (
            <Empty>没有命中的规则。放宽筛选，或换个预设。</Empty>
          ) : (
            <>
              {/* 表头：两把尺子在这儿点名，列表里就不用每行再贴一次标签 */}
              <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-[var(--line)] bg-[var(--bg)] px-8 py-1.5 text-[11px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
                <span className="w-9 flex-none">#</span>
                <span className="w-[132px] flex-none">规则</span>
                <span className="w-[18px] flex-none" title="潜力：世界观天花板">
                  潜
                </span>
                <span className="w-[26px] flex-none" title="可写性：第一章的地板">
                  写
                </span>
                <span className="w-4 flex-none" title="可具身化">
                  具
                </span>
                <span className="hidden min-w-0 flex-1 md:block">改写方向</span>
                <span className="hidden w-[76px] flex-none md:block">市场</span>
                <span className="w-5 flex-none" />
              </div>
              <ul>
                {list.map((r) => (
                  <li
                    key={r.id}
                    className={cx(
                      'group flex items-center gap-3 border-b border-[var(--line-soft)] px-8 transition-colors',
                      sel === r.id ? 'bg-[var(--bg-sunk)]' : 'hover:bg-[var(--bg-sunk)]/60',
                    )}
                  >
                    {/* 选中和「加入组合台」是两个独立按钮——
                        原来后者是嵌在 button 里的 span onClick，非法嵌套且键盘到不了 */}
                    <button
                      onClick={() => setSel(r.id)}
                      aria-current={sel === r.id}
                      className="flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left"
                    >
                      <span className="num w-9 flex-none text-[12px] text-[var(--text-faint)]">{r.id}</span>
                      <span className="w-[132px] flex-none truncate text-[14px] font-medium">{r.name}</span>
                      <Ticks n={r.star} label={`潜力 ${r.star} / 5`} />
                      <Rung n={r.writability} label={`可写性 ${r.writability} / 5`} />
                      <span className="w-4 flex-none text-[12px] text-[var(--color-celadon)]">
                        {r.embodiable ? '握' : ''}
                      </span>
                      <span className="hidden min-w-0 flex-1 truncate text-[14px] text-[var(--text-dim)] md:block">{r.change}</span>
                      <span className="hidden w-[76px] flex-none md:block">
                        <Chip tone={MARKET_TONE[r.market]} className="w-full justify-center">
                          {r.market}
                        </Chip>
                      </span>
                    </button>
                    <button
                      onClick={() => toggleSlot(r.id)}
                      aria-pressed={slots.includes(r.id)}
                      aria-label={`${slots.includes(r.id) ? '移出' : '加入'}组合台：${r.name}`}
                      title="加入组合台"
                      className={cx(
                        'flex h-5 w-5 flex-none items-center justify-center rounded-[2px] border text-[14px] transition-colors',
                        slots.includes(r.id)
                          ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--on-accent)]'
                          : 'border-[var(--line)] text-[var(--text-faint)] opacity-0 hover:border-[var(--accent)] focus-visible:opacity-100 group-hover:opacity-100',
                      )}
                    >
                      +
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <aside className="w-full flex-none overflow-y-auto border-t border-[var(--line-soft)] lg:w-[360px] lg:border-l lg:border-t-0 xl:w-[420px]">
          {current ? <RuleDetail key={current.id} rule={current} books={books} /> : (
            <div className="px-7 py-10">
              <Eyebrow>规则详情</Eyebrow>
              <p className="mt-3 text-[14px] leading-relaxed text-[var(--text-dim)]">
                选一条规则看它的改写方向、一句话爽点、最小可写场景与五问推演。
              </p>
              <p className="mt-4 text-[12px] leading-relaxed text-[var(--text-faint)]">
                「一句话爽点」是结局的截图，「最小可写场景」是开场的切口——
                <br />
                缺了前者不知道往哪写，缺了后者不知道从哪起笔。
              </p>
            </div>
          )}
        </aside>
      </div>

      {/* 组合台 */}
      {slotRules.length > 0 && (
        <div className="seat flex-none border-t border-[var(--line)] bg-[var(--surface)] px-8 py-3.5">
          <div className="flex items-center gap-4">
            <Eyebrow className="flex-none">组合台 {slotRules.length}/3</Eyebrow>
            <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
              {slotRules.map((r) => (
                <button
                  key={r.id}
                  onClick={() => toggleSlot(r.id)}
                  className="flex items-center gap-1.5 rounded-[2px] border border-[var(--line)] px-2 py-1 text-[14px] hover:border-[var(--accent)]"
                >
                  {r.name}
                  <span className="text-[var(--text-faint)]">×</span>
                </button>
              ))}
            </div>
            <div className="flex flex-none items-center gap-3 text-[12px]">
              {slotRules.length >= 2 &&
                (shared.length ? (
                  <Chip tone="good">共享概念 {shared.join('·')}</Chip>
                ) : (
                  <Chip tone="accent">无共享概念 · 世界会散装</Chip>
                ))}
              {!hasEmbodiable && <Chip tone="accent">整组无可具身化规则</Chip>}
              {slotRules.length >= 4 && <Chip tone="accent">4 条以上＝事故现场</Chip>}
              <Button size="sm" variant="quiet" onClick={() => setSlots([])}>
                清空
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Ruler({
  label,
  value,
  onChange,
  tone,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  tone: 'accent' | 'good'
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[14px] text-[var(--text-faint)]">{label}≥</span>
      {/* 筛选器跟着列表的形状走：潜力是阶梯，可写是平条 */}
      <div className={cx('flex gap-[3px]', tone === 'accent' ? 'items-end' : 'items-center')}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onChange(value === n ? 0 : n)}
            aria-pressed={n <= value}
            aria-label={`${label} ≥ ${n}`}
            className="w-[6px] transition-colors"
            style={{
              height: tone === 'accent' ? 6 + n * 3 : 6,
              background:
                n <= value
                  ? tone === 'accent'
                    ? 'var(--accent)'
                    : 'var(--color-celadon)'
                  : 'var(--line)',
            }}
            title={`${label} ≥ ${n}`}
          />
        ))}
      </div>
    </div>
  )
}

function RuleDetail({ rule: r, books }: { rule: Rule; books: Project[] }) {
  const [market, setMarket] = useState(r.market)
  const [used, setUsed] = useState(r.market_used ?? '')
  const [gap, setGap] = useState(r.market_gap ?? '')
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  const MICRO = ['催生行业', '谁获利最多', '谁损失最大', '新权力来源', '最激烈冲突']

  return (
    <div className="seat seat-r px-7 py-6">
      <div className="flex items-baseline gap-2">
        <span className="num text-[12px] text-[var(--text-faint)]">#{r.id}</span>
        <h2 className="text-[18px] font-semibold tracking-tight">{r.name}</h2>
      </div>
      <div className="mt-1 text-[12px] text-[var(--text-faint)]">{r.domain}</div>

      <div className="mt-4 flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-[14px] text-[var(--text-dim)]">
          潜力 <Ticks n={r.star} /> <span className="num">{r.star}</span>
        </span>
        <span className="flex items-center gap-1.5 text-[14px] text-[var(--text-dim)]">
          可写 <Rung n={r.writability} /> <span className="num">{r.writability}</span>
        </span>
        {r.embodiable && <Chip tone="good">可具身化</Chip>}
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {r.tags.map((on, i) => on && <Chip key={i}>{TAG_NAMES[i]}</Chip>)}
      </div>

      <Block label="现实规则">{r.real}</Block>
      <Block label="改写方向">{r.change}</Block>
      {r.hook && (
        <Block label="一句话爽点 · 结局原型" tone="accent">
          {r.hook}
        </Block>
      )}
      {r.scene && (
        <Block label="最小可写场景 · 开场切口" tone="good">
          {r.scene}
        </Block>
      )}

      <div className="mt-6">
        <Eyebrow>挂载概念</Eyebrow>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {r.concepts.map((c) => (
            <a key={c} href={`/graph?focus=${encodeURIComponent(c)}`} className="rounded-[2px] border border-[var(--line)] px-2 py-[3px] text-[14px] text-[var(--text-dim)] hover:border-[var(--accent)] hover:text-[var(--accent)]">
              {c}
            </a>
          ))}
        </div>
      </div>

      {r.micro.some(Boolean) && (
        <div className="mt-6">
          <Eyebrow>微型世界</Eyebrow>
          <dl className="mt-2 space-y-2">
            {r.micro.map(
              (v, i) =>
                v && (
                  <div key={i} className="flex gap-3 text-[14px]">
                    <dt className="w-[68px] flex-none text-[var(--text-faint)]">{MICRO[i]}</dt>
                    <dd className="flex-1 leading-relaxed text-[var(--text-dim)]">{v}</dd>
                  </div>
                ),
            )}
          </dl>
        </div>
      )}

      {r.deep && (
        <div className="mt-6">
          <Eyebrow>五问深度推演</Eyebrow>
          <div className="mt-2 space-y-3">
            {[
              ['① 社会剧变', r.deep.q1],
              ['② 谁受益 · 谁受损', r.deep.q2],
              ['③ 新权力结构', r.deep.q3],
              ['④ 最激烈的冲突', r.deep.q4],
              ['⑤ 爽点在哪', r.deep.q5],
              ['故事切口', r.deep.story],
            ].map(
              ([k, v]) =>
                v && (
                  <div key={k}>
                    <div className="text-[12px] font-medium text-[var(--text-faint)]">{k}</div>
                    <p className="mt-1 text-[14px] leading-[1.8] text-[var(--text-dim)]">{v}</p>
                  </div>
                ),
            )}
          </div>
        </div>
      )}

      {/* 市场占用：关口零 */}
      <div className="mt-7 border border-[var(--line-soft)] p-4">
        <Eyebrow>市场占用 · 关口零</Eyebrow>
        <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--text-faint)]">
          「未评估」不等于安全，只等于没查过。查完必须回写——一次调研的成本只付一次。
        </p>
        <div className="mt-3 flex gap-1">
          {MARKETS.map((m) => (
            <button
              key={m}
              onClick={() => {
                setMarket(m)
                setSaved(false)
              }}
              className={cx(
                'flex-1 rounded-[2px] border px-1.5 py-1 text-[12px] transition-colors',
                market === m
                  ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                  : 'border-[var(--line)] text-[var(--text-faint)] hover:border-[var(--text-faint)]',
              )}
            >
              {m}
            </button>
          ))}
        </div>
        <textarea
          value={used}
          onChange={(e) => {
            setUsed(e.target.value)
            setSaved(false)
          }}
          rows={2}
          placeholder="已被写过：书名 + 它的规则差"
          className="field mt-2"
        />
        <textarea
          value={gap}
          onChange={(e) => {
            setGap(e.target.value)
            setSaved(false)
          }}
          rows={2}
          placeholder="留白方向：我的差异，一句话说清"
          className="field mt-2"
        />
        <div className="mt-2 flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              await setRuleMarket(r.id, market, used, gap)
              setBusy(false)
              setSaved(true)
            }}
          >
            回写规则笔记
          </Button>
          {saved && <span className="text-[12px] text-[var(--color-celadon)]">已回写</span>}
        </div>
      </div>

      {/* 加入作品 */}
      {books.length > 0 && (
        <div className="mt-5">
          <Eyebrow>选为本书规则</Eyebrow>
          <div className="mt-2 space-y-1.5">
            {books.map((b) => (
              <div key={b.id} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-[14px] text-[var(--text-dim)]">{b.title}</span>
                <Button size="sm" variant="quiet" onClick={() => pickRule(b.id, r.id, '主规则')}>
                  主
                </Button>
                <Button size="sm" variant="quiet" onClick={() => pickRule(b.id, r.id, '辅规则')}>
                  辅
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {r.field_notes && (
        <div className="mt-6">
          <Eyebrow>实战记录</Eyebrow>
          <p className="mt-1.5 whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--text-dim)]">
            {r.field_notes}
          </p>
        </div>
      )}
    </div>
  )
}

function Block({
  label,
  children,
  tone,
}: {
  label: string
  children: React.ReactNode
  tone?: 'accent' | 'good'
}) {
  return (
    <div className="mt-5">
      <Eyebrow>{label}</Eyebrow>
      <p
        className="mt-1.5 text-[14px] leading-[1.8]"
        style={{
          color:
            tone === 'accent' ? 'var(--accent)' : tone === 'good' ? 'var(--color-celadon)' : 'var(--text-dim)',
        }}
      >
        {children}
      </p>
    </div>
  )
}
