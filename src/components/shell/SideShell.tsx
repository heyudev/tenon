'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { cx } from '../ui'

/**
 * 侧栏外壳：宽屏是常驻栏，窄屏收成抽屉。
 * 原来两个 layout 都是写死宽度 + `h-dvh` 并排，手机上主区被挤到没有。
 * 抽屉推入用入榫曲线——它也是一次「滑到位」。
 */
export default function SideShell({
  width = 236,
  label = '导航',
  children,
}: {
  width?: number
  label?: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const path = usePathname()
  // 跳转后自动收起，否则点完一个链接抽屉还盖在内容上
  useEffect(() => setOpen(false), [path])

  return (
    <>
      <div className="flex flex-none items-center gap-3 border-b border-[var(--line-soft)] px-3 py-2 md:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label={`展开${label}`}
          aria-expanded={open}
          className="flex h-8 w-8 items-center justify-center rounded-[2px] border border-[var(--line)] text-[var(--text-dim)]"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
            <path d="M1 3h12M1 7h12M1 11h12" stroke="currentColor" strokeWidth="1.3" />
          </svg>
        </button>
        <span className="text-[14px] font-semibold tracking-[0.02em]">榫</span>
        <span className="eyebrow">TENON</span>
      </div>

      {open && (
        <button
          aria-label={`收起${label}`}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/45 md:hidden"
        />
      )}

      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-40 flex flex-col overflow-x-hidden border-r border-[var(--line-soft)] bg-[var(--bg)]',
          'transition-transform duration-300 [transition-timing-function:var(--ease-seat)]',
          'md:static md:z-auto md:flex-none md:translate-x-0 md:transition-none',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        style={{ width }}
      >
        {children}
      </aside>
    </>
  )
}
