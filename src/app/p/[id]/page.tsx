import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  cast,
  chapters,
  decisions,
  locks,
  metrics,
  projects,
  stageStore,
  threads,
  volumes,
} from '@/lib/repo'
import { LAYERS, STAGES, gateProgress } from '@/lib/stages'
import { weightsOf } from '@/lib/route'
import { autosOf } from '@/lib/gate-ctx'
import { GENRE_MAP } from '@/lib/genre'
import { PipelineRibbon, ribbonCells } from '@/components/PipelineRibbon'
import { Chip, Eyebrow } from '@/components/ui'
import ProjectHeader from './ProjectHeader'

export default async function ProjectOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const p = projects.get(id)
  if (!p) notFound()

  const states = stageStore.all(id)
  const weights = weightsOf(p)
  const autos = autosOf(id)
  const cells = ribbonCells(states, weights, autos)
  const chs = chapters.list(id)
  const ths = threads.list(id)
  const people = cast.list(id)
  const words = chs.reduce((s, c) => s + c.words, 0)
  const dec = decisions.list(id)
  const lk = locks.list(id)
  const ms = metrics.list(id)

  // 下一步：第一个门禁没过的环节
  const next = cells.find((c) => !c.passed && c.weight === '必经')
  const overdue = ths.filter(
    (t) => (t.status === '已埋设' || t.status === '已强化') && t.plan_ch != null && chs.length > t.plan_ch,
  )

  return (
    <div className="mx-auto max-w-[1000px] px-10 py-10">
      <ProjectHeader project={p} />

      {/* 管线 */}
      <section className="mt-9">
        <div className="flex items-baseline justify-between">
          <Eyebrow>创作管线</Eyebrow>
          <span className="num text-[12px] text-[var(--text-faint)]">
            必经 {cells.filter((c) => c.weight === '必经' && c.passed).length}/{cells.filter((c) => c.weight === '必经').length}
          </span>
        </div>
        <div className="mt-3">
          <PipelineRibbon cells={cells} projectId={id} height={34} showLayers />
        </div>
        {next && (
          <Link
            href={`/p/${id}/s/${next.stage.id}`}
            className="mt-4 flex items-center gap-3 border border-[var(--accent)]/30 bg-[var(--accent)]/5 px-4 py-3 transition-colors hover:bg-[var(--accent)]/8"
          >
            <span className="eyebrow" style={{ color: 'var(--accent)' }}>
              下一步
            </span>
            <span className="num text-[14px] text-[var(--text-faint)]">
              {String(next.stage.no).padStart(2, '0')}
            </span>
            <span className="text-[14px] font-medium">{next.stage.title}</span>
            <span className="min-w-0 flex-1 truncate text-[14px] text-[var(--text-dim)]">{next.stage.purpose}</span>
            <span className="num flex-none text-[12px] text-[var(--text-faint)]">
              {next.done}/{next.total}
            </span>
          </Link>
        )}
      </section>

      {/* 真相源 */}
      <section className="mt-10">
        <Eyebrow>真相源</Eyebrow>
        <div className="mt-3 grid grid-cols-4 gap-px overflow-hidden border border-[var(--line-soft)] bg-[var(--line-soft)]">
          {[
            { k: '人物', v: people.length, s: `主角 ${people.filter((x) => x.role === '主角').length} · 反派 ${people.filter((x) => x.role === '反派').length}`, href: `/p/${id}/s/d1-hero` },
            { k: '伏笔', v: ths.length, s: `未收 ${ths.filter((t) => t.status === '已埋设' || t.status === '已强化').length}${overdue.length ? ` · 逾期 ${overdue.length}` : ''}`, href: `/p/${id}/s/f3-threads` },
            {
              k: '卷 / 章',
              v: `${volumes.list(id).length} / ${chs.length}`,
              s: words > 0
                ? `${chs.filter((c) => c.words > 0).length} 章有正文 · ${(words / 10000).toFixed(1)} 万字`
                : chs.length
                  ? '正文待填'
                  : '未排事件线',
              href: `/p/${id}/s/f2-volume`,
            },
            { k: '已发布', v: chs.filter((c) => c.status === '已发布').length, s: ms.length ? `${ms.length} 章有数据` : '无数据', href: `/p/${id}/s/h2-metrics` },
          ].map((x) => (
            <Link key={x.k} href={x.href} className="bg-[var(--surface)] px-4 py-4 transition-colors hover:bg-[var(--bg-sunk)]">
              <div className="eyebrow">{x.k}</div>
              <div className="num mt-1.5 text-[26px] font-light leading-none">{x.v}</div>
              <div className="mt-2 truncate text-[12px] text-[var(--text-faint)]">{x.s}</div>
            </Link>
          ))}
        </div>
        {overdue.length > 0 && (
          <p className="mt-2.5 text-[12px] text-[var(--accent)]">
            {overdue.map((t) => t.fid).join('、')} 已过计划回收章还没收 —— 起点老白的头号差评来源。
          </p>
        )}
      </section>

      {/* 各层门禁 */}
      <section className="mt-10">
        <Eyebrow>门禁盘</Eyebrow>
        <div className="mt-3 space-y-3">
          {LAYERS.map((l) => {
            const ss = STAGES.filter((s) => s.layer === l.id)
            return (
              <div key={l.id} className="frame px-5 py-4">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-sm" style={{ background: `hsl(${l.hue} 46% 52%)` }} />
                  <span className="text-[14px] font-semibold">{l.title}</span>
                  <span className="text-[12px] text-[var(--text-faint)]">{l.desc}</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-x-6 gap-y-1.5">
                  {ss.filter((s) => weights[s.id] !== '不适用').map((s) => {
                    const g = gateProgress(s, states[s.id]?.gate ?? {}, autos)
                    return (
                      <Link
                        key={s.id}
                        href={`/p/${id}/s/${s.id}`}
                        className="group flex items-center gap-2 py-0.5"
                      >
                        <span className="num w-4 flex-none text-[12px] text-[var(--text-faint)]">{s.no}</span>
                        <span className="min-w-0 flex-1 truncate text-[14px] text-[var(--text-dim)] group-hover:text-[var(--text)]">
                          {s.title}
                        </span>
                        {g.passed ? (
                          <Chip tone="good">过</Chip>
                        ) : g.hardLeft ? (
                          <span className="num flex-none text-[12px] text-[var(--accent)]">硬{g.hardLeft}</span>
                        ) : (
                          <span className="num flex-none text-[12px] text-[var(--text-faint)]">
                            {g.done}/{g.total}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 锁定项 / 决策留痕 */}
      <section className="mt-10 grid grid-cols-2 gap-5">
        <div>
          <Eyebrow>锁定项 · 禁止修改</Eyebrow>
          {lk.length === 0 ? (
            <p className="mt-2.5 text-[14px] leading-relaxed text-[var(--text-faint)]">
              还没有锁定项。每章回写时若确立了"以后不能改"的关键设定（金手指规则、主角身世），应写进来。
            </p>
          ) : (
            <ul className="mt-2.5 space-y-1.5">
              {lk.map((x) => (
                <li key={x.id} className="text-[14px] leading-relaxed text-[var(--text-dim)]">
                  <span className="text-[var(--accent)]">·</span> {x.item}
                  {x.reason && <span className="ml-1.5 text-[12px] text-[var(--text-faint)]">{x.reason}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <Eyebrow>决策留痕</Eyebrow>
          {dec.length === 0 ? (
            <p className="mt-2.5 text-[14px] leading-relaxed text-[var(--text-faint)]">
              高风险动作（回改已发布正文 / 推翻既有裁决 / 动锁定项）必须留痕：动议 + 证据等级 + 先例 + 结论 + 签字。
              防的是委员会的记忆盲区——后续会话拿同级证据重提同一件事。
            </p>
          ) : (
            <ul className="mt-2.5 space-y-2">
              {dec.slice(0, 6).map((d) => (
                <li key={d.id} className="text-[14px] leading-relaxed">
                  <div className="flex items-center gap-1.5">
                    <Chip tone={d.signed ? 'good' : 'warn'}>{d.signed ? '已签字' : '待签'}</Chip>
                    <span className="text-[12px] text-[var(--text-faint)]">{d.kind}</span>
                    <span className="text-[12px] text-[var(--text-faint)]">{d.evidence}</span>
                  </div>
                  <div className="mt-0.5 text-[var(--text-dim)]">{d.motion}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
