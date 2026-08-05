'use client'

import { useState } from 'react'
import {
  DIMENSIONS,
  KEY_DIFFS,
  OPERATORS,
  VENUES,
  VENUE_MAP,
  type DimensionId,
  type VenueId,
} from '@/lib/platform'
import { saveSetting } from '@/lib/actions'
import { Button, Chip, Eyebrow, cx } from '@/components/ui'

type Verified = Record<string, { v: string; d: string }>

/**
 * 阵地库。
 * 建模：阵地 = 运营商 × 频道。运营商层管商业模型，阵地层管读者与节奏。
 * 结构性知识直接给；易变数值只给"你要去查什么"和一个记录位。
 */
export default function PlatformDesk({ verified }: { verified: Record<string, Verified> }) {
  const [a, setA] = useState<VenueId>('fanqie-m')
  const [b, setB] = useState<VenueId>('qidian')
  const [dim, setDim] = useState<DimensionId | 'diff' | 'venue'>('venue')
  const [store, setStore] = useState(verified)
  const [dirty, setDirty] = useState(false)

  const va = VENUE_MAP[a]
  const vb = VENUE_MAP[b]
  const pair = [va, vb]

  const setVal = (opId: string, k: string, v: string) => {
    setStore((s) => ({ ...s, [opId]: { ...s[opId], [k]: { v, d: new Date().toISOString().slice(0, 10) } } }))
    setDirty(true)
  }
  const save = async () => {
    for (const [k, v] of Object.entries(store)) await saveSetting(`platform.verified.${k}`, JSON.stringify(v))
    setDirty(false)
  }

  return (
    <div className="mx-auto max-w-[1080px] px-10 py-12">
      <header>
        <h1 className="display text-[26px] tracking-tight">阵地库</h1>
        <p className="mt-1.5 max-w-[720px] text-[14px] leading-relaxed text-[var(--text-faint)]">
          <span className="text-[var(--accent)]">阵地 = 运营商 × 频道</span>，是一个单元不是两个独立选项——
          起点中文网本身就是男频站，女频在同集团的另外几个站；番茄男女频同一个 App，但分类、榜单、读者、题材各不相同。
          <br />
          运营商层管商业模型（钱、签约、上架、后台）；阵地层管读者画像、主流题材、节奏参数。
          <span className="text-[var(--color-ochre)]">分成、全勤、签约门槛这类会变的数值</span>只标出"你要去查什么"，查完自己填。
        </p>
      </header>

      {/* 阵地选择 */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="text-[12px] text-[var(--text-faint)]">对照</span>
        <VenuePick value={a} onChange={setA} />
        <span className="text-[var(--text-faint)]">vs</span>
        <VenuePick value={b} onChange={setB} />
        {dirty && (
          <Button size="sm" variant="solid" className="ml-auto" onClick={save}>
            保存核实结果
          </Button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {[
          { id: 'venue' as const, label: '阵地对照' },
          { id: 'diff' as const, label: '两类商业模型' },
          ...DIMENSIONS.map((d) => ({ id: d.id, label: d.label })),
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setDim(t.id)}
            className={cx(
              'rounded-[2px] px-2.5 py-[5px] text-[14px] transition-colors',
              dim === t.id ? 'bg-[var(--accent)]/12 font-medium text-[var(--accent)]' : 'text-[var(--text-dim)] hover:bg-[var(--bg-sunk)]',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 阵地层对照 */}
      {dim === 'venue' && (
        <div className="seat mt-6 grid grid-cols-2 gap-4">
          {pair.map((v) => (
            <div key={v.id} className="frame p-5">
              <div className="flex items-baseline gap-2">
                <span className="text-[18px] font-semibold">{v.name}</span>
                <Chip tone="mute">{v.channel}</Chip>
              </div>
              <div className="mt-1 text-[12px] text-[var(--text-faint)]">
                {OPERATORS[v.operator].name} · {OPERATORS[v.operator].biz}
              </div>
              <dl className="mt-4 space-y-3">
                <Kv k="定生死">{v.deathline}</Kv>
                <Kv k="读者画像">{v.readers}</Kv>
                <Kv k="核心指标">{v.metrics.join(' · ')}</Kv>
                <Kv k="单章字数">{`${v.words[0]}-${v.words[1]}　${v.wordsNote}`}</Kv>
                <Kv k="爽点红线">{`连续 ≥${v.maxBeatGap} 章无中爽；蓄能耐受 ${v.tensionWindow} 章`}</Kv>
                <Kv k="主流题材">{v.hotGenres.join(' · ')}</Kv>
              </dl>
              <div className="mt-4">
                <Eyebrow>硬规则</Eyebrow>
                <ul className="mt-1.5 space-y-1">
                  {v.hardRules.map((r) => (
                    <li key={r} className="text-[14px] leading-relaxed text-[var(--text-dim)]">· {r}</li>
                  ))}
                </ul>
              </div>
              {v.notes.length > 0 && (
                <div className="mt-4">
                  <Eyebrow>阵地特有</Eyebrow>
                  <dl className="mt-1.5 space-y-2.5">
                    {v.notes.map((f) => (
                      <FactRow key={f.k} f={f} rec={store[v.id]?.[f.k]} onSet={(val) => setVal(v.id, f.k, val)} />
                    ))}
                  </dl>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 两类商业模型的关键差异 */}
      {dim === 'diff' && (
        <div className="seat mt-6 overflow-hidden border border-[var(--line-soft)]">
          <div className="sunk flex border-b border-[var(--line-soft)] px-4 py-2">
            <span className="eyebrow w-[130px] flex-none">项</span>
            <span className="eyebrow flex-1">免费阅读 · 广告分成</span>
            <span className="eyebrow flex-1">付费订阅</span>
          </div>
          {KEY_DIFFS.map((k, i) => (
            <div key={i} className="border-b border-[var(--line-soft)] px-4 py-3 last:border-0">
              <div className="flex items-start">
                <span className="w-[130px] flex-none text-[14px] font-medium">{k.item}</span>
                <span className="flex-1 pr-4 text-[14px] leading-relaxed text-[var(--text-dim)]">{k.free}</span>
                <span className="flex-1 text-[14px] leading-relaxed text-[var(--text-dim)]">{k.paid}</span>
              </div>
              <p className="mt-1.5 pl-[130px] text-[12px] leading-relaxed text-[var(--text-faint)]">→ {k.note}</p>
            </div>
          ))}
        </div>
      )}

      {/* 运营商层某个维度 */}
      {dim !== 'venue' && dim !== 'diff' && (
        <div className="seat mt-6">
          <p className="text-[14px] text-[var(--text-faint)]">
            {DIMENSIONS.find((d) => d.id === dim)?.desc}
            <span className="opacity-70">这一层按运营商走，同一运营商下的各阵地共享</span>
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            {[...new Set(pair.map((v) => v.operator))].map((opId) => {
              const op = OPERATORS[opId]
              return (
                <div key={opId} className="frame p-5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[14px] font-semibold">{op.name}</span>
                    <span className="text-[12px] text-[var(--text-faint)]">{op.biz}</span>
                  </div>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--text-dim)]">{op.model}</p>
                  <dl className="mt-4 space-y-3.5">
                    {op[dim].map((f) => (
                      <FactRow key={f.k} f={f} rec={store[opId]?.[f.k]} onSet={(val) => setVal(opId, f.k, val)} />
                    ))}
                  </dl>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function VenuePick({ value, onChange }: { value: VenueId; onChange: (v: VenueId) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as VenueId)} className="field h-8 w-[170px] cursor-pointer text-[14px]">
      {VENUES.map((v) => (
        <option key={v.id} value={v.id}>
          {v.name}
        </option>
      ))}
    </select>
  )
}

function Kv({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="eyebrow">{k}</dt>
      <dd className="mt-0.5 text-[14px] leading-[1.75] text-[var(--text-dim)]">{children}</dd>
    </div>
  )
}

function FactRow({
  f,
  rec,
  onSet,
}: {
  f: { k: string; v: string; volatile?: boolean; why?: string }
  rec?: { v: string; d: string }
  onSet: (v: string) => void
}) {
  return (
    <div>
      <dt className="flex items-baseline gap-2">
        <span className="text-[14px] font-medium">{f.k}</span>
        {f.volatile && <Chip tone={rec?.v ? 'good' : 'warn'}>{rec?.v ? '已核实' : '待核实'}</Chip>}
      </dt>
      {f.v && <dd className="mt-1 text-[14px] leading-[1.75] text-[var(--text-dim)]">{f.v}</dd>}
      {f.volatile && (
        <dd className="mt-1.5">
          <input
            defaultValue={rec?.v ?? ''}
            onBlur={(e) => onSet(e.target.value)}
            placeholder="查到之后填这里"
            className="field h-8 text-[14px]"
          />
          {rec?.d && (
            <span className="mt-1 block text-[11px] text-[var(--text-faint)]">
              核实于 {rec.d} —— 平台会调，隔一段时间要复核
            </span>
          )}
        </dd>
      )}
      {f.why && <dd className="mt-1 text-[12px] leading-relaxed text-[var(--text-faint)]">为什么重要：{f.why}</dd>}
    </div>
  )
}
