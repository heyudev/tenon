'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  cast,
  chapters,
  decisions,
  locks,
  metrics,
  projects,
  stageStore,
  threads,
  volumes,
} from './repo'
import { setSetting } from './db'
import { VENUE_MAP } from './platform'

const touch = (id?: string) => {
  revalidatePath('/', 'layout')
  if (id) revalidatePath(`/p/${id}`, 'layout')
}

/* ── 作品 ── */
export async function createProject(fd: FormData) {
  const title = String(fd.get('title') ?? '').trim()
  if (!title) return
  const venueId = String(fd.get('venue') ?? 'fanqie-m')
  const v = VENUE_MAP[venueId] ?? VENUE_MAP['fanqie-m']
  // platform/channel 都由 venue 派生，存的是运营商 id（'番茄'）而不是全称（'番茄小说'）——
  // schema 的默认值与展示处都按 id 来
  const p = projects.create(title, v.id, v.operator, v.channel, String(fd.get('genre') ?? '') || null)
  touch()
  redirect(`/p/${p.id}`)
}

export async function updateProject(id: string, patch: Record<string, unknown>) {
  projects.update(id, patch)
  touch(id)
}

export async function deleteProject(id: string) {
  projects.remove(id)
  touch()
  redirect('/')
}

/* ── 环节 ── */
export async function saveStage(
  projectId: string,
  stageId: string,
  patch: { data?: Record<string, unknown>; gate?: Record<string, boolean>; status?: string },
) {
  stageStore.save(projectId, stageId, patch as never)
  touch(projectId)
}

/* ── 开书访谈 ── */

/**
 * 采纳访谈草稿。**只写人在复核屏上勾选过的那些环节**——
 * 这是「AI 产出不自动落库」在这条路径上的落点，不要改成全量写入。
 */
export async function commitInterview(
  projectId: string,
  picked: {
    answers: Record<string, string>
    stages: Record<string, Record<string, unknown>>
    hero?: Record<string, string> | null
  },
) {
  // 作者亲口答的那几项，直接进核心创意成型
  const { scene, want, block } = picked.answers
  const core: Record<string, unknown> = {}
  if (scene) core.scene = scene
  if (want) core.want = want
  if (block) core.block = block
  if (Object.keys(core).length) stageStore.save(projectId, 'b9-core', { data: core, status: '进行中' })

  for (const [stageId, data] of Object.entries(picked.stages)) {
    if (!data || Object.keys(data).length === 0) continue
    stageStore.save(projectId, stageId, { data, status: '进行中' })
  }

  if (picked.hero && picked.hero.name) {
    const id = cast.create(projectId, picked.hero.name, '主角')
    const { name: _drop, ...rest } = picked.hero
    cast.update(id, rest)
  }

  touch(projectId)
}

/* ── 人物 ── */
export async function addCharacter(projectId: string, name: string, role: string) {
  cast.create(projectId, name, role)
  touch(projectId)
}
export async function updateCharacter(projectId: string, id: string, patch: Record<string, unknown>) {
  cast.update(id, patch)
  touch(projectId)
}
export async function removeCharacter(projectId: string, id: string) {
  cast.remove(id)
  touch(projectId)
}

/* ── 伏笔 ── */
export async function addThread(projectId: string, content: string, level: string) {
  threads.create(projectId, content, level)
  touch(projectId)
}
export async function updateThread(projectId: string, id: string, patch: Record<string, unknown>) {
  threads.update(id, patch)
  touch(projectId)
}
export async function removeThread(projectId: string, id: string) {
  threads.remove(id)
  touch(projectId)
}

/* ── 卷 ── */
export async function addVolume(projectId: string, title: string) {
  volumes.create(projectId, title)
  touch(projectId)
}
export async function updateVolume(projectId: string, id: string, patch: Record<string, unknown>) {
  volumes.update(id, patch)
  touch(projectId)
}
export async function removeVolume(projectId: string, id: string) {
  volumes.remove(id)
  touch(projectId)
}

/* ── 章节 ── */
export async function addChapter(projectId: string, no: number, volumeId?: string | null) {
  const id = chapters.create(projectId, no, volumeId)
  touch(projectId)
  return id
}
export async function addChapterRange(projectId: string, from: number, count: number, volumeId?: string | null) {
  for (let i = 0; i < count; i++) chapters.create(projectId, from + i, volumeId)
  touch(projectId)
}
export async function updateChapter(projectId: string, id: string, patch: Record<string, unknown>) {
  chapters.update(id, patch)
  touch(projectId)
}
export async function removeChapter(projectId: string, id: string) {
  chapters.remove(id)
  touch(projectId)
}

/* ── 数据 / 决策 / 锁定 ── */
export async function saveMetric(projectId: string, chapterNo: number, m: Record<string, unknown>) {
  metrics.upsert(projectId, chapterNo, m)
  touch(projectId)
}
export async function addDecision(projectId: string, d: Record<string, unknown>) {
  decisions.create(projectId, d)
  touch(projectId)
}
export async function signDecision(projectId: string, id: number) {
  decisions.sign(id)
  touch(projectId)
}
export async function addLock(projectId: string, item: string, reason: string, sinceCh?: number) {
  locks.create(projectId, item, reason, sinceCh)
  touch(projectId)
}
export async function removeLock(projectId: string, id: number) {
  locks.remove(id)
  touch(projectId)
}

/* ── 设置 ── */
export async function saveSetting(key: string, value: string) {
  setSetting(key, value)
  revalidatePath('/', 'layout')
}
