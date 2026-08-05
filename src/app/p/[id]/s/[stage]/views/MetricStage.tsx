'use client'

import { useMemo, useState } from 'react'
import type { Chapter, Metric } from '@/lib/types'
import type { StageViewProps } from './GenericStage'
import StageFrame, { useAutoSave } from '@/components/stage/StageFrame'
import { FieldView } from '@/components/stage/Fields'
import { saveMetric } from '@/lib/actions'
import { Eyebrow, cx } from '@/components/ui'

const FANQIE = [
  { id: 'finish', label: '完读率', healthy: (v: number, no: number) => (no <= 3 ? v >= 60 : v >= 75), hint: '前 3 章 >60%，常规章 >75%' },
  { id: 'follow', label: '追读率', healthy: (v: number) => v >= 30, hint: '>30% 为佳' },
  { id: 'shelf', label: '加书架率', healthy: (v: number) => v >= 15, hint: '前 5 章 >15%' },
] as const

const QIDIAN = [
  { id: 'shelf', label: '收藏转化', healthy: (v: number) => v >= 10, hint: '点击→收藏' },
  { id: 'sub_first', label: '首订率', healthy: (v: number) => v >= 8, hint: '决定生死' },
  { id: 'sub_ratio', label: '追订/均订', healthy: (v: number) => v >= 70, hint: '<70% 说明近期内容在劝退老读者' },
] as const

export default function MetricStage({
  stage,
  projectId,
  state,
  cards,
  weight,
  autos,
  progress,
  platform,
  chapters,
  rows,
}: StageViewProps & { platform: string; chapters: Chapter[]; rows: Metric[] }) {
  const form = useAutoSave(projectId, stage.id, state.data)
  const [entry, setEntry] = useState<number | null>(null)
  const specs = platform === '番茄' ? FANQIE : QIDIAN
  const byNo = useMemo(() => new Map(rows.map((r) => [r.chapter_no, r])), [rows])

  // 流失尖峰：明显高于相邻章的流失
  const spikes = useMemo(() => {
    const s: number[] = []
    for (let i = 1; i < rows.length - 1; i++) {
      const d = rows[i].drop_off ?? 0
      const avg = ((rows[i - 1].drop_off ?? 0) + (rows[i + 1].drop_off ?? 0)) / 2
      if (d > 0 && d > avg * 1.6 && d - avg > 3) s.push(rows[i].chapter_no)
    }
    return s
  }, [rows])

  const span = Math.max(1, ...chapters.map((c) => c.no), ...rows.map((r) => r.chapter_no))

  return (
    <StageFrame
      stage={stage}
      projectId={projectId}
      gate={state.gate}
      cards={cards}
      weight={weight} autos={autos} progress={progress}
      aside={
        <section>
          <Eyebrow>健康线 · {platform}</Eyebrow>
          <div className="mt-2.5 space-y-2.5">
            {specs.map((s) => {
              const vals = rows.map((r) => r[s.id as keyof Metric] as number | null).filter((v): v is number => v != null)
              const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
              const ok = avg != null && s.healthy(avg, 10)
              return (
                <div key={s.id}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[14px] text-[var(--text-dim)]">{s.label}</span>
                    <span
                      className="num text-[14px]"
                      style={{ color: avg == null ? 'var(--text-faint)' : ok ? 'var(--color-celadon)' : 'var(--accent)' }}
                    >
                      {avg == null ? '—' : `${avg.toFixed(1)}%`}
                    </span>
                  </div>
                  <div className="text-[11px] text-[var(--text-faint)]">{s.hint}</div>
                </div>
              )
            })}
          </div>

          {spikes.length > 0 && (
            <p className="mt-4 rounded-[2px] border border-[var(--accent)]/30 bg-[var(--accent)]/6 px-3 py-2 text-[12px] leading-relaxed text-[var(--accent)]">
              流失尖峰：第 {spikes.join('、')} 章。尖峰章＝事故章，立即按决策树诊断——蓄能超期 / 爽点空转 / 信息增量为零的水章。
            </p>
          )}

          <p className="mt-4 text-[12px] leading-relaxed text-[var(--text-faint)]">
            样本量意识：前 100 个读者的数据只够判断"死没死"，不够判断"为什么"。章级诊断至少等该章 1000+ 展示。
          </p>
        </section>
      }
    >
      <div className="max-w-[880px]">
        {rows.length > 0 && (
          <>
            <Eyebrow>指标曲线</Eyebrow>
            <div className="mt-3 border border-[var(--line-soft)] p-5">
              <svg viewBox={`0 0 ${span * 10} 120`} className="h-[150px] w-full" preserveAspectRatio="none">
                {[25, 50, 75].map((y) => (
                  <line key={y} x1="0" y1={120 - y * 1.2} x2={span * 10} y2={120 - y * 1.2} stroke="var(--line-soft)" strokeWidth="0.5" />
                ))}
                {(['finish', 'follow'] as const).map((k, ki) => {
                  const pts = rows
                    .filter((r) => r[k] != null)
                    .map((r) => `${r.chapter_no * 10 - 5},${120 - (r[k] as number) * 1.2}`)
                  if (pts.length < 2) return null
                  return (
                    <polyline
                      key={k}
                      points={pts.join(' ')}
                      fill="none"
                      stroke={ki === 0 ? 'var(--accent)' : 'var(--color-celadon)'}
                      strokeWidth="1.4"
                      vectorEffect="non-scaling-stroke"
                    />
                  )
                })}
                {rows.map((r) =>
                  r.drop_off ? (
                    <rect
                      key={r.id}
                      x={r.chapter_no * 10 - 8}
                      y={120 - r.drop_off * 1.2}
                      width="6"
                      height={r.drop_off * 1.2}
                      fill={spikes.includes(r.chapter_no) ? 'var(--accent)' : 'var(--line)'}
                      opacity={spikes.includes(r.chapter_no) ? 0.8 : 0.5}
                    />
                  ) : null,
                )}
              </svg>
              <div className="mt-2 flex gap-4 text-[12px] text-[var(--text-faint)]">
                <span className="flex items-center gap-1.5">
                  <span className="h-[2px] w-4" style={{ background: 'var(--accent)' }} />
                  完读率
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-[2px] w-4" style={{ background: 'var(--color-celadon)' }} />
                  追读率
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2" style={{ background: 'var(--line)' }} />
                  章末流失
                </span>
              </div>
            </div>
          </>
        )}

        {/* 录入 */}
        <div className="mt-8">
          <Eyebrow>章级数据录入</Eyebrow>
          <div className="mt-3 max-h-[400px] overflow-y-auto border border-[var(--line-soft)]">
            <div className="sunk flex border-b border-[var(--line-soft)] px-3 py-1.5">
              <span className="eyebrow w-10 flex-none">章</span>
              <span className="eyebrow w-[132px] flex-none">设计</span>
              {specs.map((s) => (
                <span key={s.id} className="eyebrow flex-1">
                  {s.label}
                </span>
              ))}
              <span className="eyebrow flex-1">章末流失</span>
            </div>
            {chapters.map((c) => {
              const m = byNo.get(c.no)
              return (
                <div
                  key={c.id}
                  className={cx(
                    'flex items-center border-b border-[var(--line-soft)] px-3 py-1 last:border-0',
                    spikes.includes(c.no) && 'bg-[var(--accent)]/6',
                  )}
                  onFocus={() => setEntry(c.no)}
                >
                  <span className="num w-10 flex-none text-[12px] text-[var(--text-faint)]">{c.no}</span>
                  <span className="w-[132px] flex-none truncate text-[12px] text-[var(--text-faint)]">
                    {c.beat}
                    {c.hook_type ? ` · ${c.hook_type}` : ''}
                  </span>
                  {specs.map((s) => (
                    <input
                      key={s.id}
                      type="number"
                      defaultValue={(m?.[s.id as keyof Metric] as number) ?? ''}
                      onBlur={(e) =>
                        saveMetric(projectId, c.no, { [s.id]: e.target.value ? Number(e.target.value) : null })
                      }
                      placeholder="—"
                      className="mr-2 min-w-0 flex-1 bg-transparent py-1 text-[14px] outline-none"
                    />
                  ))}
                  <input
                    type="number"
                    defaultValue={m?.drop_off ?? ''}
                    onBlur={(e) => saveMetric(projectId, c.no, { drop_off: e.target.value ? Number(e.target.value) : null })}
                    placeholder="—"
                    className="min-w-0 flex-1 bg-transparent py-1 text-[14px] outline-none"
                  />
                </div>
              )
            })}
          </div>
          <p className="mt-2 text-[12px] text-[var(--text-faint)]">数值填百分比数字，例如 76.5。{entry ? `当前第 ${entry} 章` : ''}</p>
        </div>

        {stage.fields.length > 0 && (
          <div className="mt-8 space-y-6">
            {stage.fields.map((f) => (
              <FieldView key={f.id} f={f} value={form.data[f.id]} onChange={(v) => form.set(f.id, v)} />
            ))}
          </div>
        )}
      </div>
    </StageFrame>
  )
}
