'use client'

import { useState } from 'react'
import type { Chapter, Volume } from '@/lib/types'
import type { StageViewProps } from './GenericStage'
import StageFrame from '@/components/stage/StageFrame'
import { addVolume, removeVolume, updateVolume } from '@/lib/actions'
import { Button, Eyebrow, cx } from '@/components/ui'

const LAYERS = ['L1 表层规则', 'L2 隐藏结构', 'L3 规则的管理员', 'L4 元规则']
const TRACKS = ['第一轨 · 爬等级', '第二轨 · 争权限', '第三轨 · 立法权']
const LAYER_HUE: Record<string, number> = { L1: 200, L2: 168, L3: 38, L4: 8 }

export default function VolumeStage({
  stage,
  projectId,
  state,
  cards,
  weight,
  autos,
  progress,
  vols,
  chapters,
}: StageViewProps & { vols: Volume[]; chapters: Chapter[] }) {
  const [title, setTitle] = useState('')

  return (
    <StageFrame
      stage={stage}
      projectId={projectId}
      gate={state.gate}
      cards={cards}
      weight={weight} autos={autos} progress={progress}
      aside={
        <section>
          <Eyebrow>四层揭露分配</Eyebrow>
          <div className="mt-2.5 space-y-1.5">
            {LAYERS.map((l) => {
              const got = vols.filter((v) => v.reveal_layer === l)
              return (
                <div key={l} className="flex items-center gap-2 text-[14px]">
                  <span className="h-2 w-2 rounded-sm" style={{ background: `hsl(${LAYER_HUE[l.slice(0, 2)]} 46% 52%)` }} />
                  <span className="flex-1 text-[var(--text-dim)]">{l}</span>
                  <span className="num text-[12px] text-[var(--text-faint)]">
                    {got.length ? got.map((v) => v.no).join(',') : '—'}
                  </span>
                </div>
              )
            })}
          </div>
          <p className="mt-4 text-[12px] leading-relaxed text-[var(--text-faint)]">
            卷模板：卷首新地图或新阶层 → 本卷规则差展示 → 主角建立局部优势 → 中段危机（代价清算或身份暴露）→ 卷尾大爽点 + 下一层的钩子。
            <br />
            <br />
            每卷同时要是一个可独立改编的短剧闭环 —— 这是 IP 接口。
          </p>
        </section>
      }
    >
      <div className="max-w-[780px]">
        <div className="flex gap-1.5">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && title.trim()) {
                addVolume(projectId, title.trim())
                setTitle('')
              }
            }}
            placeholder="新增一卷（卷名），回车"
            className="field h-8"
          />
        </div>

        <div className="mt-5 space-y-4">
          {vols.map((v) => {
            const chs = chapters.filter((c) => c.volume_id === v.id)
            const words = chs.reduce((s, c) => s + c.words, 0)
            const hue = LAYER_HUE[(v.reveal_layer ?? '').slice(0, 2)] ?? 200
            return (
              <div key={v.id} className="frame-thin p-5">
                <div className="flex items-center gap-2.5">
                  <span
                    className="num rounded-[2px] px-1.5 py-[2px] text-[12px]"
                    style={{ background: `hsl(${hue} 42% 50% / 0.15)`, color: `hsl(${hue} 46% 58%)` }}
                  >
                    {v.vid}
                  </span>
                  <input
                    defaultValue={v.title}
                    onBlur={(e) => updateVolume(projectId, v.id, { title: e.target.value })}
                    className="field h-8 w-[220px] text-[14px] font-medium"
                  />
                  <span className="num text-[12px] text-[var(--text-faint)]">
                    {chs.length} 章 · {(words / 10000).toFixed(1)} 万字
                  </span>
                  <Button size="sm" variant="quiet" className="ml-auto" onClick={() => removeVolume(projectId, v.id)}>
                    删除
                  </Button>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {LAYERS.map((l) => (
                    <button
                      key={l}
                      onClick={() => updateVolume(projectId, v.id, { reveal_layer: v.reveal_layer === l ? null : l })}
                      className={cx(
                        'rounded-[2px] border px-2 py-[3px] text-[12px] transition-colors',
                        v.reveal_layer === l
                          ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                          : 'border-[var(--line)] text-[var(--text-faint)] hover:border-[var(--text-faint)]',
                      )}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {TRACKS.map((t) => (
                    <button
                      key={t}
                      onClick={() => updateVolume(projectId, v.id, { power_track: v.power_track === t ? null : t })}
                      className={cx(
                        'rounded-[2px] border px-2 py-[3px] text-[12px] transition-colors',
                        v.power_track === t
                          ? 'border-[var(--color-celadon)] bg-[var(--color-celadon)]/10 text-[var(--color-celadon)]'
                          : 'border-[var(--line)] text-[var(--text-faint)] hover:border-[var(--text-faint)]',
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <div className="mt-3.5 grid grid-cols-3 gap-3">
                  {(
                    [
                      ['goal', '单卷目标'],
                      ['conflict', '核心冲突'],
                      ['climax', '卷末大高潮'],
                    ] as const
                  ).map(([k, label]) => (
                    <div key={k}>
                      <div className="eyebrow mb-1">{label}</div>
                      <textarea
                        defaultValue={(v[k] as string) ?? ''}
                        onBlur={(e) => updateVolume(projectId, v.id, { [k]: e.target.value })}
                        rows={3}
                        className="field resize-y"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </StageFrame>
  )
}
