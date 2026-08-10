'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Chip, Tenon, cx } from '@/components/ui'
import { DEFAULT_OPTS, type AutopilotEvent, type AutopilotOpts } from '@/lib/ai/autopilot-types'

interface Health {
  ok: boolean
  reasons: string[]
  pending: number
  planned: number
  complete: boolean
  completeDetail: string
}

const ROLE_ORDER = ['写手', '审稿人', '修订师', '记录员', '读者模型']

export default function Autopilot({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [health, setHealth] = useState<Health | null>(null)
  const [opts, setOpts] = useState<AutopilotOpts>(DEFAULT_OPTS)
  const [log, setLog] = useState<AutopilotEvent[]>([])
  const [running, setRunning] = useState(false)
  const [cur, setCur] = useState<{ no: number; title: string; role?: string } | null>(null)
  const abort = useRef<AbortController | null>(null)
  const tail = useRef<HTMLDivElement>(null)

  const check = useCallback(async () => {
    const r = await fetch(`/api/autopilot?projectId=${projectId}`)
    setHealth(await r.json())
  }, [projectId])

  useEffect(() => {
    check()
  }, [check])

  useEffect(() => {
    tail.current?.scrollIntoView({ block: 'end' })
  }, [log])

  const start = async () => {
    setLog([])
    setCur(null)
    setRunning(true)
    const ac = new AbortController()
    abort.current = ac
    try {
      const res = await fetch('/api/autopilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, opts }),
        signal: ac.signal,
      })
      const reader = res.body!.getReader()
      const dec = new TextDecoder()
      let buf = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const parts = buf.split('\n\n')
        buf = parts.pop() ?? ''
        for (const p of parts) {
          const line = p.replace(/^data: /, '').trim()
          if (!line) continue
          const ev = JSON.parse(line) as AutopilotEvent
          setLog((l) => [...l, ev])
          if (ev.t === 'chapter') setCur({ no: ev.no, title: ev.title })
          if (ev.t === 'role') setCur((c) => (c ? { ...c, role: ev.role } : c))
        }
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError')
        setLog((l) => [...l, { t: 'error', no: null, msg: (e as Error).message }])
    } finally {
      setRunning(false)
      setCur(null)
      abort.current = null
      await check()
      router.refresh() // 让日更台看到刚落库的正文
    }
  }

  const stop = () => abort.current?.abort()

  const wrote = log.filter((e) => e.t === 'wrote' && e.field === 'body').length
  const finished = log.find((e) => e.t === 'done') as Extract<AutopilotEvent, { t: 'done' }> | undefined

  return (
    <div className="frame-thin p-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="display text-[18px]">自主续写</h2>
        <span className="text-[12px] text-[var(--text-faint)]">
          整个委员会不经人手把排定的章节写完
        </span>
      </div>

      <p className="mt-2 text-[12px] leading-relaxed text-[var(--accent)]">
        ⚠ 这个模式会<strong className="font-semibold">直接把 AI 产出写进库</strong>，绕过「产出必须过人眼」那条默认约束。
        它靠三件事兜底：开跑前查大纲、每章过门禁、全程写 <span className="num">ai_runs</span> 留痕（role 前缀 <span className="num">auto/</span>）。
      </p>

      {/* 体检 */}
      {health && (
        <div className="mt-4">
          {health.complete ? (
            <div className="flex items-center gap-2 text-[14px] text-[var(--color-celadon)]">
              <Tenon seated size={14} tone="good" />
              全书已写完 —— {health.completeDetail}
            </div>
          ) : health.ok ? (
            <div className="flex flex-wrap items-center gap-2 text-[14px] text-[var(--text-dim)]">
              <Tenon seated size={14} />
              可以开跑：已排定 <span className="num">{health.planned}</span> 章，
              其中 <span className="num text-[var(--accent)]">{health.pending}</span> 章还没有正文
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 text-[14px] text-[var(--accent)]">
                <Tenon seated={false} size={14} />
                还不能开
              </div>
              <ul className="mt-2 space-y-1">
                {health.reasons.map((r) => (
                  <li key={r} className="text-[12px] leading-relaxed text-[var(--text-dim)]">
                    · {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 预算与刹车 */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-[12px] text-[var(--text-faint)]">
          本次最多写几章
          <input
            type="number"
            min={1}
            max={500}
            value={opts.maxChapters}
            disabled={running}
            onChange={(e) => setOpts({ ...opts, maxChapters: Math.max(1, +e.target.value || 1) })}
            className="field mt-1 h-8"
          />
        </label>
        <label className="text-[12px] text-[var(--text-faint)]">
          每章最多返修几轮
          <input
            type="number"
            min={0}
            max={5}
            value={opts.maxRevisions}
            disabled={running}
            onChange={(e) => setOpts({ ...opts, maxRevisions: Math.max(0, +e.target.value || 0) })}
            className="field mt-1 h-8"
          />
        </label>
      </div>

      <div className="mt-3 space-y-1.5">
        {(
          [
            ['stopOnGateFail', '门禁过不去就停下等人'],
            ['stopOnReaderDrop', '读者模型判「弃书」就停下'],
            ['autoSummary', '记录员的摘要自动落库（这一步会写进真相源）'],
            ['overwrite', '覆盖已经有正文的章（默认关，不碰你写过的）'],
          ] as const
        ).map(([k, label]) => (
          <label key={k} className="flex cursor-pointer items-center gap-2 text-[12px] text-[var(--text-dim)]">
            <input
              type="checkbox"
              checked={opts[k]}
              disabled={running}
              onChange={(e) => setOpts({ ...opts, [k]: e.target.checked })}
              className="accent-[var(--accent)]"
            />
            {label}
          </label>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button
          variant="solid"
          disabled={running || !health?.ok || health?.complete}
          onClick={start}
        >
          {running ? '正在写…' : '开始自主续写'}
        </Button>
        {running && (
          <Button variant="danger" onClick={stop}>
            叫停
          </Button>
        )}
        {cur && (
          <span className="text-[12px] text-[var(--text-faint)]">
            第 {cur.no} 章{cur.role ? ` · ${cur.role}` : ''}
          </span>
        )}
        {!running && wrote > 0 && (
          <span className="text-[12px] text-[var(--color-celadon)]">本次写了 {wrote} 章</span>
        )}
      </div>

      {/* 实时流水 */}
      {log.length > 0 && (
        <div className="mt-4 max-h-[340px] overflow-y-auto border-t border-[var(--line-soft)] pt-3">
          {log.map((e, i) => (
            <LogLine key={i} e={e} />
          ))}
          <div ref={tail} />
        </div>
      )}

      {finished && (
        <p
          className={cx(
            'mt-3 border px-3 py-2 text-[12px] leading-relaxed',
            finished.complete
              ? 'border-[var(--color-celadon)]/40 text-[var(--color-celadon)]'
              : 'border-[var(--line)] text-[var(--text-dim)]',
          )}
        >
          {finished.complete ? '全书写完 —— ' : '本轮结束 —— '}
          {finished.reason}
        </p>
      )}
    </div>
  )
}

function LogLine({ e }: { e: AutopilotEvent }) {
  const row = (label: React.ReactNode, body: React.ReactNode, tone?: 'accent' | 'good' | 'mute') => (
    <div className="flex gap-2.5 py-[3px] text-[12px] leading-relaxed">
      <span
        className={cx(
          'w-[70px] flex-none text-right',
          tone === 'accent' ? 'text-[var(--accent)]' : tone === 'good' ? 'text-[var(--color-celadon)]' : 'text-[var(--text-faint)]',
        )}
      >
        {label}
      </span>
      <span className="min-w-0 flex-1 text-[var(--text-dim)]">{body}</span>
    </div>
  )

  switch (e.t) {
    case 'start':
      return row('开跑', `待写 ${e.pending} 章，本次预算 ${e.budget} 章 · ${e.provider} ${e.model}`)
    case 'chapter':
      return (
        <div className="mt-2 flex items-baseline gap-2 border-t border-[var(--line-soft)] pt-2">
          <span className="num text-[12px] text-[var(--text-faint)]">
            {String(e.no).padStart(3, '0')}
          </span>
          <span className="text-[14px] font-medium">{e.title}</span>
        </div>
      )
    case 'role':
      return row(
        e.role,
        <>
          {e.chars} 字 · {(e.ms / 1000).toFixed(1)}s
          <span className="ml-2 text-[var(--text-faint)]">
            {ROLE_ORDER.includes(e.role) ? `第 ${ROLE_ORDER.indexOf(e.role) + 1}/5 棒` : ''}
          </span>
        </>,
      )
    case 'verdict':
      return row(
        '裁决',
        <Chip tone={e.verdict === '通过' || e.verdict === '追更' ? 'good' : e.verdict === '弃书' ? 'accent' : 'mute'}>
          {e.role} · {e.verdict}
        </Chip>,
      )
    case 'gate':
      return row(
        '门禁',
        e.failed.length ? (
          <span className="text-[var(--accent)]">
            {e.passed}/{e.total} · 未过：{e.failed.join('；')}
          </span>
        ) : (
          <span className="text-[var(--color-celadon)]">{e.passed}/{e.total} 全过</span>
        ),
        e.failed.length ? 'accent' : 'good',
      )
    case 'wrote':
      return row('落库', `${e.field} ← ${e.chars} 字`, 'good')
    case 'pause':
      return row('停', <span className="text-[var(--accent)]">{e.reason}</span>, 'accent')
    case 'blocked':
      return row('拦下', <span className="text-[var(--accent)]">{e.reasons.join('；')}</span>, 'accent')
    case 'error':
      return row('出错', <span className="text-[var(--accent)]">{e.msg}</span>, 'accent')
    default:
      return null
  }
}
