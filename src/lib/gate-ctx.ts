import { cast, chapters, metrics, projectRules, projects, stageStore, threads, volumes } from './repo'
import { runChecks, type CheckResult } from './checks'

/** 为一本书跑一遍全部自动门禁判定 */
export function autosOf(projectId: string): Record<string, CheckResult | null> {
  const p = projects.get(projectId)
  if (!p) return {}
  const states = stageStore.all(projectId)
  const data = Object.fromEntries(Object.entries(states).map(([k, v]) => [k, v.data]))
  return runChecks({
    project: p,
    data,
    chapters: chapters.list(projectId),
    threads: threads.list(projectId),
    cast: cast.list(projectId),
    volumes: volumes.list(projectId),
    rules: projectRules.list(projectId),
    metrics: metrics.list(projectId),
  })
}

export type { CheckResult }
