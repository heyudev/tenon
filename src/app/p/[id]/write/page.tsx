import { notFound } from 'next/navigation'
import { cast, chapters, projects, threads, volumes } from '@/lib/repo'
import { STAGE_MAP } from '@/lib/stages'
import WriteDesk from './WriteDesk'

export default async function WritePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const p = projects.get(id)
  if (!p) notFound()

  return (
    <WriteDesk
      project={p}
      chapters={chapters.list(id)}
      vols={volumes.list(id)}
      people={cast.list(id)}
      items={threads.list(id)}
      gates={{
        brief: STAGE_MAP['g1-brief'].gate,
        draft: STAGE_MAP['g2-draft'].gate,
        review: STAGE_MAP['g4-gate'].gate,
        writeback: STAGE_MAP['g5-writeback'].gate,
      }}
    />
  )
}
