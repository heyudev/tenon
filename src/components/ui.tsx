'use client'

import React from 'react'

export const cx = (...a: unknown[]) =>
  a.filter((x): x is string => typeof x === 'string' && x.length > 0).join(' ')

/* ── 排印 ─────────────────────────────────────── */

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cx('eyebrow', className)}>{children}</div>
}

export function SectionTitle({
  children,
  aside,
  className,
}: {
  children: React.ReactNode
  aside?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cx('flex items-baseline justify-between gap-4', className)}>
      <h2 className="text-[18px] font-semibold tracking-tight">{children}</h2>
      {aside && <div className="text-[14px] text-[var(--text-faint)]">{aside}</div>}
    </div>
  )
}

/* ── 容器 ─────────────────────────────────────── */

export function Panel({
  children,
  className,
  pad = true,
}: {
  children: React.ReactNode
  className?: string
  pad?: boolean
}) {
  return <section className={cx('frame', pad && 'p-5', className)}>{children}</section>
}

/* ── 榫卯 ─────────────────────────────────────────
   系统的视觉母题：门禁通过 = 榫头入卯。
   未过时只有一个开着口的卯，过了才有榫坐进去。 */

export function Tenon({
  seated,
  size = 14,
  tone = 'accent',
  idle,
}: {
  seated: boolean
  size?: number
  /** 强调色（朱砂）还是稳态色（青） */
  tone?: 'accent' | 'good'
  /** 非硬项：未坐入时用最淡的线，不喊人 */
  idle?: boolean
}) {
  const c = tone === 'good' ? 'var(--color-celadon)' : 'var(--accent)'
  const stroke = seated ? c : idle ? 'var(--line)' : `color-mix(in srgb, ${c} 45%, transparent)`
  return (
    <svg viewBox="0 0 14 14" width={size} height={size} aria-hidden className="flex-none">
      {/* 卯：右边的构件，左缘开一个口 */}
      <path
        d="M13 1H5v3.5h3.2v5H5V13h8z"
        fill="none"
        stroke={stroke}
        strokeWidth="1.2"
        strokeLinejoin="round"
        style={{ transition: 'stroke 0.22s var(--ease-seat)' }}
      />
      {/* 榫：始终在，只是没坐入时退到卯口外面。
          推进用 ease-seat，退出用 ease-part——装和拆不是同一条曲线。 */}
      <path
        d="M1 4.5h7.2v5H1z"
        fill={c}
        style={{
          transformBox: 'view-box',
          transform: seated ? 'none' : 'translateX(-9px)',
          opacity: seated ? 1 : 0,
          transition: seated
            ? 'transform 0.24s var(--ease-seat), opacity 0.1s linear'
            : 'transform 0.18s var(--ease-part), opacity 0.14s linear 0.04s',
        }}
      />
    </svg>
  )
}

/* ── 控件 ─────────────────────────────────────── */

export function Button({
  children,
  variant = 'ghost',
  size = 'md',
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'solid' | 'ghost' | 'quiet' | 'danger'
  size?: 'sm' | 'md'
}) {
  const base =
    'inline-flex items-center justify-center gap-1.5 rounded-[2px] font-medium transition-all duration-150 disabled:opacity-35 disabled:pointer-events-none select-none whitespace-nowrap'
  const sizes = { sm: 'h-7 px-2.5 text-[14px]', md: 'h-8 px-3.5 text-[14px]' }
  const variants = {
    solid:
      'bg-[var(--accent)] text-white hover:brightness-110 active:brightness-95 shadow-[0_1px_0_rgb(255_255_255/0.12)_inset]',
    ghost:
      'border border-[var(--line)] text-[var(--text)] hover:bg-[var(--bg-sunk)] hover:border-[var(--text-faint)]',
    quiet: 'text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--bg-sunk)]',
    danger: 'border border-[var(--accent)]/40 text-[var(--accent)] hover:bg-[var(--accent)]/8',
  }
  return (
    <button className={cx(base, sizes[size], variants[variant], className)} {...rest}>
      {children}
    </button>
  )
}

export function Chip({
  children,
  tone = 'neutral',
  active,
  className,
  ...rest
}: React.HTMLAttributes<HTMLSpanElement> & {
  tone?: 'neutral' | 'accent' | 'good' | 'warn' | 'mute'
  active?: boolean
}) {
  const tones = {
    neutral: 'text-[var(--text-dim)] border-[var(--line)]',
    // 朱砂是唯一强调色，就该用成块面——描边版的朱砂在满屏发丝线里根本看不见
    accent: 'text-[var(--on-accent)] border-transparent bg-[var(--accent)]',
    good: 'text-[var(--color-celadon)] border-[var(--color-celadon)]/35 bg-[var(--color-celadon)]/8',
    warn: 'text-[var(--color-ochre)] border-[var(--color-ochre)]/40 bg-[var(--color-ochre)]/8',
    mute: 'text-[var(--text-faint)] border-[var(--line-soft)]',
  }
  return (
    <span
      className={cx(
        'inline-flex h-[22px] items-center rounded-[2px] border px-2 text-[12px] font-medium leading-none',
        tones[tone],
        active && 'ring-1 ring-[var(--accent)]/30',
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  )
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label?: string
  hint?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={cx('block', className)}>
      {label && (
        <div className="mb-1.5 flex items-baseline gap-2">
          <span className="text-[14px] font-medium text-[var(--text)]">{label}</span>
          {hint && <span className="text-[12px] text-[var(--text-faint)]">{hint}</span>}
        </div>
      )}
      {children}
    </label>
  )
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx('field', props.className)} />
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx('field resize-y', props.className)} />
}

export function Select({
  options,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { options: string[] }) {
  return (
    <select {...props} className={cx('field cursor-pointer', props.className)}>
      <option value="">—</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  className?: string
}) {
  // 槽是卯，滑块是榫。选中不是「浮起来」，是「坐进去」——
  // 所以滑块用 inset 描边而不是投影，并且沿轨道滑到位。
  const at = Math.max(0, options.findIndex((o) => o.value === value))
  return (
    <div
      className={cx('sunk relative inline-grid rounded-[2px] border border-[var(--line-soft)] p-0.5', className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden
        className="absolute bottom-0.5 left-0.5 top-0.5 rounded-[2px] bg-[var(--surface)] shadow-[inset_0_0_0_1px_var(--line)]"
        style={{
          width: `calc((100% - 4px) / ${options.length})`,
          transform: `translateX(${at * 100}%)`,
          transition: 'transform 0.26s var(--ease-seat)',
        }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'relative z-10 whitespace-nowrap rounded-[2px] px-2.5 py-1 text-[14px] font-medium transition-colors duration-150',
            value === o.value ? 'text-[var(--text)]' : 'text-[var(--text-faint)] hover:text-[var(--text-dim)]',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Check({
  checked,
  onChange,
  children,
  hard,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  children: React.ReactNode
  hard?: boolean
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="group flex w-full items-start gap-2.5 py-1.5 text-left"
    >
      <span className="mt-[3px] flex-none transition-opacity duration-150 group-hover:opacity-80">
        <Tenon seated={checked} idle={!hard} />
      </span>
      <span
        className={cx(
          'text-[14px] leading-[1.55] transition-colors',
          checked ? 'text-[var(--text-faint)] line-through decoration-[var(--line)]' : 'text-[var(--text-dim)]',
        )}
      >
        {children}
        {hard && !checked && (
          <span className="ml-2 inline-flex h-[18px] translate-y-[2px] items-center rounded-[2px] bg-[var(--accent)] px-1.5 text-[11px] font-medium leading-none text-[var(--on-accent)]">
            硬项
          </span>
        )}
      </span>
    </button>
  )
}

/* ── 数据显示 ─────────────────────────────────── */

export function Meter({
  value,
  max = 1,
  tone = 'accent',
  className,
}: {
  value: number
  max?: number
  tone?: 'accent' | 'good' | 'warn' | 'mute'
  className?: string
}) {
  const colors = {
    accent: 'var(--accent)',
    good: 'var(--color-celadon)',
    warn: 'var(--color-ochre)',
    mute: 'var(--text-faint)',
  }
  const pct = Math.max(0, Math.min(1, max === 0 ? 0 : value / max)) * 100
  // 方头不圆头，推进用入榫曲线——这是「推到哪儿了」，不是「充了多少电」
  return (
    <div className={cx('h-[3px] w-full overflow-hidden bg-[var(--line-soft)]', className)}>
      <div
        className="h-full"
        style={{
          width: `${pct}%`,
          background: colors[tone],
          transition: 'width 0.32s var(--ease-seat)',
        }}
      />
    </div>
  )
}

export function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  tone?: 'accent' | 'good' | 'warn'
}) {
  const c = tone === 'accent' ? 'var(--accent)' : tone === 'good' ? 'var(--color-celadon)' : tone === 'warn' ? 'var(--color-ochre)' : 'var(--text)'
  return (
    <div>
      <div className="eyebrow mb-1.5">{label}</div>
      <div className="num text-[26px] font-light leading-none tracking-tight" style={{ color: c }}>
        {value}
      </div>
      {sub && <div className="mt-1.5 text-[12px] text-[var(--text-faint)]">{sub}</div>}
    </div>
  )
}

/* 两把尺子必须靠**形状**分开，不能只靠颜色——
   2px 宽的刻度上朱砂和青根本分不出来，色觉障碍下更是全废。
   潜力＝天花板，所以是往上长的阶梯；可写＝地板，所以是一条推平的实条。 */

/** 潜力★：递增高度的阶梯，量的是世界观天花板 */
export function Ticks({
  n,
  max = 5,
  tone = 'accent',
  label,
}: {
  n: number
  max?: number
  tone?: 'accent' | 'good'
  label?: string
}) {
  const c = tone === 'accent' ? 'var(--accent)' : 'var(--color-celadon)'
  return (
    <span
      className="inline-flex items-end gap-[2px] align-middle"
      role="img"
      aria-label={label ?? `潜力 ${n} / ${max}`}
    >
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className="w-[2px] transition-colors"
          style={{ height: 3 + i * 2, background: i < n ? c : 'var(--line)' }}
        />
      ))}
    </span>
  )
}

/** 可写✍：一条推进到位的实条，量的是第一章的地板 */
export function Rung({
  n,
  max = 5,
  tone = 'good',
  label,
}: {
  n: number
  max?: number
  tone?: 'accent' | 'good'
  label?: string
}) {
  const c = tone === 'accent' ? 'var(--accent)' : 'var(--color-celadon)'
  return (
    <span
      className="inline-flex h-[11px] w-[26px] items-center align-middle"
      role="img"
      aria-label={label ?? `可写性 ${n} / ${max}`}
    >
      <span className="h-[4px] w-full bg-[var(--line)]">
        <span
          className="block h-full"
          style={{ width: `${(Math.max(0, Math.min(max, n)) / max) * 100}%`, background: c, transition: 'width 0.3s var(--ease-seat)' }}
        />
      </span>
    </span>
  )
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <div className="text-[14px] text-[var(--text-faint)]">{children}</div>
    </div>
  )
}
