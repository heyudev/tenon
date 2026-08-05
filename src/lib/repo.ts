import { db, j, now, rid } from './db'
import type {
  Chapter,
  Character,
  Concept,
  CraftCard,
  Decision,
  Edge,
  Lab,
  Metric,
  Project,
  ProjectRule,
  Resource,
  Rule,
  StageState,
  Thread,
  Volume,
} from './types'
import { STAGES } from './stages'

/* ══════════ 资产层 ══════════ */

type RuleRow = Record<string, string | number | null>

function toRule(r: RuleRow): Rule {
  return {
    id: r.id as number,
    name: r.name as string,
    domain: r.domain as string,
    real: r.real as string,
    change: r.change as string,
    hook: r.hook as string | null,
    scene: r.scene as string | null,
    star: r.star as number,
    writability: r.writability as number,
    embodiable: !!r.embodiable,
    market: r.market as Rule['market'],
    market_used: r.market_used as string | null,
    market_gap: r.market_gap as string | null,
    tags: [!!r.b_quant, !!r.b_scarce, !!r.b_compete, !!r.b_cost, !!r.b_universal],
    concepts: j.parse<string[]>(r.concepts as string, []),
    micro: j.parse<string[]>(r.micro as string, []),
    deep: r.deep ? j.parse<Rule['deep']>(r.deep as string, null) : null,
    field_notes: r.field_notes as string | null,
  }
}

export const assets = {
  rules(): Rule[] {
    return (db().prepare('SELECT * FROM rules ORDER BY id').all() as RuleRow[]).map(toRule)
  },
  rule(id: number): Rule | null {
    const r = db().prepare('SELECT * FROM rules WHERE id = ?').get(id) as RuleRow | undefined
    return r ? toRule(r) : null
  },
  concepts(): Concept[] {
    return db().prepare('SELECT * FROM concepts').all() as Concept[]
  },
  edges(): Edge[] {
    return db().prepare('SELECT * FROM edges').all() as Edge[]
  },
  resources(): Resource[] {
    return db().prepare('SELECT * FROM resources').all() as Resource[]
  },
  domains(): { name: string; tip: string }[] {
    return db().prepare('SELECT * FROM domains').all() as { name: string; tip: string }[]
  },
  labs(): Lab[] {
    return db().prepare('SELECT * FROM labs ORDER BY id').all() as Lab[]
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
  setMarket(id: number, market: string, used: string, gap: string) {
    db()
      .prepare('UPDATE rules SET market=?, market_used=?, market_gap=? WHERE id=?')
      .run(market, used || null, gap || null, id)
  },
  appendFieldNote(id: number, note: string) {
    const cur = (db().prepare('SELECT field_notes FROM rules WHERE id=?').get(id) as { field_notes: string | null })?.field_notes
    db().prepare('UPDATE rules SET field_notes=? WHERE id=?').run(cur ? `${cur}\n${note}` : note, id)
  },
  addEdge(e: Omit<Edge, 'id'>) {
    db()
      .prepare('INSERT INTO edges(src,dst,strength,direction,feedback,mechanism,origin) VALUES(?,?,?,?,?,?,?)')
      .run(e.src, e.dst, e.strength, e.direction, e.feedback, e.mechanism, e.origin || '补充')
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

/* ══════════ 本书选用的规则 ══════════ */

export const projectRules = {
  list(projectId: string): ProjectRule[] {
    const rows = db()
      .prepare('SELECT * FROM project_rules WHERE project_id=?')
      .all(projectId) as ProjectRule[]
    return rows.map((r) => ({ ...r, rule: assets.rule(r.rule_id) ?? undefined }))
  },
  add(projectId: string, ruleId: number, role: string) {
    db()
      .prepare(
        'INSERT OR IGNORE INTO project_rules(project_id,rule_id,role) VALUES(?,?,?)',
      )
      .run(projectId, ruleId, role)
    projects.touch(projectId)
  },
  update(projectId: string, ruleId: number, patch: Partial<ProjectRule>) {
    const sets: string[] = []
    const vals: unknown[] = []
    for (const c of ['role', 'operator', 'rewritten', 'note'] as const)
      if (c in patch) {
        sets.push(`${c}=?`)
        vals.push(patch[c] ?? null)
      }
    if (!sets.length) return
    vals.push(projectId, ruleId)
    db().prepare(`UPDATE project_rules SET ${sets.join(',')} WHERE project_id=? AND rule_id=?`).run(...vals)
  },
  remove(projectId: string, ruleId: number) {
    db().prepare('DELETE FROM project_rules WHERE project_id=? AND rule_id=?').run(projectId, ruleId)
  },
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
    const n = (db().prepare('SELECT COUNT(*) c FROM characters WHERE project_id=?').get(projectId) as { c: number }).c
    return `C-${String(n + 1).padStart(3, '0')}`
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
    const n = (db().prepare('SELECT COUNT(*) c FROM threads WHERE project_id=?').get(projectId) as { c: number }).c
    db()
      .prepare('INSERT INTO threads(id,project_id,fid,content,level,updated_at) VALUES(?,?,?,?,?,?)')
      .run(id, projectId, `FS-${String(n + 1).padStart(3, '0')}`, content, level, now())
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
    const n = (db().prepare('SELECT COUNT(*) c FROM volumes WHERE project_id=?').get(projectId) as { c: number }).c + 1
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
