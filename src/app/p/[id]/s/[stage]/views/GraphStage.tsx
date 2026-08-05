'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import type { Edge, ProjectRule } from '@/lib/types'
import type { StageViewProps } from './GenericStage'
import StageFrame, { useAutoSave } from '@/components/stage/StageFrame'
import { FieldView } from '@/components/stage/Fields'
import { Chip, Eyebrow } from '@/components/ui'

export default function GraphStage({
  stage,
  projectId,
  state,
  cards,
  weight,
  autos,
  progress,
  picked,
  edges,
}: StageViewProps & { picked: ProjectRule[]; edges: Edge[] }) {
  const form = useAutoSave(projectId, stage.id, state.data)
  const entry = useMemo(() => [...new Set(picked.flatMap((p) => p.rule?.concepts ?? []))], [picked])

  const { first, second, loops } = useMemo(() => {
    const out = new Map<string, Edge[]>()
    for (const e of edges) {
      if (!out.has(e.src)) out.set(e.src, [])
      out.get(e.src)!.push(e)
      if (e.direction === '双向') {
        if (!out.has(e.dst)) out.set(e.dst, [])
        out.get(e.dst)!.push({ ...e, src: e.dst, dst: e.src })
      }
    }
    const f = new Map<string, Edge[]>()
    for (const c of entry) for (const e of out.get(c) ?? []) {
      if (entry.includes(e.dst)) continue
      if (!f.has(e.dst)) f.set(e.dst, [])
      f.get(e.dst)!.push(e)
    }
    const s = new Set<string>()
    for (const c of f.keys()) for (const e of out.get(c) ?? []) if (!entry.includes(e.dst) && !f.has(e.dst)) s.add(e.dst)

    // 经过入口概念的环（≤3 步）
    const cyc: { path: string[]; feedback: string }[] = []
    const seen = new Set<string>()
    for (const start of entry) {
      const walk = (cur: string, trail: string[], signs: string[]) => {
        if (trail.length > 3) return
        for (const e of out.get(cur) ?? []) {
          if (e.dst === start && trail.length >= 2) {
            const key = [...trail].sort().join('|')
            if (seen.has(key)) continue
            seen.add(key)
            const neg = [...signs, e.feedback].filter((x) => x === '负').length
            cyc.push({ path: [...trail, start], feedback: neg % 2 === 0 ? '正' : '负' })
          } else if (!trail.includes(e.dst)) walk(e.dst, [...trail, e.dst], [...signs, e.feedback])
        }
      }
      walk(start, [start], [])
    }
    return { first: f, second: [...s], loops: cyc.slice(0, 10) }
  }, [entry, edges])

  const posLoops = loops.filter((l) => l.feedback === '正').length
  const negLoops = loops.filter((l) => l.feedback === '负').length

  return (
    <StageFrame
      stage={stage}
      projectId={projectId}
      gate={state.gate}
      cards={cards}
      weight={weight} autos={autos} progress={progress}
      aside={
        <section>
          <Eyebrow>环路体检</Eyebrow>
          <div className="mt-2.5 flex gap-4">
            <div>
              <div className="num text-[26px] font-light" style={{ color: 'var(--accent)' }}>{posLoops}</div>
              <div className="text-[12px] text-[var(--text-faint)]">正反馈环</div>
            </div>
            <div>
              <div className="num text-[26px] font-light" style={{ color: 'var(--color-celadon)' }}>{negLoops}</div>
              <div className="text-[12px] text-[var(--text-faint)]">负反馈环</div>
            </div>
          </div>
          {negLoops === 0 && posLoops > 0 && (
            <p className="mt-3 rounded-[2px] border border-[var(--accent)]/30 bg-[var(--accent)]/6 px-3 py-2 text-[12px] leading-relaxed text-[var(--accent)]">
              一个刹车都没有 —— 任何扰动都会指数发散，世界三卷内必崩。去图谱里补一条负反馈边，四类刹车选一：制度 / 物理 / 社会 / 对手。对手刹车最好用，刹车本身就是反派。
            </p>
          )}
          <Link
            href={`/graph${entry[0] ? `?focus=${encodeURIComponent(entry[0])}` : ''}`}
            className="mt-3 block text-[14px] text-[var(--accent)] hover:underline"
          >
            打开概念图谱 →
          </Link>
        </section>
      }
    >
      <div className="max-w-[760px]">
        {entry.length === 0 ? (
          <p className="text-[14px] text-[var(--text-faint)]">
            还没选规则。先回 <Link href={`/p/${projectId}/s/b3-rules`} className="text-[var(--accent)]">02 选规则</Link>。
          </p>
        ) : (
          <div className="frame-thin p-5">
            <Eyebrow>扰动路径 · 自动推算</Eyebrow>
            <div className="mt-4 space-y-4">
              <Wave label="入口概念" items={entry} tone="accent" />
              <Wave
                label="一阶传导"
                items={[...first.keys()]}
                detail={[...first.entries()].map(([k, es]) => `${es[0].src}→${k}：${es[0].mechanism ?? ''}`)}
              />
              <Wave label="二阶传导" items={second} />
            </div>

            {loops.length > 0 && (
              <div className="mt-6">
                <Eyebrow>检出的环路</Eyebrow>
                <div className="mt-2 space-y-1.5">
                  {loops.map((l, i) => (
                    <div key={i} className="flex items-baseline gap-2">
                      <Chip tone={l.feedback === '正' ? 'accent' : 'good'}>{l.feedback}</Chip>
                      <span className="text-[14px] text-[var(--text-dim)]">{l.path.join(' → ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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

function Wave({
  label,
  items,
  detail,
  tone,
}: {
  label: string
  items: string[]
  detail?: string[]
  tone?: 'accent'
}) {
  if (!items.length) return null
  return (
    <div className="flex gap-4">
      <div className="w-[62px] flex-none pt-0.5 text-[12px] text-[var(--text-faint)]">{label}</div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap gap-1.5">
          {items.map((c) => (
            <span
              key={c}
              className="rounded-[2px] border px-2 py-[3px] text-[14px]"
              style={{
                borderColor: tone === 'accent' ? 'color-mix(in srgb, var(--accent) 45%, transparent)' : 'var(--line)',
                color: tone === 'accent' ? 'var(--accent)' : 'var(--text-dim)',
              }}
            >
              {c}
            </span>
          ))}
        </div>
        {detail && detail.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {detail.slice(0, 8).map((d, i) => (
              <div key={i} className="text-[12px] leading-relaxed text-[var(--text-faint)]">{d}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
