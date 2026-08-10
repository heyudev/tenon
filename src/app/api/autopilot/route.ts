import { NextRequest } from 'next/server'
import { DEFAULT_OPTS, autopilot, isComplete, preflight, type AutopilotOpts } from '@/lib/ai/autopilot'
import type { ProviderId } from '@/lib/ai/provider'

// 自主续写可能连跑很多章，给足时长
export const maxDuration = 3600
export const dynamic = 'force-dynamic'

/** GET：只做前置体检，不跑模型。界面进来先问一次「现在能不能开」 */
export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('projectId')
  if (!projectId) return Response.json({ error: '缺少 projectId' }, { status: 400 })
  const pre = preflight(projectId)
  const done = isComplete(projectId)
  return Response.json({
    ok: pre.ok,
    reasons: pre.reasons,
    pending: pre.pending.filter((c) => !c.body?.trim()).length,
    planned: pre.pending.length,
    complete: done.complete,
    completeDetail: done.detail,
  })
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    projectId: string
    opts?: Partial<AutopilotOpts>
    provider?: ProviderId
  }
  const opts: AutopilotOpts = { ...DEFAULT_OPTS, ...(body.opts ?? {}) }
  const encoder = new TextEncoder()
  const ac = new AbortController()
  // 客户端断开（关页面 / 点停止）就中止整条流水线，别让它在后台继续烧
  req.signal.addEventListener('abort', () => ac.abort())

  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`))
        } catch {
          /* 流已关闭 */
        }
      }
      try {
        for await (const ev of autopilot(body.projectId, opts, ac.signal, body.provider)) send(ev)
      } catch (e) {
        send({ t: 'error', no: null, msg: (e as Error).message })
      } finally {
        try {
          controller.close()
        } catch {
          /* 已关闭 */
        }
      }
    },
    cancel() {
      ac.abort()
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
