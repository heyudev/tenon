'use client'

import Link from 'next/link'
import type { Stage } from '@/lib/stages'

/** 15-18 是同一个日更主循环的四个节拍，工作区在日更台；这里只留环节说明与门禁入口 */
export default function WriteRedirect({ projectId, stage }: { projectId: string; stage: Stage }) {
  return (
    <div className="mx-auto max-w-[640px] px-10 py-20 text-center">
      <div className="eyebrow">{String(stage.no).padStart(2, '0')} · 日更主循环</div>
      <h1 className="display mt-3 text-[26px]">{stage.title}</h1>
      <p className="mt-4 text-[14px] leading-[1.9] text-[var(--text-dim)]">{stage.purpose}</p>
      <p className="mt-3 text-[14px] text-[var(--text-faint)]">
        15 章节规划 → 16 正文生成 → 17 审校门禁 → 18 状态回写 是同一个循环的四个节拍，
        <br />
        它们的工作区合并在日更台里，逐章推进。
      </p>
      <Link
        href={`/p/${projectId}/write`}
        className="mt-8 inline-flex h-9 items-center rounded-[2px] bg-[var(--accent)] px-5 text-[14px] font-medium text-white transition-all hover:brightness-110"
      >
        打开日更台 →
      </Link>
      <div className="mt-10 text-left">
        <div className="eyebrow">本节拍的门禁</div>
        <ul className="mt-2.5 space-y-1.5">
          {stage.gate.map((g) => (
            <li key={g.id} className="flex gap-2 text-[14px] leading-relaxed text-[var(--text-dim)]">
              <span className="mt-[7px] h-1 w-1 flex-none rounded-full bg-[var(--text-faint)]" />
              <span>
                {g.text}
                {g.hard && <span className="ml-1.5 text-[12px] text-[var(--accent)]">硬项</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
