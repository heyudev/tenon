'use client'

import { useState } from 'react'
import { createProject } from '@/lib/actions'
import { ARCHETYPES, CHANNELS, ENTRIES, GENRES, type EntryId } from '@/lib/genre'
import { OPERATORS, VENUES, VENUE_MAP, type VenueId } from '@/lib/platform'
import { STAGES, weightOf } from '@/lib/stages'
import { Eyebrow, cx } from '@/components/ui'

/**
 * 开新书 = 入口分诊 + 选阵地 + 选类型。
 * 阵地（= 运营商 × 频道）是一个单元，不是两个独立选项——
 * 起点本身就是男频站，番茄男频与女频也是两套读者与榜单。
 */
export default function NewBook() {
  const [step, setStep] = useState(0)
  const [entry, setEntry] = useState<EntryId>('blank')
  const [venueId, setVenueId] = useState<VenueId | ''>('')
  const [genreId, setGenreId] = useState('')

  const venue = venueId ? VENUE_MAP[venueId] : null
  const genre = GENRES.find((g) => g.id === genreId)
  const entryDef = ENTRIES.find((e) => e.id === entry)!

  const fitGenres = venue ? GENRES.filter((g) => g.venueFit.includes(venue.id)) : []
  const otherGenres = venue
    ? GENRES.filter((g) => !g.venueFit.includes(venue.id) && (g.channel === venue.channel || g.channel === '双频'))
    : []

  const route =
    genre && venue
      ? STAGES.map((s) => weightOf(s, { archetypes: genre.archetypes, channel: venue.channel, venue: venue.id }))
      : []
  const must = route.filter((w) => w === '必经').length
  const boost = route.filter((w) => w === '增强').length
  const skip = route.filter((w) => w === '不适用').length

  const byBiz = (biz: '免费阅读 · 广告分成' | '付费订阅') =>
    VENUES.filter((v) => OPERATORS[v.operator].biz === biz)

  return (
    <div className="mx-auto max-w-[900px] px-10 py-14">
      <Eyebrow>开新书</Eyebrow>
      <h1 className="display mt-3 text-[26px]">
        {['你手上现在有什么？', '投哪个阵地？', '什么类型？'][step]}
      </h1>
      <div className="mt-3 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-[2px] w-12 rounded-full transition-colors"
            style={{ background: i <= step ? 'var(--accent)' : 'var(--line)' }}
          />
        ))}
      </div>

      {/* 0 · 入口分诊 */}
      {step === 0 && (
        <div className="seat mt-8">
          <p className="text-[14px] leading-relaxed text-[var(--text-dim)]">
            这一步决定你从哪个环节切进去。走错入口不会错，但会绕远路。
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2.5">
            {ENTRIES.map((e) => (
              <button
                key={e.id}
                onClick={() => {
                  setEntry(e.id)
                  setStep(1)
                }}
                className={cx(
                  'border p-4 text-left transition-colors',
                  entry === e.id ? 'border-[var(--accent)]/50 bg-[var(--accent)]/5' : 'border-[var(--line-soft)] hover:border-[var(--line)]',
                )}
              >
                <div className="text-[14px] font-medium">{e.label}</div>
                <div className="mt-1.5 text-[14px] leading-relaxed text-[var(--text-dim)]">{e.desc}</div>
                <div className="mt-2.5 text-[12px] leading-relaxed text-[var(--text-faint)]">{e.path}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 1 · 阵地 */}
      {step === 1 && (
        <div className="seat mt-8">
          <p className="text-[14px] leading-relaxed text-[var(--text-dim)]">
            阵地 = <span className="text-[var(--accent)]">运营商 × 频道</span>，是一个单元不是两个选项。
            <br />
            <span className="text-[var(--text-faint)]">
              起点中文网本身就是男频站，女频在同集团的另外几个站；番茄男女频同一个 App，但分类、榜单、读者、题材各不相同。
            </span>
          </p>

          {(['免费阅读 · 广告分成', '付费订阅'] as const).map((biz) => (
            <div key={biz} className="mt-6">
              <Eyebrow>{biz}</Eyebrow>
              <div className="mt-2.5 grid grid-cols-3 gap-2.5">
                {byBiz(biz).map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      setVenueId(v.id)
                      setGenreId('')
                      setStep(2)
                    }}
                    className={cx(
                      'border p-3.5 text-left transition-colors',
                      venueId === v.id ? 'border-[var(--accent)]/50 bg-[var(--accent)]/5' : 'border-[var(--line-soft)] hover:border-[var(--line)]',
                    )}
                  >
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[14px] font-medium">{v.name}</span>
                      <span className="text-[11px] text-[var(--text-faint)]">{v.channel}</span>
                    </div>
                    <div className="mt-1 text-[12px] text-[var(--text-faint)]">{v.tagline}</div>
                    <div className="mt-2 space-y-0.5 text-[12px] text-[var(--text-dim)]">
                      <div>单章 {v.words[0]}-{v.words[1]}</div>
                      <div>爽点红线 ≥{v.maxBeatGap} 章</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2 · 类型 + 建立 */}
      {step === 2 && venue && (
        <div className="seat mt-8">
          <div className="frame-thin p-4">
            <div className="flex items-baseline gap-2">
              <span className="text-[14px] font-medium">{venue.name}</span>
              <span className="text-[12px] text-[var(--text-faint)]">
                {OPERATORS[venue.operator].name} · {OPERATORS[venue.operator].biz}
              </span>
            </div>
            <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--text-dim)]">{venue.readers}</p>
            <p className="mt-1.5 text-[12px] text-[var(--text-faint)]">
              定生死：{venue.deathline}　主流题材：{venue.hotGenres.join(' · ')}
            </p>
          </div>

          <p className="mt-5 text-[14px] leading-relaxed text-[var(--text-dim)]">
            类型决定<span className="text-[var(--accent)]">走哪条路线</span>——哪些环节必经、哪些是增强、哪些跟这本书无关。
          </p>

          <div className="mt-4">
            <Eyebrow>这个阵地的主流类型</Eyebrow>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {fitGenres.map((g) => (
                <GenreChip key={g.id} g={g} on={genreId === g.id} pick={setGenreId} />
              ))}
            </div>
          </div>
          {otherGenres.length > 0 && (
            <div className="mt-4">
              <Eyebrow>同频道的其它类型（在这个阵地不是主流）</Eyebrow>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {otherGenres.map((g) => (
                  <GenreChip key={g.id} g={g} on={genreId === g.id} pick={setGenreId} dim />
                ))}
              </div>
            </div>
          )}

          {genre && (
            <div className="seat mt-5 border border-[var(--line-soft)] p-5">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-medium">{genre.name}</span>
                {genre.archetypes.map((a) => (
                  <span key={a} className="rounded-[2px] border border-[var(--line)] px-1.5 py-[2px] text-[12px] text-[var(--text-faint)]">
                    {ARCHETYPES.find((x) => x.id === a)?.label}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--text-dim)]">{genre.contract}</p>

              <div className="mt-4 grid grid-cols-2 gap-5">
                <div>
                  <Eyebrow>必备元素</Eyebrow>
                  <ul className="mt-1.5 space-y-1">
                    {genre.musts.map((m) => (
                      <li key={m} className="text-[14px] leading-relaxed text-[var(--text-dim)]">· {m}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <Eyebrow>雷区</Eyebrow>
                  <ul className="mt-1.5 space-y-1">
                    {[...genre.mines, ...CHANNELS[venue.channel].mines.slice(0, 2)].map((m) => (
                      <li key={m} className="text-[14px] leading-relaxed" style={{ color: 'var(--accent)' }}>· {m}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-4">
                <Eyebrow>开篇节奏</Eyebrow>
                <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--text-dim)]">{genre.opening}</p>
              </div>

              <div className="mt-4 flex items-center gap-4 border-t border-[var(--line-soft)] pt-3.5 text-[14px]">
                <span className="text-[var(--text-faint)]">本书路线</span>
                <span>必经 <span className="num text-[var(--accent)]">{must}</span></span>
                <span className="text-[var(--text-dim)]">增强 <span className="num">{boost}</span></span>
                <span className="text-[var(--text-faint)]">不适用 <span className="num">{skip}</span></span>
                <span className="ml-auto text-[12px] text-[var(--text-faint)]">全图 {STAGES.length} 环节</span>
              </div>

              {!genre.venueFit.includes(venue.id) && (
                <p className="mt-3 rounded-[2px] border border-[var(--color-ochre)]/35 bg-[var(--color-ochre)]/6 px-3 py-2 text-[12px] leading-relaxed text-[var(--color-ochre)]">
                  这个类型在「{venue.name}」不是主流。可以写，但要清楚你在逆势——这个阵地的读者预期与榜单结构都不在你这边。
                </p>
              )}
            </div>
          )}

          <form action={createProject} className="mt-6">
            <input type="hidden" name="venue" value={venue.id} />
            <input type="hidden" name="genre" value={genreId} />
            <div className="mb-1.5 text-[14px] font-medium">书名 / 工作代号</div>
            <input name="title" required className="field" placeholder="未定就先写代号" />
            <button
              type="submit"
              disabled={!genreId}
              className="mt-4 h-9 w-full rounded-[2px] bg-[var(--accent)] text-[14px] font-medium text-white transition-all hover:brightness-110 disabled:opacity-30"
            >
              建立 · 从「{entryDef.label}」入口开始
            </button>
            {!genreId && <p className="mt-2 text-[12px] text-[var(--text-faint)]">先选一个类型</p>}
          </form>
        </div>
      )}

      {step > 0 && (
        <button onClick={() => setStep(step - 1)} className="mt-6 text-[14px] text-[var(--text-faint)] hover:text-[var(--text)]">
          ← 上一步
        </button>
      )}
    </div>
  )
}

function GenreChip({
  g,
  on,
  pick,
  dim,
}: {
  g: (typeof GENRES)[number]
  on: boolean
  pick: (id: string) => void
  dim?: boolean
}) {
  return (
    <button
      onClick={() => pick(g.id)}
      className={cx(
        'rounded-[2px] border px-2.5 py-1.5 text-[14px] transition-colors',
        on
          ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
          : dim
            ? 'border-[var(--line-soft)] text-[var(--text-faint)] hover:border-[var(--line)]'
            : 'border-[var(--line)] text-[var(--text-dim)] hover:border-[var(--text-faint)]',
      )}
    >
      {g.name}
    </button>
  )
}
