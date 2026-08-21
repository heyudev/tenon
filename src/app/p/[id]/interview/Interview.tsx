'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { QUESTIONS, DRAFT_FIELDS, type Answers, type Draft } from '@/lib/ai/interview'
import { STAGE_MAP } from '@/lib/stages'
import { commitInterview } from '@/lib/actions'
import { Button, Chip, Eyebrow, cx } from '@/components/ui'

const EMPTY: Answers = { scene: '', want: '', block: '', style: '' }

/** 字段 id → 人话标签 */
function labelOf(stageId: string, fid: string): string {
  if (stageId === 'hero') {
    const m: Record<string, string> = {
      name: '姓名', stance: '站位', motive_surface: '表层动机',
      motive_deep: '深层动机', weakness: '软肋', notes: '一句话人设',
    }
    return m[fid] ?? fid
  }
  return STAGE_MAP[stageId]?.fields.find((f) => f.id === fid)?.label ?? fid
}

const show = (v: unknown) => (Array.isArray(v) ? v.join('、') : String(v ?? ''))

export default function Interview({ projectId, title }: { projectId: string; title: string }) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [a, setA] = useState<Answers>(EMPTY)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  // 复核屏：默认全选，人可以逐环节取消
  const [take, setTake] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)

  const q = QUESTIONS[step]
  const last = step === QUESTIONS.length - 1
  const answered = (a[q?.id] ?? '').trim().length > 0

  const run = async () => {
    setBusy(true)
    setErr('')
    try {
      const res = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, answers: a }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      setDraft(d.draft as Draft)
      const init: Record<string, boolean> = {}
      for (const k of Object.keys((d.draft as Draft).stages)) init[k] = true
      if (Object.keys((d.draft as Draft).hero).length) init.hero = true
      setTake(init)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const commit = async () => {
    if (!draft) return
    setSaving(true)
    const stages = Object.fromEntries(Object.entries(draft.stages).filter(([k]) => take[k]))
    await commitInterview(projectId, {
      answers: a,
      stages,
      hero: take.hero ? draft.hero : null,
    })
    router.push(`/p/${projectId}/guide`)
  }

  /* ── 复核屏 ── */
  if (draft) {
    const groups = [
      ...Object.keys(draft.stages).map((sid) => ({
        key: sid,
        title: `${STAGE_MAP[sid]?.no ?? ''} ${STAGE_MAP[sid]?.title ?? sid}`,
        rows: DRAFT_FIELDS[sid]?.filter((f) => draft.stages[sid][f] !== undefined).map((f) => [labelOf(sid, f), show(draft.stages[sid][f])]) ?? [],
      })),
      ...(Object.keys(draft.hero).length
        ? [{
            key: 'hero',
            title: '主角卡（会新建一个人物）',
            rows: Object.entries(draft.hero).map(([f, v]) => [labelOf('hero', f), v]),
          }]
        : []),
    ].filter((g) => g.rows.length > 0)

    const picked = groups.filter((g) => take[g.key]).reduce((n, g) => n + g.rows.length, 0)

    return (
      <div className="mx-auto max-w-[760px] px-10 py-12">
        <Eyebrow>开书访谈 · 复核</Eyebrow>
        <h1 className="display mt-3 text-[26px]">这是草稿，不是结论</h1>
        <p className="mt-3 text-[14px] leading-[1.9] text-[var(--text-dim)]">
          按你那四个回答补出来的。<strong>逐组看一眼，不要的整组取消</strong>；采纳之后每一项都还能在各自环节里改。
          <br />
          <span className="text-[var(--text-faint)]">
            AI 产出不会自己进真相源——这一屏就是那道人工确认。
          </span>
        </p>

        <div className="mt-7 space-y-3">
          {groups.map((g) => (
            <div
              key={g.key}
              className={cx(
                'border p-5 transition-colors',
                take[g.key] ? 'border-[var(--accent)]/35 bg-[var(--accent)]/4' : 'border-[var(--line-soft)] opacity-55',
              )}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-[14px] font-semibold">{g.title}</span>
                <span className="num text-[12px] text-[var(--text-faint)]">{g.rows.length} 项</span>
                <button
                  onClick={() => setTake({ ...take, [g.key]: !take[g.key] })}
                  className="ml-auto rounded-[2px] border border-[var(--line)] px-2.5 py-1 text-[12px] transition-colors hover:border-[var(--text-faint)]"
                >
                  {take[g.key] ? '取消这组' : '采纳这组'}
                </button>
              </div>
              <dl className="mt-3 space-y-2">
                {g.rows.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[128px_1fr] gap-3">
                    <dt className="text-[12px] text-[var(--text-faint)]">{k}</dt>
                    <dd className="whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--text-dim)]">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-3">
          <Button variant="solid" onClick={commit} disabled={saving || picked === 0}>
            {saving ? '写入中…' : `采纳 ${picked} 项并继续`}
          </Button>
          <Button variant="quiet" onClick={() => setDraft(null)} disabled={saving}>
            回去改答案
          </Button>
        </div>
      </div>
    )
  }

  /* ── 提问屏 ── */
  return (
    <div className="mx-auto max-w-[680px] px-10 py-12">
      <div className="flex items-baseline gap-3">
        <Eyebrow>开书访谈</Eyebrow>
        <span className="text-[12px] text-[var(--text-faint)]">《{title}》</span>
        <Link href={`/p/${projectId}/guide`} className="ml-auto text-[12px] text-[var(--text-faint)] hover:text-[var(--text-dim)]">
          跳过，我自己填 →
        </Link>
      </div>

      <h1 className="display mt-3 text-[26px]">回答 {QUESTIONS.length} 个问题就能开写</h1>
      <p className="mt-2.5 text-[14px] leading-relaxed text-[var(--text-dim)]">
        最小可动笔集合有 30 个字段，但真正只有你知道的就这几个。其余的类型库里已经有，或者能从你的回答里推出来。
      </p>

      {/* 进度 */}
      <div className="mt-6 flex gap-px">
        {QUESTIONS.map((x, i) => (
          <span
            key={x.id}
            className="h-1.5 flex-1"
            style={{ background: i < step ? 'var(--accent)' : i === step ? 'var(--accent)' : 'var(--line)', opacity: i > step ? 1 : i === step ? 0.55 : 1 }}
          />
        ))}
      </div>

      <div className="seat mt-7">
        <div className="flex items-baseline gap-2.5">
          <span className="num text-[12px] text-[var(--text-faint)]">{step + 1} / {QUESTIONS.length}</span>
          {q.canAssist && <Chip tone="mute">答不上来可以留空</Chip>}
        </div>
        <h2 className="mt-2 text-[18px] font-semibold tracking-tight">{q.label}</h2>
        <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--text-faint)]">{q.hint}</p>
        <textarea
          value={a[q.id]}
          onChange={(e) => setA({ ...a, [q.id]: e.target.value })}
          rows={q.rows ?? 3}
          placeholder={q.placeholder}
          className="field mt-3 resize-y"
          autoFocus
        />
      </div>

      {err && (
        <p className="mt-4 border border-[var(--accent)]/35 bg-[var(--accent)]/6 px-4 py-3 text-[14px] leading-relaxed text-[var(--accent)]">
          {err}
        </p>
      )}

      <div className="mt-6 flex items-center gap-3">
        {step > 0 && (
          <Button variant="quiet" onClick={() => setStep(step - 1)} disabled={busy}>
            上一个
          </Button>
        )}
        {!last ? (
          <Button variant="solid" onClick={() => setStep(step + 1)} disabled={!answered}>
            下一个
          </Button>
        ) : (
          <Button variant="solid" onClick={run} disabled={busy}>
            {busy ? '起草中…（本地模型可能要几分钟）' : '生成草稿'}
          </Button>
        )}
        {!answered && !last && (
          <span className="text-[12px] text-[var(--text-faint)]">这一题是种子，必须自己答</span>
        )}
      </div>
    </div>
  )
}
