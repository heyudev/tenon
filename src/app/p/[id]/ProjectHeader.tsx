'use client'

import { useState } from 'react'
import type { Project } from '@/lib/types'
import { deleteProject, updateProject } from '@/lib/actions'
import { VENUES, VENUE_MAP } from '@/lib/platform'
import { venueOf } from '@/lib/route'
import { Button } from '@/components/ui'

const STATUS = ['立项中', '构建中', '连载中', '完结', '冻结']

export default function ProjectHeader({ project: p }: { project: Project }) {
  const [confirm, setConfirm] = useState(false)
  const [out, setOut] = useState('')

  const doExport = async () => {
    setOut('导出中…')
    const res = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: p.id }),
    })
    const d = await res.json()
    setOut(d.error ? `失败：${d.error}` : `已导出 ${d.count} 个文件 → ${d.dir}`)
  }

  return (
    <header>
      <div className="flex items-baseline gap-3">
        <input
          defaultValue={p.title}
          onBlur={(e) => updateProject(p.id, { title: e.target.value })}
          className="min-w-0 flex-1 bg-transparent text-[26px] font-light tracking-tight outline-none"
        />
        {/* 阵地是真相源：字数区间、爽点红线、健康线、提示词分支全从它派生。
            platform/channel 只是它的派生展示字段，必须一起写，不能单独改 */}
        <select
          value={venueOf(p).id}
          onChange={(e) => {
            const v = VENUE_MAP[e.target.value]
            if (v) updateProject(p.id, { venue: v.id, platform: v.operator, channel: v.channel })
          }}
          className="h-8 flex-none cursor-pointer rounded-[2px] border border-[var(--line)] bg-transparent px-2 text-[12px]"
          title="发布阵地 —— 换阵地会同时换掉字数区间、爽点红线与健康线"
        >
          {VENUES.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
        <select
          defaultValue={p.status}
          onChange={(e) => updateProject(p.id, { status: e.target.value })}
          className="h-7 flex-none cursor-pointer rounded-[2px] border border-[var(--line)] bg-transparent px-2 text-[14px]"
        >
          {STATUS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <Button size="sm" variant="ghost" className="flex-none" onClick={doExport} title="导出成 markdown 快照到 export/">
          导出
        </Button>
        {confirm ? (
          <div className="flex flex-none gap-1">
            <Button size="sm" variant="danger" onClick={() => deleteProject(p.id)}>
              确认删除
            </Button>
            <Button size="sm" variant="quiet" onClick={() => setConfirm(false)}>
              取消
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="quiet" className="flex-none" onClick={() => setConfirm(true)}>
            删除
          </Button>
        )}
      </div>
      {out && <p className="mt-2 text-[12px] text-[var(--color-celadon)]">{out}</p>}
      <textarea
        defaultValue={p.logline ?? ''}
        onBlur={(e) => updateProject(p.id, { logline: e.target.value })}
        rows={2}
        placeholder="一句话卖点：当〔现实规则〕变成〔改写后规则〕，一个〔特殊主角〕必须〔核心动作〕。"
        className="field mt-3 resize-y text-[14px]"
      />
    </header>
  )
}
