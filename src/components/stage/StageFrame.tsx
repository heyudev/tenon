'use client'

import { useEffect, useRef, useState } from 'react'
import type { CraftCard } from '@/lib/types'
import type { Stage } from '@/lib/stages'
import { gateProgress } from '@/lib/stages'
import { saveStage } from '@/lib/actions'
import { Markdown } from '@/components/md'
import { AiOutput, useAiRun } from '@/components/AiPanel'
import { Button, Check, Chip, Eyebrow, Meter, cx } from '@/components/ui'
import StageProgress, { type ProgressItem } from './StageProgress'
import { termsIn } from '@/lib/glossary'

/** 环节页的统一骨架：正文区（各环节自定义）+ 右栏门禁 / AI / 方法论 */
export default function StageFrame({
  stage,
  projectId,
  gate,
  cards,
  children,
  aside,
  weight,
  autos,
  progress,
}: {
  stage: Stage
  projectId: string
  gate: Record<string, boolean>
  cards: CraftCard[]
  children: React.ReactNode
  aside?: React.ReactNode
  weight?: '必经' | '增强' | '不适用'
  /** 自动门禁的判定结果：checkId → 结果（null＝数据不足） */
  autos?: Record<string, { pass: boolean; detail: string } | null>
  /** 全流程进度：随时能看见自己在哪 */
  progress?: ProgressItem[]
}) {
  const [checked, setChecked] = useState(gate)
  const [card, setCard] = useState<CraftCard | null>(null)
  const [guide, setGuide] = useState(true)
  const ai = useAiRun()
  const g = gateProgress(stage, checked, autos)

  const toggle = (id: string, v: boolean) => {
    const next = { ...checked, [id]: v }
    setChecked(next)
    const p = gateProgress(stage, next, autos)
    saveStage(projectId, stage.id, { gate: next, status: p.passed ? '已通过' : '进行中' })
  }

  return (
    <div className="flex min-h-dvh">
      <div className="min-w-0 flex-1">
        {progress && <StageProgress items={progress} currentId={stage.id} projectId={projectId} />}
        <header className="border-b border-[var(--line-soft)] px-10 pb-6 pt-6">
          <div className="flex items-baseline gap-3">
            <span className="num text-[14px] text-[var(--text-faint)]">
              {String(stage.no).padStart(2, '0')}
            </span>
            <h1 className="display text-[26px]">{stage.title}</h1>
            {weight === '必经' && <Chip tone="accent">必经</Chip>}
            {weight === '增强' && <Chip tone="mute">增强</Chip>}
            {weight === '不适用' && <Chip tone="mute">这本书用不上</Chip>}
            {stage.minViable && <Chip tone="warn">最小可动笔</Chip>}
            {stage.crossBook && <Chip tone="mute">跨书常驻</Chip>}
            {g.passed && <Chip tone="good">门禁已过</Chip>}
            {!g.passed && g.hardLeft > 0 && <Chip tone="accent">硬项欠 {g.hardLeft}</Chip>}
          </div>
          <p className="mt-2 max-w-[680px] text-[14px] leading-[1.8] text-[var(--text-dim)]">{stage.purpose}</p>
          <p className="mt-2 text-[12px] text-[var(--text-faint)]">产出物：{stage.output}</p>
        </header>

        {/* 五件套：为什么 / 怎么做 / 常见错法 */}
        <section className="border-b border-[var(--line-soft)] px-10 py-5">
          <button
            onClick={() => setGuide(!guide)}
            className="flex items-center gap-2 text-[12px] tracking-[0.18em] text-[var(--text-faint)] uppercase transition-colors hover:text-[var(--text-dim)]"
          >
            <span
              className="inline-block transition-transform duration-200"
              style={{ transform: guide ? 'rotate(90deg)' : 'none' }}
            >
              ›
            </span>
            怎么做
          </button>

          {guide && (
            <div className="seat mt-4 grid max-w-[900px] grid-cols-[1fr_1fr] gap-x-10 gap-y-5">
              <div className="col-span-2 border-l-2 border-[var(--accent)]/40 pl-4">
                <div className="eyebrow" style={{ color: 'var(--accent)' }}>
                  不做会死在哪里
                </div>
                <p className="mt-1.5 text-[14px] leading-[1.85] text-[var(--text-dim)]">{stage.why}</p>
              </div>

              <div>
                <Eyebrow>动作</Eyebrow>
                <ol className="mt-2 space-y-1.5">
                  {stage.how.map((h, i) => (
                    <li key={i} className="flex gap-2.5 text-[14px] leading-[1.8] text-[var(--text-dim)]">
                      <span className="num flex-none text-[var(--text-faint)]">{i + 1}</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div>
                <Eyebrow>常见错法</Eyebrow>
                <ul className="mt-2 space-y-1.5">
                  {stage.pitfalls.map((p, i) => (
                    <li key={i} className="flex gap-2.5 text-[14px] leading-[1.8]">
                      <span className="flex-none text-[var(--accent)]">✕</span>
                      <span className="text-[var(--text-dim)]">{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>

        <div className="px-10 py-7">{children}</div>
      </div>

      <aside className="w-[340px] flex-none border-l border-[var(--line-soft)]">
        <div className="sticky top-0 max-h-dvh overflow-y-auto px-6 py-7">
          {aside}

          {/* AI 动作 */}
          {stage.ai && stage.ai.length > 0 && (
            <section className={cx(aside && 'mt-8')}>
              <Eyebrow>AI 动作</Eyebrow>
              <div className="mt-2.5 space-y-2">
                {stage.ai.map((a) => (
                  <div key={a.id}>
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="flex-1"
                        disabled={ai.running}
                        onClick={() =>
                          ai.run({ kind: 'stage', projectId, stageId: stage.id, actionId: a.id })
                        }
                      >
                        {a.label}
                      </Button>
                      <Button
                        size="sm"
                        variant="quiet"
                        aria-label="复制提示词"
                        title="只复制提示词，拿到 Claude Code / 网页里跑"
                        onClick={() =>
                          ai.copyPrompt({ kind: 'stage', projectId, stageId: stage.id, actionId: a.id })
                        }
                      >
                        ⧉
                      </Button>
                    </div>
                    <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-faint)]">
                      {a.role}
                      {a.hint ? ` · ${a.hint}` : ''}
                    </p>
                  </div>
                ))}
              </div>
              <AiOutput ai={ai} />
            </section>
          )}

          {/* 门禁 */}
          <section className="mt-8">
            <div className="flex items-baseline justify-between">
              <Eyebrow>门禁</Eyebrow>
              <span className="num text-[12px] text-[var(--text-faint)]">
                {g.done}/{g.total}
                {g.autoCount > 0 && <span className="ml-1 opacity-60">· {g.autoCount} 项系统判</span>}
              </span>
            </div>
            <Meter
              value={g.done}
              max={g.total}
              tone={g.passed ? 'good' : g.failed ? 'accent' : g.hardLeft ? 'warn' : 'mute'}
              className="mt-2"
            />
            <div className="mt-2">
              {stage.gate.map((item) => {
                // 可判定项：系统说了算，人勾不动
                if (item.auto) {
                  const r = autos?.[item.auto]
                  const st = r == null ? 'pending' : r.pass ? 'pass' : 'fail'
                  return (
                    <div key={item.id} className="flex items-start gap-2.5 py-1.5">
                      <span
                        className={cx(
                          'mt-[3px] flex h-[13px] w-[13px] flex-none items-center justify-center rounded-[2px] border text-[11px] leading-none',
                          st === 'pass' && 'border-[var(--color-celadon)] bg-[var(--color-celadon)] text-white',
                          st === 'fail' && 'border-[var(--accent)] text-[var(--accent)]',
                          st === 'pending' && 'border-dashed border-[var(--line)] text-[var(--text-faint)]',
                        )}
                        title={st === 'pending' ? '数据不足，还判不了' : st === 'pass' ? '系统判定通过' : '系统判定未通过'}
                      >
                        {st === 'pass' ? '✓' : st === 'fail' ? '!' : ''}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div
                          className={cx(
                            'text-[14px] leading-[1.55]',
                            st === 'pass' ? 'text-[var(--text-faint)]' : 'text-[var(--text-dim)]',
                          )}
                        >
                          {item.text}
                          {item.hard && st !== 'pass' && (
                            <span className="ml-1.5 text-[12px] text-[var(--accent)]">硬项</span>
                          )}
                          <span className="ml-1.5 text-[11px] text-[var(--text-faint)]">系统判</span>
                        </div>
                        {r && (
                          <div
                            className="mt-0.5 text-[12px] leading-relaxed"
                            style={{ color: r.pass ? 'var(--text-faint)' : 'var(--accent)' }}
                          >
                            {r.detail}
                          </div>
                        )}
                        {!r && (
                          <div className="mt-0.5 text-[12px] text-[var(--text-faint)]">
                            还没填到能判的程度
                          </div>
                        )}
                      </div>
                    </div>
                  )
                }
                // 主观项：人勾
                return (
                  <Check key={item.id} checked={!!checked[item.id]} onChange={(v) => toggle(item.id, v)} hard={item.hard}>
                    {item.text}
                  </Check>
                )
              })}
            </div>
            {g.autoCount > 0 && (
              <p className="mt-2.5 text-[11px] leading-relaxed text-[var(--text-faint)]">
                标「系统判」的项由数据算出，勾不动——要让它变绿，去把数据改对。
                剩下的是只有人能判的（够不够狠、愿不愿意点下一章）。
              </p>
            )}
          </section>

          {/* 本环节出现的术语 */}
          {(() => {
            const terms = termsIn(stage.purpose, stage.why, stage.how, stage.pitfalls, stage.output,
              stage.gate.map((g) => g.text))
            if (!terms.length) return null
            return (
              <section className="mt-8">
                <Eyebrow>本环节黑话</Eyebrow>
                <dl className="mt-2 space-y-2.5">
                  {terms.map((t) => (
                    <div key={t.t}>
                      <dt className="text-[14px] font-medium text-[var(--text)]">{t.t}</dt>
                      <dd className="mt-0.5 text-[12px] leading-relaxed text-[var(--text-dim)]">{t.d}</dd>
                      {t.why && (
                        <dd className="mt-0.5 text-[12px] leading-relaxed text-[var(--text-faint)]">{t.why}</dd>
                      )}
                    </div>
                  ))}
                </dl>
              </section>
            )
          })()}

          {/* 方法论 */}
          {cards.length > 0 && (
            <section className="mt-8">
              <Eyebrow>适用方法论</Eyebrow>
              <div className="mt-2 space-y-1">
                {cards.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCard(c)}
                    className="block w-full rounded-[2px] px-2.5 py-1.5 text-left text-[14px] text-[var(--text-dim)] transition-colors hover:bg-[var(--bg-sunk)] hover:text-[var(--text)]"
                  >
                    {c.title}
                    {c.summary && (
                      <span className="mt-0.5 block text-[12px] leading-snug text-[var(--text-faint)]">
                        {c.summary}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </aside>

      {/* 方法论抽屉 */}
      {card && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setCard(null)}>
          <div
            className="seat seat-r h-full w-[620px] overflow-y-auto bg-[var(--bg)] px-10 py-10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <Eyebrow>{card.category}</Eyebrow>
                <h2 className="mt-2 text-[26px] font-light tracking-tight">{card.title}</h2>
              </div>
              <Button size="sm" variant="quiet" onClick={() => setCard(null)}>
                关闭
              </Button>
            </div>
            {card.summary && (
              <p className="mt-3 border-l-2 border-[var(--accent)]/40 pl-4 text-[14px] leading-relaxed text-[var(--text-dim)]">
                {card.summary}
              </p>
            )}
            <div className="mt-7">
              <Markdown src={card.body} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** 字段自动保存：失焦或停手 800ms 后落盘 */
export function useAutoSave(projectId: string, stageId: string, initial: Record<string, unknown>) {
  const [data, setData] = useState(initial)
  const [dirty, setDirty] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flush = (next?: Record<string, unknown>) => {
    if (timer.current) clearTimeout(timer.current)
    const payload = next ?? data
    saveStage(projectId, stageId, { data: payload, status: '进行中' })
    setDirty(false)
  }

  const commit = (next: Record<string, unknown>) => {
    setData(next)
    setDirty(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => flush(next), 800)
  }

  const set = (id: string, v: unknown) => commit({ ...data, [id]: v })

  /**
   * 一次改多个字段必须走这里。
   * 连着调 set() 会全部基于同一份闭包 data 合并，只有最后一次生效——
   * 落库的也是那一份，前面的改动直接丢掉。
   */
  const setMany = (patch: Record<string, unknown>) => commit({ ...data, ...patch })

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), [])

  return { data, set, setMany, dirty, flush }
}
