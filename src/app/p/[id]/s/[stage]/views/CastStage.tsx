'use client'

import { useState } from 'react'
import type { Character } from '@/lib/types'
import type { StageViewProps } from './GenericStage'
import StageFrame from '@/components/stage/StageFrame'
import { addCharacter, removeCharacter, updateCharacter } from '@/lib/actions'
import { Button, Chip, Eyebrow, cx } from '@/components/ui'

const ROLES = ['主角', '核心配角', '反派', '路人脸']
const STANCES = ['局外人', '内行人', '执行者']
const ATTITUDES = ['敬畏', '戏耍', '憎恨', '利用']
const STATUS = ['活跃', '重伤', '突破', '结盟', '死亡', '失踪', '废弃']

export default function CastStage({
  stage,
  projectId,
  state,
  cards,
  weight,
  autos,
  progress,
  people,
}: StageViewProps & { people: Character[] }) {
  const [sel, setSel] = useState<string | null>(people[0]?.id ?? null)
  const [name, setName] = useState('')
  const cur = people.find((p) => p.id === sel) ?? null

  const hero = people.find((p) => p.role === '主角')
  const faces = people.filter((p) => p.face_rank != null).sort((a, b) => (a.face_rank ?? 0) - (b.face_rank ?? 0))
  const incomplete = people.filter((p) => p.role !== '主角' && !(p.desire && p.weakness && p.resource_rel))

  return (
    <StageFrame
      stage={stage}
      projectId={projectId}
      gate={state.gate}
      cards={cards}
      weight={weight} autos={autos} progress={progress}
      aside={
        <section>
          <Eyebrow>阵容体检</Eyebrow>
          <div className="mt-2.5 space-y-2 text-[14px] leading-relaxed">
            <div className={hero?.stance ? 'text-[var(--text-dim)]' : 'text-[var(--accent)]'}>
              {hero ? (hero.stance ? `主角站位：${hero.stance}` : '主角未定站位') : '还没有主角'}
            </div>
            <div className="text-[var(--text-dim)]">
              打脸链 <span className="num">{faces.length}</span>/10 张脸
              {faces.length > 0 && faces.length < 10 && (
                <span className="text-[var(--text-faint)]">（立项时应排满前 10 张）</span>
              )}
            </div>
            <div className={incomplete.length ? 'text-[var(--accent)]' : 'text-[var(--text-dim)]'}>
              {incomplete.length
                ? `${incomplete.length} 人三件套未填齐`
                : '配角三件套全部填齐'}
            </div>
          </div>
          {faces.length > 0 && (
            <div className="mt-4">
              <Eyebrow>打脸链</Eyebrow>
              <div className="mt-2 space-y-1">
                {faces.map((f) => (
                  <div key={f.id} className="flex items-center gap-2 text-[14px]">
                    <span className="num w-4 text-[var(--text-faint)]">{f.face_rank}</span>
                    <span className="flex-1 truncate text-[var(--text-dim)]">{f.name}</span>
                    <span className="text-[12px] text-[var(--text-faint)]">{f.faction ?? ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="mt-4 text-[12px] leading-relaxed text-[var(--text-faint)]">
            配角三件套填完之后，配角在任何场景的反应都应可推导 —— 这就是防 OOC 的人物状态表本体，也是写正文时注入 L2 记忆的内容。
          </p>
        </section>
      }
    >
      <div className="flex gap-6">
        {/* 名册 */}
        <div className="w-[228px] flex-none">
          <div className="flex gap-1.5">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) {
                  addCharacter(projectId, name.trim(), people.length === 0 ? '主角' : '核心配角')
                  setName('')
                }
              }}
              placeholder="新增人物，回车"
              className="field h-8"
            />
          </div>
          <div className="mt-3 space-y-px">
            {ROLES.map((role) => {
              const list = people.filter((p) => p.role === role)
              if (!list.length) return null
              return (
                <div key={role} className="pb-2">
                  <div className="eyebrow px-1 pb-1 pt-2">{role}</div>
                  {list.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSel(p.id)}
                      className={cx(
                        'flex w-full items-center gap-2 rounded-[2px] px-2 py-1.5 text-left transition-colors',
                        sel === p.id ? 'bg-[var(--bg-sunk)]' : 'hover:bg-[var(--bg-sunk)]/60',
                      )}
                    >
                      <span className="num text-[12px] text-[var(--text-faint)]">{p.cid}</span>
                      <span className="min-w-0 flex-1 truncate text-[14px]">{p.name}</span>
                      {p.status !== '活跃' && <span className="text-[11px] text-[var(--text-faint)]">{p.status}</span>}
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        </div>

        {/* 档案 */}
        <div className="min-w-0 flex-1">
          {!cur ? (
            <p className="text-[14px] text-[var(--text-faint)]">左边新增一个人物开始。主角建议 C-001。</p>
          ) : (
            <div key={cur.id} className="seat max-w-[620px] space-y-5">
              <div className="flex items-center gap-2.5">
                <span className="num text-[14px] text-[var(--text-faint)]">{cur.cid}</span>
                <input
                  defaultValue={cur.name}
                  onBlur={(e) => updateCharacter(projectId, cur.id, { name: e.target.value })}
                  className="field h-8 w-[180px] text-[14px] font-medium"
                />
                <Button size="sm" variant="quiet" className="ml-auto" onClick={() => { removeCharacter(projectId, cur.id); setSel(null) }}>
                  删除
                </Button>
              </div>

              <Pills label="角色" options={ROLES} value={cur.role} onPick={(v) => updateCharacter(projectId, cur.id, { role: v })} />
              {cur.role === '主角' && (
                <>
                  <Pills
                    label="他与阻碍的关系"
                    options={STANCES}
                    value={cur.stance ?? ''}
                    onPick={(v) => updateCharacter(projectId, cur.id, { stance: v })}
                  />
                  <Pills
                    label="处世态度（人物弧光的坐标轴）"
                    options={ATTITUDES}
                    value={cur.attitude ?? ''}
                    onPick={(v) => updateCharacter(projectId, cur.id, { attitude: v })}
                  />
                </>
              )}
              <Pills label="状态" options={STATUS} value={cur.status} onPick={(v) => updateCharacter(projectId, cur.id, { status: v })} />

              <Area
                label="表层动机"
                hint="具体而小：救妹妹、还债、活过这个月 —— 让读者代入"
                v={cur.motive_surface}
                on={(v) => updateCharacter(projectId, cur.id, { motive_surface: v })}
              />
              <Area
                label="深层动机"
                hint="中期觉醒：改写规则本身 —— 让长篇升维。开局只给表层"
                v={cur.motive_deep}
                on={(v) => updateCharacter(projectId, cur.id, { motive_deep: v })}
              />

              <div className="border border-[var(--line-soft)] p-4">
                <Eyebrow>配角三件套</Eyebrow>
                <div className="mt-3 space-y-3">
                  <Area label="他要什么（欲望）" v={cur.desire} on={(v) => updateCharacter(projectId, cur.id, { desire: v })} />
                  <Area label="他怕什么（软肋）" v={cur.weakness} on={(v) => updateCharacter(projectId, cur.id, { weakness: v })} />
                  <Area
                    label="与主角的资源关系"
                    hint="他能给主角什么 / 要抢主角什么"
                    v={cur.resource_rel}
                    on={(v) => updateCharacter(projectId, cur.id, { resource_rel: v })}
                  />
                </div>
              </div>

              <Area
                label="⚠ 知道什么秘密"
                hint="一致性闸的关键字段 —— 审校时逐人核对，防止有人知道了他不该知道的事"
                v={cur.secrets}
                on={(v) => updateCharacter(projectId, cur.id, { secrets: v })}
              />

              <div className="grid grid-cols-3 gap-3">
                <Line label="阵营" v={cur.faction} on={(v) => updateCharacter(projectId, cur.id, { faction: v })} />
                <Line label="口癖" v={cur.tic} on={(v) => updateCharacter(projectId, cur.id, { tic: v })} />
                <Line
                  label="打脸链序号"
                  hint="第几张脸"
                  v={cur.face_rank?.toString() ?? ''}
                  on={(v) => updateCharacter(projectId, cur.id, { face_rank: v ? Number(v) : null })}
                />
              </div>

              <Area label="备注" v={cur.notes} on={(v) => updateCharacter(projectId, cur.id, { notes: v })} />

              {cur.role === '主角' && !cur.stance && (
                <div className="rounded-[2px] border border-[var(--accent)]/30 bg-[var(--accent)]/6 px-3.5 py-2.5 text-[14px] leading-relaxed text-[var(--accent)]">
                  主角还没定站位。三种站位对应完全不同的天然剧情：局外人（隐藏身份、被追捕、揭示身世）/ 内行人（信息差碾压、商战、打脸）/ 执行者（破案、清算、权力斗争）。
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </StageFrame>
  )
}

function Pills({
  label,
  options,
  value,
  onPick,
}: {
  label: string
  options: string[]
  value: string
  onPick: (v: string) => void
}) {
  return (
    <div>
      <div className="mb-1.5 text-[14px] font-medium">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onPick(o)}
            className={cx(
              'rounded-[2px] border px-2.5 py-1 text-[14px] transition-colors',
              value === o
                ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                : 'border-[var(--line)] text-[var(--text-dim)] hover:border-[var(--text-faint)]',
            )}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}

function Area({ label, hint, v, on }: { label: string; hint?: string; v: string | null; on: (v: string) => void }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline gap-2">
        <span className="text-[14px] font-medium">{label}</span>
        {hint && <span className="text-[12px] text-[var(--text-faint)]">{hint}</span>}
      </div>
      <textarea defaultValue={v ?? ''} onBlur={(e) => on(e.target.value)} rows={2} className="field resize-y" />
    </div>
  )
}

function Line({ label, hint, v, on }: { label: string; hint?: string; v: string | null; on: (v: string) => void }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline gap-1.5">
        <span className="text-[14px] font-medium">{label}</span>
        {hint && <span className="text-[12px] text-[var(--text-faint)]">{hint}</span>}
      </div>
      <input defaultValue={v ?? ''} onBlur={(e) => on(e.target.value)} className="field h-8" />
    </div>
  )
}

export { Chip }
