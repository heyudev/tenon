import Link from 'next/link'
import { assets, projects } from '@/lib/repo'
import { LAYERS, STAGES, MIN_VIABLE, isSequential } from '@/lib/stages'
import { ARCHETYPES, CHANNELS, ENTRIES, GENRES } from '@/lib/genre'
import { DIMENSIONS, OPERATORS, VENUES } from '@/lib/platform'
import { GLOSSARY } from '@/lib/glossary'
import { CHECKS } from '@/lib/checks'
import { Chip, Eyebrow } from '@/components/ui'

/**
 * 读数据库的页面必须每次请求现算。
 * Next 默认会把它静态预渲染，把「构建那一刻的库内容」烤进 HTML——
 * 新建的书不出现、删掉的还在，用起来像坏了。
 */
export const dynamic = 'force-dynamic'

/** 系统全貌：一页看完这台机器由什么构成、怎么咬合 */
export default function OverviewPage() {
  const craft = assets.craft()
  const books = projects.all()

  const gateItems = STAGES.flatMap((s) => s.gate)
  const autoGates = gateItems.filter((g) => g.auto).length
  const hardGates = gateItems.filter((g) => g.hard).length
  const seq = STAGES.filter(isSequential)

  return (
    <div className="mx-auto max-w-[1000px] px-10 py-12">
      <Eyebrow>系统全貌</Eyebrow>
      <h1 className="display mt-3 text-[28px] leading-tight">
        这台机器由三层构成
      </h1>
      <p className="mt-3 max-w-[640px] text-[14px] leading-[1.9] text-[var(--text-dim)]">
        资产层是跨书共享的库存，框架层是一张完整的地图，项目层是从地图上裁出来的一条路。
        <br />
        <span className="text-[var(--text-faint)]">
          三个参数（阵地 × 频道 × 类型）决定怎么裁；门禁决定哪一步算走完了。
        </span>
      </p>

      {/* ── 三层构造 ── */}
      <section className="mt-10 space-y-3">
        <Tier
          n="资产层"
          sub="跨书共享 · 一次建好，本本都用"
          hue={265}
          items={[
            { t: '核心资源参考', v: `${assets.resources().length} 种`, d: '五要素：产生源头 / 流动路径 / 沉淀形态 / 黑市形态 / 世界观类比' },
            { t: '阵地库', v: `${VENUES.length} 阵地 / ${Object.keys(OPERATORS).length} 运营商`, d: `${DIMENSIONS.length} 个维度的运营全景，会变的数值只标"你要去查什么"`, href: '/platforms' },
            { t: '方法论库', v: `${craft.length} 张卡`, d: '全是可执行判据：阈值 / 决策流程 / 失效模式', href: '/craft' },
            { t: '术语表', v: `${GLOSSARY.length} 条`, d: '这套系统的黑话。环节页会自动列出本环节出现过的词', href: '/glossary' },
          ]}
        />

        <Arrow label="资产层供料给框架层：选规则、查判据、对阵地参数" />

        <Tier
          n="框架层"
          sub={`一张完整的地图 · ${LAYERS.length} 层 ${STAGES.length} 环节`}
          hue={8}
          items={[
            { t: '环节', v: `${STAGES.length} 个`, d: `每个都答五件事：不做会死在哪里 / 怎么做 / 做到什么算够 / 常见错法 / 产出什么` },
            { t: '门禁', v: `${gateItems.length} 条`, d: `其中硬项 ${hardGates} 条、系统自动判定 ${autoGates} 条（判定器 ${Object.keys(CHECKS).length} 个）` },
            { t: '最小可动笔集合', v: `${MIN_VIABLE.length} 项`, d: '这些齐了就能写第一章，不必等全部环节填完' },
            { t: '顺序主干', v: `${seq.length} 个`, d: '作者层（跨书资产池）与协议层（随时可触发）不参与排序，永不挡路' },
          ]}
        />

        <Arrow label="三个参数把地图裁成路：必经 / 增强 / 不适用" />

        <Tier
          n="项目层"
          sub={`每本书自己的一条路 · 当前 ${books.length} 本`}
          hue={168}
          items={[
            { t: '真相源', v: '人物 / 伏笔 / 卷章 / 锁定项', d: '写第 200 章时读的是它，不是前 199 章' },
            { t: '日更主循环', v: 'brief → 正文 → 润色 → 门禁 → 回写', d: '五角色流水线 + 分层记忆 L0–L4' },
            { t: '数据回路', v: '数据 → 诊断 → 调整', d: '三个杠杆按成本排序：回改已发 / 调未发 / 调卷计划' },
          ]}
        />
      </section>

      {/* ── 参数如何裁剪 ── */}
      <section className="mt-14">
        <Eyebrow>路线是怎么裁出来的</Eyebrow>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            {
              t: '阵地',
              n: VENUES.length,
              d: '运营商 × 频道，是一个单元不是两个选项。定商业模型、字数、爽点红线、定生死的窗口',
              e: VENUES.slice(0, 4).map((v) => v.name).join(' · ') + ' …',
            },
            {
              t: '频道',
              n: Object.keys(CHANNELS).length,
              d: '读者契约。差别不在主角性别，在"什么算爽"和"什么是雷"',
              e: '男频：事业线主轴，感情线配菜　女频：情感线与事业线双主轴',
            },
            {
              t: '类型',
              n: GENRES.length,
              d: `归到 ${ARCHETYPES.length} 种路线原型，决定哪些环节必经、哪些增强、哪些用不上`,
              e: ARCHETYPES.map((a) => a.label).join(' · '),
            },
          ].map((x) => (
            <div key={x.t} className="frame-thin p-4">
              <div className="flex items-baseline gap-2">
                <span className="text-[14px] font-semibold">{x.t}</span>
                <span className="num text-[18px] font-light text-[var(--accent)]">{x.n}</span>
              </div>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--text-dim)]">{x.d}</p>
              <p className="mt-2 text-[12px] leading-relaxed text-[var(--text-faint)]">{x.e}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-[var(--text-faint)]">
          举例：年代文（轻设定＋重人物）会裁掉力量体系、资源系统、历史时间线；玄幻修仙（重成长＋重设定）一个都不裁。
          <span className="text-[var(--text-dim)]">地图是全的，路是裁出来的。</span>
        </p>
      </section>

      {/* ── 全流程地图 ── */}
      <section className="mt-14">
        <div className="flex items-baseline justify-between">
          <Eyebrow>全流程地图</Eyebrow>
          <span className="text-[12px] text-[var(--text-faint)]">
            <span className="text-[var(--accent)]">●</span> 最小可动笔集合
          </span>
        </div>
        <div className="mt-4 space-y-2">
          {LAYERS.map((l) => {
            const ss = STAGES.filter((s) => s.layer === l.id)
            return (
              <div key={l.id} className="flex gap-4 border-b border-[var(--line-soft)] pb-2 last:border-0">
                <div className="w-[110px] flex-none pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-sm" style={{ background: `hsl(${l.hue} 46% 52%)` }} />
                    <span className="text-[14px] font-semibold">{l.title}</span>
                    <span className="num text-[11px] text-[var(--text-faint)]">{ss.length}</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-faint)]">
                    {l.id === 'author' ? '跨书常驻 · 永不挡路' : l.id === 'protocol' ? '横切 · 随时可触发' : ''}
                  </p>
                </div>
                <div className="flex min-w-0 flex-1 flex-wrap gap-x-3 gap-y-1 pt-0.5">
                  {ss.map((s) => (
                    <span key={s.id} className="text-[14px] text-[var(--text-dim)]">
                      <span className="num mr-1 text-[11px] text-[var(--text-faint)]">
                        {String(s.no).padStart(2, '0')}
                      </span>
                      {s.title}
                      {s.minViable && <span className="ml-0.5 text-[11px] text-[var(--accent)]">●</span>}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── 入口分诊 ── */}
      <section className="mt-14">
        <Eyebrow>五种入口</Eyebrow>
        <p className="mt-1.5 text-[14px] text-[var(--text-faint)]">
          作者到达时手上有什么是不一样的。走错入口不会错，但会绕远路。
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {ENTRIES.map((e) => (
            <div key={e.id} className="border border-[var(--line-soft)] px-3.5 py-2.5">
              <div className="text-[14px] font-medium">{e.label}</div>
              <div className="mt-1 text-[12px] leading-relaxed text-[var(--text-faint)]">{e.path}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 七条回路 ── */}
      <section className="mt-14">
        <Eyebrow>七条闭环</Eyebrow>
        <p className="mt-1.5 text-[14px] text-[var(--text-faint)]">
          单向流水线是幻觉。真实创作是反复回头的——框架必须让人回得去。
        </p>
        <div className="mt-3 space-y-px overflow-hidden border border-[var(--line-soft)]">
          {[
            ['日更循环', 'brief → 正文 → 润色 → 门禁 → 回写 → 下一章', '每章'],
            ['章级数据回路', '数据异常 → 诊断 → 调排期 / 改 brief', '48h 生效'],
            ['开篇回路', '前三章数据差 → 重写开篇方案', '免费平台可回改已发'],
            ['卷回路', '卷末复盘 → 修订下一卷卷纲', '每卷'],
            ['设定回路', '写不动 / 审校发现设定不够用 → 回补世界与人物', '随时'],
            ['卡文回路', '卡文救火协议 → 定位卡点 → 回对应上游环节', '随时'],
            ['书回路', '完结收束 → 资产回流 → 世界观派生 → 下一本', '完本'],
          ].map(([a, b, c]) => (
            <div key={a} className="flex items-baseline gap-3 bg-[var(--surface)] px-4 py-2.5">
              <span className="w-[92px] flex-none text-[14px] font-medium">{a}</span>
              <span className="min-w-0 flex-1 text-[14px] text-[var(--text-dim)]">{b}</span>
              <span className="flex-none text-[12px] text-[var(--text-faint)]">{c}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── 门禁体系 ── */}
      <section className="mt-14">
        <Eyebrow>门禁分两类</Eyebrow>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="border border-[var(--color-celadon)]/30 bg-[var(--color-celadon)]/5 p-4">
            <div className="flex items-baseline gap-2">
              <span className="text-[14px] font-semibold">可判定项</span>
              <span className="num text-[18px] font-light" style={{ color: 'var(--color-celadon)' }}>
                {autoGates}
              </span>
            </div>
            <p className="mt-2 text-[14px] leading-relaxed text-[var(--text-dim)]">
              系统从数据里算，人勾不动也不用勾。不通过时会告诉你为什么——
              新手不必知道标准，老手不必自己数。
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-[var(--text-faint)]">
              最大爽点间隔 · 字数区间 · 钩子连续同型 · 评分卡总分 · 伏笔逾期 · 等级表缺列 · 配角三件套 …
            </p>
          </div>
          <div className="border border-[var(--line-soft)] p-4">
            <div className="flex items-baseline gap-2">
              <span className="text-[14px] font-semibold">主观项</span>
              <span className="num text-[18px] font-light">{gateItems.length - autoGates}</span>
            </div>
            <p className="mt-2 text-[14px] leading-relaxed text-[var(--text-dim)]">
              只有人能判的：够不够狠、愿不愿意点下一章、这段对白像不像这个人说的。
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-[var(--text-faint)]">
              风味闸那 20% 的人工是整本书的灵魂税，不可豁免。
            </p>
          </div>
        </div>
        <p className="mt-2.5 text-[12px] text-[var(--text-faint)]">
          其中 <span className="num text-[var(--accent)]">{hardGates}</span> 条是硬项（一票否决）——不全过，环节永远不算通过。
        </p>
      </section>

      {/* ── 设计原则 ── */}
      <section className="mt-14 border-t border-[var(--line-soft)] pt-8">
        <Eyebrow>五条不动摇的原则</Eyebrow>
        <ul className="mt-3 space-y-2.5">
          {[
            ['人做高杠杆低频决策，AI 做高工作量高频执行', 'AI 负责"对"，人负责"过分"——爆款活在分布的尾部'],
            ['AI 产出不自动进真相源', '状态库写错一次，错误会在后续生成里自我复制'],
            ['正文永不回读', '写第 200 章时读的是状态文件，不是前 199 章'],
            ['门禁是硬的', '可判定的由系统算，人改不动；一票否决项不全过就不算通过'],
            ['系统自立', '不读外部目录、不留外部路径、不镜像别处的内容'],
          ].map(([a, b]) => (
            <li key={a} className="flex gap-3">
              <span className="mt-[7px] h-1 w-1 flex-none rounded-full bg-[var(--accent)]" />
              <span>
                <span className="text-[14px] font-medium">{a}</span>
                <span className="ml-2 text-[14px] text-[var(--text-faint)]">{b}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-12 flex items-center gap-3">
        <Link
          href="/new"
          className="inline-flex h-9 items-center rounded-[2px] bg-[var(--accent)] px-5 text-[14px] font-medium text-white transition-all hover:brightness-110"
        >
          开一本新书 →
        </Link>
        {books.length > 0 && (
          <Link href={`/p/${books[0].id}/guide`} className="text-[14px] text-[var(--accent)] hover:underline">
            继续《{books[0].title}》
          </Link>
        )}
      </div>
    </div>
  )
}

function Tier({
  n,
  sub,
  hue,
  items,
}: {
  n: string
  sub: string
  hue: number
  items: { t: string; v: string; d: string; href?: string }[]
}) {
  return (
    // 文武边：外一道层色粗线，内一道细线，中间留一线白
    <div
      className="border-[1.5px] p-5"
      style={{
        borderColor: `hsl(${hue} 40% 50% / 0.32)`,
        boxShadow: `inset 0 0 0 2px var(--bg), inset 0 0 0 3px hsl(${hue} 40% 50% / 0.16)`,
      }}
    >
      <div className="flex items-baseline gap-2.5">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: `hsl(${hue} 46% 52%)` }} />
        <span className="text-[14px] font-semibold">{n}</span>
        <span className="text-[12px] text-[var(--text-faint)]">{sub}</span>
      </div>
      <div className="rules-3 mt-3.5 grid grid-cols-3 gap-x-0 gap-y-4">
        {items.map((x) => {
          const inner = (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-[14px] font-medium">{x.t}</span>
                <span className="num text-[12px] text-[var(--accent)]">{x.v}</span>
              </div>
              <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-faint)]">{x.d}</p>
            </>
          )
          return x.href ? (
            <Link key={x.t} href={x.href} className="group block">
              {inner}
            </Link>
          ) : (
            <div key={x.t}>{inner}</div>
          )
        })}
      </div>
    </div>
  )
}

function Arrow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 px-5">
      <span className="text-[var(--text-faint)]">↓</span>
      <span className="text-[12px] text-[var(--text-faint)]">{label}</span>
    </div>
  )
}
