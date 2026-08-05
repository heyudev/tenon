import { redirect } from 'next/navigation'

export default async function CastRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/p/${id}/s/d1-hero`)
}
