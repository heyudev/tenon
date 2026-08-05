import { assets } from '@/lib/repo'
import ConceptGraph from './ConceptGraph'

export default async function GraphPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>
}) {
  const { focus } = await searchParams
  return (
    <ConceptGraph
      concepts={assets.concepts()}
      edges={assets.edges()}
      rules={assets.rules()}
      focusInit={focus}
    />
  )
}
