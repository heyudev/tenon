import fs from 'node:fs'
import path from 'node:path'
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
import { STAGES, STAGE_MAP, gateProgress } from './stages'
import { autosOf } from './gate-ctx'
import { venueOf } from './route'

/**
 * 导出成 markdown 快照，写到仓库内的 export/<书名>/。
 * 用途：交付、备份、拿去别的编辑器接着写。
 * **系统里的结构化数据是真相源，导出物只是快照**——改导出物不会回流。
 */

const fm = (o: Record<string, unknown>) =>
  `---\n${Object.entries(o)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? `[${v.join(', ')}]` : v}`)
    .join('\n')}\n---\n\n`

const safe = (s: string) => s.replace(/[\/\\:*?"<>|]/g, '_').slice(0, 60)

function fieldsToMd(stageId: string, data: Record<string, unknown>): string {
  const stage = STAGE_MAP[stageId]
  let out = ''
  for (const f of stage.fields) {
    const v = data[f.id]
    if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) continue
    out += `### ${f.label}\n\n`
    if (f.k === 'table' && Array.isArray(v)) {
      const rows = v as Record<string, string>[]
      out += `| ${f.cols.map((c) => c.label).join(' | ')} |\n`
      out += `|${f.cols.map(() => '---').join('|')}|\n`
      for (const r of rows)
        out += `| ${f.cols.map((c) => (r[c.id] ?? '').replace(/\|/g, '｜').replace(/\n/g, ' ')).join(' | ')} |\n`
      out += '\n'
    } else if (f.k === 'list' && Array.isArray(v)) {
      out += (v as string[]).filter(Boolean).map((x) => `- ${x}`).join('\n') + '\n\n'
    } else if (f.k === 'score' && typeof v === 'object') {
      const m = v as Record<string, number>
      const total = f.items.reduce((s, it) => s + (Number(m[it.id]) || 0), 0)
      out += `**总分 ${total} / ${f.items.length * 2}** —— ${total >= 14 ? '立项' : total >= 10 ? '修改后重测' : '弃'}\n\n`
      out += `| 维度 | 得分 |\n|---|---|\n`
      for (const it of f.items) out += `| ${it.label} | ${m[it.id] ?? '—'} |\n`
      out += '\n'
    } else if (f.k === 'flags' && typeof v === 'object') {
      const m = v as Record<string, boolean>
      out += f.items.map((it) => `- [${m[it.id] ? 'x' : ' '}] ${it.label}${it.hint ? ` —— ${it.hint}` : ''}`).join('\n') + '\n\n'
    } else {
      out += `${String(v)}\n\n`
    }
  }
  return out
}

export function exportProject(projectId: string, outRoot?: string): { dir: string; files: string[] } {
  const p = projects.get(projectId)
  if (!p) throw new Error('作品不存在')
  const dir = path.join(outRoot ?? path.join(process.cwd(), 'export'), safe(p.title))
  fs.rmSync(dir, { recursive: true, force: true })
  const files: string[] = []
  const write = (rel: string, body: string) => {
    const full = path.join(dir, rel)
    fs.mkdirSync(path.dirname(full), { recursive: true })
    fs.writeFileSync(full, body, 'utf8')
    files.push(rel)
  }

  const states = stageStore.all(projectId)
  const chs = chapters.list(projectId)
  const vols = volumes.list(projectId)
  const people = cast.list(projectId)
  const ths = threads.list(projectId)
  const words = chs.reduce((s, c) => s + c.words, 0)
  const stamp = new Date().toISOString().slice(0, 10)

  /* 导航 */
  // 必须带上自动判定，否则 42 条可判定项全部落到 pending，
  // 导出的门禁状态会比应用里显示的低一截
  const autos = autosOf(projectId)
  const passed = STAGES.filter((s) => gateProgress(s, states[s.id]?.gate ?? {}, autos).passed)
  write(
    '00_导航.md',
    fm({ type: 'moc', 书名: p.title, 阵地: venueOf(p).name, 状态: p.status, 导出日期: stamp, 来源: '榫 Tenon' }) +
      `# ${p.title}\n\n> ${p.logline ?? '（卖点未定）'}\n\n` +
      `**${venueOf(p).name}** · ${p.status} · ${vols.length} 卷 / ${chs.length} 章 / ${(words / 10000).toFixed(1)} 万字 · 门禁 ${passed.length}/${STAGES.length}\n\n` +
      `## 管线状态\n\n| # | 环节 | 门禁 | 状态 |\n|---|---|---|---|\n` +
      STAGES.map((s) => {
        const g = gateProgress(s, states[s.id]?.gate ?? {}, autos)
        return `| ${s.no} | ${s.title} | ${g.done}/${g.total} | ${g.passed ? '✅ 已过' : g.hardLeft ? `🔴 硬项欠 ${g.hardLeft}` : '⏳'} |`
      }).join('\n') +
      `\n\n## 目录\n\n- [立项书](01_立项书.md)\n- [世界观圣经](02_世界观圣经.md)\n- [人物档案/](人物档案/)\n- [伏笔账本](伏笔账本/伏笔总账.md)\n- [卷结构/](卷结构/)\n- [章节记录/](章节记录/)\n- [正文/](正文/)\n`,
  )

  /* 立项书（选题层 01-06） */
  let brief = fm({ type: 'doc', 书名: p.title, 导出日期: stamp }) + `# 立项书 ·《${p.title}》\n\n`
  brief += `**一句话卖点**：${p.logline ?? '（未定）'}\n\n`
  for (const id of ['b1-market', 'b9-core', 'b7-concept']) {
    const body = fieldsToMd(id, states[id].data)
    if (body) brief += `## ${STAGE_MAP[id].no} ${STAGE_MAP[id].title}\n\n${body}`
  }
  write('01_立项书.md', brief)

  /* 世界观圣经（构建层 07-09 + 总纲 11） */
  let bible = fm({ type: 'doc', 书名: p.title, 导出日期: stamp }) + `# 世界观圣经 ·《${p.title}》\n\n`
  for (const id of ['c6-bible', 'c1-resource', 'c2-power', 'f1-outline']) {
    const body = fieldsToMd(id, states[id].data)
    if (body) bible += `## ${STAGE_MAP[id].no} ${STAGE_MAP[id].title}\n\n${body}`
  }
  const lk = locks.list(projectId)
  if (lk.length)
    bible += `## 禁止修改事项（锁定项）\n\n${lk.map((x) => `- **${x.item}**${x.reason ? ` —— ${x.reason}` : ''}${x.since_ch ? `（第 ${x.since_ch} 章确立）` : ''}`).join('\n')}\n`
  write('02_世界观圣经.md', bible)

  /* 人物档案 */
  for (const c of people)
    write(
      `人物档案/${c.cid}_${safe(c.name)}.md`,
      fm({
        id: c.cid,
        类型: '人物',
        名字: c.name,
        别名: c.aliases,
        角色: c.role,
        站位: c.stance,
        阵营: c.faction,
        状态: c.status,
        打脸链序号: c.face_rank,
        首次登场: c.first_ch,
        最近更新章: c.last_ch,
      }) +
        `# ${c.name}（${c.cid}）\n\n` +
        (c.motive_surface ? `**表层动机**：${c.motive_surface}\n\n` : '') +
        (c.motive_deep ? `**深层动机**：${c.motive_deep}\n\n` : '') +
        (c.attitude ? `**处世态度**：${c.attitude}\n\n` : '') +
        `## 三件套\n\n- 欲望：${c.desire ?? '—'}\n- 软肋：${c.weakness ?? '—'}\n- 与主角的资源关系：${c.resource_rel ?? '—'}\n\n` +
        (c.secrets ? `## ⚠ 知道的秘密\n\n${c.secrets}\n\n` : '') +
        (c.tic ? `**口癖**：${c.tic}\n\n` : '') +
        (c.notes ? `## 备注\n\n${c.notes}\n` : ''),
    )

  /* 伏笔账本 */
  write(
    '伏笔账本/伏笔总账.md',
    fm({ type: 'ledger', 书名: p.title, 导出日期: stamp, 条数: ths.length }) +
      `# 伏笔总账 ·《${p.title}》\n\n> 凡埋必收。状态机：已埋设 → 已强化 → 已回收 / 已废弃（须说明理由）。每卷末对账。\n\n` +
      `| ID | 层级 | 悬念内容 | 读者可见线索 | 真相 | 埋设章 | 计划回收 | 实际回收 | 强化章 | 状态 |\n` +
      `|---|---|---|---|---|---|---|---|---|---|\n` +
      ths
        .map(
          (t) =>
            `| ${t.fid} | ${t.level} | ${(t.content || '').replace(/\|/g, '｜').replace(/\n/g, ' ')} | ${(t.clue ?? '').replace(/\|/g, '｜')} | ${(t.truth ?? '').replace(/\|/g, '｜')} | ${t.planted_ch ?? ''} | ${t.plan_ch ?? ''} | ${t.actual_ch ?? ''} | ${t.reinforced.join('/')} | ${t.status}${t.discard_why ? `（${t.discard_why}）` : ''} |`,
        )
        .join('\n') +
      '\n',
  )

  /* 卷结构 */
  for (const v of vols) {
    const vc = chs.filter((c) => c.volume_id === v.id)
    write(
      `卷结构/${v.vid}.md`,
      fm({ id: v.vid, 类型: '卷', 卷名: v.title, 揭露层级: v.reveal_layer, 力量轨道: v.power_track, 章数: vc.length }) +
        `# ${v.vid}《${v.title}》\n\n` +
        `- **单卷目标**：${v.goal ?? '—'}\n- **核心冲突**：${v.conflict ?? '—'}\n- **卷末大高潮**：${v.climax ?? '—'}\n- **揭露层级**：${v.reveal_layer ?? '—'}\n- **力量轨道**：${v.power_track ?? '—'}\n\n` +
        `## 事件线\n\n| 章 | 事件 | 节拍 | 钩子 | 埋 | 收 |\n|---|---|---|---|---|---|\n` +
        vc
          .map(
            (c) =>
              `| ${c.no} | ${(c.event ?? c.core_event ?? '').replace(/\|/g, '｜')} | ${c.beat} | ${c.hook_type ?? ''} | ${c.plant.join('/')} | ${c.harvest.join('/')} |`,
          )
          .join('\n') +
        '\n',
    )
  }

  /* 章节记录 */
  const byVol = new Map<string, typeof chs>()
  for (const c of chs) {
    const k = c.volume_id ?? '_'
    if (!byVol.has(k)) byVol.set(k, [])
    byVol.get(k)!.push(c)
  }
  for (const [vid, list] of byVol) {
    const v = vols.find((x) => x.id === vid)
    write(
      `章节记录/${v?.vid ?? 'V-00'}_章节记录.md`,
      fm({ type: 'record', 卷: v?.vid ?? '', 导出日期: stamp }) +
        `# 章节记录 · ${v ? `${v.vid}《${v.title}》` : '未归卷'} ·《${p.title}》\n\n> 每章"给未来的摘要"。写第 200 章时读的是这个，不是正文。\n\n` +
        list
          .map((c) => {
            let s = `## 第 ${c.no} 章${c.title ? `·${c.title}` : ''}\n\n`
            s += `- 一句话剧情：${c.summary ?? '（未回写）'}\n`
            s += `- 信息增量：${c.info_gain ?? '—'}\n`
            s += `- 本章爽点：${c.beat}\n`
            s += `- 章末 Hook：${c.hook_type ?? '—'}${c.hook_text ? ` —— ${c.hook_text}` : ''}\n`
            if (c.plant.length) s += `- 埋设伏笔：${c.plant.join('、')}\n`
            if (c.harvest.length) s += `- 回收伏笔：${c.harvest.join('、')}\n`
            s += `- 字数：${c.words}\n`
            return s
          })
          .join('\n'),
    )
  }

  /* 正文 */
  for (const c of chs) {
    if (!c.body) continue
    const v = vols.find((x) => x.id === c.volume_id)
    write(
      `正文/${v?.vid.replace('-', '') ?? 'V00'}-${String(c.no).padStart(3, '0')}_${safe(c.title ?? '')}.md`,
      `# 第 ${c.no} 章${c.title ? ` ${c.title}` : ''}\n\n${c.body}\n`,
    )
  }

  /* 数据与复盘 */
  const ms = metrics.list(projectId)
  if (ms.length) {
    write(
      '数据/章级指标.csv',
      '章号,日期,完读率,追读率,章末流失,停留,书架/收藏,首订,追订比,备注\n' +
        ms
          .map((m) =>
            [m.chapter_no, m.date, m.finish, m.follow, m.drop_off, m.stay, m.shelf, m.sub_first, m.sub_ratio, m.note]
              .map((x) => x ?? '')
              .join(','),
          )
          .join('\n') +
        '\n',
    )
  }
  const retro = fieldsToMd('h5-retro', states['h5-retro'].data)
  const diag = fieldsToMd('h3-diagnose', states['h3-diagnose'].data)
  if (retro || diag) write('数据/复盘.md', `# 复盘 ·《${p.title}》\n\n${diag}${retro}`)

  const dec = decisions.list(projectId)
  if (dec.length)
    write(
      '修改记录.md',
      `# 决策留痕 ·《${p.title}》\n\n> 高风险动作必须留痕：动议 + 证据等级 + 先例 + 结论 + 签字。防的是后续会话拿同级证据重提同一件事。\n\n` +
        dec
          .map(
            (d) =>
              `## ${d.ts.slice(0, 16).replace('T', ' ')} · ${d.kind}${d.signed ? '（已签字）' : '（待签）'}\n\n- **动议**：${d.motion}\n- **证据等级**：${d.evidence}\n- **检索到的先例**：${d.precedent ?? '（无）'}\n- **结论**：${d.ruling ?? '（未决）'}\n`,
          )
          .join('\n'),
    )

  return { dir, files }
}
