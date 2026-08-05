'use client'

import type { Field } from '@/lib/stages'
import { Button, Chip, Eyebrow, cx } from '@/components/ui'

type Row = Record<string, string>
const asRows = (v: unknown): Row[] => (Array.isArray(v) ? (v as Row[]) : [])
const asList = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : [])
const asMap = (v: unknown): Record<string, number | boolean> =>
  v && typeof v === 'object' ? (v as Record<string, number | boolean>) : {}

export function FieldView({
  f,
  value,
  onChange,
}: {
  f: Field
  value: unknown
  onChange: (v: unknown) => void
}) {
  switch (f.k) {
    case 'text':
      return (
        <Wrap f={f}>
          <input
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={f.placeholder}
            className="field"
          />
        </Wrap>
      )

    case 'area':
      return (
        <Wrap f={f}>
          <textarea
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            rows={f.rows ?? 4}
            placeholder={f.placeholder}
            className="field resize-y"
          />
        </Wrap>
      )

    case 'select':
      return (
        <Wrap f={f}>
          <div className="flex flex-wrap gap-1.5">
            {f.options.map((o) => (
              <button
                key={o}
                onClick={() => onChange(value === o ? '' : o)}
                className={cx(
                  'rounded-[2px] border px-3 py-1.5 text-[14px] transition-colors',
                  value === o
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                    : 'border-[var(--line)] text-[var(--text-dim)] hover:border-[var(--text-faint)]',
                )}
              >
                {o}
              </button>
            ))}
          </div>
        </Wrap>
      )

    case 'list': {
      const items = asList(value)
      return (
        <Wrap f={f}>
          <div className="space-y-1.5">
            {items.map((it, i) => (
              <div key={i} className="flex gap-1.5">
                <input
                  value={it}
                  onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
                  className="field"
                />
                <Button size="sm" variant="quiet" onClick={() => onChange(items.filter((_, j) => j !== i))}>
                  ×
                </Button>
              </div>
            ))}
            <Button size="sm" variant="quiet" onClick={() => onChange([...items, ''])}>
              ＋ 添加
            </Button>
          </div>
        </Wrap>
      )
    }

    case 'table': {
      const rows = asRows(value)
      return (
        <Wrap f={f}>
          <div className="overflow-hidden border border-[var(--line-soft)]">
            <div className="sunk flex border-b border-[var(--line-soft)]">
              {f.cols.map((c) => (
                <div key={c.id} className="eyebrow px-2.5 py-1.5" style={{ flex: c.grow ?? 1 }}>
                  {c.label}
                </div>
              ))}
              <div className="w-7 flex-none" />
            </div>
            {rows.map((r, i) => (
              <div key={i} className="flex border-b border-[var(--line-soft)] last:border-0">
                {f.cols.map((c) => (
                  <div key={c.id} style={{ flex: c.grow ?? 1 }} className="min-w-0 border-r border-[var(--line-soft)] last:border-0">
                    <textarea
                      value={r[c.id] ?? ''}
                      onChange={(e) =>
                        onChange(rows.map((x, j) => (j === i ? { ...x, [c.id]: e.target.value } : x)))
                      }
                      rows={1}
                      className="w-full resize-y bg-transparent px-2.5 py-2 text-[14px] leading-relaxed outline-none"
                    />
                  </div>
                ))}
                <button
                  onClick={() => onChange(rows.filter((_, j) => j !== i))}
                  className="w-7 flex-none text-[14px] text-[var(--text-faint)] hover:text-[var(--accent)]"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <Button size="sm" variant="quiet" className="mt-1.5" onClick={() => onChange([...rows, {}])}>
            ＋ 添加一行
          </Button>
        </Wrap>
      )
    }

    case 'score': {
      const m = asMap(value) as Record<string, number>
      const total = f.items.reduce((s, it) => s + (Number(m[it.id]) || 0), 0)
      const verdict = total >= 14 ? ['立项', 'good'] : total >= 10 ? ['修改后重测', 'warn'] : ['弃', 'accent']
      return (
        <Wrap f={f}>
          <div className="mb-3 flex items-baseline gap-3">
            <span className="num text-[32px] font-light leading-none">{total}</span>
            <span className="text-[14px] text-[var(--text-faint)]">/ {f.items.length * 2}</span>
            <Chip tone={verdict[1] as 'good' | 'warn' | 'accent'}>{verdict[0]}</Chip>
          </div>
          <div className="space-y-px overflow-hidden border border-[var(--line-soft)]">
            {f.items.map((it, i) => {
              const v = Number(m[it.id]) || 0
              return (
                <div key={it.id} className="flex items-center gap-3 bg-[var(--surface)] px-3.5 py-2.5">
                  <span className="num w-4 flex-none text-[12px] text-[var(--text-faint)]">{i + 1}</span>
                  <span className="w-[104px] flex-none text-[14px] font-medium">{it.label}</span>
                  <span className="min-w-0 flex-1 truncate text-[12px] text-[var(--text-faint)]">
                    0＝{it.zero} · 2＝{it.two}
                  </span>
                  <div className="flex flex-none gap-1">
                    {[0, 1, 2].map((n) => (
                      <button
                        key={n}
                        onClick={() => onChange({ ...m, [it.id]: n })}
                        className={cx(
                          'h-6 w-6 rounded-[2px] border text-[14px] transition-colors',
                          v === n && m[it.id] !== undefined
                            ? 'border-[var(--accent)] bg-[var(--accent)]/12 text-[var(--accent)]'
                            : 'border-[var(--line)] text-[var(--text-faint)] hover:border-[var(--text-faint)]',
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </Wrap>
      )
    }

    case 'flags': {
      const m = asMap(value) as Record<string, boolean>
      return (
        <Wrap f={f}>
          <div className="space-y-px overflow-hidden border border-[var(--line-soft)]">
            {f.items.map((it) => (
              <button
                key={it.id}
                onClick={() => onChange({ ...m, [it.id]: !m[it.id] })}
                className="flex w-full items-center gap-3 bg-[var(--surface)] px-3.5 py-2.5 text-left"
              >
                <span
                  className={cx(
                    'h-[13px] w-[13px] flex-none rounded-[2px] border transition-colors',
                    m[it.id] ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-[var(--line)]',
                  )}
                />
                <span className="flex-none text-[14px] font-medium">{it.label}</span>
                {it.hint && <span className="min-w-0 flex-1 truncate text-[12px] text-[var(--text-faint)]">{it.hint}</span>}
              </button>
            ))}
          </div>
        </Wrap>
      )
    }
  }
}

function Wrap({ f, children }: { f: Field; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline gap-2">
        <span className="text-[14px] font-medium">{f.label}</span>
        {'hint' in f && f.hint && <span className="text-[12px] text-[var(--text-faint)]">{f.hint}</span>}
      </div>
      {children}
    </div>
  )
}

export { Eyebrow }
