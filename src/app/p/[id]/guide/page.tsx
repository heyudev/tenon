import Link from 'next/link'
import { notFound } from 'next/navigation'
import { projects, stageStore } from '@/lib/repo'
import { LAYER_MAP, STAGES, gateProgress, isSequential } from '@/lib/stages'
import { weightsOf, venueOf } from '@/lib/route'
import { autosOf } from '@/lib/gate-ctx'
import { GENRE_MAP, ENTRIES } from '@/lib/genre'
// 注意：cx 出自 'use client' 的 ui.tsx，服务端组件不能调用它（类型检查发现不了，运行时 500）
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

  // 「接下来」按当前目标排：没动笔之前，通往动笔的那几项排前面，
  // 否则会出现「推荐做 07，列表却从 06 开头」这种自相矛盾的观感
  const upcoming = pending
    .filter((x) => x.s.id !== next?.s.id)
    .sort((a, b) => (mvReady ? 0 : Number(!!b.s.minViable) - Number(!!a.s.minViable)))
    .slice(0, 5)
  const blockers = next ? next.s.needs.filter((d) => !passedIds.has(d) && weights[d] !== '不适用') : []

  // 只有一个目标：没动笔之前，一切都为「能写第一章」服务；动笔之后才谈全路线。
  const goal = mvReady ? 'core' : 'draft'
  const mvLeft = mv.filter((x) => !x.g.passed)
  // 访谈是否已经做过：核心创意那三个种子字段有值就算做过。
  // 不能用「最小可动笔进度」判断——门禁全是人工硬项，访谈填完数据进度仍是 0，
  // 那样会一直推荐已经做完的事。
  const coreData = (states['b9-core']?.data ?? {}) as Record<string, unknown>
  const interviewed = ['scene', 'want', 'block'].some(
    (k) => typeof coreData[k] === 'string' && (coreData[k] as string).trim(),
  )

  const why = (x: typeof next) => {
    if (!x) return ''
    if (x.s.minViable)
      return `这是「最小可动笔集合」里还没过的第一项。这个集合还差 ${mvLeft.length} 项，齐了就能写第一章。`
    if (blockers.length)
      return '它是路线上下一个必经环节。上游那几项还没过，但不挡你——它们定下来之后回头复核一次就行。'
    return '它是路线上下一个必经环节，上游依赖都已满足。'
  }

  /** 门禁里有几项是系统从数据里算的——把它和"人要勾的"分开说，否则数字看着像自己填过 */
  const autoCount = (x: typeof next) => (x ? x.s.gate.filter((g) => g.auto).length : 0)

  return (
    <div className="mx-auto max-w-[760px] px-10 py-12">
      <Eyebrow>引导模式</Eyebrow>
      <h1 className="display mt-3 text-[26px]">
        {goal === 'draft' ? `离动笔还差 ${mvLeft.length} 步` : '可以写第一章了'}
      </h1>

      {/* 主指标只有一个：当前目标的进度。其余降级为一行小字，不跟它抢注意力 */}
      <div className="mt-5 border border-[var(--line-soft)] bg-[var(--surface)] px-5 py-4">
        <div className="flex items-baseline gap-2.5">
          <span className="eyebrow">{goal === 'draft' ? '最小可动笔集合' : '本书必经环节'}</span>
          <span className="num ml-auto text-[18px] font-light">
            {goal === 'draft' ? `${mvPassed}/${mv.length}` : `${corePassed}/${core.length}`}
          </span>
        </div>
        <div className="mt-2.5 flex gap-px overflow-hidden">
          {(goal === 'draft' ? mv : core).map((x) => (
            <span
              key={x.s.id}
              title={`${x.s.title}${x.g.passed ? '（已过）' : ''}`}
              className="h-1.5 flex-1"
              style={{
                background: x.g.passed
                  ? goal === 'draft'
                    ? 'var(--accent)'
                    : 'var(--color-celadon)'
                  : 'var(--line)',
              }}
            />
          ))}
        </div>
        <p className="mt-2.5 text-[12px] leading-relaxed text-[var(--text-faint)]">
          {goal === 'draft' ? (
            <>这 {mv.length} 步齐了就能写第一章。其余 {inRoute.length - mv.length} 个环节都可以边写边补。</>
          ) : (
            <>动笔所需的都齐了。剩下的是让这本书走得更远的环节，不挡你更新。</>
          )}
        </p>
      </div>

      {/* 门槛一过，这件事就该是全页最响的——别让人还得自己找「那我现在能写了吗」 */}
      {mvReady && (
        <div className="mt-4 border border-[var(--color-celadon)] bg-[var(--color-celadon)]/8 p-6">
          <h2 className="text-[18px] font-semibold tracking-tight">动笔所需的都齐了，现在可以写第一章</h2>
          <p className="mt-2 text-[14px] leading-[1.8] text-[var(--text-dim)]">
            类型契约、核心创意、卖点、金手指、主角、视角、文风都定死了。
            剩下 {inRoute.length - mv.length} 个环节全部可以边写边补——而且开篇试水的真实数据，
            反过来还会推翻你现在的一部分设定，所以先写比先补更划算。
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Link
              href={`/p/${id}/write`}
              className="rounded-[2px] border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 text-[14px] font-medium text-[var(--on-accent)]"
            >
              去日更台写第一章 →
            </Link>
            <Link href={`/p/${id}/s/e4-opening`} className="text-[14px] text-[var(--text-dim)] hover:text-[var(--text)]">
              先比几版开篇方案
            </Link>
          </div>
        </div>
      )}

      {/* 把 7 步摊开编号：哪几步做完了、下一步是哪个、每步做完得到什么，一眼看全 */}
      {goal === 'draft' && (
        <ol className="mt-3 space-y-px overflow-hidden border border-[var(--line-soft)]">
          {mv.map((x, i) => {
            const isNext = x.s.id === next?.s.id
            return (
              <li key={x.s.id}>
                <Link
                  href={`/p/${id}/s/${x.s.id}`}
                  className={
                    'flex items-center gap-3 px-4 py-2.5 transition-colors ' +
                    (isNext ? 'bg-[var(--accent)]/8' : 'bg-[var(--surface)] hover:bg-[var(--bg-sunk)]')
                  }
                >
                  <span
                    className={
                      'num flex h-5 w-5 flex-none items-center justify-center rounded-full text-[11px] ' +
                      (x.g.passed
                        ? 'bg-[var(--accent)] text-[var(--on-accent)]'
                        : isNext
                          ? 'border border-[var(--accent)] text-[var(--accent)]'
                          : 'border border-[var(--line)] text-[var(--text-faint)]')
                    }
                  >
                    {x.g.passed ? '✓' : i + 1}
                  </span>
                  <span
                    className={
                      'flex-none text-[14px] ' +
                      (x.g.passed ? 'text-[var(--text-faint)] line-through' : '')
                    }
                  >
                    {x.s.title}
                  </span>
                  {isNext && <Chip tone="accent">下一步</Chip>}
                  <span className="min-w-0 flex-1 truncate text-[12px] text-[var(--text-faint)]">{x.s.output}</span>
                  <span className="num flex-none text-[12px] text-[var(--text-faint)]">
                    {x.g.done}/{x.g.total}
                  </span>
                </Link>
              </li>
            )
          })}
        </ol>
      )}

      <p className="mt-2.5 text-[12px] leading-relaxed text-[var(--text-faint)]">
        阵地：{venue.name}　类型：{genre?.name ?? '未定'}　本书路线 {inRoute.length} 环节（全图{' '}
        {STAGES.length}，裁掉 {STAGES.length - inRoute.length}）
        {goal === 'draft' && `　必经 ${corePassed}/${core.length}`}
      </p>

      {/* 访谈做完之后，门禁还得人一条条过——这时候要说的是「去过门禁」，不能还推访谈 */}
      {goal === 'draft' && interviewed && (
        <div className="mt-7 border border-[var(--color-celadon)]/35 bg-[var(--color-celadon)]/5 px-5 py-4">
          <div className="text-[14px] font-medium">草稿已经填进去了</div>
          <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--text-dim)]">
            接下来是<strong>你</strong>的活：逐个环节看一眼，把门禁勾掉。带「系统判」的那些不用管，它们从数据里自己算；
            剩下的是只有你能判的——够不够狠、愿不愿意点下一章。不同意草稿的地方直接改，这本来就是草稿。
          </p>
        </div>
      )}

      {/* 两种开书方式，并排摆出来由人选。互不替代：访谈是另一条独立的路，不是正常流程的加速器 */}
      {goal === 'draft' && mvPassed === 0 && !interviewed && (
        <section className="mt-7">
          <Eyebrow>两种开书方式，挑一种</Eyebrow>
          <div className="mt-2.5 grid gap-2.5 md:grid-cols-2">
            <Link
              href={`/p/${id}/interview`}
              className="flex flex-col border border-[var(--accent)] bg-[var(--accent)]/6 p-5 transition-colors hover:bg-[var(--accent)]/10"
            >
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-semibold">开书访谈</span>
                <Chip tone="accent">快</Chip>
              </div>
              <p className="mt-2 flex-1 text-[14px] leading-[1.8] text-[var(--text-dim)]">
                回答 4 个问题：那个画面、他要什么、什么挡着他、想要什么文风。
                其余 20 多项由 AI 补成草稿，你逐组审——不用对着空框写。
              </p>
              <p className="mt-2.5 text-[12px] leading-relaxed text-[var(--text-faint)]">
                适合：脑子里已经有个人和一个处境，想快点开写。
                <br />
                草稿仍要你过目采纳，之后照样逐环节勾门禁。
              </p>
              <span className="mt-3 text-[14px] font-medium text-[var(--accent)]">开始访谈 →</span>
            </Link>

            <Link
              href={`/p/${id}/s/${mv[0]?.s.id ?? 'b2-genre'}`}
              className="flex flex-col border border-[var(--line)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--text-faint)]"
            >
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-semibold">逐环节自己填</span>
                <Chip tone="mute">细</Chip>
              </div>
              <p className="mt-2 flex-1 text-[14px] leading-[1.8] text-[var(--text-dim)]">
                按 {mv.length} 步顺序走，每步都有「不做会死在哪里 / 怎么做 / 做到什么算够」。
                每个字段自己定，AI 只在你点它的时候出手。
              </p>
              <p className="mt-2.5 text-[12px] leading-relaxed text-[var(--text-faint)]">
                适合：想法还没定型，或者想借这套判据把它想清楚。
              </p>
              <span className="mt-3 text-[14px] font-medium">从第 1 步开始 →</span>
            </Link>
          </div>
        </section>
      )}

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
              {autoCount(next) > 0 && `（${autoCount(next)} 项系统判）`}
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
              照常做这一项，不用等
              {blockers.map((b) => STAGES.find((s) => s.id === b)?.title).join('、')}
              ——它还没过，但只影响细节不影响你现在能不能动手；等它定了回头扫一眼这里就行。
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
      {null}

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
        入口分诊的六种起点见
        <Link href="/new" className="mx-1 text-[var(--accent)]">
          新建作品
        </Link>
        ：{ENTRIES.map((e) => e.label).join(' · ')}
      </p>
    </div>
  )
}
