'use client'

import { useRef, useState } from 'react'
import { Button, Chip, Eyebrow, cx } from '@/components/ui'

export interface AiRequest {
  kind: 'stage' | 'chapter' | 'architect'
  projectId: string
  stageId?: string
  actionId?: string
  chapterId?: string
  volumeId?: string
  role?: string
  extra?: string
}

/**
 * 跑 AI 的通用面板：流式输出 + 一键复制提示词（外部执行路径）。
 * 结果不自动写库——AI 产出必须过人眼才能进真相源（状态库写错一次，错误会自我复制）。
 */
export function useAiRun() {
  const [text, setText] = useState('')
  const [running, setRunning] = useState(false)
  const [err, setErr] = useState('')
  const [meta, setMeta] = useState<{ role: string; provider: string; model: string } | null>(null)
  const abort = useRef<AbortController | null>(null)

  const stop = () => {
    abort.current?.abort()
    setRunning(false)
  }

  const run = async (req: AiRequest) => {
    abort.current?.abort()
    const ac = new AbortController()
    abort.current = ac
    setText('')
    setErr('')
    setRunning(true)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
        signal: ac.signal,
      })
      if (!res.body) throw new Error('无响应流')
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const frames = buf.split('\n\n')
        buf = frames.pop() ?? ''
        for (const f of frames) {
          const ev = f.match(/^event: (.+)$/m)?.[1]
          const dataLine = f.match(/^data: ([\s\S]*)$/m)?.[1]
          if (!ev || dataLine == null) continue
          const data = JSON.parse(dataLine)
          if (ev === 'chunk') setText((t) => t + data)
          else if (ev === 'meta') setMeta(data)
          else if (ev === 'done') setText(data.text)
          else if (ev === 'error') setErr(data)
        }
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setErr((e as Error).message)
    }
    setRunning(false)
  }

  const copyPrompt = async (req: AiRequest) => {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...req, preview: true }),
    })
    const d = await res.json()
    if (d.error) {
      setErr(d.error)
      return
    }
    await navigator.clipboard.writeText(`${d.system}\n\n════════\n\n${d.prompt}`)
    setErr('')
    setMeta({ role: d.role, provider: '已复制到剪贴板', model: '' })
  }

  return { text, setText, running, err, meta, run, stop, copyPrompt }
}

export function AiOutput({
  ai,
  onAccept,
  acceptLabel = '采纳到字段',
  className,
}: {
  ai: ReturnType<typeof useAiRun>
  onAccept?: (text: string) => void
  acceptLabel?: string
  className?: string
}) {
  if (!ai.text && !ai.err && !ai.running) return null
  return (
    <div className={cx('mt-4 border border-[var(--line-soft)]', className)}>
      <div className="flex items-center gap-2 border-b border-[var(--line-soft)] px-4 py-2">
        <Eyebrow>{ai.meta?.role ?? 'AI'} 产出</Eyebrow>
        {ai.meta?.model && <Chip tone="mute">{ai.meta.provider} · {ai.meta.model}</Chip>}
        {ai.running && (
          <span className="flex items-center gap-1.5 text-[12px] text-[var(--accent)]">
            <span className="h-1 w-1 animate-pulse rounded-full bg-[var(--accent)]" />
            生成中
          </span>
        )}
        <div className="ml-auto flex gap-1.5">
          {ai.running && (
            <Button size="sm" variant="quiet" onClick={ai.stop}>
              停止
            </Button>
          )}
          {!!ai.text && (
            <Button size="sm" variant="quiet" onClick={() => navigator.clipboard.writeText(ai.text)}>
              复制
            </Button>
          )}
          {!!ai.text && onAccept && !ai.running && (
            <Button size="sm" variant="ghost" onClick={() => onAccept(ai.text)}>
              {acceptLabel}
            </Button>
          )}
        </div>
      </div>
      {ai.err && (
        <p className="px-4 py-3 text-[14px] leading-relaxed text-[var(--accent)]">{ai.err}</p>
      )}
      {ai.text && (
        <pre className="max-h-[520px] overflow-y-auto whitespace-pre-wrap px-4 py-3.5 text-[14px] leading-[1.85] text-[var(--text-dim)]">
          {ai.text}
        </pre>
      )}
    </div>
  )
}
