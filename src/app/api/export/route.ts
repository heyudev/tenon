import { NextRequest } from 'next/server'
import { exportProject } from '@/lib/export'
import { projects } from '@/lib/repo'

export const dynamic = 'force-dynamic'

/** 导出成 markdown 快照。结构化数据是真相源，导出物只是快照——改快照不会回流 */
export async function POST(req: NextRequest) {
  const { projectId } = (await req.json()) as { projectId?: string }
  if (!projectId) return Response.json({ error: '缺少 projectId' }, { status: 400 })
  if (!projects.get(projectId)) return Response.json({ error: '作品不存在' }, { status: 404 })

  try {
    const { dir, files } = exportProject(projectId)
    return Response.json({ dir, count: files.length, files })
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 })
  }
}
