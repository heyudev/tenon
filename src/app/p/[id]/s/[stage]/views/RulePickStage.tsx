'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { ProjectRule, Rule } from '@/lib/types'
import type { StageViewProps } from './GenericStage'
import StageFrame, { useAutoSave } from '@/components/stage/StageFrame'
import { FieldView } from '@/components/stage/Fields'
import { pickRule, unpickRule, updateProjectRule } from '@/lib/actions'
import { Button, Chip, Eyebrow, Rung, Ticks, cx } from '@/components/ui'

const OPERATORS = ['反转', '量化', '交易化', '垄断化', '隐藏化']
const MARKET_TONE: Record<string, 'good' | 'neutral' | 'warn' | 'accent' | 'mute'> = {
  空白: 'good', 零星: 'neutral', 密集: 'warn', 红海: 'accent', 未评估: 'mute',
}

export default function RulePickStage({
  stage,
  projectId,
  state,
  cards,
  weight,
  autos,
  progress,
  rules,
  picked,
}: StageViewProps & { rules: Rule[]; picked: ProjectRule[] }) {
  const form = useAutoSave(projectId, stage.id, state.data)
  const [q, setQ] = useState('')
  const [showPicker, setShowPicker] = useState(picked.length === 0)

  const main = picked.filter((p) => p.role === '主规则')
  const shared = picked.length >= 2
    ? picked.map((p) => new Set(p.rule?.concepts ?? [])).reduce((a, b) => new Set([...a].filter((x) => b.has(x))))
    : new Set<string>()
  const hasEmbodiable = picked.some((p) => p.rule?.embodiable)
  const unchecked = picked.filter((p) => p.rule?.market === '未评估')

  const candidates = q.trim()
    ? rules
        .filter((r) => !picked.some((p) => p.rule_id === r.id))
        .filter((r) =>
          [r.name, r.change, r.real, r.concepts.join('')].some((s) => s.toLowerCase().includes(q.trim().toLowerCase())),
        )
        .slice(0, 40)
    : rules
        .filter((r) => !picked.some((p) => p.rule_id === r.id))
        .filter((r) => r.writability === 5 && r.embodiable)
        .slice(0, 40)

  return (
    <StageFrame
      stage={stage}
      projectId={projectId}
      gate={state.gate}
      cards={cards}
      weight={weight} autos={autos} progress={progress}
      aside={
        <section>
          <Eyebrow>组合体检</Eyebrow>
          <div className="mt-2.5 space-y-2">
            <Row ok={main.length === 1} bad={main.length !== 1}>
              主规则 {main.length} 条 {main.length === 1 ? '' : '（只能有 1 条）'}
            </Row>
            <Row ok={picked.length - main.length <= 2}>
              辅规则 {picked.length - main.length} 条（≤2）
            </Row>
            <Row ok={picked.length < 2 || shared.size > 0} bad={picked.length >= 2 && shared.size === 0}>
              {picked.length < 2
                ? '共享概念：待第二条规则'
                : shared.size
                  ? `共享概念 ${[...shared].join('·')}`
                  : '无共享概念 → 世界会散装'}
            </Row>
            <Row ok={hasEmbodiable} bad={picked.length > 0 && !hasEmbodiable}>
              {hasEmbodiable ? '有可具身化规则' : '整组无可具身化 → 主角手里没有能握住的东西'}
            </Row>
            <Row ok={unchecked.length === 0} bad={unchecked.length > 0}>
              {unchecked.length ? `${unchecked.length} 条未做查重` : '全部已评估市场占用'}
            </Row>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-[var(--text-faint)]">
            查重在<Link href="/rulebase" className="text-[var(--accent)]">规则库</Link>页做——选中规则后在右栏回写「市场占用」。
          </p>
        </section>
      }
    >
      <div className="max-w-[820px]">
        {/* 已选规则 */}
        {picked.length > 0 && (
          <div className="space-y-3">
            {picked.map((p) => {
              const r = p.rule
              if (!r) return null
              return (
                <div key={r.id} className="frame-thin p-4">
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => updateProjectRule(projectId, r.id, { role: p.role === '主规则' ? '辅规则' : '主规则' })}
                      className={cx(
                        'rounded-[2px] border px-2 py-[3px] text-[12px] transition-colors',
                        p.role === '主规则'
                          ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                          : 'border-[var(--line)] text-[var(--text-faint)]',
                      )}
                    >
                      {p.role}
                    </button>
                    <span className="text-[14px] font-medium">{r.name}</span>
                    <span className="num text-[12px] text-[var(--text-faint)]">#{r.id}</span>
                    <Ticks n={r.star} />
                    <Rung n={r.writability} />
                    {r.embodiable && <Chip tone="good">可具身化</Chip>}
                    <Chip tone={MARKET_TONE[r.market]}>{r.market}</Chip>
                    <Button size="sm" variant="quiet" className="ml-auto" onClick={() => unpickRule(projectId, r.id)}>
                      移除
                    </Button>
                  </div>

                  <div className="mt-2.5 grid grid-cols-2 gap-x-6 gap-y-2 text-[14px]">
                    <Kv k="现实规则">{r.real}</Kv>
                    <Kv k="改写方向">{r.change}</Kv>
                    <Kv k="一句话爽点" tone="accent">{r.hook}</Kv>
                    <Kv k="最小可写场景" tone="good">{r.scene}</Kv>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="text-[12px] text-[var(--text-faint)]">改写算子</span>
                    {OPERATORS.map((o) => (
                      <button
                        key={o}
                        onClick={() => updateProjectRule(projectId, r.id, { operator: p.operator === o ? null : o })}
                        className={cx(
                          'rounded-[2px] border px-2 py-[3px] text-[12px] transition-colors',
                          p.operator === o
                            ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                            : 'border-[var(--line)] text-[var(--text-faint)] hover:border-[var(--text-faint)]',
                        )}
                      >
                        {o}
                      </button>
                    ))}
                    <span className="ml-2 text-[12px] text-[var(--text-faint)]">
                      概念 {r.concepts.join('·')}
                    </span>
                  </div>

                  <textarea
                    defaultValue={p.rewritten ?? ''}
                    onBlur={(e) => updateProjectRule(projectId, r.id, { rewritten: e.target.value })}
                    rows={2}
                    placeholder="本书的改写一句话：当〔现实规则〕变成〔改写后规则〕……"
                    className="field mt-2.5"
                  />
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-4">
          <Button variant="ghost" size="sm" onClick={() => setShowPicker(!showPicker)}>
            {showPicker ? '收起候选' : '＋ 添加规则'}
          </Button>
        </div>

        {showPicker && (
          <div className="mt-3 border border-[var(--line-soft)]">
            <div className="flex items-center gap-2 border-b border-[var(--line-soft)] px-3 py-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="搜规则名 / 改写方向 / 概念"
                className="field h-8 flex-1"
              />
              <span className="text-[12px] text-[var(--text-faint)]">
                {q ? `${candidates.length} 条` : '默认列出可写性 ✍5 且可具身化的规则'}
              </span>
            </div>
            <div className="max-h-[380px] overflow-y-auto">
              {candidates.map((r) => (
                <div key={r.id} className="flex items-center gap-2.5 border-b border-[var(--line-soft)] px-3 py-2 last:border-0">
                  <span className="num w-8 flex-none text-[12px] text-[var(--text-faint)]">{r.id}</span>
                  <span className="w-[120px] flex-none truncate text-[14px] font-medium">{r.name}</span>
                  <Ticks n={r.star} />
                  <Rung n={r.writability} />
                  <span className="min-w-0 flex-1 truncate text-[14px] text-[var(--text-dim)]">{r.change}</span>
                  <Button size="sm" variant="quiet" onClick={() => pickRule(projectId, r.id, picked.length === 0 ? '主规则' : '辅规则')}>
                    选用
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 space-y-6">
          {stage.fields.map((f) => (
            <FieldView key={f.id} f={f} value={form.data[f.id]} onChange={(v) => form.set(f.id, v)} />
          ))}
        </div>
      </div>
    </StageFrame>
  )
}

function Row({ ok, bad, children }: { ok: boolean; bad?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-[14px] leading-relaxed">
      <span
        className="mt-[5px] h-1.5 w-1.5 flex-none rounded-full"
        style={{ background: bad ? 'var(--accent)' : ok ? 'var(--color-celadon)' : 'var(--line)' }}
      />
      <span style={{ color: bad ? 'var(--accent)' : 'var(--text-dim)' }}>{children}</span>
    </div>
  )
}

function Kv({ k, children, tone }: { k: string; children: React.ReactNode; tone?: 'accent' | 'good' }) {
  if (!children) return null
  return (
    <div>
      <div className="eyebrow">{k}</div>
      <div
        className="mt-0.5 leading-relaxed"
        style={{ color: tone === 'accent' ? 'var(--accent)' : tone === 'good' ? 'var(--color-celadon)' : 'var(--text-dim)' }}
      >
        {children}
      </div>
    </div>
  )
}
