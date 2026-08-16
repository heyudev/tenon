import { db, j, now, rid } from './db'
import type {
  Chapter,
  Character,
  CraftCard,
  Decision,
  Metric,
  Project,
  Resource,
  StageState,
  Thread,
  Volume,
} from './types'
import { STAGES } from './stages'

/* ══════════ 资产层 ══════════ */

export const assets = {
  resources(): Resource[] {
    return db().prepare('SELECT * FROM resources').all() as Resource[]
  },
  craft(): CraftCard[] {
    return db().prepare('SELECT * FROM craft_cards ORDER BY ord').all() as CraftCard[]
  },
  craftBy(ids: string[]): CraftCard[] {
    if (!ids.length) return []
    const q = ids.map(() => '?').join(',')
    return db()
      .prepare(`SELECT * FROM craft_cards WHERE id IN (${q}) ORDER BY ord`)
      .all(...ids) as CraftCard[]
  },
}

/* ══════════ 项目 ══════════ */

export const projects = {
  all(): Project[] {
    return db().prepare('SELECT * FROM projects ORDER BY updated_at DESC').all() as Project[]
  },
  get(id: string): Project | null {
    return (db().prepare('SELECT * FROM projects WHERE id=?').get(id) as Project) ?? null
  },
  create(title: string, venue: string, platform: string, channel: string, genre: string | null = null): Project {
    const id = rid('bk')
    const t = now()
    db()
      .prepare(
        'INSERT INTO projects(id,title,venue,platform,channel,genre,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)',
      )
      .run(id, title, venue, platform, channel, genre, '立项中', t, t)
    return projects.get(id)!
  },
  update(id: string, patch: Partial<Project>) {
    const cols = ['title', 'venue', 'platform', 'channel', 'genre', 'logline', 'status', 'cover_note'] as const
    const sets: string[] = []
    const vals: unknown[] = []
    for (const c of cols)
      if (c in patch) {
        sets.push(`${c}=?`)
        vals.push(patch[c] ?? null)
      }
    sets.push('updated_at=?')
    vals.push(now(), id)
    db().prepare(`UPDATE projects SET ${sets.join(',')} WHERE id=?`).run(...vals)
  },
  remove(id: string) {
    db().prepare('DELETE FROM projects WHERE id=?').run(id)
  },
  touch(id: string) {
    db().prepare('UPDATE projects SET updated_at=? WHERE id=?').run(now(), id)
  },
}

/* ══════════ 环节状态 ══════════ */

export const stageStore = {
  all(projectId: string): Record<string, StageState> {
    const rows = db().prepare('SELECT * FROM stage_states WHERE project_id=?').all(projectId) as {
      project_id: string
      stage_id: string
      status: StageState['status']
      data: string
      gate: string
      updated_at: string
    }[]
    const out: Record<string, StageState> = {}
    for (const r of rows)
      out[r.stage_id] = {
        ...r,
        data: j.parse<Record<string, unknown>>(r.data, {}),
        gate: j.parse<Record<string, boolean>>(r.gate, {}),
      }
    for (const s of STAGES)
      if (!out[s.id])
        out[s.id] = {
          project_id: projectId,
          stage_id: s.id,
          status: '未开始',
          data: {},
          gate: {},
          updated_at: '',
        }
    return out
  },
  get(projectId: string, stageId: string): StageState {
    return stageStore.all(projectId)[stageId]
  },
  save(projectId: string, stageId: string, patch: Partial<Pick<StageState, 'status' | 'data' | 'gate'>>) {
    const cur = stageStore.get(projectId, stageId)
    const next = {
      status: patch.status ?? cur.status,
      data: patch.data ? { ...cur.data, ...patch.data } : cur.data,
      gate: patch.gate ? { ...cur.gate, ...patch.gate } : cur.gate,
    }
    db()
      .prepare(
        `INSERT INTO stage_states(project_id,stage_id,status,data,gate,updated_at) VALUES(?,?,?,?,?,?)
         ON CONFLICT(project_id,stage_id) DO UPDATE SET status=excluded.status,data=excluded.data,gate=excluded.gate,updated_at=excluded.updated_at`,
      )
      .run(projectId, stageId, next.status, j.str(next.data), j.str(next.gate), now())
    projects.touch(projectId)
  },
}

/**
 * 下一个可用序号 = 现存记录的最大序号 + 1。
 *
 * 不能用 COUNT(*)+1：删掉中间任意一条就会与现存记录撞号，而 FS-xxx / C-xxx 是
 * chapters.plant / harvest 里以**文本**形式引用的，撞号会让伏笔账本静默对错账。
 * 导入进来的编号不一定是本系统的格式（import.mjs 会原样保留源文件里的伏笔编号），
 * 所以只抓末尾数字，抓不到的就当没有序号忽略掉。
 *
 * table / col 是调用点写死的常量，不来自外部输入。
 */
function nextSeq(table: string, col: string, projectId: string): number {
  const rows = db()
    .prepare(`SELECT ${col} AS v FROM ${table} WHERE project_id=?`)
    .all(projectId) as { v: string | number | null }[]
  let max = 0
  for (const r of rows) {
    const m = /(\d+)\s*$/.exec(String(r.v ?? ''))
    if (m) max = Math.max(max, Number(m[1]))
  }
  return max + 1
}

/* ══════════ 人物 ══════════ */

type CharRow = Omit<Character, 'aliases'> & { aliases: string }

export const cast = {
  list(projectId: string): Character[] {
    const rows = db()
      .prepare('SELECT * FROM characters WHERE project_id=? ORDER BY cid')
      .all(projectId) as CharRow[]
    return rows.map((r) => ({ ...r, aliases: j.parse<string[]>(r.aliases, []) }))
  },
  nextCid(projectId: string): string {
    return `C-${String(nextSeq('characters', 'cid', projectId)).padStart(3, '0')}`
  },
  create(projectId: string, name: string, role: string): string {
    const id = rid('c')
    db()
      .prepare(
        'INSERT INTO characters(id,project_id,cid,name,role,updated_at) VALUES(?,?,?,?,?,?)',
      )
      .run(id, projectId, cast.nextCid(projectId), name, role, now())
    projects.touch(projectId)
    return id
  },
  update(id: string, patch: Record<string, unknown>) {
    const cols = [
      'name', 'role', 'stance', 'faction', 'motive_surface', 'motive_deep', 'attitude',
      'desire', 'weakness', 'resource_rel', 'secrets', 'status', 'face_rank', 'first_ch',
      'last_ch', 'tic', 'notes',
    ]
    const sets: string[] = []
    const vals: unknown[] = []
    for (const c of cols)
      if (c in patch) {
        sets.push(`${c}=?`)
        vals.push(patch[c] ?? null)
      }
    if ('aliases' in patch) {
      sets.push('aliases=?')
      vals.push(j.str(patch.aliases))
    }
    if (!sets.length) return
    sets.push('updated_at=?')
    vals.push(now(), id)
    db().prepare(`UPDATE characters SET ${sets.join(',')} WHERE id=?`).run(...vals)
  },
  remove(id: string) {
    db().prepare('DELETE FROM characters WHERE id=?').run(id)
  },
}

/* ══════════ 伏笔 / 悬念 ══════════ */

type ThreadRow = Omit<Thread, 'reinforced'> & { reinforced: string }

export const threads = {
  list(projectId: string): Thread[] {
    const rows = db()
      .prepare('SELECT * FROM threads WHERE project_id=? ORDER BY fid')
      .all(projectId) as ThreadRow[]
    return rows.map((r) => ({ ...r, reinforced: j.parse<number[]>(r.reinforced, []) }))
  },
  create(projectId: string, content: string, level: string): string {
    const id = rid('t')
    const n = nextSeq('threads', 'fid', projectId)
    db()
      .prepare('INSERT INTO threads(id,project_id,fid,content,level,updated_at) VALUES(?,?,?,?,?,?)')
      .run(id, projectId, `FS-${String(n).padStart(3, '0')}`, content, level, now())
    projects.touch(projectId)
    return id
  },
  update(id: string, patch: Record<string, unknown>) {
    const cols = ['content', 'clue', 'truth', 'level', 'planted_ch', 'plan_ch', 'actual_ch', 'status', 'discard_why']
    const sets: string[] = []
    const vals: unknown[] = []
    for (const c of cols)
      if (c in patch) {
        sets.push(`${c}=?`)
        vals.push(patch[c] === '' ? null : (patch[c] ?? null))
      }
    if ('reinforced' in patch) {
      sets.push('reinforced=?')
      vals.push(j.str(patch.reinforced))
    }
    if (!sets.length) return
    sets.push('updated_at=?')
    vals.push(now(), id)
    db().prepare(`UPDATE threads SET ${sets.join(',')} WHERE id=?`).run(...vals)
  },
  remove(id: string) {
    db().prepare('DELETE FROM threads WHERE id=?').run(id)
  },
}

/* ══════════ 卷 ══════════ */

export const volumes = {
  list(projectId: string): Volume[] {
    return db().prepare('SELECT * FROM volumes WHERE project_id=? ORDER BY no').all(projectId) as Volume[]
  },
  create(projectId: string, title: string): string {
    const id = rid('v')
    // 卷号同时是排序键（ORDER BY no），撞号会让卷的顺序变得不确定
    const n = nextSeq('volumes', 'no', projectId)
    db()
      .prepare('INSERT INTO volumes(id,project_id,vid,no,title,updated_at) VALUES(?,?,?,?,?,?)')
      .run(id, projectId, `V-${String(n).padStart(2, '0')}`, n, title, now())
    projects.touch(projectId)
    return id
  },
  update(id: string, patch: Record<string, unknown>) {
    const cols = ['title', 'goal', 'conflict', 'climax', 'reveal_layer', 'power_track']
    const sets: string[] = []
    const vals: unknown[] = []
    for (const c of cols)
      if (c in patch) {
        sets.push(`${c}=?`)
        vals.push(patch[c] ?? null)
      }
    if (!sets.length) return
    sets.push('updated_at=?')
    vals.push(now(), id)
    db().prepare(`UPDATE volumes SET ${sets.join(',')} WHERE id=?`).run(...vals)
  },
  remove(id: string) {
    db().prepare('DELETE FROM volumes WHERE id=?').run(id)
  },
}

/* ══════════ 章节 ══════════ */

type ChapRow = Omit<Chapter, 'cast' | 'plant' | 'harvest' | 'gate'> & {
  cast: string
  plant: string
  harvest: string
  gate: string
}

const toChap = (r: ChapRow): Chapter => ({
  ...r,
  cast: j.parse<string[]>(r.cast, []),
  plant: j.parse<string[]>(r.plant, []),
  harvest: j.parse<string[]>(r.harvest, []),
  gate: j.parse<Record<string, boolean>>(r.gate, {}),
})

export const chapters = {
  list(projectId: string): Chapter[] {
    return (
      db().prepare('SELECT * FROM chapters WHERE project_id=? ORDER BY no').all(projectId) as ChapRow[]
    ).map(toChap)
  },
  get(id: string): Chapter | null {
    const r = db().prepare('SELECT * FROM chapters WHERE id=?').get(id) as ChapRow | undefined
    return r ? toChap(r) : null
  },
  byNo(projectId: string, no: number): Chapter | null {
    const r = db()
      .prepare('SELECT * FROM chapters WHERE project_id=? AND no=?')
      .get(projectId, no) as ChapRow | undefined
    return r ? toChap(r) : null
  },
  create(projectId: string, no: number, volumeId?: string | null): string {
    const id = rid('ch')
    db()
      .prepare('INSERT INTO chapters(id,project_id,volume_id,no,updated_at) VALUES(?,?,?,?,?)')
      .run(id, projectId, volumeId ?? null, no, now())
    projects.touch(projectId)
    return id
  },
  update(id: string, patch: Record<string, unknown>) {
    const cols = [
      'volume_id', 'title', 'event', 'beat', 'scene', 'core_event', 'twist', 'hook_type',
      'hook_text', 'body', 'summary', 'info_gain', 'status', 'review',
    ]
    const sets: string[] = []
    const vals: unknown[] = []
    for (const c of cols)
      if (c in patch) {
        sets.push(`${c}=?`)
        vals.push(patch[c] ?? null)
      }
    for (const c of ['cast', 'plant', 'harvest', 'gate'] as const)
      if (c in patch) {
        sets.push(`${c}=?`)
        vals.push(j.str(patch[c]))
      }
    if ('body' in patch) {
      sets.push('words=?')
      vals.push(String(patch.body ?? '').replace(/\s/g, '').length)
    }
    if (!sets.length) return
    sets.push('updated_at=?')
    vals.push(now(), id)
    db().prepare(`UPDATE chapters SET ${sets.join(',')} WHERE id=?`).run(...vals)
  },
  remove(id: string) {
    db().prepare('DELETE FROM chapters WHERE id=?').run(id)
  },
}

/* ══════════ 数据 / 决策 / 锁定项 ══════════ */

export const metrics = {
  list(projectId: string): Metric[] {
    return db()
      .prepare('SELECT * FROM metrics WHERE project_id=? ORDER BY chapter_no')
      .all(projectId) as Metric[]
  },
  upsert(projectId: string, chapterNo: number, m: Partial<Metric>) {
    const ex = db()
      .prepare('SELECT id FROM metrics WHERE project_id=? AND chapter_no=?')
      .get(projectId, chapterNo) as { id: number } | undefined
    const cols = ['finish', 'follow', 'drop_off', 'stay', 'shelf', 'sub_first', 'sub_ratio', 'note'] as const
    if (ex) {
      const sets: string[] = []
      const vals: unknown[] = []
      for (const c of cols)
        if (c in m) {
          sets.push(`${c}=?`)
          vals.push(m[c] ?? null)
        }
      if (!sets.length) return
      vals.push(ex.id)
      db().prepare(`UPDATE metrics SET ${sets.join(',')} WHERE id=?`).run(...vals)
    } else {
      db()
        .prepare(
          'INSERT INTO metrics(project_id,chapter_no,date,finish,follow,drop_off,stay,shelf,sub_first,sub_ratio,note) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
        )
        .run(
          projectId, chapterNo, now().slice(0, 10),
          m.finish ?? null, m.follow ?? null, m.drop_off ?? null, m.stay ?? null,
          m.shelf ?? null, m.sub_first ?? null, m.sub_ratio ?? null, m.note ?? null,
        )
    }
    projects.touch(projectId)
  },
}

export const decisions = {
  list(projectId: string): Decision[] {
    return db()
      .prepare('SELECT * FROM decisions WHERE project_id=? ORDER BY ts DESC')
      .all(projectId) as Decision[]
  },
  create(projectId: string, d: Partial<Decision>) {
    db()
      .prepare(
        'INSERT INTO decisions(project_id,ts,kind,motion,evidence,precedent,ruling,signed,locked) VALUES(?,?,?,?,?,?,?,?,?)',
      )
      .run(
        projectId, now(), d.kind ?? '常规', d.motion ?? '', d.evidence ?? '模拟角色观察',
        d.precedent ?? null, d.ruling ?? null, d.signed ?? 0, d.locked ?? 0,
      )
    projects.touch(projectId)
  },
  sign(id: number) {
    db().prepare('UPDATE decisions SET signed=1 WHERE id=?').run(id)
  },
}

export const locks = {
  list(projectId: string) {
    return db()
      .prepare('SELECT * FROM locks WHERE project_id=? ORDER BY id DESC')
      .all(projectId) as { id: number; item: string; reason: string | null; since_ch: number | null; ts: string }[]
  },
  create(projectId: string, item: string, reason: string, sinceCh?: number) {
    db()
      .prepare('INSERT INTO locks(project_id,item,reason,since_ch,ts) VALUES(?,?,?,?,?)')
      .run(projectId, item, reason || null, sinceCh ?? null, now())
  },
  remove(id: number) {
    db().prepare('DELETE FROM locks WHERE id=?').run(id)
  },
}

export const aiRuns = {
  log(r: {
    project_id?: string | null
    stage_id?: string | null
    role: string
    provider: string
    model?: string | null
    prompt: string
    output?: string | null
    ok?: boolean
    ms?: number
  }) {
    db()
      .prepare(
        'INSERT INTO ai_runs(project_id,stage_id,role,provider,model,prompt,output,ok,ms,ts) VALUES(?,?,?,?,?,?,?,?,?,?)',
      )
      .run(
        r.project_id ?? null, r.stage_id ?? null, r.role, r.provider, r.model ?? null,
        r.prompt, r.output ?? null, r.ok === false ? 0 : 1, r.ms ?? null, now(),
      )
  },
  recent(projectId: string, limit = 30) {
    return db()
      .prepare('SELECT * FROM ai_runs WHERE project_id=? ORDER BY id DESC LIMIT ?')
      .all(projectId, limit)
  },
}
