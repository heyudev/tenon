'use client'

import { useMemo, useState } from 'react'
import type { Thread } from '@/lib/types'
import type { StageViewProps } from './GenericStage'
import StageFrame from '@/components/stage/StageFrame'
import { addThread, removeThread, updateThread } from '@/lib/actions'
import { Button, Chip, Eyebrow, Meter, cx } from '@/components/ui'

const LEVELS = ['章级', '卷级', '书级'] as const
const STATUSES = ['已埋设', '已强化', '已回收', '已废弃'] as const
const LEVEL_HUE: Record<string, number> = { 章级: 200, 卷级: 38, 书级: 8 }

export default function ThreadStage({
  stage,
  projectId,
  state,
  cards,
  weight,
  autos,
  progress,
  items,
  chapterCount,
}: StageViewProps & { items: Thread[]; chapterCount: number }) {
  const [draft, setDraft] = useState('')
  const [sel, setSel] = useState<string | null>(null)

  const span = Math.max(chapterCount, 40, ...items.map((t) => Math.max(t.plan_ch ?? 0, t.actual_ch ?? 0, t.planted_ch ?? 0)))
  const open = items.filter((t) => t.status === '已埋设' || t.status === '已强化')
  const noPlan = open.filter((t) => !t.plan_ch)
  const mix = useMemo(() => {
    const n = items.length || 1
    return LEVELS.map((l) => ({ l, pct: items.filter((t) => t.level === l).length / n, n: items.filter((t) => t.level === l).length }))
  }, [items])
  const book = items.filter((t) => t.level === '书级')

  const cur = items.find((t) => t.id === sel)

  return (
    <StageFrame
      stage={stage}
      projectId={projectId}
      gate={state.gate}
      cards={cards}
      weight={weight} autos={autos} progress={progress}
      aside={
        <section>
          <Eyebrow>账本体检</Eyebrow>
          <div className="mt-3 space-y-3">
            {mix.map(({ l, pct, n }) => {
              const target = l === '章级' ? 0.7 : l === '卷级' ? 0.25 : 0.05
              const off = Math.abs(pct - target) > 0.2
              return (
                <div key={l}>
                  <div className="flex items-baseline justify-between text-[14px]">
                    <span className="text-[var(--text-dim)]">{l}</span>
                    <span className="num text-[var(--text-faint)]">
                      {n} · {Math.round(pct * 100)}%
                      <span className="ml-1 opacity-60">/ {Math.round(target * 100)}%</span>
                    </span>
                  </div>
                  <Meter value={pct} max={1} tone={off ? 'warn' : 'mute'} className="mt-1" />
                </div>
              )
            })}
          </div>
          <div className="mt-4 space-y-2 text-[14px] leading-relaxed">
            <div className={noPlan.length ? 'text-[var(--accent)]' : 'text-[var(--text-dim)]'}>
              {noPlan.length ? `${noPlan.length} 条没有计划回收章` : '全部有计划回收章'}
            </div>
            <div className={book.length >= 1 && book.length <= 3 ? 'text-[var(--text-dim)]' : 'text-[var(--accent)]'}>
              书级悬念 {book.length} 条（应为 1-3）
            </div>
            <div className="text-[var(--text-dim)]">未回收 {open.length} 条</div>
          </div>
          <p className="mt-4 text-[12px] leading-relaxed text-[var(--text-faint)]">
            揭晓纪律：每揭一个旧悬念，同场景埋一个新悬念（好奇心账户永不清零）。书级悬念的线索每卷至少露头一次，否则回收时读者已无记忆、无爽感。
          </p>
        </section>
      }
    >
      <div className="max-w-[900px]">
        <div className="flex gap-1.5">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && draft.trim()) {
                addThread(projectId, draft.trim(), '章级')
                setDraft('')
              }
            }}
            placeholder="新增悬念 / 伏笔，回车"
            className="field h-8"
          />
        </div>

        {items.length === 0 ? (
          <p className="mt-6 text-[14px] text-[var(--text-faint)]">
            账本还空着。开户时建议 10-15 条，配比大致 70% 章级 / 25% 卷级 / 1-3 条书级。
          </p>
        ) : (
          <>
            {/* 甘特 */}
            <div className="mt-6">
              <div className="flex items-baseline justify-between">
                <Eyebrow>埋收甘特</Eyebrow>
                <span className="text-[12px] text-[var(--text-faint)]">1 — {span} 章</span>
              </div>
              <div className="mt-3 space-y-[3px]">
                {items.map((t) => {
                  const from = t.planted_ch ?? 0
                  const to = t.actual_ch ?? t.plan_ch ?? span
                  const overdue = !t.actual_ch && t.plan_ch != null && chapterCount > t.plan_ch
                  const done = t.status === '已回收'
                  const dropped = t.status === '已废弃'
                  const hue = LEVEL_HUE[t.level]
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSel(t.id === sel ? null : t.id)}
                      className={cx(
                        'group flex w-full items-center gap-2.5 rounded-[2px] px-1.5 py-1 text-left transition-colors',
                        sel === t.id ? 'bg-[var(--bg-sunk)]' : 'hover:bg-[var(--bg-sunk)]/60',
                      )}
                    >
                      <span className="num w-[46px] flex-none text-[12px] text-[var(--text-faint)]">{t.fid}</span>
                      <span className="w-[168px] flex-none truncate text-[14px] text-[var(--text-dim)]">{t.content}</span>
                      <span className="relative h-[14px] min-w-0 flex-1 rounded-sm bg-[var(--line-soft)]">
                        <span
                          className="absolute inset-y-0 rounded-sm transition-[width,left,right] duration-300 [transition-timing-function:var(--ease-seat)]"
                          style={{
                            left: `${(from / span) * 100}%`,
                            width: `${Math.max(1.5, ((to - from) / span) * 100)}%`,
                            background: dropped
                              ? 'var(--line)'
                              : overdue
                                ? 'var(--accent)'
                                : `hsl(${hue} 42% 50% / ${done ? 0.85 : 0.4})`,
                            outline: done ? `1px solid hsl(${hue} 46% 55%)` : undefined,
                          }}
                        />
                        {t.reinforced.map((c) => (
                          <span
                            key={c}
                            className="absolute top-1/2 h-[7px] w-[2px] -translate-y-1/2 rounded-full bg-[var(--bg)]"
                            style={{ left: `${(c / span) * 100}%` }}
                          />
                        ))}
                      </span>
                      <span className="w-[52px] flex-none text-right text-[11px] text-[var(--text-faint)]">
                        {overdue ? <span className="text-[var(--accent)]">逾期</span> : t.status}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 详情 */}
            {cur && (
              <div key={cur.id} className="seat mt-6 border border-[var(--line-soft)] p-5">
                <div className="flex items-center gap-2.5">
                  <span className="num text-[14px] text-[var(--text-faint)]">{cur.fid}</span>
                  <div className="flex gap-1">
                    {LEVELS.map((l) => (
                      <button
                        key={l}
                        onClick={() => updateThread(projectId, cur.id, { level: l })}
                        className={cx(
                          'rounded-[2px] border px-2 py-[3px] text-[12px]',
                          cur.level === l
                            ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                            : 'border-[var(--line)] text-[var(--text-faint)]',
                        )}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                  <div className="ml-3 flex gap-1">
                    {STATUSES.map((s) => (
                      <button
                        key={s}
                        onClick={() => updateThread(projectId, cur.id, { status: s })}
                        className={cx(
                          'rounded-[2px] border px-2 py-[3px] text-[12px]',
                          cur.status === s
                            ? 'border-[var(--color-celadon)] bg-[var(--color-celadon)]/10 text-[var(--color-celadon)]'
                            : 'border-[var(--line)] text-[var(--text-faint)]',
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <Button size="sm" variant="quiet" className="ml-auto" onClick={() => { removeThread(projectId, cur.id); setSel(null) }}>
                    删除
                  </Button>
                </div>

                <div className="mt-4 space-y-3">
                  <Fld label="悬念内容" v={cur.content} on={(v) => updateThread(projectId, cur.id, { content: v })} />
                  <Fld
                    label="读者可见线索"
                    hint="埋的时候读者看到的是什么（一句话、一个物件、一个反常反应）"
                    v={cur.clue}
                    on={(v) => updateThread(projectId, cur.id, { clue: v })}
                  />
                  <Fld label="真相" hint="回收时兑现什么，要超预期" v={cur.truth} on={(v) => updateThread(projectId, cur.id, { truth: v })} />
                  <div className="grid grid-cols-4 gap-3">
                    <Num label="埋设章" v={cur.planted_ch} on={(v) => updateThread(projectId, cur.id, { planted_ch: v })} />
                    <Num label="计划回收章" v={cur.plan_ch} on={(v) => updateThread(projectId, cur.id, { plan_ch: v })} />
                    <Num label="实际回收章" v={cur.actual_ch} on={(v) => updateThread(projectId, cur.id, { actual_ch: v })} />
                    <div>
                      <div className="mb-1.5 text-[14px] font-medium">强化章</div>
                      <input
                        defaultValue={cur.reinforced.join(',')}
                        onBlur={(e) =>
                          updateThread(projectId, cur.id, {
                            reinforced: e.target.value.split(',').map((x) => Number(x.trim())).filter((x) => x > 0),
                          })
                        }
                        placeholder="12,45"
                        className="field h-8"
                      />
                    </div>
                  </div>
                  {cur.status === '已废弃' && (
                    <Fld
                      label="为何放弃"
                      hint="废弃必须说明理由，不许无声消失"
                      v={cur.discard_why}
                      on={(v) => updateThread(projectId, cur.id, { discard_why: v })}
                    />
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </StageFrame>
  )
}

function Fld({ label, hint, v, on }: { label: string; hint?: string; v: string | null; on: (v: string) => void }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline gap-2">
        <span className="text-[14px] font-medium">{label}</span>
        {hint && <span className="text-[12px] text-[var(--text-faint)]">{hint}</span>}
      </div>
      <textarea defaultValue={v ?? ''} onBlur={(e) => on(e.target.value)} rows={2} className="field resize-y" />
    </div>
  )
}

function Num({ label, v, on }: { label: string; v: number | null; on: (v: number | null) => void }) {
  return (
    <div>
      <div className="mb-1.5 text-[14px] font-medium">{label}</div>
      <input
        type="number"
        defaultValue={v ?? ''}
        onBlur={(e) => on(e.target.value ? Number(e.target.value) : null)}
        className="field h-8"
      />
    </div>
  )
}

export { Chip }
