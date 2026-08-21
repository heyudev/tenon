import { PROVIDERS, currentModel, currentProvider, listModels, probe } from '@/lib/ai/provider'
import { assets } from '@/lib/repo'
import SettingsForm from './SettingsForm'

/**
 * 必须每次请求现算。
 * 这一页的内容全是**实时探活**：后端可不可用、Ollama 本机拉了哪些模型。
 * 默认的静态预渲染会把构建那一刻的结果烤进 HTML——删了模型还显示着、
 * 新 pull 的模型不出现，全是这个原因。
 */
export const dynamic = 'force-dynamic'

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
