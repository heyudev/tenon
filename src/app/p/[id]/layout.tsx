import Link from 'next/link'
import { notFound } from 'next/navigation'
import { projects, stageStore } from '@/lib/repo'
import { LAYERS, STAGES, gateProgress, isSequential } from '@/lib/stages'
import { weightsOf } from '@/lib/route'
import { autosOf } from '@/lib/gate-ctx'
import { GENRE_MAP } from '@/lib/genre'
import { Mark, ThemeToggle } from '@/components/shell/bits'
import SideShell from "@/components/shell/SideShell"
import RouteRail from './RouteRail'

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const p = projects.get(id)
  if (!p) notFound()
  const states = stageStore.all(id)
  const weights = weightsOf(p)
  const autos = autosOf(id)
  const genre = p.genre ? GENRE_MAP[p.genre] : null

  const items = STAGES.map((s) => {
    const g = gateProgress(s, states[s.id]?.gate ?? {}, autos)
    return {
      id: s.id,
      no: s.no,
      title: s.title,
      layer: s.layer,
      weight: weights[s.id],
      minViable: !!s.minViable,
      crossBook: !!s.crossBook,
      sequential: isSequential(s),
      done: g.done,
      total: g.total,
      passed: g.passed,
      started: states[s.id]?.status !== '未开始',
    }
  })

  return (
    <div className="flex h-dvh flex-col md:flex-row">
      <SideShell width={262} label="环节轨">
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <Link href="/" className="flex items-center gap-2 text-[var(--text-faint)] hover:text-[var(--text)]">
            <Mark size={15} />
            <span className="text-[12px] tracking-[0.18em]">TENON</span>
          </Link>
          <ThemeToggle />
        </div>

        <div className="px-4 pb-3">
          <Link href={`/p/${id}`} className="block">
            <div className="truncate text-[14px] font-semibold tracking-tight hover:text-[var(--accent)]">
              {p.title}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] text-[var(--text-faint)]">
              <span>{p.platform}</span>
              <span>·</span>
              <span>{p.channel}</span>
              {genre && (
                <>
                  <span>·</span>
                  <span>{genre.name}</span>
                </>
              )}
            </div>
          </Link>
        </div>

        <RouteRail projectId={id} items={items} layers={LAYERS} hasGenre={!!genre} />
      </SideShell>

      <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
