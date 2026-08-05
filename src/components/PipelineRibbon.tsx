import Link from 'next/link'
import { LAYER_MAP, STAGES, gateProgress, type Stage, type Weight } from '@/lib/stages'
import type { StageState } from '@/lib/types'

export interface RibbonCell {
  stage: Stage
  done: number
  total: number
  hardLeft: number
  passed: boolean
  started: boolean
  weight: Weight
}

export function ribbonCells(
  states: Record<string, StageState>,
  weights?: Record<string, Weight>,
  autos?: Record<string, { pass: boolean } | null>,
): RibbonCell[] {
  return STAGES.map((stage) => {
    const st = states[stage.id]
    const g = gateProgress(stage, st?.gate ?? {}, autos)
    const started = st?.status !== '未开始' || Object.keys(st?.data ?? {}).length > 0 || g.done > 0
    return { stage, ...g, started, weight: weights?.[stage.id] ?? '必经' }
  })
}

/**
 * 管线丝带：一眼看出这本书卡在哪一层。
 * 必经实心、增强半透、不适用压扁——地图是全的，路是按类型裁的。
 */
export function PipelineRibbon({
  cells,
  projectId,
  height = 26,
  showLayers = false,
}: {
  cells: RibbonCell[]
  projectId: string
  height?: number
  showLayers?: boolean
}) {
  const layers = [...new Set(cells.map((c) => c.stage.layer))]
  return (
    <div className="w-full">
      <div className="flex items-end gap-[2px]">
        {cells.map((c) => {
          const hue = LAYER_MAP[c.stage.layer].hue
          const ratio = c.total ? c.done / c.total : 0
          const off = c.weight === '不适用'
          const soft = c.weight === '增强'
          return (
            <Link
              key={c.stage.id}
              href={`/p/${projectId}/s/${c.stage.id}`}
              title={`${c.stage.no}. ${c.stage.title}｜${c.weight}｜门禁 ${c.done}/${c.total}${c.hardLeft ? `｜硬项欠 ${c.hardLeft}` : ''}`}
              className="group relative flex-1 overflow-hidden rounded-[2px] transition-all duration-200 hover:scale-y-110"
              style={{
                height: off ? Math.round(height * 0.35) : height,
                opacity: off ? 0.3 : soft ? 0.6 : 1,
                background: c.started ? `hsl(${hue} 20% 50% / 0.16)` : 'var(--line-soft)',
              }}
            >
              <span
                className="absolute inset-x-0 bottom-0 transition-[width,left,right] duration-300 [transition-timing-function:var(--ease-seat)]"
                style={{
                  height: `${ratio * 100}%`,
                  background: c.passed ? `hsl(${hue} 46% 52%)` : `hsl(${hue} 40% 50% / 0.55)`,
                  transitionTimingFunction: 'var(--ease-seat)',
                }}
              />
              {c.hardLeft > 0 && c.started && !off && (
                <span className="absolute right-[1px] top-[1px] h-1 w-1 rounded-full bg-[var(--accent)]" />
              )}
              {c.stage.minViable && (
                <span className="absolute inset-x-0 top-0 h-[2px]" style={{ background: 'var(--accent)' }} />
              )}
            </Link>
          )
        })}
      </div>
      {showLayers && (
        <div className="mt-1.5 flex gap-[2px]">
          {layers.map((lid) => {
            const n = cells.filter((c) => c.stage.layer === lid).length
            const l = LAYER_MAP[lid]
            return (
              <div key={lid} className="flex items-center gap-1" style={{ flex: n }}>
                <span className="h-[3px] w-full rounded-full" style={{ background: `hsl(${l.hue} 46% 52% / 0.4)` }} />
              </div>
            )
          })}
        </div>
      )}
      {showLayers && (
        <div className="mt-1 flex gap-[2px]">
          {layers.map((lid) => {
            const n = cells.filter((c) => c.stage.layer === lid).length
            return (
              <div key={lid} className="truncate text-[11px] text-[var(--text-faint)]" style={{ flex: n }}>
                {LAYER_MAP[lid].title}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
