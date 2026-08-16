import Link from 'next/link'
import { assets, projects, stageStore } from '@/lib/repo'
import { LAYERS, STAGES } from '@/lib/stages'
import { weightsOf } from '@/lib/route'
import { autosOf } from '@/lib/gate-ctx'
import { PipelineRibbon, ribbonCells } from '@/components/PipelineRibbon'
import { Eyebrow } from '@/components/ui'

export default function Home() {
  const books = projects.all()
  const stats = [
    { k: '环节', v: STAGES.length, s: `${LAYERS.length} 层，每层说清不做会死在哪里` },
    { k: '方法论卡片', v: assets.craft().length, s: '全是可执行判据' },
    { k: '自动判据', v: STAGES.flatMap((s) => s.gate.filter((g) => g.auto)).length, s: '系统从数据里算，人勾不动' },
    { k: '核心资源参考', v: assets.resources().length, s: '五要素：源头 / 路径 / 沉淀 / 黑市 / 类比' },
  ]

  return (
    <div className="mx-auto max-w-[1080px] px-10 py-14">
      {/* 题头 */}
      <header className="seat-y seat">
        <Eyebrow>AI 小说创作系统</Eyebrow>
        <h1 className="display mt-3 text-[40px] leading-[1.2]">
          一本书从 0 到完结的
          <br />
          <span className="text-[var(--accent)]">全环节创作工作台</span>
        </h1>
        <p className="mt-5 max-w-[560px] text-[14px] leading-[1.9] text-[var(--text-dim)]">
          10 层 46 个环节，从选题、构建、叙事设计、结构、日更生产，一直到发布运营与完结收束。
          <br />
          每个环节都说清：不做会死在哪里 · 具体怎么做 · 做到什么算够 · 最容易怎么做砸。
          <br />
          <span className="text-[var(--text-faint)]">
            平台 × 频道 × 类型三个参数决定你这本书走哪条路线——地图是全的，路是裁出来的。
          </span>
        </p>
      </header>

      <Link
        href="/overview"
        className="seat-y seat mt-6 inline-flex items-center gap-2 text-[14px] text-[var(--accent)] hover:underline"
        style={{ animationDelay: '40ms' }}
      >
        看系统全貌 · 三层构造 / 路线怎么裁 / 七条闭环 →
      </Link>

      {/* 资产盘 */}
      <div className="seat-y seat mt-14 grid grid-cols-4 gap-px overflow-hidden border border-[var(--line-soft)] bg-[var(--line-soft)]" style={{ animationDelay: '60ms' }}>
        {stats.map((s) => (
          <div key={s.k} className="bg-[var(--surface)] px-5 py-5">
            <div className="eyebrow">{s.k}</div>
            <div className="num mt-2 text-[28px] font-light leading-none tracking-tight">{s.v}</div>
            <div className="mt-2 text-[12px] leading-relaxed text-[var(--text-faint)]">{s.s}</div>
          </div>
        ))}
      </div>

      {/* 管线总览 */}
      <section className="seat-y seat mt-16" style={{ animationDelay: '120ms' }}>
        <Eyebrow>创作管线 · 10 层 46 环节</Eyebrow>
        <div className="mt-4 grid grid-cols-5 gap-3">
          {LAYERS.map((l) => {
            const ss = STAGES.filter((s) => s.layer === l.id)
            return (
              <div key={l.id} className="frame p-4">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-sm" style={{ background: `hsl(${l.hue} 46% 52%)` }} />
                  <span className="text-[14px] font-semibold">{l.title}</span>
                  <span className="num ml-auto text-[12px] text-[var(--text-faint)]">{ss.length}</span>
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-[var(--text-faint)]">{l.desc}</p>
                <ul className="mt-3 space-y-1">
                  {ss.map((s) => (
                    <li key={s.id} className="truncate text-[14px] text-[var(--text-dim)]">
                      <span className="num mr-1.5 text-[var(--text-faint)]">{String(s.no).padStart(2, '0')}</span>
                      {s.title}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </section>

      {/* 作品 */}
      <section className="seat-y seat mt-16" style={{ animationDelay: '180ms' }}>
        <div className="flex items-baseline justify-between">
          <Eyebrow>作品</Eyebrow>
          <Link href="/new" className="text-[14px] text-[var(--accent)] hover:underline">
            新建作品 →
          </Link>
        </div>

        {books.length === 0 ? (
          <div className="mt-4 border border-dashed border-[var(--line)] px-6 py-14 text-center">
            <p className="text-[14px] text-[var(--text-dim)]">还没有作品。</p>
            <p className="mt-1.5 text-[14px] text-[var(--text-faint)]">
              带着你手上那点东西——一个画面、一个人、一条设定、或者只是一个类型——
              <Link href="/new" className="text-[var(--accent)] hover:underline">新建作品</Link>，入口分诊会告诉你从哪一步切进去。
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-px overflow-hidden border border-[var(--line-soft)]">
            {books.map((b) => {
              const cells = ribbonCells(stageStore.all(b.id), weightsOf(b), autosOf(b.id))
              return (
                <div key={b.id} className="bg-[var(--surface)] px-5 py-4">
                  <div className="flex items-baseline gap-3">
                    <Link href={`/p/${b.id}`} className="text-[14px] font-medium hover:text-[var(--accent)]">
                      {b.title}
                    </Link>
                    <span className="text-[12px] text-[var(--text-faint)]">{b.platform}</span>
                    <span className="text-[12px] text-[var(--text-faint)]">{b.status}</span>
                    <span className="num ml-auto text-[12px] text-[var(--text-faint)]">
                      必经 {cells.filter((c) => c.weight === '必经' && c.passed).length}/{cells.filter((c) => c.weight === '必经').length}
                    </span>
                  </div>
                  {b.logline && (
                    <p className="mt-1.5 line-clamp-1 text-[14px] text-[var(--text-dim)]">{b.logline}</p>
                  )}
                  <div className="mt-3">
                    <PipelineRibbon cells={cells} projectId={b.id} height={20} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
