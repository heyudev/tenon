'use client'

import { useMemo, useState } from 'react'
import type { Beat, Chapter, HookType, Thread, Volume } from '@/lib/types'
import type { Venue } from '@/lib/platform'
import type { StageViewProps } from './GenericStage'
import StageFrame from '@/components/stage/StageFrame'
import { addChapterRange, updateChapter } from '@/lib/actions'
import { Button, Chip, Eyebrow, cx } from '@/components/ui'

const BEATS: Beat[] = ['蓄能', '过渡', '微爽', '中爽', '大爽']
const BEAT_H: Record<Beat, number> = { 蓄能: 0.18, 过渡: 0.3, 微爽: 0.5, 中爽: 0.75, 大爽: 1 }
const HOOKS: HookType[] = ['危机钩', '悬念钩', '期待钩', '反转钩']
const HOOK_HUE: Record<string, number> = { 危机钩: 8, 悬念钩: 268, 期待钩: 38, 反转钩: 168 }
/** 钩子四型的目标配比，见方法论卡「断章钩子四型与使用纪律」 */
const HOOK_MIX: Record<string, number> = { 危机钩: 0.4, 悬念钩: 0.3, 期待钩: 0.2, 反转钩: 0.1 }

export default function BeatStage({
  stage,
  projectId,
  state,
  cards,
  weight,
  autos,
  progress,
  venue,
  vols,
  chapters,
  items,
}: StageViewProps & { venue: Venue; vols: Volume[]; chapters: Chapter[]; items: Thread[] }) {
  const [sel, setSel] = useState<number | null>(null)
  const [volId, setVolId] = useState<string>(vols[0]?.id ?? '')
  const [count, setCount] = useState(40)

  /** 排期自检：最大间隔看的是「中爽及以上」之间隔了几章。红线逐阵地不同，取阵地参数 */
  const limit = venue.maxBeatGap
  const audit = useMemo(() => {
    const sorted = [...chapters].sort((a, b) => a.no - b.no)
    let gap = 0
    let worst = { len: 0, from: 0, to: 0 }
    let start = sorted[0]?.no ?? 1
    for (const c of sorted) {
      if (c.beat === '中爽' || c.beat === '大爽') {
        if (gap > worst.len) worst = { len: gap, from: start, to: c.no }
        gap = 0
        start = c.no
      } else gap++
    }
    if (gap > worst.len) worst = { len: gap, from: start, to: sorted.at(-1)?.no ?? 0 }

    // 连续同型钩子
    const sameHook: number[] = []
    for (let i = 2; i < sorted.length; i++)
      if (
        sorted[i].hook_type &&
        sorted[i].hook_type === sorted[i - 1].hook_type &&
        sorted[i].hook_type === sorted[i - 2].hook_type
      )
        sameHook.push(sorted[i].no)

    const counts: Record<string, number> = {}
    for (const c of sorted) if (c.hook_type) counts[c.hook_type] = (counts[c.hook_type] ?? 0) + 1

    const beats: Record<string, number> = {}
    for (const c of sorted) beats[c.beat] = (beats[c.beat] ?? 0) + 1

    return { worst, sameHook, counts, beats, total: sorted.length }
  }, [chapters, limit])

  const overGap = audit.worst.len >= limit
  const cur = sel != null ? chapters.find((c) => c.no === sel) : null
  const maxNo = Math.max(0, ...chapters.map((c) => c.no))

  return (
    <StageFrame
      stage={stage}
      projectId={projectId}
      gate={state.gate}
      cards={cards}
      weight={weight} autos={autos} progress={progress}
      aside={
        <section>
          <Eyebrow>排期自检</Eyebrow>
          <div
            className={cx(
              'mt-2.5 border px-3.5 py-3',
              overGap ? 'border-[var(--accent)]/40 bg-[var(--accent)]/6' : 'border-[var(--line-soft)]',
            )}
          >
            <div className="text-[12px] text-[var(--text-faint)]">最大爽点间隔</div>
            <div
              className="num mt-1 text-[26px] font-light leading-none"
              style={{ color: overGap ? 'var(--accent)' : 'var(--color-celadon)' }}
            >
              {audit.worst.len}
              <span className="ml-1 text-[14px] text-[var(--text-faint)]">章</span>
            </div>
            {audit.worst.len > 0 && (
              <div className="mt-1.5 text-[12px] text-[var(--text-faint)]">
                第 {audit.worst.from} — {audit.worst.to} 章之间
              </div>
            )}
            <div className="mt-2 text-[12px] leading-relaxed text-[var(--text-faint)]">
              {venue.name} 红线：连续 ≥{limit} 章无中爽及以上
            </div>
            {overGap && (
              <p className="mt-2 text-[12px] leading-relaxed text-[var(--accent)]">
                超线。插入微型兑现，或把后面的爽点前移。总量达标不等于分布达标——低谷藏在两个中爽之间。
              </p>
            )}
          </div>

          <div className="mt-5">
            <Eyebrow>钩子四型配比</Eyebrow>
            <div className="mt-2 space-y-1.5">
              {HOOKS.map((h) => {
                const n = audit.counts[h] ?? 0
                const pct = audit.total ? n / audit.total : 0
                return (
                  <div key={h} className="flex items-center gap-2">
                    <span className="w-[46px] flex-none text-[12px] text-[var(--text-dim)]">{h}</span>
                    <span className="relative h-[5px] flex-1 overflow-hidden rounded-full bg-[var(--line-soft)]">
                      <span
                        className="absolute inset-y-0 left-0 rounded-full transition-[width,left,right] duration-300 [transition-timing-function:var(--ease-seat)]"
                        style={{ width: `${pct * 100}%`, background: `hsl(${HOOK_HUE[h]} 46% 52%)` }}
                      />
                      <span
                        className="absolute inset-y-0 w-px bg-[var(--text-faint)]"
                        style={{ left: `${HOOK_MIX[h] * 100}%` }}
                      />
                    </span>
                    <span className="num w-[52px] flex-none text-right text-[11px] text-[var(--text-faint)]">
                      {Math.round(pct * 100)}% / {Math.round(HOOK_MIX[h] * 100)}%
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {audit.sameHook.length > 0 && (
            <p className="mt-4 rounded-[2px] border border-[var(--accent)]/30 bg-[var(--accent)]/6 px-3 py-2 text-[12px] leading-relaxed text-[var(--accent)]">
              第 {audit.sameHook.join('、')} 章连续 3 章同型钩子 —— 读者会审美疲劳，按四型配比轮换。
            </p>
          )}

          <p className="mt-4 text-[12px] leading-relaxed text-[var(--text-faint)]">
            {venue.name} 排期：每章一个微爽点，每 {limit} 章内必须有一个中爽点，每 20-30 章一个卷级大爽点。
            蓄能连续不得超过 {venue.tensionWindow} 章，且蓄能期必须有进展感。
          </p>
        </section>
      }
    >
      <div className="max-w-[900px]">
        {chapters.length === 0 ? (
          <div className="border border-dashed border-[var(--line)] px-6 py-10 text-center">
            <p className="text-[14px] text-[var(--text-dim)]">还没有章节。事件线只写到"事件"粒度，场景细节留给日更台。</p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <select value={volId} onChange={(e) => setVolId(e.target.value)} className="field h-8 w-[160px]">
                <option value="">不指定卷</option>
                {vols.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.vid} {v.title}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="field h-8 w-[70px]"
              />
              <Button variant="solid" size="sm" onClick={() => addChapterRange(projectId, 1, count, volId || null)}>
                建 {count} 章事件线
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* 爽点热力条 */}
            <Eyebrow>爽点排期</Eyebrow>
            <div className="mt-3 flex h-[92px] items-end gap-[2px]">
              {chapters.map((c) => {
                const h = BEAT_H[c.beat] ?? 0.3
                const strong = c.beat === '中爽' || c.beat === '大爽'
                return (
                  <button
                    key={c.id}
                    onClick={() => setSel(c.no === sel ? null : c.no)}
                    title={`第${c.no}章 · ${c.beat}${c.hook_type ? ` · ${c.hook_type}` : ''}\n${c.event ?? ''}`}
                    className="group relative min-w-[4px] flex-1 rounded-t-[2px] transition-all duration-300 hover:brightness-125"
                    style={{
                      height: `${h * 100}%`,
                      background: strong
                        ? `hsl(8 52% ${c.beat === '大爽' ? 56 : 48}%)`
                        : c.beat === '蓄能'
                          ? 'var(--line)'
                          : 'hsl(8 30% 45% / 0.45)',
                      outline: sel === c.no ? '1px solid var(--accent)' : undefined,
                    }}
                  />
                )
              })}
            </div>
            {/* 钩子型号条 */}
            <div className="mt-[3px] flex gap-[2px]">
              {chapters.map((c) => (
                <span
                  key={c.id}
                  className="min-w-[4px] flex-1 rounded-b-[2px]"
                  style={{
                    height: 4,
                    background: c.hook_type ? `hsl(${HOOK_HUE[c.hook_type]} 46% 52%)` : 'var(--line-soft)',
                  }}
                />
              ))}
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-[var(--text-faint)]">
              <span>第 1 章</span>
              <span>第 {maxNo} 章</span>
            </div>

            {/* 章列表 */}
            <div className="mt-7">
              <div className="flex items-baseline justify-between">
                <Eyebrow>事件线</Eyebrow>
                <Button
                  size="sm"
                  variant="quiet"
                  onClick={() => addChapterRange(projectId, maxNo + 1, 10, vols.at(-1)?.id ?? null)}
                >
                  ＋ 再加 10 章
                </Button>
              </div>
              <div className="mt-2 space-y-px">
                {chapters.map((c) => (
                  <div
                    key={c.id}
                    className={cx(
                      'flex items-center gap-2 rounded-[2px] px-1.5 py-1 transition-colors',
                      sel === c.no ? 'bg-[var(--bg-sunk)]' : 'hover:bg-[var(--bg-sunk)]/50',
                    )}
                  >
                    <span className="num w-8 flex-none text-[12px] text-[var(--text-faint)]">{c.no}</span>
                    <input
                      defaultValue={c.event ?? ''}
                      onBlur={(e) => updateChapter(projectId, c.id, { event: e.target.value })}
                      placeholder="事件：谁做了什么，导致什么"
                      className="min-w-0 flex-1 bg-transparent px-1.5 py-1 text-[14px] outline-none placeholder:text-[var(--text-faint)]"
                    />
                    <div className="flex flex-none gap-[3px]">
                      {BEATS.map((b) => (
                        <button
                          key={b}
                          onClick={() => updateChapter(projectId, c.id, { beat: b })}
                          title={b}
                          className="h-4 w-4 rounded-[2px] border text-[11px] leading-none transition-colors"
                          style={{
                            borderColor: c.beat === b ? 'var(--accent)' : 'var(--line)',
                            background: c.beat === b ? 'var(--accent)' : 'transparent',
                            color: c.beat === b ? '#fff' : 'var(--text-faint)',
                          }}
                        >
                          {b[0]}
                        </button>
                      ))}
                    </div>
                    <select
                      defaultValue={c.hook_type ?? ''}
                      onChange={(e) => updateChapter(projectId, c.id, { hook_type: e.target.value || null })}
                      className="h-6 w-[68px] flex-none cursor-pointer rounded-[2px] border border-[var(--line)] bg-transparent px-1 text-[12px]"
                    >
                      <option value="">钩子</option>
                      {HOOKS.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                    <span className="w-[92px] flex-none text-right text-[11px] text-[var(--text-faint)]">
                      {c.plant.length > 0 && <span className="text-[var(--color-celadon)]">埋{c.plant.length} </span>}
                      {c.harvest.length > 0 && <span className="text-[var(--accent)]">收{c.harvest.length}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 单章伏笔挂接 */}
            {cur && items.length > 0 && (
              <div className="seat mt-6 border border-[var(--line-soft)] p-4">
                <div className="flex items-center gap-2">
                  <Eyebrow>第 {cur.no} 章 · 伏笔挂接</Eyebrow>
                  <Chip tone="mute">{cur.beat}</Chip>
                </div>
                <div className="mt-3 space-y-1.5">
                  {items.map((t) => {
                    const planted = cur.plant.includes(t.fid)
                    const harvested = cur.harvest.includes(t.fid)
                    return (
                      <div key={t.id} className="flex items-center gap-2 text-[14px]">
                        <span className="num w-[46px] flex-none text-[var(--text-faint)]">{t.fid}</span>
                        <span className="min-w-0 flex-1 truncate text-[var(--text-dim)]">{t.content}</span>
                        <button
                          onClick={() =>
                            updateChapter(projectId, cur.id, {
                              plant: planted ? cur.plant.filter((x) => x !== t.fid) : [...cur.plant, t.fid],
                            })
                          }
                          className={cx(
                            'rounded-[2px] border px-1.5 py-[2px] text-[12px]',
                            planted
                              ? 'border-[var(--color-celadon)] text-[var(--color-celadon)]'
                              : 'border-[var(--line)] text-[var(--text-faint)]',
                          )}
                        >
                          埋
                        </button>
                        <button
                          onClick={() =>
                            updateChapter(projectId, cur.id, {
                              harvest: harvested ? cur.harvest.filter((x) => x !== t.fid) : [...cur.harvest, t.fid],
                            })
                          }
                          className={cx(
                            'rounded-[2px] border px-1.5 py-[2px] text-[12px]',
                            harvested
                              ? 'border-[var(--accent)] text-[var(--accent)]'
                              : 'border-[var(--line)] text-[var(--text-faint)]',
                          )}
                        >
                          收
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </StageFrame>
  )
}
