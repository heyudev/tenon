import Link from 'next/link'
import { projects } from '@/lib/repo'
import { Mark, NavLink, ThemeToggle } from '@/components/shell/bits'
import SideShell from '@/components/shell/SideShell'

export default function HubLayout({ children }: { children: React.ReactNode }) {
  const books = projects.all()

  return (
    <div className="flex h-dvh flex-col md:flex-row">
      <SideShell width={236}>
        <div className="flex items-center justify-between px-4 pb-3 pt-4">
          <Link href="/" className="flex items-center gap-2 text-[var(--text)]">
            <span className="text-[var(--accent)]">
              <Mark size={18} />
            </span>
            <span className="text-[14px] font-semibold tracking-[0.02em]">榫</span>
            <span className="text-[12px] tracking-[0.2em] text-[var(--text-faint)]">TENON</span>
          </Link>
          <ThemeToggle />
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 pb-4">
          <NavLink href="/overview">系统全貌</NavLink>

          <div className="eyebrow px-2.5 pb-1.5 pt-4">资产层 · 跨书共享</div>
          <NavLink href="/rulebase">规则库</NavLink>
          <NavLink href="/graph">概念图谱</NavLink>
          <NavLink href="/lab">组合实验室</NavLink>
          <NavLink href="/platforms">阵地库</NavLink>
          <NavLink href="/craft">方法论库</NavLink>
          <NavLink href="/glossary">术语表</NavLink>

          <div className="eyebrow px-2.5 pb-1.5 pt-5">作品</div>
          {books.map((b) => (
            <NavLink key={b.id} href={`/p/${b.id}`} badge={b.platform}>
              {b.title}
            </NavLink>
          ))}
          <NavLink href="/new">＋ 新建作品</NavLink>

          <div className="eyebrow px-2.5 pb-1.5 pt-5">系统</div>
          <NavLink href="/settings">设置</NavLink>
        </nav>
      </SideShell>

      <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
