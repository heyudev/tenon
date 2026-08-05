'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cx } from '../ui'

/** 榫卯标记：两个互相咬合的缺口 —— 系统同名意象 */
export function Mark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 4h7v4h4V4h7v16h-7v-4h-4v4H3V4z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M10 8v8M14 8v8" stroke="currentColor" strokeWidth="1.4" opacity="0.35" />
    </svg>
  )
}

export function ThemeToggle() {
  const [dark, setDark] = useState(true)
  useEffect(() => setDark(document.documentElement.classList.contains('dark')), [])
  return (
    <button
      onClick={() => {
        const next = !dark
        setDark(next)
        document.documentElement.classList.toggle('dark', next)
        localStorage.setItem('tenon.theme', next ? 'dark' : 'light')
      }}
      aria-label="切换深浅主题"
      title="切换主题"
      className="flex h-7 w-7 items-center justify-center rounded-[2px] text-[var(--text-faint)] transition-colors hover:bg-[var(--bg-sunk)] hover:text-[var(--text)]"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="5.2" stroke="currentColor" strokeWidth="1.3" />
        <path d="M8 2.8a5.2 5.2 0 000 10.4V2.8z" fill="currentColor" />
      </svg>
    </button>
  )
}

export function NavLink({
  href,
  children,
  exact,
  badge,
}: {
  href: string
  children: React.ReactNode
  exact?: boolean
  badge?: React.ReactNode
}) {
  const path = usePathname()
  const on = exact ? path === href : path === href || path.startsWith(href + '/')
  return (
    <Link
      href={href}
      className={cx(
        'group relative flex items-center justify-between gap-2 overflow-hidden rounded-[2px] px-2.5 py-[7px] text-[14px] transition-colors duration-150',
        on
          ? 'bg-[var(--bg-sunk)] text-[var(--text)] font-medium'
          : 'text-[var(--text-dim)] hover:bg-[var(--bg-sunk)]/60 hover:text-[var(--text)]',
      )}
    >
      {/* 当前项：一道朱砂，方头不圆头，沿轨道从上滑入到位 */}
      {on && (
        <span
          className="absolute left-0 top-0 h-full w-[3px] bg-[var(--accent)]"
          style={{ animation: 'seat 0.26s var(--ease-seat) both', ['--seat-x' as string]: '0', ['--seat-y' as string]: '-100%' }}
        />
      )}
      <span className="truncate">{children}</span>
      {badge != null && <span className="num flex-none text-[12px] text-[var(--text-faint)]">{badge}</span>}
    </Link>
  )
}
