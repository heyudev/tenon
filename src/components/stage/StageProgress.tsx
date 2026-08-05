'use client'

import Link from 'next/link'
import { LAYER_MAP, type LayerId, type Weight } from '@/lib/stages'
import { Tenon, cx } from '@/components/ui'

export interface ProgressItem {
  /** 是否属于顺序主干（作者层/协议层不算） */
  sequential: boolean
  id: string
  no: number
  title: string
  layer: LayerId
  weight: Weight
  passed: boolean
  started: boolean
  minViable: boolean
  done: number
  total: number
}

/**
 * 进程条：随时能看见「我在全流程的哪儿」。
 * 上排是计数（本层 / 必经总量 / 最小可动笔），中间是 50 段丝带并标出当前位置，
 * 下排是前后两个必经环节的直达。
 */
export default function StageProgress({
  items,
  currentId,
  projectId,
}: {
  items: ProgressItem[]
  currentId: string
  projectId: string
}) {
  const cur = items.find((i) => i.id === currentId)
  if (!cur) return null

  const inRoute = items.filter((i) => i.weight !== '不适用')
  const core = items.filter((i) => i.weight === '必经' && i.sequential)
  const corePassed = core.filter((i) => i.passed).length
  const mv = items.filter((i) => i.minViable)
  const mvPassed = mv.filter((i) => i.passed).length

  const layerItems = inRoute.filter((i) => i.layer === cur.layer)
  const layerIdx = layerItems.findIndex((i) => i.id === cur.id) + 1
  const layerPassed = layerItems.filter((i) => i.passed).length
  const layer = LAYER_MAP[cur.layer]

  // 前后：优先跳必经环节，没有就跳路线内的相邻环节
  const seq = inRoute
  const pos = seq.findIndex((i) => i.id === cur.id)
  const prev = [...seq.slice(0, pos)].reverse().find((i) => i.weight === '必经' && i.sequential) ?? seq[pos - 1]
  const next = seq.slice(pos + 1).find((i) => i.weight === '必经' && i.sequential) ?? seq[pos + 1]

  return (
    <div className="border-b border-[var(--line-soft)] bg-[var(--bg-sunk)]/40 px-10 py-3">
      {/* 计数 */}
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-[12px]">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ background: `hsl(${layer.hue} 46% 52%)` }} />
          <span className="font-medium text-[var(--text)]">{layer.title}</span>
          <span className="num text-[var(--text-faint)]">
            第 {layerIdx}/{layerItems.length} 环节 · 本层已过 {layerPassed}
          </span>
        </span>
        <span className="text-[var(--text-faint)]">
          必经 <span className="num text-[var(--text-dim)]">{corePassed}/{core.length}</span>
        </span>
        <span className="text-[var(--text-faint)]">
          本书路线 <span className="num text-[var(--text-dim)]">{inRoute.length}</span> / 全图{' '}
          <span className="num">{items.length}</span>
        </span>
        {/* 最小可动笔：一榫一卯，坐满了才动笔 */}
        <span
          className={cx(
            'flex items-center gap-2',
            mvPassed === mv.length ? 'text-[var(--color-celadon)]' : 'text-[var(--accent)]',
          )}
          title={mv.map((i) => `${i.passed ? '已过' : '未过'} ${i.no}. ${i.title}`).join('\n')}
        >
          最小可动笔
          <span className="flex items-center gap-[3px]">
            {mv.map((i) => (
              <Tenon
                key={i.id}
                seated={i.passed}
                size={11}
                tone={mvPassed === mv.length ? 'good' : 'accent'}
              />
            ))}
          </span>
          <span className="num">{mvPassed}/{mv.length}</span>
          {mvPassed === mv.length && ' · 可以写第一章了'}
        </span>
        <span className="ml-auto text-[var(--text-faint)]">
          本环节门禁 <span className="num text-[var(--text-dim)]">{cur.done}/{cur.total}</span>
        </span>
      </div>

      {/* 全流程丝带 */}
      <div className="mt-2 flex items-end gap-[2px]">
        {items.map((i) => {
          const hue = LAYER_MAP[i.layer].hue
          const off = i.weight === '不适用'
          const soft = i.weight === '增强'
          const isCur = i.id === currentId
          return (
            <Link
              key={i.id}
              href={`/p/${projectId}/s/${i.id}`}
              title={`${i.no}. ${i.title}｜${i.weight}｜门禁 ${i.done}/${i.total}`}
              className="group relative flex-1 rounded-[2px] transition-all duration-200 hover:brightness-125"
              style={{
                height: isCur ? 16 : off ? 4 : 10,
                opacity: off ? 0.28 : soft ? 0.55 : 1,
                background: i.passed
                  ? `hsl(${hue} 46% 52%)`
                  : i.started
                    ? `hsl(${hue} 34% 48% / 0.5)`
                    : 'var(--line)',
                outline: isCur ? '1px solid var(--accent)' : undefined,
                outlineOffset: isCur ? 1 : undefined,
              }}
            />
          )
        })}
      </div>

      {/* 前后导航 */}
      <div className="mt-2 flex items-center gap-3 text-[12px]">
        {prev ? (
          <Link href={`/p/${projectId}/s/${prev.id}`} className="min-w-0 truncate text-[var(--text-faint)] hover:text-[var(--text)]">
            ← <span className="num">{String(prev.no).padStart(2, '0')}</span> {prev.title}
          </Link>
        ) : (
          <span />
        )}
        <Link
          href={`/p/${projectId}/guide`}
          className="mx-auto flex-none rounded-[2px] border border-[var(--line)] px-2 py-[2px] text-[var(--text-faint)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          引导模式
        </Link>
        {next ? (
          <Link href={`/p/${projectId}/s/${next.id}`} className="min-w-0 truncate text-right text-[var(--text-faint)] hover:text-[var(--text)]">
            <span className="num">{String(next.no).padStart(2, '0')}</span> {next.title} →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  )
}
