'use client'

import { useState } from 'react'
import { saveSetting } from '@/lib/actions'
import { Button, Chip, Eyebrow, cx } from '@/components/ui'

export default function SettingsForm({
  providers,
  probes,
  current,
  models,
  options,
  counts,
}: {
  providers: { id: string; label: string; desc: string; needsKey: boolean; defaultModel: string }[]
  probes: Record<string, { ok: boolean; detail: string }>
  current: string
  models: Record<string, string>
  /** 每个后端的候选模型。Ollama 是本机实拉的，其余是静态清单 */
  options: Record<string, string[]>
  counts: { craft: number; resources: number }
}) {
  const [sel, setSel] = useState(current)
  const [mdl, setMdl] = useState(models)
  const [saved, setSaved] = useState(false)
  // 当前值不在候选里（或压根没候选）就落到自由输入，清单过时也不挡路
  const [custom, setCustom] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      providers.map((p) => {
        const list = options[p.id] ?? []
        const cur = models[p.id] ?? ''
        return [p.id, list.length === 0 || (cur !== '' && !list.includes(cur))]
      }),
    ),
  )

  return (
    <div className="mx-auto max-w-[720px] px-10 py-14">
      <h1 className="display text-[26px] tracking-tight">设置</h1>

      <section className="mt-9">
        <Eyebrow>AI 后端</Eyebrow>
        <p className="mt-2 text-[14px] leading-relaxed text-[var(--text-faint)]">
          随时可切。所有环节共用同一个后端；每次调用都会留痕（角色、提示词、产出、耗时）。
          <br />
          任何环节都可以只复制提示词、拿到外部去跑 —— AI 后端不可用不会挡住工作流。
        </p>

        <div className="mt-4 space-y-2">
          {providers.map((p) => {
            const pr = probes[p.id]
            const on = sel === p.id
            return (
              <button
                key={p.id}
                onClick={() => {
                  setSel(p.id)
                  setSaved(false)
                }}
                className={cx(
                  'block w-full border p-4 text-left transition-colors',
                  on ? 'border-[var(--accent)]/50 bg-[var(--accent)]/5' : 'border-[var(--line-soft)] hover:border-[var(--line)]',
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={cx(
                      'h-[13px] w-[13px] flex-none rounded-full border transition-colors',
                      on ? 'border-[5px] border-[var(--accent)]' : 'border-[var(--line)]',
                    )}
                  />
                  <span className="text-[14px] font-medium">{p.label}</span>
                  <Chip tone={pr?.ok ? 'good' : 'mute'}>{pr?.ok ? '可用' : '不可用'}</Chip>
                  <span className="ml-auto truncate text-[12px] text-[var(--text-faint)]">{pr?.detail}</span>
                </div>
                <p className="ml-[23px] mt-1.5 text-[14px] leading-relaxed text-[var(--text-dim)]">{p.desc}</p>
                {on && (
                  <div className="ml-[23px] mt-3 flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[14px] text-[var(--text-faint)]">模型</span>
                    {(options[p.id] ?? []).length > 0 && !custom[p.id] ? (
                      <select
                        value={mdl[p.id] || p.defaultModel}
                        onChange={(e) => {
                          if (e.target.value === '__custom__') {
                            setCustom({ ...custom, [p.id]: true })
                            return
                          }
                          setMdl({ ...mdl, [p.id]: e.target.value })
                          setSaved(false)
                        }}
                        className="h-8 w-[240px] cursor-pointer rounded-[2px] border border-[var(--line)] bg-transparent px-2 text-[14px]"
                      >
                        {(options[p.id] ?? []).map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                        <option value="__custom__">自定义…</option>
                      </select>
                    ) : (
                      <>
                        <input
                          value={mdl[p.id] ?? ''}
                          onChange={(e) => {
                            setMdl({ ...mdl, [p.id]: e.target.value })
                            setSaved(false)
                          }}
                          placeholder={p.defaultModel}
                          className="field h-8 w-[240px]"
                        />
                        {(options[p.id] ?? []).length > 0 && (
                          <button
                            onClick={() => setCustom({ ...custom, [p.id]: false })}
                            className="text-[12px] text-[var(--accent)] hover:underline"
                          >
                            回到列表
                          </button>
                        )}
                      </>
                    )}
                    {p.id === 'ollama' && (options[p.id] ?? []).length === 0 && (
                      <span className="text-[12px] text-[var(--text-faint)]">
                        没读到本机模型，先 <code>ollama pull qwen3:8b</code>
                      </span>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button
            variant="solid"
            onClick={async () => {
              await saveSetting('ai.provider', sel)
              await saveSetting(`ai.model.${sel}`, mdl[sel] ?? '')
              setSaved(true)
            }}
          >
            保存
          </Button>
          {saved && <span className="text-[14px] text-[var(--color-celadon)]">已保存</span>}
        </div>

        {sel === 'anthropic-api' && !probes['anthropic-api']?.ok && (
          <p className="mt-4 border border-[var(--color-ochre)]/35 bg-[var(--color-ochre)]/6 px-4 py-3 text-[14px] leading-relaxed text-[var(--color-ochre)]">
            还没读到 ANTHROPIC_API_KEY。在项目根目录建 <code>.env.local</code>，写入{' '}
            <code>ANTHROPIC_API_KEY=sk-ant-...</code>，然后重启 dev server。
          </p>
        )}
      </section>

      <section className="mt-14">
        <Eyebrow>资产层</Eyebrow>
        <div className="mt-3 grid grid-cols-4 gap-px overflow-hidden border border-[var(--line-soft)] bg-[var(--line-soft)]">
          {[
            ['方法论卡', counts.craft],
            ['核心资源', counts.resources],
          ].map(([k, v]) => (
            <div key={k as string} className="bg-[var(--surface)] px-4 py-3">
              <div className="eyebrow">{k}</div>
              <div className="num mt-1 text-[18px] font-light">{v}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-[var(--text-faint)]">
          资产层是本系统自己的库存，全部存在仓库内的{' '}
          <code className="rounded-[2px] bg-[var(--bg-sunk)] px-1.5 py-0.5">seed/assets.json</code>，不依赖任何外部目录。
          <br />
          重建（覆盖资产层，保留规则的实战记录与全部项目数据）：
          <code className="ml-1.5 rounded-[2px] bg-[var(--bg-sunk)] px-1.5 py-0.5">npm run seed</code>
          <br />
          在图谱里人工补的边（origin=补充）不会被重建冲掉。
        </p>
      </section>
    </div>
  )
}
