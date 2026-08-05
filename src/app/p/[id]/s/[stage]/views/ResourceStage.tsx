'use client'

import type { Resource } from '@/lib/types'
import type { StageViewProps } from './GenericStage'
import StageFrame, { useAutoSave } from '@/components/stage/StageFrame'
import { FieldView } from '@/components/stage/Fields'
import { Eyebrow } from '@/components/ui'

type Row = Record<string, string>
const STEPS = [
  { id: 'origin', label: '产生源头', note: '源头分布决定地图与势力格局' },
  { id: 'path', label: '流动路径', note: '每个中转节点都是一个职业 / 组织 / 舞台' },
  { id: 'sink', label: '沉淀形态', note: '沉淀处＝宝库＝夺宝篇的目标' },
]

export default function ResourceStage({
  stage,
  projectId,
  state,
  cards,
  weight,
  autos,
  progress,
  refs,
}: StageViewProps & { refs: Resource[] }) {
  const form = useAutoSave(projectId, stage.id, state.data)
  const core: Row[] = Array.isArray(form.data.core) ? (form.data.core as Row[]) : []
  const filled = core.filter((c) => c.name)

  return (
    <StageFrame
      stage={stage}
      projectId={projectId}
      gate={state.gate}
      cards={cards}
      weight={weight} autos={autos} progress={progress}
      aside={
        <section>
          <Eyebrow>参考 · 14 种核心资源</Eyebrow>
          <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--text-faint)]">
            无形资源是现代都市文的真正主角：信任只能慢攒可以瞬间清零；注意力总量恒定但分配极不均；秘密分享即贬值。
          </p>
          <div className="mt-2.5 space-y-1">
            {refs.map((r) => (
              <div key={r.name} className="text-[14px] text-[var(--text-dim)]">
                <span className="font-medium">{r.name}</span>
                <span className="ml-1.5 text-[var(--text-faint)]">≈ {r.analogy}</span>
              </div>
            ))}
          </div>
        </section>
      }
    >
      <div className="max-w-[860px]">
        {/* 资源流图 */}
        {filled.length > 0 && (
          <div className="mb-8">
            <Eyebrow>资源流</Eyebrow>
            <div className="mt-3 space-y-4">
              {filled.map((c, i) => (
                <div key={i} className="frame-thin p-4">
                  <div className="text-[14px] font-medium">{c.name}</div>
                  <div className="mt-3 flex items-stretch gap-2">
                    {STEPS.map((s, si) => (
                      <div key={s.id} className="flex min-w-0 flex-1 items-stretch gap-2">
                        <div className="sunk min-w-0 flex-1 rounded-[2px] border border-[var(--line-soft)] px-3 py-2.5">
                          <div className="eyebrow">{s.label}</div>
                          <div className="mt-1 text-[14px] leading-relaxed text-[var(--text-dim)]">
                            {c[s.id] || <span className="text-[var(--text-faint)]">未填</span>}
                          </div>
                        </div>
                        {si < STEPS.length - 1 && (
                          <div className="flex flex-none items-center text-[var(--text-faint)]">→</div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex items-start gap-2">
                    <div className="flex-none pl-2 text-[var(--accent)]">↳</div>
                    <div className="min-w-0 flex-1 rounded-[2px] border border-[var(--accent)]/25 bg-[var(--accent)]/5 px-3 py-2">
                      <div className="eyebrow" style={{ color: 'var(--accent)' }}>
                        黑市形态 · 自洽性的试金石
                      </div>
                      <div className="mt-1 text-[14px] leading-relaxed text-[var(--text-dim)]">
                        {c.black || (
                          <span className="text-[var(--accent)]">
                            想不出黑市 → 规则的稀缺性或代价设计有问题
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-6">
          {stage.fields.map((f) => (
            <FieldView key={f.id} f={f} value={form.data[f.id]} onChange={(v) => form.set(f.id, v)} />
          ))}
        </div>
      </div>
    </StageFrame>
  )
}
