import Link from 'next/link'
import { projects } from '@/lib/repo'
import { Mark, NavLink, ThemeToggle } from '@/components/shell/bits'
import SideShell from '@/components/shell/SideShell'

/**
 * 读数据库的页面必须每次请求现算。
 * Next 默认会把它静态预渲染，把「构建那一刻的库内容」烤进 HTML——
 * 新建的书不出现、删掉的还在，用起来像坏了。
 */
export const dynamic = 'force-dynamic'

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

        {/* 按「用户每天要干什么」排，不按系统自己的本体论分层。
            书在最上面——那是唯一天天要点的东西；方法论/阵地/术语是查阅资料，收到下面。 */}
        <nav className="flex-1 overflow-y-auto px-2.5 pb-4">
          <div className="eyebrow px-2.5 pb-1.5 pt-1">我的书</div>
          {books.map((b) => (
            <NavLink key={b.id} href={`/p/${b.id}`} badge={b.platform}>
              {b.title}
            </NavLink>
          ))}
          <NavLink href="/new">＋ 写一本新书</NavLink>

          <div className="eyebrow px-2.5 pb-1.5 pt-5">要用的时候再看</div>
          <NavLink href="/craft">怎么写 · 方法论</NavLink>
          <NavLink href="/platforms">发在哪 · 阵地</NavLink>
          <NavLink href="/glossary">名词解释</NavLink>
          <NavLink href="/overview">这套系统怎么运转</NavLink>

          <div className="eyebrow px-2.5 pb-1.5 pt-5">系统</div>
          <NavLink href="/settings">设置</NavLink>
        </nav>
      </SideShell>

      <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
