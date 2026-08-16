#!/usr/bin/env node
// 资产层导入：核心资源参考 + 方法论卡片
//
// 数据源只有一个：仓库自带的 seed/assets.json（系统自有 schema）。
// 本系统不读取任何外部目录——资产层是系统自己的库存，不是别处内容的镜像。
// 幂等：重复运行覆盖资产层，全部项目数据不受影响。
//
// 注：规则库 / 概念图谱 / 组合实验室已随规则引擎一并退役，
// 退役前的快照留在 archive/rule-engine-snapshot.json，seed 不读取它。

import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { craftCards } from './craft.mjs'
import { craftCardsExtend } from './craft-extend.mjs'

const ROOT = process.cwd()
const DB_PATH = process.env.TENON_DB ?? path.join(ROOT, 'data', 'tenon.db')
const ASSETS = path.join(ROOT, 'seed', 'assets.json')

if (!fs.existsSync(ASSETS)) {
  console.error(`找不到资产种子文件：${path.relative(ROOT, ASSETS)}`)
  process.exit(1)
}
const data = JSON.parse(fs.readFileSync(ASSETS, 'utf8'))

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.exec(fs.readFileSync(path.join(ROOT, 'src', 'lib', 'schema.sql'), 'utf8'))

const tx = db.transaction(() => {
  db.exec('DELETE FROM resources')
  const insR = db.prepare('INSERT INTO resources(name,origin,path,sink,black,analogy) VALUES(?,?,?,?,?,?)')
  for (const r of data.resources ?? []) insR.run(r.name, r.origin, r.path, r.sink, r.black, r.analogy)

  db.exec('DELETE FROM craft_cards')
  const insK = db.prepare(
    'INSERT INTO craft_cards(id,kind,category,title,summary,body,ord) VALUES(?,?,?,?,?,?,?)',
  )
  for (const c of [...craftCards, ...craftCardsExtend])
    insK.run(c.id, c.kind, c.category, c.title, c.summary ?? null, c.body, c.ord ?? 0)
})
tx()

const n = (t) => db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c
console.log(`
  榫 · 资产层导入完成
  ─────────────────────────────
  核心资源参考 ${String(n('resources')).padStart(4)}
  方法论卡片   ${String(n('craft_cards')).padStart(4)}
  数据库       ${path.relative(ROOT, DB_PATH)}
`)
db.close()
