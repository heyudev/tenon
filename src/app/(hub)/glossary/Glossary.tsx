'use client'

import { useState } from 'react'
import type { Term } from '@/lib/glossary'
import { Eyebrow } from '@/components/ui'

/** 术语表：新手打不开门的第一道墙不是方法论，是词 */
export default function Glossary({ terms }: { terms: Term[] }) {
  const [q, setQ] = useState('')
  const kw = q.trim()
  const list = kw
    ? terms.filter((t) =>
        [t.t, ...(t.alias ?? []), t.d, t.why ?? ''].some((x) => x.includes(kw)),
      )
    : terms

  return (
    <div className="mx-auto max-w-[760px] px-10 py-12">
      <h1 className="display text-[26px] tracking-tight">术语表</h1>
      <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--text-faint)]">
        这套系统里的黑话。界面上到处都是这些词，读不懂就没法往下走。
        <br />
        环节页右栏会自动列出该环节出现过的术语，不用来回翻这里。
      </p>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="搜术语 / 解释"
        className="field mt-5 h-8"
      />
      <div className="mt-2 text-[12px] text-[var(--text-faint)]">
        {list.length} / {terms.length} 条
      </div>

      <dl className="mt-5 space-y-px overflow-hidden border border-[var(--line-soft)]">
        {list.map((t) => (
          <div key={t.t} className="bg-[var(--surface)] px-5 py-3.5">
            <dt className="flex flex-wrap items-baseline gap-2">
              <span className="text-[14px] font-medium">{t.t}</span>
              {t.alias?.map((a) => (
                <span key={a} className="text-[12px] text-[var(--text-faint)]">
                  {a}
                </span>
              ))}
            </dt>
            <dd className="mt-1 text-[14px] leading-[1.8] text-[var(--text-dim)]">{t.d}</dd>
            {t.why && (
              <dd className="mt-1 border-l-2 border-[var(--accent)]/30 pl-2.5 text-[12px] leading-relaxed text-[var(--text-faint)]">
                {t.why}
              </dd>
            )}
          </div>
        ))}
      </dl>

      {list.length === 0 && (
        <p className="mt-6 text-center text-[14px] text-[var(--text-faint)]">没有匹配的词条。</p>
      )}
      <div className="mt-8">
        <Eyebrow>看不懂还可以去</Eyebrow>
        <p className="mt-1.5 text-[14px] text-[var(--text-dim)]">
          方法论库（每条判据的完整说明）· 阵地库（平台黑话）· 规则库（规则与概念本身）
        </p>
      </div>
    </div>
  )
}
