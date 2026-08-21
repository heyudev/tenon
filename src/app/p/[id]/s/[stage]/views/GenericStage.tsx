'use client'

import type { CraftCard, StageState } from '@/lib/types'
import type { Stage } from '@/lib/stages'
import StageFrame, { useAutoSave } from '@/components/stage/StageFrame'
import { FieldView } from '@/components/stage/Fields'

export interface StageViewProps {
  stage: Stage
  projectId: string
  state: StageState
  cards: CraftCard[]
  weight?: '必经' | '增强' | '不适用'
  autos?: Record<string, { pass: boolean; detail: string } | null>
  progress?: import('@/components/stage/StageProgress').ProgressItem[]
  /**
   * 系统已经知道答案的字段（比如类型库里写好的读者契约 / 必备元素 / 雷区）。
   * 不自动写进去——一键带入，人看过再改。让人改，比让人对着空框填快得多。
   */
  presets?: { label: string; note?: string; data: Record<string, unknown> }
}

export default function GenericStage({ stage, projectId, state, cards, weight, autos, progress, presets }: StageViewProps) {
  const form = useAutoSave(projectId, stage.id, state.data)

  const empty = (v: unknown) =>
    v == null || v === '' || (Array.isArray(v) && v.filter(Boolean).length === 0)
  const fillable = presets ? Object.keys(presets.data).filter((k) => empty(form.data[k])) : []

  return (
    <StageFrame stage={stage} projectId={projectId} gate={state.gate} cards={cards} weight={weight} autos={autos} progress={progress}>
      {stage.fields.length === 0 ? (
        <p className="text-[14px] text-[var(--text-faint)]">这一环节没有表单字段，产出在右栏的门禁与 AI 动作里。</p>
      ) : (
        <div className="max-w-[760px] space-y-6">
          {fillable.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 border border-[var(--accent)]/30 bg-[var(--accent)]/5 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-medium">{presets!.label}</div>
                {presets!.note && (
                  <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-faint)]">{presets!.note}</p>
                )}
              </div>
              <button
                onClick={() =>
                  form.setMany(Object.fromEntries(fillable.map((k) => [k, presets!.data[k]])))
                }
                className="flex-none rounded-[2px] border border-[var(--accent)] bg-[var(--accent)] px-3 py-1.5 text-[12px] text-[var(--on-accent)]"
              >
                带入 {fillable.length} 项
              </button>
            </div>
          )}
          {stage.fields.map((f) => (
            <FieldView key={f.id} f={f} value={form.data[f.id]} onChange={(v) => form.set(f.id, v)} />
          ))}
          <div className="h-4 text-[12px] text-[var(--text-faint)]">
            {form.dirty ? '未保存…' : '已自动保存'}
          </div>
        </div>
      )}
    </StageFrame>
  )
}
