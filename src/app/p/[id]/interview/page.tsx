import { notFound } from 'next/navigation'
import { projects } from '@/lib/repo'
import Interview from './Interview'

export default async function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const p = projects.get(id)
  if (!p) notFound()
  return <Interview projectId={id} title={p.title} />
}
