import Link from 'next/link'
import { notFound } from 'next/navigation'
import { projects, stageStore } from '@/lib/repo'
import { LAYER_MAP, STAGES, gateProgress, isSequential } from '@/lib/stages'
import { weightsOf, venueOf } from '@/lib/route'
import { autosOf } from '@/lib/gate-ctx'
import { GENRE_MAP, ENTRIES } from '@/lib/genre'
import { Chip, Eyebrow } from '@/components/ui'

/**
 * 引导模式：一次只回答一个问题——**我现在该做什么**。
 * 全部环节摊开会劝退；这里按依赖与路线算出下一步，并说清为什么是它。
 */
export default async function GuidePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const p = projects.get(id)
  if (!p) notFound()

  const states = stageStore.all(id)
  const weights = weightsOf(p)
  const autos = autosOf(id)
  const venue = venueOf(p)
  const genre = p.genre ? GENRE_MAP[p.genre] : null

  const items = STAGES.map((s) => {
    const g = gateProgress(s, states[s.id]?.gate ?? {}, autos)
    return { s, g, weight: weights[s.id], started: states[s.id]?.status !== '未开始' }
  })

  const inRoute = items.filter((x) => x.weight !== '不适用')
  // 必经进度只算顺序主干：作者层与协议层不参与排序，也不计入进度
  const core = items.filter((x) => x.weight === '必经' && isSequential(x.s))
  const corePassed = core.filter((x) => x.g.passed).length
  const mv = items.filter((x) => x.s.minViable)
  const mvPassed = mv.filter((x) => x.g.passed).length
  const mvReady = mvPassed === mv.length

  const passedIds = new Set(items.filter((x) => x.g.passed).map((x) => x.s.id))
  const byId = new Map(STAGES.map((s) => [s.id, s]))
  // 依赖满足：已过 / 这本书用不上 / 跨书资产（永不挡路）
  const ready = (dep: string[]) =>
    dep.every((d) => {
      if (passedIds.has(d) || weights[d] === '不适用') return true
      const ds = byId.get(d)
      return !!ds && !isSequential(ds)
    })

  // 下一步只在顺序主干里找：优先「最小可动笔且依赖已满足」，其次「必经且依赖已满足」
  const pending = inRoute.filter((x) => !x.g.passed && isSequential(x.s))
  const next =
    pending.find((x) => x.s.minViable && ready(x.s.needs)) ??
    pending.find((x) => x.weight === '必经' && ready(x.s.needs)) ??
    pending.find((x) => x.weight === '必经') ??
    pending[0]

  const upcoming = pending.filter((x) => x.s.id !== next?.s.id).slice(0, 5)
  const blockers = next ? next.s.needs.filter((d) => !passedIds.has(d) && weights[d] !== '不适用') : []

  const why = (x: typeof next) => {
    if (!x) return ''
    if (x.s.minViable) return '它属于「最小可动笔集合」——这些齐了你就能写第一章，不必等其余环节'
    if (blockers.length) return '它是路线上下一个必经环节；上游还有没过的，但可以先动手'
    return '它是路线上下一个必经环节，且上游依赖都已满足'
  }

  return (
    <div className="mx-auto max-w-[760px] px-10 py-12">
      <Eyebrow>引导模式</Eyebrow>
      <h1 className="display mt-3 text-[26px]">
        {mvReady ? '可以写第一章了' : '你现在该做这个'}
      </h1>

      {/* 全局进度 */}
      <div className="mt-5 grid grid-cols-3 gap-px overflow-hidden border border-[var(--line-soft)] bg-[var(--line-soft)]">
        {[
          {
            k: '最小可动笔',
            v: `${mvPassed}/${mv.length}`,
            s: mvReady ? '齐了' : '齐了就能写第一章',
            tone: mvReady ? 'var(--color-celadon)' : 'var(--accent)',
          },
          { k: '必经环节', v: `${corePassed}/${core.length}`, s: '本书路线', tone: 'var(--text)' },
          {
            k: '路线规模',
            v: `${inRoute.length}`,
            s: `全图 ${STAGES.length} · 裁掉 ${STAGES.length - inRoute.length}`,
            tone: 'var(--text)',
          },
        ].map((x) => (
          <div key={x.k} className="bg-[var(--surface)] px-4 py-3.5">
            <div className="eyebrow">{x.k}</div>
            <div className="num mt-1.5 text-[26px] font-light leading-none" style={{ color: x.tone }}>
              {x.v}
            </div>
            <div className="mt-1.5 text-[12px] text-[var(--text-faint)]">{x.s}</div>
          </div>
        ))}
      </div>

      <p className="mt-2.5 text-[12px] leading-relaxed text-[var(--text-faint)]">
        阵地：{venue.name}　类型：{genre?.name ?? '未定'}
        —— 这两个决定了路线怎么裁。地图是全的，路是裁出来的。
      </p>

      {/* 当前该做的 */}
      {next ? (
        <Link
          href={`/p/${id}/s/${next.s.id}`}
          className="mt-7 block border border-[var(--accent)]/35 bg-[var(--accent)]/5 p-6 transition-colors hover:bg-[var(--accent)]/8"
        >
          <div className="flex items-center gap-2.5">
            <span
              className="h-2 w-2 rounded-sm"
              style={{ background: `hsl(${LAYER_MAP[next.s.layer].hue} 46% 52%)` }}
            />
            <span className="text-[12px] text-[var(--text-faint)]">{LAYER_MAP[next.s.layer].title}</span>
            <span className="num text-[12px] text-[var(--text-faint)]">
              {String(next.s.no).padStart(2, '0')}
            </span>
            {next.s.minViable && <Chip tone="warn">最小可动笔</Chip>}
            {next.weight === '增强' && <Chip tone="mute">增强</Chip>}
            <span className="num ml-auto text-[12px] text-[var(--text-faint)]">
              门禁 {next.g.done}/{next.g.total}
            </span>
          </div>
          <h2 className="mt-2.5 text-[18px] font-semibold tracking-tight">{next.s.title}</h2>
          <p className="mt-2 text-[14px] leading-[1.8] text-[var(--text-dim)]">{next.s.purpose}</p>

          <div className="mt-4 border-l-2 border-[var(--accent)]/40 pl-3.5">
            <div className="eyebrow" style={{ color: 'var(--accent)' }}>
              为什么是它
            </div>
            <p className="mt-1 text-[14px] leading-relaxed text-[var(--text-dim)]">{why(next)}</p>
          </div>

          <div className="mt-4">
            <Eyebrow>做完之后你会有</Eyebrow>
            <p className="mt-1 text-[14px] text-[var(--text-dim)]">{next.s.output}</p>
          </div>

          {blockers.length > 0 && (
            <p className="mt-3 text-[12px] leading-relaxed text-[var(--color-ochre)]">
              上游还没过：{blockers.map((b) => STAGES.find((s) => s.id === b)?.title).join('、')}
              —— 可以先动手，但这几项定下来后要回头复核。
            </p>
          )}

          <div className="mt-4 text-[14px] font-medium text-[var(--accent)]">开始做 →</div>
        </Link>
      ) : (
        <div className="mt-7 border border-[var(--color-celadon)]/35 bg-[var(--color-celadon)]/5 p-6">
          <h2 className="text-[18px] font-medium">路线上的必经环节都过了</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-[var(--text-dim)]">
            接下来是日更主循环：brief → 正文 → 润色 → 门禁 → 回写，逐章推进。
          </p>
          <Link href={`/p/${id}/write`} className="mt-4 inline-block text-[14px] font-medium text-[var(--accent)]">
            去日更台 →
          </Link>
        </div>
      )}

      {/* 可以动笔了 */}
      {mvReady && (
        <div className="mt-4 border border-[var(--color-celadon)]/35 bg-[var(--color-celadon)]/5 px-5 py-4">
          <div className="text-[14px] font-medium">最小可动笔集合已齐</div>
          <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--text-dim)]">
            类型契约、核心创意、卖点、金手指、主角、视角、文风都定了——现在就可以写第一章。
            剩下的环节可以边写边补，开篇试水的结果反过来还会改设定。
          </p>
          <Link href={`/p/${id}/s/e4-opening`} className="mt-2.5 inline-block text-[14px] font-medium text-[var(--accent)]">
            去写开篇方案 →
          </Link>
        </div>
      )}

      {/* 接下来 */}
      {upcoming.length > 0 && (
        <section className="mt-9">
          <Eyebrow>接下来</Eyebrow>
          <div className="mt-2.5 space-y-px overflow-hidden border border-[var(--line-soft)]">
            {upcoming.map((x) => (
              <Link
                key={x.s.id}
                href={`/p/${id}/s/${x.s.id}`}
                className="flex items-center gap-2.5 bg-[var(--surface)] px-4 py-2.5 transition-colors hover:bg-[var(--bg-sunk)]"
              >
                <span
                  className="h-1.5 w-1.5 flex-none rounded-sm"
                  style={{ background: `hsl(${LAYER_MAP[x.s.layer].hue} 46% 52%)` }}
                />
                <span className="num w-6 flex-none text-[12px] text-[var(--text-faint)]">
                  {String(x.s.no).padStart(2, '0')}
                </span>
                <span className="flex-none text-[14px]">{x.s.title}</span>
                {x.s.minViable && <span className="flex-none text-[11px] text-[var(--accent)]">●</span>}
                <span className="min-w-0 flex-1 truncate text-[12px] text-[var(--text-faint)]">
                  {x.s.purpose}
                </span>
                <span className="num flex-none text-[12px] text-[var(--text-faint)]">
                  {x.g.done}/{x.g.total}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 随时可用 */}
      <section className="mt-9">
        <Eyebrow>随时可用</Eyebrow>
        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
          <Link href={`/p/${id}/s/x-rescue`} className="border border-[var(--line-soft)] p-3.5 transition-colors hover:border-[var(--line)]">
            <div className="text-[14px] font-medium">卡文救火</div>
            <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-faint)]">
              写不下去了。先分类卡点，再回对应的上游环节补——硬写只会写出水章。
            </p>
          </Link>
          <Link href={`/p/${id}/s/x-risk`} className="border border-[var(--line-soft)] p-3.5 transition-colors hover:border-[var(--line)]">
            <div className="text-[14px] font-medium">风险合规扫描</div>
            <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-faint)]">
              立项时扫核心设定，每卷扫内容。写完才发现过不了审是最贵的返工。
            </p>
          </Link>
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-[var(--text-faint)]">
          作者层（能力盘 / 素材库 / 拆书库 / 复用资产 / 产能排期）是跨书常驻的资产池，
          随手可加、永不挡路，不计入本书的必经环节。
        </p>
      </section>

      <p className="mt-8 text-[12px] leading-relaxed text-[var(--text-faint)]">
        入口分诊的五种起点见
        <Link href="/new" className="mx-1 text-[var(--accent)]">
          新建作品
        </Link>
        ：{ENTRIES.map((e) => e.label).join(' · ')}
      </p>
    </div>
  )
}
