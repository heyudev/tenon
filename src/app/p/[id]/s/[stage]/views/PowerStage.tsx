'use client'

import type { StageViewProps } from './GenericStage'
import StageFrame, { useAutoSave } from '@/components/stage/StageFrame'
import { FieldView } from '@/components/stage/Fields'
import { Eyebrow } from '@/components/ui'

type Row = Record<string, string>

export default function PowerStage({ stage, projectId, state, cards, weight, autos, progress }: StageViewProps) {
  const form = useAutoSave(projectId, stage.id, state.data)
  const levels: Row[] = Array.isArray(form.data.levels) ? (form.data.levels as Row[]) : []
  const filled = levels.filter((l) => l.name)

  const complete = filled.filter((l) => l.cost && l.perm && l.social).length
  const tracks = ['track1', 'track2', 'track3'].filter((k) => (form.data[k] as string)?.trim()).length

  return (
    <StageFrame
      stage={stage}
      projectId={projectId}
      gate={state.gate}
      cards={cards}
      weight={weight} autos={autos} progress={progress}
      aside={
        <section>
          <Eyebrow>体系体检</Eyebrow>
          <div className="mt-2.5 space-y-2 text-[14px] leading-relaxed text-[var(--text-dim)]">
            <div>
              等级 <span className="num">{filled.length}</span> 级
              {filled.length > 0 && filled.length < 8 && (
                <span className="text-[var(--text-faint)]">（300 万字建议 12-15 级）</span>
              )}
            </div>
            <div>
              四列齐全 <span className="num">{complete}</span>/{filled.length || 0}
              {filled.length > complete && <span className="text-[var(--accent)]"> · 有缺列的等级不可审计</span>}
            </div>
            <div>换轨预埋 <span className="num">{tracks}</span>/3</div>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-[var(--text-faint)]">
            30 秒数值锚测试：任取两个相邻等级的角色对战，你能立刻说出胜负与原因吗？说不出＝体系还不可审计，重做。
          </p>
        </section>
      }
    >
      <div className="max-w-[860px]">
        {/* 等级阶梯 */}
        {filled.length > 0 && (
          <div className="mb-8">
            <Eyebrow>等级阶梯</Eyebrow>
            <div className="mt-3 space-y-px overflow-hidden border border-[var(--line-soft)]">
              {filled.map((l, i) => {
                const pct = ((i + 1) / filled.length) * 100
                return (
                  <div key={i} className="relative bg-[var(--surface)] px-4 py-3">
                    <div
                      className="absolute inset-y-0 left-0 transition-[width] duration-300 [transition-timing-function:var(--ease-seat)]"
                      style={{
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, hsl(38 46% 52% / 0.14), transparent)`,
                      }}
                    />
                    <div className="relative flex items-baseline gap-3">
                      <span className="num w-5 flex-none text-[12px] text-[var(--text-faint)]">{i + 1}</span>
                      <span className="w-[92px] flex-none text-[14px] font-medium">{l.name}</span>
                      <span className="w-[150px] flex-none truncate text-[14px] text-[var(--text-dim)]" title={l.cost}>
                        {l.cost || <span className="text-[var(--accent)]">缺资源门槛</span>}
                      </span>
                      <span className="w-[160px] flex-none truncate text-[14px] text-[var(--text-dim)]" title={l.perm}>
                        {l.perm || <span className="text-[var(--accent)]">缺规则权限</span>}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[14px] text-[var(--text-faint)]" title={l.social}>
                        {l.social || <span className="text-[var(--accent)]">缺社会身份</span>}
                      </span>
                    </div>
                  </div>
                )
              })}
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
