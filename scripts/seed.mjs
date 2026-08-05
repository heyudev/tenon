#!/usr/bin/env node
// 资产层导入：规则 / 概念 / 因果边 / 资源流 / 示范文明 / 方法论卡片
//
// 数据源只有一个：仓库自带的 seed/assets.json（系统自有 schema）。
// 本系统不读取任何外部目录——资产层是系统自己的库存，不是别处内容的镜像。
// 幂等：重复运行覆盖资产层，保留规则的「实战记录」与全部项目数据。

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

// 人工写过的实战记录不能被覆盖——规则库是越用越准的资产
const keptNotes = new Map()
for (const r of db.prepare('SELECT name, field_notes FROM rules WHERE field_notes IS NOT NULL').all()) {
  keptNotes.set(r.name, r.field_notes)
}

const tx = db.transaction(() => {
  db.exec('DELETE FROM rules')
  const insRule = db.prepare(`INSERT INTO rules
    (id,name,domain,real,change,hook,scene,star,writability,embodiable,
     market,market_used,market_gap,b_quant,b_scarce,b_compete,b_cost,b_universal,
     concepts,micro,deep,field_notes)
    VALUES (@id,@name,@domain,@real,@change,@hook,@scene,@star,@writability,@embodiable,
     @market,@market_used,@market_gap,@b_quant,@b_scarce,@b_compete,@b_cost,@b_universal,
     @concepts,@micro,@deep,@field_notes)`)
  for (const r of data.rules) {
    const t = r.tags ?? {}
    const m = r.micro ?? {}
    insRule.run({
      id: r.id,
      name: r.name,
      domain: r.domain,
      real: r.real ?? '',
      change: r.change ?? '',
      hook: r.hook || null,
      scene: r.scene || null,
      star: r.star ?? 0,
      writability: r.writability ?? 0,
      embodiable: r.embodiable ? 1 : 0,
      market: r.market || '未评估',
      market_used: r.marketUsed || null,
      market_gap: r.marketGap || null,
      b_quant: t.quant ? 1 : 0,
      b_scarce: t.scarce ? 1 : 0,
      b_compete: t.compete ? 1 : 0,
      b_cost: t.cost ? 1 : 0,
      b_universal: t.universal ? 1 : 0,
      concepts: JSON.stringify(r.concepts ?? []),
      micro: JSON.stringify([m.industry, m.winner, m.loser, m.power, m.conflict].map((x) => x ?? '')),
      deep: r.deep ? JSON.stringify(r.deep) : null,
      field_notes: keptNotes.get(r.name) ?? null,
    })
  }

  db.exec('DELETE FROM concepts')
  const insC = db.prepare('INSERT INTO concepts(name,cat,desc) VALUES(?,?,?)')
  for (const c of data.concepts) insC.run(c.name, c.cat, c.desc || null)

  // 人工补的边（origin='补充'，比如给正反馈环配的刹车）不能被重导冲掉
  db.exec("DELETE FROM edges WHERE origin='原库'")
  const insE = db.prepare(
    'INSERT INTO edges(src,dst,strength,direction,feedback,mechanism,origin) VALUES(?,?,?,?,?,?,?)',
  )
  for (const e of data.edges)
    insE.run(e.src, e.dst, e.strength, e.direction, e.feedback, e.mechanism || null, '原库')

  db.exec('DELETE FROM resources')
  const insR = db.prepare('INSERT INTO resources(name,origin,path,sink,black,analogy) VALUES(?,?,?,?,?,?)')
  for (const r of data.resources) insR.run(r.name, r.origin, r.path, r.sink, r.black, r.analogy)

  db.exec('DELETE FROM domains')
  const insD = db.prepare('INSERT INTO domains(name,tip) VALUES(?,?)')
  for (const d of data.domains) insD.run(d.name, d.tip || null)

  db.exec('DELETE FROM labs')
  const insL = db.prepare(
    'INSERT INTO labs(combo,name,core,law,biz,black,war,hook) VALUES(?,?,?,?,?,?,?,?)',
  )
  for (const l of data.labs) insL.run(l.combo, l.name, l.core, l.law, l.biz, l.black, l.war, l.hook)

  db.exec('DELETE FROM craft_cards')
  const insK = db.prepare(
    'INSERT INTO craft_cards(id,kind,category,title,summary,body,ord) VALUES(?,?,?,?,?,?,?)',
  )
  for (const c of [...craftCards, ...craftCardsExtend])
    insK.run(c.id, c.kind, c.category, c.title, c.summary ?? null, c.body, c.ord ?? 0)
})
tx()

const n = (t) => db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c
const q = (s, ...a) => db.prepare(s).get(...a).c
console.log(`
  榫 · 资产层导入完成
  ─────────────────────────────
  规则         ${String(n('rules')).padStart(4)}   （深度推演 ${q('SELECT COUNT(*) c FROM rules WHERE deep IS NOT NULL')}，可具身化 ${q('SELECT COUNT(*) c FROM rules WHERE embodiable=1')}）
  概念节点     ${String(n('concepts')).padStart(4)}
  因果边       ${String(n('edges')).padStart(4)}   （正反馈 ${q("SELECT COUNT(*) c FROM edges WHERE feedback='正'")} / 负反馈 ${q("SELECT COUNT(*) c FROM edges WHERE feedback='负'")} / 人工补 ${q("SELECT COUNT(*) c FROM edges WHERE origin='补充'")}）
  核心资源     ${String(n('resources')).padStart(4)}
  领域         ${String(n('domains')).padStart(4)}
  示范文明     ${String(n('labs')).padStart(4)}
  方法论卡片   ${String(n('craft_cards')).padStart(4)}
  数据库       ${path.relative(ROOT, DB_PATH)}
`)
db.close()
