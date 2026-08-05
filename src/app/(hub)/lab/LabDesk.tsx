'use client'

import { useState } from 'react'
import type { Lab, Resource } from '@/lib/types'
import { Eyebrow, Segmented, cx } from '@/components/ui'

const FIELDS: { k: keyof Lab; label: string; hint: string }[] = [
  { k: 'core', label: '核心设定', hint: '这个文明的一句话本体' },
  { k: 'law', label: '法律', hint: '国家为这条规则立了什么法' },
  { k: 'biz', label: '商业与职业', hint: '合法这一侧长出的机构与工种' },
  { k: 'black', label: '黑市', hint: '非法那一侧长出的东西——想不出黑市说明规则没咬进生活' },
  { k: 'war', label: '最激烈的冲突', hint: '结构自动生成的那场戏' },
  { k: 'hook', label: '主角与故事钩子', hint: '谁站在交点上' },
]

type Mode = 'civ' | 'field' | 'flow'

export default function LabDesk({ labs, resources }: { labs: Lab[]; resources: Resource[] }) {
  const [mode, setMode] = useState<Mode>('civ')
  const [civ, setCiv] = useState(labs[0]?.id ?? 0)
  const [field, setField] = useState<keyof Lab>('black')

  const cur = labs.find((l) => l.id === civ) ?? labs[0]
  const curField = FIELDS.find((f) => f.k === field)!

  return (
    <div className="flex h-full flex-col">
      <header className="flex-none border-b border-[var(--line-soft)] px-8 pb-4 pt-6">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="display flex-none whitespace-nowrap text-[26px] tracking-tight">组合实验室</h1>
          <span className="text-[14px] text-[var(--text-faint)]">
            规则不相加，<span className="text-[var(--accent)]">相乘</span>——价值在两条传导路径相交处长出的新东西
          </span>
        </div>
        <div className="mt-4">
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: 'civ', label: '按文明' },
              { value: 'field', label: '按要素横比' },
              { value: 'flow', label: '资源流' },
            ]}
          />
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-[var(--text-faint)]">
          {mode === 'civ' && '一个文明的六个切面。交点处的矛盾就是它独有的结构，单条规则推不出来。'}
          {mode === 'field' && `同一个切面横着看 ${labs.length} 个文明——对照才看得出哪种改写更有咬合力。`}
          {mode === 'flow' && '不要设计能力，设计资源流。能力是表现层，资源是本体层——能力全部换皮，只要资源流不变，故事结构完全成立。'}
        </p>
      </header>

      {mode === 'flow' ? (
        <div className="min-h-0 flex-1 overflow-auto px-8 py-6">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-[var(--line)]">
                {['资源', '产生源头', '流动路径', '沉淀形态', '黑市形态', '世界观类比'].map((h) => (
                  <th key={h} className="eyebrow whitespace-nowrap py-2 pr-4 text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resources.map((r) => (
                <tr key={r.name} className="border-b border-[var(--line-soft)]">
                  <td className="whitespace-nowrap py-2.5 pr-4 font-medium">{r.name}</td>
                  <td className="py-2.5 pr-4 text-[var(--text-dim)]">{r.origin}</td>
                  <td className="py-2.5 pr-4 text-[var(--text-dim)]">{r.path}</td>
                  <td className="py-2.5 pr-4 text-[var(--text-dim)]">{r.sink}</td>
                  <td className="py-2.5 pr-4 text-[var(--text-dim)]">{r.black}</td>
                  <td className="py-2.5 text-[var(--text-faint)]">{r.analogy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* 左：选谁 */}
          <nav className="w-full flex-none overflow-y-auto border-b border-[var(--line-soft)] lg:w-[260px] lg:border-b-0 lg:border-r">
            {mode === 'civ'
              ? labs.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setCiv(l.id)}
                    aria-current={l.id === cur?.id}
                    className={cx(
                      'relative block w-full border-b border-[var(--line-soft)] px-6 py-3 text-left transition-colors last:border-b-0',
                      l.id === cur?.id ? 'bg-[var(--bg-sunk)]' : 'hover:bg-[var(--bg-sunk)]/60',
                    )}
                  >
                    {l.id === cur?.id && <span className="absolute left-0 top-0 h-full w-[3px] bg-[var(--accent)]" />}
                    <div className="text-[14px] font-medium">{l.name}</div>
                    <div className="mt-0.5 truncate text-[12px] text-[var(--text-faint)]">{l.combo}</div>
                  </button>
                ))
              : FIELDS.map((f) => (
                  <button
                    key={f.k}
                    onClick={() => setField(f.k)}
                    aria-current={f.k === field}
                    className={cx(
                      'relative block w-full border-b border-[var(--line-soft)] px-6 py-3 text-left transition-colors last:border-b-0',
                      f.k === field ? 'bg-[var(--bg-sunk)]' : 'hover:bg-[var(--bg-sunk)]/60',
                    )}
                  >
                    {f.k === field && <span className="absolute left-0 top-0 h-full w-[3px] bg-[var(--accent)]" />}
                    <div className="text-[14px] font-medium">{f.label}</div>
                    <div className="mt-0.5 text-[12px] leading-relaxed text-[var(--text-faint)]">{f.hint}</div>
                  </button>
                ))}
          </nav>

          {/* 右：看内容 */}
          <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
            {mode === 'civ' && cur && (
              <article key={cur.id} className="seat max-w-[760px]">
                <h2 className="display text-[26px]">{cur.name}</h2>
                <p className="mt-1 text-[12px] text-[var(--text-faint)]">{cur.combo}</p>
                <dl className="mt-6 space-y-5">
                  {FIELDS.map((f) => {
                    const v = cur[f.k] as string
                    if (!v) return null
                    return (
                      <div key={f.k}>
                        <dt className="eyebrow">{f.label}</dt>
                        <dd className="mt-1.5 text-[14px] leading-[1.8] text-[var(--text-dim)]">{v}</dd>
                      </div>
                    )
                  })}
                </dl>
              </article>
            )}

            {mode === 'field' && (
              <div key={field} className="seat max-w-[860px]">
                <h2 className="display text-[26px]">{curField.label}</h2>
                <p className="mt-1 text-[12px] text-[var(--text-faint)]">{curField.hint}</p>
                <dl className="mt-6 space-y-4">
                  {labs.map((l) => {
                    const v = l[field] as string
                    if (!v) return null
                    return (
                      <div key={l.id} className="frame-thin px-5 py-4">
                        <dt className="flex items-baseline gap-2.5">
                          <span className="text-[14px] font-medium">{l.name}</span>
                          <span className="truncate text-[12px] text-[var(--text-faint)]">{l.combo}</span>
                        </dt>
                        <dd className="mt-1.5 text-[14px] leading-[1.8] text-[var(--text-dim)]">{v}</dd>
                      </div>
                    )
                  })}
                </dl>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
