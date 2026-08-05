import Link from 'next/link'
import { assets, projects, stageStore } from '@/lib/repo'
import { LAYERS, STAGES } from '@/lib/stages'
import { weightsOf } from '@/lib/route'
import { autosOf } from '@/lib/gate-ctx'
import { PipelineRibbon, ribbonCells } from '@/components/PipelineRibbon'
import { Eyebrow } from '@/components/ui'

export default function Home() {
  const books = projects.all()
  const rules = assets.rules()
  const edges = assets.edges()
  const stats = [
    { k: '规则', v: rules.length, s: `深度推演 ${rules.filter((r) => r.deep).length} · 可具身化 ${rules.filter((r) => r.embodiable).length}` },
    { k: '概念节点', v: assets.concepts().length, s: `${edges.length} 条因果边` },
    { k: '正／负反馈', v: `${edges.filter((e) => e.feedback === '正').length}／${edges.filter((e) => e.feedback === '负').length}`, s: '正反馈过采样，需人工补刹车' },
    { k: '方法论卡片', v: assets.craft().length, s: '全是可执行判据' },
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
          9 层 50 个环节，从选题、构建、叙事设计、结构、日更生产，一直到发布运营与完结收束。
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
        <Eyebrow>创作管线 · 9 层 50 环节</Eyebrow>
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
              从<Link href="/rulebase" className="text-[var(--accent)] hover:underline">规则库</Link>挑一条可写性 ✍5 的规则开始，或直接
              <Link href="/new" className="text-[var(--accent)] hover:underline">新建作品</Link>。
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
