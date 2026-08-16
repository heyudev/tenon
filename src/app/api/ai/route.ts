import { NextRequest } from 'next/server'
import { buildArchitectPrompt, buildChapterPrompt, buildStagePrompt, type PipelineRole } from '@/lib/ai/prompts'
import { currentModel, currentProvider, runAI, type ProviderId } from '@/lib/ai/provider'
import { aiRuns } from '@/lib/repo'

export const maxDuration = 900
export const dynamic = 'force-dynamic'

interface Body {
  kind: 'stage' | 'chapter' | 'architect'
  projectId: string
  stageId?: string
  actionId?: string
  chapterId?: string
  volumeId?: string
  role?: PipelineRole
  extra?: string
  provider?: ProviderId
  /** 只要提示词，不跑模型——给"复制到 Claude Code 外部执行"用 */
  preview?: boolean
}

function spec(b: Body) {
  if (b.kind === 'chapter') return buildChapterPrompt(b.projectId, b.chapterId!, b.role ?? '写手', b.extra)
  if (b.kind === 'architect') return buildArchitectPrompt(b.projectId, b.volumeId!)
  return buildStagePrompt(b.projectId, b.stageId!, b.actionId!)
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body
  let s
  try {
    s = spec(body)
  } catch (e) {
    return Response.json({ error: `装配提示词失败：${(e as Error).message}` }, { status: 400 })
  }

  if (body.preview) {
    return Response.json({
      role: s.role,
      system: s.system,
      prompt: s.prompt,
      provider: body.provider ?? currentProvider(),
      model: currentModel(body.provider ?? currentProvider()),
    })
  }

  const provider = body.provider ?? currentProvider()
  const encoder = new TextEncoder()
  const t0 = Date.now()

  const stream = new ReadableStream({
    async start(controller) {
      // 客户端提前断开后 enqueue 会抛，吞掉即可——留痕在下面照写
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        } catch {
          /* 流已关闭 */
        }
      }

      send('meta', { role: s.role, provider, model: currentModel(provider) })

      try {
        const res = await runAI(s.prompt, {
          system: s.system,
          provider,
          onChunk: (t) => send('chunk', t),
          signal: req.signal,
        })
        aiRuns.log({
          project_id: body.projectId,
          stage_id: body.stageId ?? body.chapterId ?? null,
          role: s.role,
          provider: res.provider,
          model: res.model,
          prompt: s.prompt,
          output: res.text,
          ms: res.ms,
        })
        send('done', { text: res.text, ms: res.ms })
      } catch (e) {
        const msg = (e as Error).message
        aiRuns.log({
          project_id: body.projectId,
          stage_id: body.stageId ?? body.chapterId ?? null,
          role: s.role,
          provider,
          prompt: s.prompt,
          output: msg,
          ok: false,
          ms: Date.now() - t0,
        })
        send('error', msg)
      }
      try {
        controller.close()
      } catch {
        /* 已关闭 */
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
