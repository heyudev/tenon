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
}

export default function GenericStage({ stage, projectId, state, cards, weight, autos, progress }: StageViewProps) {
  const form = useAutoSave(projectId, stage.id, state.data)

  return (
    <StageFrame stage={stage} projectId={projectId} gate={state.gate} cards={cards} weight={weight} autos={autos} progress={progress}>
      {stage.fields.length === 0 ? (
        <p className="text-[14px] text-[var(--text-faint)]">这一环节没有表单字段，产出在右栏的门禁与 AI 动作里。</p>
      ) : (
        <div className="max-w-[760px] space-y-6">
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
