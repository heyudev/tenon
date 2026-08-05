import { PROVIDERS, currentModel, currentProvider, probe } from '@/lib/ai/provider'
import { assets } from '@/lib/repo'
import SettingsForm from './SettingsForm'

export default async function SettingsPage() {
  const probes = Object.fromEntries(
    await Promise.all(PROVIDERS.map(async (p) => [p.id, await probe(p.id)] as const)),
  )
  return (
    <SettingsForm
      providers={PROVIDERS}
      probes={probes as Record<string, { ok: boolean; detail: string }>}
      current={currentProvider()}
      models={Object.fromEntries(PROVIDERS.map((p) => [p.id, currentModel(p.id)]))}
      counts={{
        rules: assets.rules().length,
        concepts: assets.concepts().length,
        edges: assets.edges().length,
        craft: assets.craft().length,
      }}
    />
  )
}
