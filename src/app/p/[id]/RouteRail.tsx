'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import type { Layer, LayerId, Weight } from '@/lib/stages'
import { Tenon, cx } from '@/components/ui'

export interface RailItem {
  id: string
  no: number
  title: string
  layer: LayerId
  weight: Weight
  minViable: boolean
  crossBook: boolean
  sequential: boolean
  done: number
  total: number
  passed: boolean
  started: boolean
}

/**
 * 左轨 = 这本书的路线，不是全量目录。
 * 必经实心、增强淡出、不适用默认收起——地图是全的，路是按类型裁出来的。
 */
export default function RouteRail({
  projectId,
  items,
  layers,
  hasGenre,
}: {
  projectId: string
  items: RailItem[]
  layers: Layer[]
  hasGenre: boolean
}) {
  const path = usePathname()
  const [mode, setMode] = useState<'route' | 'all'>('route')

  const mv = items.filter((i) => i.minViable)
  const mvDone = mv.filter((i) => i.passed).length
  const core = items.filter((i) => i.weight === '必经' && i.sequential)
  const coreDone = core.filter((i) => i.passed).length

  const visible = (i: RailItem) => (mode === 'all' ? true : i.weight !== '不适用')

  return (
    <nav className="flex-1 overflow-y-auto px-2.5 pb-6">
      {/* 最小可动笔集合 */}
      <div className="mb-3 border border-[var(--line-soft)] px-3 py-2.5">
        <div className="flex items-baseline justify-between">
          <span className="eyebrow">最小可动笔集合</span>
          <span className="num text-[12px] text-[var(--text-faint)]">
            {mvDone}/{mv.length}
          </span>
        </div>
        {/* 一榫一卯，坐满了才动笔 */}
        <div className="mt-2 flex gap-[5px]">
          {mv.map((i) => (
            <Link
              key={i.id}
              href={`/p/${projectId}/s/${i.id}`}
              title={`${i.title}｜门禁 ${i.done}/${i.total}`}
              className="transition-opacity hover:opacity-70"
            >
              <Tenon
                seated={i.passed}
                size={13}
                tone={mvDone === mv.length ? 'good' : 'accent'}
                idle={!i.started}
              />
            </Link>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--text-faint)]">
          {mvDone === mv.length ? '齐了 —— 可以写第一章' : '这些齐了就能写第一章，不必等全部填完'}
        </p>
      </div>

      {/* 真相源快捷 */}
      <Quick href={`/p/${projectId}/guide`} path={path}>
        <span className="text-[var(--accent)]">引导模式 · 我该做什么</span>
      </Quick>
      <Quick href={`/p/${projectId}/interview`} path={path}>
        开书访谈 · 4 问换一版草稿
      </Quick>

      <div className="eyebrow px-2.5 pb-1 pt-3">真相源</div>
      <Quick href={`/p/${projectId}/cast`} path={path}>人物档案</Quick>
      <Quick href={`/p/${projectId}/threads`} path={path}>伏笔账本</Quick>
      <Quick href={`/p/${projectId}/write`} path={path}>日更台</Quick>

      {/* 模式切换 */}
      <div className="mt-4 flex items-center gap-1.5 px-2.5">
        <button
          onClick={() => setMode(mode === 'route' ? 'all' : 'route')}
          className="text-[12px] text-[var(--text-faint)] transition-colors hover:text-[var(--text)]"
        >
          {mode === 'route' ? '本书路线' : '全图 46 环节'}
          <span className="ml-1 opacity-60">切换</span>
        </button>
        <span className="num ml-auto text-[12px] text-[var(--text-faint)]">
          必经 {coreDone}/{core.length}
        </span>
      </div>
      {!hasGenre && (
        <p className="mt-1.5 px-2.5 text-[11px] leading-relaxed text-[var(--accent)]">
          还没定类型，路线按全图显示。去 02 类型与读者契约定下来。
        </p>
      )}

      {layers.map((l) => {
        const ls = items.filter((i) => i.layer === l.id && visible(i))
        if (!ls.length) return null
        return (
          <div key={l.id}>
            <div className="eyebrow flex items-center gap-1.5 px-2.5 pb-1 pt-4">
              <span className="h-[6px] w-[6px] rounded-sm" style={{ background: `hsl(${l.hue} 46% 52%)` }} />
              {l.title}
              {l.id === 'author' && <span className="text-[11px] opacity-70">跨书</span>}
              {l.id === 'protocol' && <span className="text-[11px] opacity-70">随时</span>}
            </div>
            {ls.map((i) => {
              const on = path === `/p/${projectId}/s/${i.id}`
              const dim = i.weight !== '必经'
              return (
                <Link
                  key={i.id}
                  href={`/p/${projectId}/s/${i.id}`}
                  className={cx(
                    'group relative flex items-center gap-2 rounded-[2px] px-2.5 py-[6px] text-[14px] transition-colors',
                    on ? 'bg-[var(--bg-sunk)] font-medium text-[var(--text)]' : 'hover:bg-[var(--bg-sunk)]/60',
                    dim ? 'text-[var(--text-faint)]' : 'text-[var(--text-dim)]',
                    i.weight === '不适用' && 'line-through decoration-[var(--line)]',
                  )}
                >
                  {on && (
                    <span className="absolute left-0 top-1/2 h-3.5 w-[2px] -translate-y-1/2 rounded-full bg-[var(--accent)]" />
                  )}
                  <span className="num w-5 flex-none text-[11px] text-[var(--text-faint)]">
                    {String(i.no).padStart(2, '0')}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{i.title}</span>
                  {i.minViable && !i.passed && (
                    <span className="flex-none text-[11px] text-[var(--accent)]" title="最小可动笔集合">
                      ●
                    </span>
                  )}
                  <span className="num flex-none text-[11px] text-[var(--text-faint)]">
                    {i.passed ? (
                      <span style={{ color: 'var(--color-celadon)' }}>✓</span>
                    ) : i.started ? (
                      `${i.done}/${i.total}`
                    ) : (
                      ''
                    )}
                  </span>
                </Link>
              )
            })}
          </div>
        )
      })}
    </nav>
  )
}

function Quick({ href, path, children }: { href: string; path: string; children: React.ReactNode }) {
  const on = path === href
  return (
    <Link
      href={href}
      className={cx(
        'relative block rounded-[2px] px-2.5 py-[6px] text-[14px] transition-colors',
        on ? 'bg-[var(--bg-sunk)] font-medium text-[var(--text)]' : 'text-[var(--text-dim)] hover:bg-[var(--bg-sunk)]/60',
      )}
    >
      {on && <span className="absolute left-0 top-1/2 h-3.5 w-[2px] -translate-y-1/2 rounded-full bg-[var(--accent)]" />}
      {children}
    </Link>
  )
}
