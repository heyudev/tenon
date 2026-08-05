import { notFound } from 'next/navigation'
import { STAGE_MAP, STAGES, gateProgress, isSequential } from '@/lib/stages'
import { weightsOf } from '@/lib/route'
import { autosOf } from '@/lib/gate-ctx'
import { assets, cast, chapters, metrics, projectRules, projects, stageStore, threads, volumes } from '@/lib/repo'
import GenericStage from './views/GenericStage'
import RulePickStage from './views/RulePickStage'
import GraphStage from './views/GraphStage'
import CastStage from './views/CastStage'
import VolumeStage from './views/VolumeStage'
import ThreadStage from './views/ThreadStage'
import BeatStage from './views/BeatStage'
import PowerStage from './views/PowerStage'
import ResourceStage from './views/ResourceStage'
import MetricStage from './views/MetricStage'
import WriteRedirect from './views/WriteRedirect'

export default async function StagePage({
  params,
}: {
  params: Promise<{ id: string; stage: string }>
}) {
  const { id, stage: stageId } = await params
  const stage = STAGE_MAP[stageId]
  if (!stage) notFound()
  const p = projects.get(id)
  if (!p) notFound()

  const state = stageStore.get(id, stageId)
  const cards = assets.craftBy(stage.craft)
  const weights = weightsOf(p)
  const autos = autosOf(id)
  const states = stageStore.all(id)
  const progress = STAGES.map((s) => {
    const g = gateProgress(s, states[s.id]?.gate ?? {}, autos)
    return {
      id: s.id, no: s.no, title: s.title, layer: s.layer,
      weight: weights[s.id], passed: g.passed, minViable: !!s.minViable, sequential: isSequential(s),
      started: states[s.id]?.status !== '未开始',
      done: g.done, total: g.total,
    }
  })
  const common = { stage, projectId: id, state, cards, weight: weights[stageId], autos, progress }

  switch (stage.view) {
    case 'rules':
      return <RulePickStage {...common} rules={assets.rules()} picked={projectRules.list(id)} />
    case 'graph':
      return <GraphStage {...common} picked={projectRules.list(id)} edges={assets.edges()} />
    case 'cast':
      return <CastStage {...common} people={cast.list(id)} />
    case 'volumes':
      return <VolumeStage {...common} vols={volumes.list(id)} chapters={chapters.list(id)} />
    case 'threads':
      return <ThreadStage {...common} items={threads.list(id)} chapterCount={chapters.list(id).length} />
    case 'beats':
      return (
        <BeatStage
          {...common}
          platform={p.platform}
          vols={volumes.list(id)}
          chapters={chapters.list(id)}
          items={threads.list(id)}
        />
      )
    case 'power':
      return <PowerStage {...common} />
    case 'resources':
      return <ResourceStage {...common} refs={assets.resources()} />
    case 'metrics':
      return <MetricStage {...common} platform={p.platform} chapters={chapters.list(id)} rows={metrics.list(id)} />
    case 'write':
      return <WriteRedirect projectId={id} stage={stage} />
    default:
      return <GenericStage {...common} />
  }
}
