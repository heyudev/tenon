import Link from 'next/link'
import { projects, stageStore } from '@/lib/repo'
import { MIN_VIABLE, STAGES, gateProgress } from '@/lib/stages'
import { weightsOf } from '@/lib/route'
import { autosOf } from '@/lib/gate-ctx'
import { PipelineRibbon, ribbonCells } from '@/components/PipelineRibbon'
import { Eyebrow } from '@/components/ui'

/**
 * 读数据库的页面必须每次请求现算。
 * Next 默认会把它静态预渲染，把「构建那一刻的库内容」烤进 HTML——
 * 新建的书不出现、删掉的还在，用起来像坏了。
 */
export const dynamic = 'force-dynamic'

/**
 * 首页 = 一个动作，不是一份系统说明书。
 *
 * 这一屏只回答两件事：这东西干什么用、我现在点哪。
 * 46 环节的全景、资产层规模、方法论卡数量——那些是「了解这套方法」时才看的，
 * 摆在第一屏只会把想写书的人吓走。全景挪到 /overview，导航里留了入口。
 */
export default function Home() {
  const books = projects.all()

  return (
    <div className="mx-auto max-w-[880px] px-10 py-16">
      {books.length === 0 ? (
        /* ── 第一次来 ── */
        <div className="seat-y seat">
          <Eyebrow>榫 · AI 小说创作系统</Eyebrow>
          <h1 className="display mt-4 text-[40px] leading-[1.25]">
            把「我想写本书」
            <br />
            推到<span className="text-[var(--accent)]">「写完了」</span>
          </h1>
          <p className="mt-6 max-w-[520px] text-[18px] leading-[1.8] text-[var(--text-dim)]">
            你带来一个人和他的处境，系统陪你把它推成能写的东西，
            然后一章一章盯着你写完——每一步都会告诉你现在该做什么、做到什么算够。
          </p>

          <Link
            href="/new"
            className="mt-9 inline-block rounded-[2px] border border-[var(--accent)] bg-[var(--accent)] px-6 py-3 text-[18px] font-medium text-[var(--on-accent)] transition-opacity hover:opacity-90"
          >
            开始写一本书 →
          </Link>

          <p className="mt-5 text-[14px] leading-relaxed text-[var(--text-faint)]">
            现在什么都还没想好也可以点——第一步就是帮你把想法问出来。
          </p>

          <div className="mt-14 border-t border-[var(--line-soft)] pt-6">
            <p className="text-[14px] leading-[1.9] text-[var(--text-faint)]">
              想先摸清这套方法怎么运转，再决定用不用：
              <Link href="/overview" className="ml-1.5 text-[var(--accent)] hover:underline">
                看系统全貌 →
              </Link>
            </p>
          </div>
        </div>
      ) : (
        /* ── 回来继续写 ── */
        <div className="seat-y seat">
          <Eyebrow>我的书</Eyebrow>
          <h1 className="display mt-3 text-[26px]">继续写</h1>

          <div className="mt-6 space-y-3">
            {books.map((b) => {
              const states = stageStore.all(b.id)
              const autos = autosOf(b.id)
              const cells = ribbonCells(states, weightsOf(b), autos)
              const mvLeft = MIN_VIABLE.filter(
                (s) => !gateProgress(s, states[s.id]?.gate ?? {}, autos).passed,
              )
              const canWrite = mvLeft.length === 0
              return (
                <div key={b.id} className="frame p-5">
                  <div className="flex flex-wrap items-baseline gap-3">
                    <Link href={`/p/${b.id}`} className="text-[18px] font-semibold hover:text-[var(--accent)]">
                      {b.title}
                    </Link>
                    <span className="text-[12px] text-[var(--text-faint)]">
                      {b.platform} · {b.status}
                    </span>
                  </div>
                  {b.logline && (
                    <p className="mt-1.5 line-clamp-1 text-[14px] text-[var(--text-dim)]">{b.logline}</p>
                  )}

                  {/* 只说一句话：现在该干什么 */}
                  <p className="mt-3 text-[14px] leading-relaxed text-[var(--text-dim)]">
                    {canWrite ? (
                      <>动笔所需的都齐了，接着写就行。</>
                    ) : (
                      <>
                        离动笔还差 {mvLeft.length} 步，下一步是
                        <span className="text-[var(--text)]">「{mvLeft[0].title}」</span>。
                      </>
                    )}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Link
                      href={canWrite ? `/p/${b.id}/write` : `/p/${b.id}/guide`}
                      className="rounded-[2px] border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 text-[14px] font-medium text-[var(--on-accent)]"
                    >
                      {canWrite ? '去写' : '继续准备'} →
                    </Link>
                    <Link
                      href={`/p/${b.id}`}
                      className="text-[14px] text-[var(--text-faint)] hover:text-[var(--text-dim)]"
                    >
                      看这本书的全部环节
                    </Link>
                  </div>

                  <div className="mt-4">
                    <PipelineRibbon cells={cells} projectId={b.id} height={16} />
                  </div>
                </div>
              )
            })}
          </div>

          <Link
            href="/new"
            className="mt-6 inline-block text-[14px] text-[var(--accent)] hover:underline"
          >
            ＋ 再写一本 →
          </Link>

          <p className="mt-10 border-t border-[var(--line-soft)] pt-5 text-[12px] text-[var(--text-faint)]">
            这套系统共 {STAGES.length} 个环节，按你这本书的阵地与类型裁剪。
            <Link href="/overview" className="ml-1.5 text-[var(--accent)] hover:underline">
              看全貌
            </Link>
          </p>
        </div>
      )}
    </div>
  )
}
