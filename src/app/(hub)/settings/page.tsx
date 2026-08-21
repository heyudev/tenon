import { PROVIDERS, currentModel, currentProvider, listModels, probe } from '@/lib/ai/provider'
import { assets } from '@/lib/repo'
import SettingsForm from './SettingsForm'

export default async function SettingsPage() {
  const probes = Object.fromEntries(
    await Promise.all(PROVIDERS.map(async (p) => [p.id, await probe(p.id)] as const)),
  )
  const options = Object.fromEntries(
    await Promise.all(PROVIDERS.map(async (p) => [p.id, await listModels(p.id)] as const)),
  )
  return (
    <SettingsForm
      providers={PROVIDERS}
      probes={probes as Record<string, { ok: boolean; detail: string }>}
      current={currentProvider()}
      options={options as Record<string, string[]>}
      models={Object.fromEntries(PROVIDERS.map((p) => [p.id, currentModel(p.id)]))}
      counts={{
        craft: assets.craft().length,
        resources: assets.resources().length,
      }}
    />
  )
}
