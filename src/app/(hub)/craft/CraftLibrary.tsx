'use client'

import { useState } from 'react'
import type { CraftCard } from '@/lib/types'
import { Markdown } from '@/components/md'
import { Eyebrow, cx } from '@/components/ui'

const KINDS = [
  { id: 'principle', label: '原则', desc: '公理层与决策纪律——冲突时以此为准' },
  { id: 'craft', label: '技法', desc: '每个环节的可执行判据' },
  { id: 'platform', label: '平台约束', desc: '硬门禁，不是建议' },
  { id: 'checklist', label: '门禁清单', desc: '四道关口，按顺序把守' },
  { id: 'role', label: '委员会角色', desc: '按分档调用，别每次全员上' },
] as const

export default function CraftLibrary({ cards }: { cards: CraftCard[] }) {
  const [kind, setKind] = useState<string>('principle')
  const [sel, setSel] = useState<string>(cards.find((c) => c.kind === 'principle')?.id ?? '')

  const list = cards.filter((c) => c.kind === kind)
  const current = cards.find((c) => c.id === sel) ?? list[0]

  return (
    <div className="flex h-full flex-col lg:flex-row">
      <div className="w-[290px] flex-none overflow-y-auto border-r border-[var(--line-soft)]">
        <div className="px-6 pb-4 pt-6">
          <h1 className="display text-[26px] tracking-tight">方法论库</h1>
          <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--text-faint)]">
            全是可执行判据：阈值、决策流程、失效模式。写不成判据的不进这一层。
            <br />
            它们同时是门禁的依据，也是注入每次生成的约束。
          </p>
        </div>

        {KINDS.map((k) => {
          const items = cards.filter((c) => c.kind === k.id)
          const open = kind === k.id
          return (
            <div key={k.id} className="border-t border-[var(--line-soft)]">
              <button
                onClick={() => {
                  setKind(k.id)
                  setSel(items[0]?.id ?? '')
                }}
                className="flex w-full items-baseline gap-2 px-6 py-3 text-left hover:bg-[var(--bg-sunk)]/50"
              >
                <span className={cx('text-[14px] font-medium', open && 'text-[var(--accent)]')}>{k.label}</span>
                <span className="num ml-auto text-[12px] text-[var(--text-faint)]">{items.length}</span>
              </button>
              {open && (
                <div className="pb-2">
                  <p className="px-6 pb-2 text-[12px] leading-relaxed text-[var(--text-faint)]">{k.desc}</p>
                  {items.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSel(c.id)}
                      className={cx(
                        'relative block w-full px-6 py-[7px] text-left text-[14px] transition-colors',
                        current?.id === c.id
                          ? 'bg-[var(--bg-sunk)] text-[var(--text)]'
                          : 'text-[var(--text-dim)] hover:text-[var(--text)]',
                      )}
                    >
                      {current?.id === c.id && (
                        <span className="absolute left-0 top-1/2 h-3 w-[2px] -translate-y-1/2 rounded-full bg-[var(--accent)]" />
                      )}
                      {c.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="min-w-0 flex-1 overflow-y-auto">
        {current && (
          <article key={current.id} className="seat mx-auto max-w-[720px] px-12 py-12">
            <Eyebrow>{current.category}</Eyebrow>
            <h2 className="mt-2.5 text-[26px] font-light tracking-tight">{current.title}</h2>
            {current.summary && (
              <p className="mt-3 border-l-2 border-[var(--accent)]/40 pl-4 text-[14px] leading-relaxed text-[var(--text-dim)]">
                {current.summary}
              </p>
            )}
            <div className="mt-8">
              <Markdown src={current.body} />
            </div>
          </article>
        )}
      </div>
    </div>
  )
}
