import { NextRequest } from 'next/server'
import { buildInterviewPrompt, parseDraft, type Answers } from '@/lib/ai/interview'
import { currentModel, currentProvider, runAI, type ProviderId } from '@/lib/ai/provider'
import { aiRuns, projects } from '@/lib/repo'

export const maxDuration = 900
export const dynamic = 'force-dynamic'

/** 开书访谈：把作者的几句回答展开成草稿。只生成，不落库——落库在复核屏由人点采纳 */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    projectId: string
    answers: Answers
    provider?: ProviderId
    /** 覆盖本次调用的模型，不改设置里保存的那个 */
    model?: string
    preview?: boolean
  }
  const p = projects.get(body.projectId)
  if (!p) return Response.json({ error: '作品不存在' }, { status: 404 })

  const { system, prompt } = buildInterviewPrompt(p, body.answers)
  if (body.preview) return Response.json({ system, prompt })

  const provider = body.provider ?? currentProvider()
  const t0 = Date.now()
  try {
    const r = await runAI(prompt, { system, provider, model: body.model, signal: req.signal })
    aiRuns.log({
      project_id: body.projectId,
      stage_id: 'interview',
      role: '开书访谈',
      provider: r.provider,
      model: r.model,
      prompt,
      output: r.text,
      ms: r.ms,
    })
    const draft = parseDraft(r.text)
    return Response.json({ draft, raw: r.text, ms: r.ms, model: r.model, provider: r.provider })
  } catch (e) {
    const msg = (e as Error).message
    aiRuns.log({
      project_id: body.projectId,
      stage_id: 'interview',
      role: '开书访谈',
      provider,
      model: currentModel(provider),
      prompt,
      output: msg,
      ok: false,
      ms: Date.now() - t0,
    })
    return Response.json({ error: msg }, { status: 500 })
  }
}
