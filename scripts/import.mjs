#!/usr/bin/env node
/**
 * 从一个 markdown 小说项目目录**提取大纲结构**，建成榫里的一本书。
 *
 *   npm run import -- "<项目目录>" [--platform 起点] [--title 书名] [--dry]
 *
 * 目录必须由参数显式给出——系统不认识、也不默认关联任何外部位置。
 * 提取是一次性的：跑完之后书就完全活在 data/tenon.db 里，与来源目录再无关系。
 *
 * ⚠ **默认只提取大纲层，不读正文内容。**
 *   正文文件只用来确定卷号／章号／标题，章的正文字段一律留空——那是给作者填的位置。
 *   确实要把正文一并搬进来时，显式加 --with-body（作者自己的选择，不是默认行为）。
 *
 * 识别的目录约定（找不到就跳过，不猜）：
 *   正文/            V01-001_标题.md  →  卷号 / 章号 / 标题（正文留空）
 *   章节记录/         - **第N章·名**：摘要   →  给未来的摘要（大纲层）
 *   伏笔账本/ 或顶层  表头含「伏笔/悬念」的 markdown 表  →  伏笔账本
 *   人物档案/ 或顶层  frontmatter / ## 小节 / 表格      →  人物档案
 *
 * 纪律：解析不出来的字段留空并在报告里说明，绝不用启发式往真相源里灌内容。
 */

import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const DB_PATH = process.env.TENON_DB ?? path.join(ROOT, 'data', 'tenon.db')

const args = process.argv.slice(2)
const flag = (n) => {
  const i = args.indexOf(`--${n}`)
  return i >= 0 ? args[i + 1] : null
}
const dry = args.includes('--dry')
/** 默认不搬正文：章的正文字段留空，位置留给作者 */
const withBody = args.includes('--with-body')

const bookDir = args.find((a) => !a.startsWith('--') && fs.existsSync(a))
if (!bookDir) {
  console.error('用法：npm run import -- "<项目目录>" [--platform 起点] [--title 书名] [--dry]')
  console.error('      目录必须显式给出，系统不预设任何外部位置。')
  process.exit(1)
}

const now = () => new Date().toISOString()
const rid = (p) => `${p}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`

/* ── 目录定位：项目可能多包一层（如 长篇版/正文），向下找一层 ── */
function findDir(root, ...names) {
  for (const n of names) {
    const direct = path.join(root, n)
    if (fs.existsSync(direct)) return direct
  }
  for (const d of fs.readdirSync(root)) {
    if (d.startsWith('.') || d.startsWith('_')) continue
    const sub = path.join(root, d)
    if (!fs.existsSync(sub) || !fs.statSync(sub).isDirectory()) continue
    for (const n of names) {
      const p = path.join(sub, n)
      if (fs.existsSync(p)) return p
    }
  }
  return null
}
const walk = (dir) => {
  const out = []
  if (!dir || !fs.existsSync(dir)) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(p))
    else if (e.name.endsWith('.md')) out.push(p)
  }
  return out
}
const topMd = () =>
  fs.readdirSync(bookDir).filter((f) => f.endsWith('.md')).map((f) => path.join(bookDir, f))

const stripFm = (t) => t.replace(/^---\n[\s\S]*?\n---\n/, '')
const firstChapterNo = (s) => {
  const m =
    String(s).match(/第\s*(\d+)\s*章/) || String(s).match(/V\d+-0*(\d+)/) || String(s).match(/ch\s*(\d+)/i)
  return m ? Number(m[1]) : null
}
const splitRow = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim())
function tables(text) {
  const out = []
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim().startsWith('|') || !lines[i + 1]?.includes('---')) continue
    const head = splitRow(lines[i])
    const rows = []
    let j = i + 2
    while (j < lines.length && lines[j].trim().startsWith('|')) rows.push(splitRow(lines[j++]))
    out.push({ head, rows })
    i = j
  }
  return out
}

/* ── 1. 正文 → 章节 ── */
const textDir = findDir(bookDir, '正文')
const chapterFiles = textDir
  ? fs
      .readdirSync(textDir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => {
        const m = f.match(/^V(\d+)[-_](\d+)[_·・\-\s]*(.*)\.md$/)
        if (!m) return null
        return {
          file: path.join(textDir, f),
          vol: Number(m[1]),
          num: Number(m[2]),
          title: m[3].replace(/^[·_\-\s]+/, '').trim(),
        }
      })
      .filter(Boolean)
      .sort((a, b) => a.vol - b.vol || a.num - b.num)
  : []

/* ── 2. 章节记录 → 给未来的摘要 ── */
const recDir = findDir(bookDir, path.join('世界状态', '章节记录'), '章节记录')
const summaries = new Map()
for (const f of walk(recDir)) {
  const fileVol = Number(path.basename(f).match(/V(\d+)/)?.[1] ?? 1)
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    const m = line.match(/^\s*[-*]\s*\*\*第\s*(\d+)\s*章(.*?)\*\*[：:]\s*(.+)$/)
    if (!m) continue
    const explicit = m[2].match(/(V\d+)[-_](\d+)/)
    summaries.set(
      explicit
        ? `${explicit[1]}-${explicit[2].padStart(3, '0')}`
        : `V${String(fileVol).padStart(2, '0')}-${String(Number(m[1])).padStart(3, '0')}`,
      m[3].trim(),
    )
  }
}

/* ── 3. 伏笔表（尽力而为） ── */
const threads = []
for (const f of [...walk(findDir(bookDir, path.join('世界状态', '伏笔账本'), '伏笔账本')), ...topMd()]) {
  for (const t of tables(fs.readFileSync(f, 'utf8'))) {
    const hi = t.head.findIndex((h) => /伏笔|悬念/.test(h))
    if (hi < 0) continue
    const idI = t.head.findIndex((h) => /^#|编号|ID/i.test(h))
    const plantI = t.head.findIndex((h) => /埋设|埋于|埋点/.test(h))
    const planI = t.head.findIndex((h) => /回收|揭晓|兑现/.test(h))
    const stI = t.head.findIndex((h) => /状态/.test(h))
    for (const r of t.rows) {
      const content = (r[hi] ?? '').replace(/\*\*/g, '').trim()
      if (!content || content.length < 4) continue
      const st = r[stI] ?? ''
      threads.push({
        fid: (r[idI] ?? '').trim() || null,
        content: content.slice(0, 400),
        planted_ch: plantI >= 0 ? firstChapterNo(r[plantI]) : null,
        plan_ch: planI >= 0 ? firstChapterNo(r[planI]) : null,
        status: /✅|已回收/.test(st) ? '已回收' : /🟡|部分|强化/.test(st) ? '已强化' : '已埋设',
        level: /全书|终局|主题级/.test(`${r[planI] ?? ''}${st}`)
          ? '书级'
          : /卷/.test(`${r[planI] ?? ''}`)
            ? '卷级'
            : '章级',
      })
    }
    if (threads.length) break
  }
  if (threads.length) break
}

/* ── 4. 人物（尽力而为） ── */
const castDir = findDir(bookDir, path.join('世界状态', '人物档案'), '人物档案')
/** 明显不是人名的标题，滤掉——宁可少提取，也不要往真相源里灌垃圾 */
const NOT_NAME =
  /档案|设定|说明|索引|快照|目录|内核|能力|成长|声音|口吻|规则|系统|机制|口径|备注|状态|阶段|原则|清单|总账|时间线|反噬|群像|三人|反派链|注意|提示|变更|版本|待决|章|卷|稿|态$|已知|未知|已死|心理|资源|处境|境界|主线|支线|伏笔|爽点|节奏|结构|数据/
const looksLikeName = (s) => /^[一-龥·]{2,8}$/.test(s) && !NOT_NAME.test(s)
const cleanName = (s) =>
  s.replace(/\*\*|\[\[|\]\]|`/g, '').split(/[（(]/)[0].split(/[·／\/—\-–]/)[0].trim()
const guessRole = (s) =>
  /女主|男主|主角/.test(s) ? '主角' : /反派|boss|BOSS|对手|终极/.test(s) ? '反派' : '核心配角'

const people = []
for (const f of [...walk(castDir), ...topMd()]) {
  const raw = fs.readFileSync(f, 'utf8')
  if (/^_?模板/.test(path.basename(f))) continue
  const inCastDir = castDir && f.startsWith(castDir)

  // ① 单人一档：frontmatter 带名字
  const fm = raw.match(/^---\n([\s\S]*?)\n---/)
  if (fm && /名字|name/.test(fm[1])) {
    const g = (k) => fm[1].match(new RegExp(`^${k}\\s*[:：]\\s*(.+)$`, 'm'))?.[1]?.trim() ?? null
    const name = g('名字') ?? g('name')
    if (name) {
      people.push({ name, role: g('类型') ?? '核心配角', status: g('状态') ?? '活跃', notes: null })
      continue
    }
  }

  // ② 人物档案目录里的文件整篇算；其它文件只取标题含「人物」的小节
  const sections = inCastDir
    ? [raw]
    : raw.split(/^##\s+/m).filter((s) => /^[^\n]*人物/.test(s))

  for (const sec of sections) {
    for (const m of sec.matchAll(/^###?\s+(.+)$/gm)) {
      const name = cleanName(m[1])
      if (name && looksLikeName(name)) people.push({ name, role: guessRole(m[1]), status: '活跃', notes: m[1].slice(0, 200) })
    }
    for (const m of sec.matchAll(/^[>\s]*[-*]\s*\*\*(.+?)\*\*\s*[：:]\s*(.+)$/gm)) {
      const name = cleanName(m[1])
      if (name && looksLikeName(name) && !/^第\d+章/.test(m[1]))
        people.push({ name, role: guessRole(`${m[1]}${m[2].slice(0, 40)}`), status: '活跃', notes: m[2].slice(0, 300) })
    }
    for (const t of tables(sec)) {
      const ni = t.head.findIndex((h) => /人物|姓名|角色名/.test(h))
      if (ni < 0) continue
      for (const r of t.rows) {
        const name = cleanName(r[ni] ?? '')
        if (name && looksLikeName(name))
          people.push({ name, role: '核心配角', status: '活跃', notes: r.filter((_, i) => i !== ni).join(' ｜ ').slice(0, 300) })
      }
    }
  }
}
const uniqPeople = [...new Map(people.map((p) => [p.name, p])).values()].slice(0, 60)

/* ── 汇报 ── */
const title = flag('title') ?? path.basename(bookDir).replace(/^小说[A-Z]_/, '').replace(/[《》]/g, '')
const platform = flag('platform') ?? '番茄'
console.log(`
  提取源：${bookDir}
  书名：${title}｜平台：${platform}｜模式：${withBody ? '⚠ 含正文' : '大纲层（正文位置留空）'}
  ─────────────────────────────
  章目录     ${String(chapterFiles.length).padStart(4)} ${textDir ? '（卷号/章号/标题）' : '（未找到「正文」目录）'}
  章节摘要   ${String(summaries.size).padStart(4)} ${recDir ? '' : '（未找到「章节记录」）'}
  伏笔       ${String(threads.length).padStart(4)} ${threads.length ? '' : '（未识别出伏笔表，需手工补）'}
  人物       ${String(uniqPeople.length).padStart(4)} ${uniqPeople.length ? '' : '（未识别出人物档案，需手工补）'}
`)
if (dry) {
  console.log('  --dry：只解析不写库。')
  if (chapterFiles.length)
    console.log(`  首章示例：V${String(chapterFiles[0].vol).padStart(2, '0')}-${String(chapterFiles[0].num).padStart(3, '0')} 《${chapterFiles[0].title}》`)
  if (threads.length) console.log(`  伏笔示例：${threads[0].fid} ${threads[0].content.slice(0, 60)}…`)
  if (uniqPeople.length) console.log(`  人物示例：${uniqPeople.slice(0, 6).map((p) => p.name).join('、')}`)
  process.exit(0)
}

/* ── 写库 ── */
const db = new Database(DB_PATH)
db.pragma('foreign_keys = ON')
db.exec(fs.readFileSync(path.join(ROOT, 'src', 'lib', 'schema.sql'), 'utf8'))

const pid = rid('bk')
const t = now()
db.transaction(() => {
  db.prepare('INSERT INTO projects(id,title,venue,platform,channel,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)')
    .run(pid, title, flag('venue') ?? 'fanqie-m', platform, flag('channel') ?? '男频', '连载中', t, t)

  const volIds = new Map()
  for (const v of [...new Set(chapterFiles.map((c) => c.vol))].sort((a, b) => a - b)) {
    const id = rid('v')
    db.prepare('INSERT INTO volumes(id,project_id,vid,no,title,updated_at) VALUES(?,?,?,?,?,?)')
      .run(id, pid, `V-${String(v).padStart(2, '0')}`, v, `卷${v}`, t)
    volIds.set(v, id)
  }

  let no = 0
  for (const c of chapterFiles) {
    no++
    // 默认不读正文文件的内容——只用文件名定位卷/章/标题，正文位置留空
    const body = withBody ? stripFm(fs.readFileSync(c.file, 'utf8')).replace(/^#\s+.*\n/, '').trim() : null
    const key = `V${String(c.vol).padStart(2, '0')}-${String(c.num).padStart(3, '0')}`
    db.prepare(
      `INSERT INTO chapters(id,project_id,volume_id,no,title,body,words,summary,status,updated_at)
       VALUES(?,?,?,?,?,?,?,?,?,?)`,
    ).run(
      rid('ch'), pid, volIds.get(c.vol) ?? null, no, c.title || null,
      body, body ? body.length : 0, summaries.get(key) ?? null,
      withBody ? '已发布' : '已规划', t,
    )
  }

  let fi = 0
  for (const th of threads) {
    fi++
    db.prepare(
      `INSERT INTO threads(id,project_id,fid,content,level,planted_ch,plan_ch,status,updated_at)
       VALUES(?,?,?,?,?,?,?,?,?)`,
    ).run(rid('t'), pid, th.fid ?? `FS-${String(fi).padStart(3, '0')}`, th.content, th.level, th.planted_ch, th.plan_ch, th.status, t)
  }

  let ci = 0
  for (const p of uniqPeople) {
    ci++
    db.prepare('INSERT INTO characters(id,project_id,cid,name,role,status,notes,updated_at) VALUES(?,?,?,?,?,?,?,?)')
      .run(rid('c'), pid, `C-${String(ci).padStart(3, '0')}`, p.name, p.role, p.status, p.notes, t)
  }
})()
db.close()

console.log(`  ✓ 已提取，作品 id = ${pid}`)
console.log(`  打开 http://localhost:3100/p/${pid}`)
console.log(`
  ${withBody ? '⚠ 正文已一并写入。' : '正文位置已留空——在日更台逐章填，或粘贴既有稿。'}
  没有提取的：世界观圣经、力量体系、爽点排期这类结构化字段。
  各家真相源都是自然语言写的，硬猜会污染状态库——请在管线里逐环节补。`)
