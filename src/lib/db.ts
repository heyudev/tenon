import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

const DB_PATH = process.env.TENON_DB ?? path.join(process.cwd(), 'data', 'tenon.db')

let _db: Database.Database | null = null

/** 单例连接。首次打开时执行 schema（幂等，全部 IF NOT EXISTS）。 */
export function db(): Database.Database {
  if (_db) return _db
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
  const d = new Database(DB_PATH)
  d.pragma('journal_mode = WAL')
  d.pragma('foreign_keys = ON')
  const schema = fs.readFileSync(path.join(process.cwd(), 'src', 'lib', 'schema.sql'), 'utf8')
  d.exec(schema)
  _db = d
  return d
}

export const now = () => new Date().toISOString()

/** 短 id，够本地用，可读性优于 uuid */
export function rid(prefix = ''): string {
  const s = Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4)
  return prefix ? `${prefix}_${s}` : s
}

export const j = {
  parse<T>(s: string | null | undefined, fallback: T): T {
    if (!s) return fallback
    try {
      return JSON.parse(s) as T
    } catch {
      return fallback
    }
  },
  str(v: unknown): string {
    return JSON.stringify(v ?? null)
  },
}

export function getSetting(key: string, fallback = ''): string {
  const row = db().prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  return row?.value ?? fallback
}

export function setSetting(key: string, value: string): void {
  db()
    .prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=?')
    .run(key, value, value)
}
