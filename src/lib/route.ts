import { GENRE_MAP, type ChannelId, type VenueId } from './genre'
import { VENUE_MAP } from './platform'
import { STAGES, weightOf, type Stage, type Weight } from './stages'
import type { Project } from './types'

/** 一本书的路线上下文 */
export interface RouteCtx {
  venue: VenueId
  channel: ChannelId
  archetypes: ReturnType<typeof archetypesOf>
}

function archetypesOf(genreId: string | null) {
  return genreId ? (GENRE_MAP[genreId]?.archetypes ?? []) : []
}

export function venueOf(p: Project) {
  return VENUE_MAP[p.venue ?? ''] ?? VENUE_MAP['fanqie-m']
}

export function ctxOf(p: Project): RouteCtx {
  const v = venueOf(p)
  return { venue: v.id, channel: v.channel, archetypes: archetypesOf(p.genre) }
}

export function weightsOf(p: Project): Record<string, Weight> {
  const ctx = ctxOf(p)
  return Object.fromEntries(STAGES.map((s) => [s.id, weightOf(s, ctx)]))
}

/** 必经环节（走完这些就算按框架走了一遍） */
export function coreStages(p: Project): Stage[] {
  const w = weightsOf(p)
  return STAGES.filter((s) => w[s.id] === '必经')
}

export { STAGES, weightOf }
export type { Weight, Stage }
