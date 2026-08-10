'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Chapter, Character, HookType, Project, Thread, Volume } from '@/lib/types'
import type { GateItem } from '@/lib/stages'
import { addChapter, updateChapter, updateThread } from '@/lib/actions'
import { AiOutput, useAiRun } from '@/components/AiPanel'
import { Button, Check, Chip, Empty, Eyebrow, Meter, Segmented, cx } from '@/components/ui'
import Autopilot from './Autopilot'

const HOOKS: HookType[] = ['危机钩', '悬念钩', '期待钩', '反转钩']
const BEATS = ['蓄能', '过渡', '微爽', '中爽', '大爽'] as const
const TABS = [
  { id: 'brief', label: '15 规划', desc: '章 brief 五行，人写不外包' },
  { id: 'draft', label: '16 正文', desc: '写手产出初稿' },
  { id: 'review', label: '17 门禁', desc: '三道闸：结构 / 一致性 / 风味' },
  { id: 'back', label: '18 回写', desc: '不回写＝这一章没完成' },
] as const
type Tab = (typeof TABS)[number]['id']

const STATUS_TONE: Record<string, string> = {
  待规划: 'var(--line)',
  已规划: 'hsl(220 42% 52%)',
  已生成: 'hsl(38 46% 52%)',
  审校中: 'hsl(8 52% 52%)',
  已通过: 'var(--color-celadon)',
  已发布: 'var(--color-celadon)',
}

export default function WriteDesk({
  project,
  chapters: chs,
  vols,
  people,
  items,
  gates,
}: {
  project: Project
  chapters: Chapter[]
  vols: Volume[]
  people: Character[]
  items: Thread[]
  gates: Record<string, GateItem[]>
}) {
  const [curId, setCurId] = useState<string | null>(chs.at(-1)?.id ?? null)
  const [tab, setTab] = useState<Tab>('brief')
  // 逐章＝人主导的默认路径；自主＝委员会自己往下写，显式切进去
  const [mode, setMode] = useState<'manual' | 'auto'>('manual')
  const ai = useAiRun()
  const cur = chs.find((c) => c.id === curId) ?? null

  const [body, setBody] = useState(cur?.body ?? '')
  const [review, setReview] = useState(cur?.review ?? '')
  useEffect(() => {
    setBody(cur?.body ?? '')
    setReview(cur?.review ?? '')
  }, [curId, cur?.body, cur?.review])

  const range = project.platform === '起点' ? [3000, 4500] : [2000, 3000]
  const chars = body.length
  const inRange = chars >= range[0] && chars <= range[1]

  const gate = cur?.gate ?? {}
  const gateList = gates[tab === 'back' ? 'writeback' : tab] ?? []
  const gDone = gateList.filter((g) => gate[g.id]).length
  const gHard = gateList.filter((g) => g.hard && !gate[g.id]).length

  const prevTypes = useMemo(() => {
    if (!cur) return []
    return chs.filter((c) => c.no < cur.no && c.hook_type).slice(-2).map((c) => c.hook_type)
  }, [chs, cur])
  const hookClash = cur?.hook_type && prevTypes.length === 2 && prevTypes.every((t) => t === cur.hook_type)

  const save = (patch: Record<string, unknown>) => cur && updateChapter(project.id, cur.id, patch)
  const toggleGate = (id: string, v: boolean) => cur && save({ gate: { ...gate, [id]: v } })

  const nextNo = Math.max(0, ...chs.map((c) => c.no)) + 1

  return (
    <div className="flex h-dvh">
      {/* 章列表 */}
      <div className="w-[190px] flex-none overflow-y-auto border-r border-[var(--line-soft)]">
        <div className="px-4 pb-2 pt-5">
          <h1 className="text-[14px] font-semibold">日更台</h1>
          <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-faint)]">
            规划 → 生成 → 门禁 → 回写
          </p>
          <Segmented
            className="mt-3 w-full"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'manual', label: '逐章' },
              { value: 'auto', label: '自主' },
            ]}
          />
        </div>
        <div className="px-2 pb-6">
          {chs.map((c) => (
            <button
              key={c.id}
              onClick={() => setCurId(c.id)}
              className={cx(
                'flex w-full items-center gap-2 rounded-[2px] px-2 py-1.5 text-left transition-colors',
                curId === c.id ? 'bg-[var(--bg-sunk)]' : 'hover:bg-[var(--bg-sunk)]/60',
              )}
            >
              <span className="h-1.5 w-1.5 flex-none rounded-full" style={{ background: STATUS_TONE[c.status] }} />
              <span className="num w-6 flex-none text-[12px] text-[var(--text-faint)]">{c.no}</span>
              <span className="min-w-0 flex-1 truncate text-[14px]">{c.title || c.event || '未命名'}</span>
              {c.words > 0 && <span className="num flex-none text-[11px] text-[var(--text-faint)]">{Math.round(c.words / 100) / 10}k</span>}
            </button>
          ))}
          <Button
            size="sm"
            variant="quiet"
            className="mt-2 w-full"
            onClick={async () => {
              await addChapter(project.id, nextNo, vols.at(-1)?.id ?? null)
            }}
          >
            ＋ 第 {nextNo} 章
          </Button>
        </div>
      </div>

      {/* 主区 */}
      <div className="min-w-0 flex-1 overflow-y-auto">
        {mode === 'auto' ? (
          <div className="max-w-[820px] px-8 py-7">
            <Autopilot projectId={project.id} />
          </div>
        ) : !cur ? (
          <Empty>还没有章节。先去 14 事件线排出本卷 40 章，或在左栏直接新建。</Empty>
        ) : (
          <div>
            <header className="border-b border-[var(--line-soft)] px-8 pb-0 pt-6">
              <div className="flex items-baseline gap-3">
                <span className="num text-[14px] text-[var(--text-faint)]">第 {cur.no} 章</span>
                <input
                  value={cur.title ?? ''}
                  onChange={(e) => save({ title: e.target.value })}
                  placeholder="章节标题（番茄：标题即钩子）"
                  className="min-w-0 flex-1 bg-transparent text-[18px] font-semibold tracking-tight outline-none placeholder:font-normal placeholder:text-[var(--text-faint)]"
                />
                <select
                  value={cur.status}
                  onChange={(e) => save({ status: e.target.value })}
                  className="h-7 cursor-pointer rounded-[2px] border border-[var(--line)] bg-transparent px-2 text-[14px]"
                >
                  {['待规划', '已规划', '已生成', '审校中', '已通过', '已发布'].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <nav className="mt-4 flex gap-1">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={cx(
                      'relative px-3 py-2 text-[14px] transition-colors',
                      tab === t.id ? 'font-medium text-[var(--text)]' : 'text-[var(--text-faint)] hover:text-[var(--text-dim)]',
                    )}
                  >
                    {t.label}
                    {tab === t.id && <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-[var(--accent)]" />}
                  </button>
                ))}
              </nav>
            </header>

            <div className="px-8 py-6">
              <p className="mb-5 text-[12px] text-[var(--text-faint)]">{TABS.find((t) => t.id === tab)?.desc}</p>

              {/* ── 15 规划 ── */}
              {tab === 'brief' && (
                <div className="max-w-[680px] space-y-5">
                  <Fld label="场景" hint="在哪、什么时候、什么氛围">
                    <textarea value={cur.scene ?? ''} onChange={(e) => save({ scene: e.target.value })} rows={2} className="field" />
                  </Fld>

                  <div>
                    <div className="mb-1.5 text-[14px] font-medium">出场人物</div>
                    <div className="flex flex-wrap gap-1.5">
                      {people.map((p) => {
                        const on = cur.cast.includes(p.id)
                        return (
                          <button
                            key={p.id}
                            onClick={() => save({ cast: on ? cur.cast.filter((x) => x !== p.id) : [...cur.cast, p.id] })}
                            className={cx(
                              'rounded-[2px] border px-2 py-1 text-[14px] transition-colors',
                              on
                                ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                                : 'border-[var(--line)] text-[var(--text-dim)]',
                            )}
                          >
                            {p.name}
                          </button>
                        )
                      })}
                      {people.length === 0 && (
                        <span className="text-[14px] text-[var(--text-faint)]">还没有人物档案</span>
                      )}
                    </div>
                    <p className="mt-1 text-[12px] text-[var(--text-faint)]">
                      勾选的人物会带着「知道什么秘密」进入 L2 记忆 —— 一致性闸靠这个字段。
                    </p>
                  </div>

                  <Fld label="核心事件" hint="一章一事。两件事拆两章，半件事是水">
                    <textarea value={cur.core_event ?? cur.event ?? ''} onChange={(e) => save({ core_event: e.target.value })} rows={2} className="field" />
                  </Fld>
                  <Fld label="本章反转" hint="信息、立场或局势，三选一">
                    <textarea value={cur.twist ?? ''} onChange={(e) => save({ twist: e.target.value })} rows={2} className="field" />
                  </Fld>

                  <div>
                    <div className="mb-1.5 flex items-baseline gap-2">
                      <span className="text-[14px] font-medium">爽点节拍</span>
                      <span className="text-[12px] text-[var(--text-faint)]">
                        {project.platform === '番茄' ? '番茄：每章至少一个微爽点' : '起点：每 2-3 章一个中爽点'}
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      {BEATS.map((b) => (
                        <button
                          key={b}
                          onClick={() => save({ beat: b })}
                          className={cx(
                            'rounded-[2px] border px-2.5 py-1 text-[14px] transition-colors',
                            cur.beat === b
                              ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                              : 'border-[var(--line)] text-[var(--text-dim)]',
                          )}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-baseline gap-2">
                      <span className="text-[14px] font-medium">章尾钩子</span>
                      {prevTypes.length > 0 && (
                        <span className="text-[12px] text-[var(--text-faint)]">前两章：{prevTypes.join('、')}</span>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      {HOOKS.map((h) => (
                        <button
                          key={h}
                          onClick={() => save({ hook_type: h })}
                          className={cx(
                            'rounded-[2px] border px-2.5 py-1 text-[14px] transition-colors',
                            cur.hook_type === h
                              ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                              : 'border-[var(--line)] text-[var(--text-dim)]',
                          )}
                        >
                          {h}
                        </button>
                      ))}
                    </div>
                    {hookClash && (
                      <p className="mt-1.5 text-[12px] text-[var(--accent)]">
                        连续 3 章同型钩子 —— 换一型。危机钩连用会让读者对威胁脱敏。
                      </p>
                    )}
                    <textarea
                      value={cur.hook_text ?? ''}
                      onChange={(e) => save({ hook_text: e.target.value })}
                      rows={2}
                      placeholder="钩子那一句（钩子是手艺活，不外包）"
                      className="field mt-2"
                    />
                  </div>

                  {items.length > 0 && (
                    <div>
                      <div className="mb-1.5 text-[14px] font-medium">伏笔埋收</div>
                      <div className="space-y-1">
                        {items
                          .filter((t) => t.status !== '已回收' && t.status !== '已废弃')
                          .map((t) => (
                            <div key={t.id} className="flex items-center gap-2 text-[14px]">
                              <span className="num w-[46px] flex-none text-[var(--text-faint)]">{t.fid}</span>
                              <span className="min-w-0 flex-1 truncate text-[var(--text-dim)]">{t.content}</span>
                              <button
                                onClick={() => save({ plant: cur.plant.includes(t.fid) ? cur.plant.filter((x) => x !== t.fid) : [...cur.plant, t.fid] })}
                                className={cx(
                                  'rounded-[2px] border px-1.5 py-[2px] text-[12px]',
                                  cur.plant.includes(t.fid)
                                    ? 'border-[var(--color-celadon)] text-[var(--color-celadon)]'
                                    : 'border-[var(--line)] text-[var(--text-faint)]',
                                )}
                              >
                                埋
                              </button>
                              <button
                                onClick={() => save({ harvest: cur.harvest.includes(t.fid) ? cur.harvest.filter((x) => x !== t.fid) : [...cur.harvest, t.fid] })}
                                className={cx(
                                  'rounded-[2px] border px-1.5 py-[2px] text-[12px]',
                                  cur.harvest.includes(t.fid)
                                    ? 'border-[var(--accent)] text-[var(--accent)]'
                                    : 'border-[var(--line)] text-[var(--text-faint)]',
                                )}
                              >
                                收
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── 16 正文 ── */}
              {tab === 'draft' && (
                <div>
                  <div className="mb-3 flex items-center gap-3">
                    <span className="num text-[14px]" style={{ color: inRange ? 'var(--color-celadon)' : 'var(--accent)' }}>
                      {chars} 字
                    </span>
                    <span className="text-[12px] text-[var(--text-faint)]">
                      {project.platform} 区间 {range[0]}–{range[1]}
                      {project.platform === '起点' && '（含标点的总字数口径）'}
                    </span>
                    <div className="w-[120px]">
                      <Meter value={Math.min(chars, range[1])} max={range[1]} tone={inRange ? 'good' : 'accent'} />
                    </div>
                    <Button size="sm" variant="quiet" onClick={() => save({ body })}>
                      保存
                    </Button>
                  </div>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    onBlur={() => save({ body })}
                    rows={26}
                    placeholder="正文写在这里，或把既有稿粘进来。&#10;也可以先跑右栏的写手生成初稿，再自己把关键 20%（打脸台词、章尾钩子）重写一遍——这 20% 是整本书的灵魂税。"
                    className="field font-serif text-[14px] leading-[2]"
                  />
                </div>
              )}

              {/* ── 17 门禁 ── */}
              {tab === 'review' && (
                <div className="max-w-[760px]">
                  <Eyebrow>审稿人问题列表</Eyebrow>
                  <textarea
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    onBlur={() => save({ review })}
                    rows={14}
                    placeholder="跑右栏的「审稿人」把问题列表拿过来，或手写。修订师会照着这份列表改，只改点到的地方。"
                    className="field mt-2 text-[14px] leading-[1.9]"
                  />
                  <p className="mt-2 text-[12px] leading-relaxed text-[var(--text-faint)]">
                    审稿与修订必须分开：同一个模型在"找错"和"改错"合并时会倾向于宣称自己写得没问题。
                  </p>
                </div>
              )}

              {/* ── 18 回写 ── */}
              {tab === 'back' && (
                <div className="max-w-[680px] space-y-5">
                  <Fld label="给未来的摘要" hint="150 字以内。写第 200 章时你读的是这个，不是正文">
                    <textarea value={cur.summary ?? ''} onChange={(e) => save({ summary: e.target.value })} rows={4} className="field" />
                  </Fld>
                  <Fld label="信息增量" hint="一句话说清读者这一章知道了什么新的 —— 比「剧情推进」更可执行的水章判据">
                    <textarea value={cur.info_gain ?? ''} onChange={(e) => save({ info_gain: e.target.value })} rows={2} className="field" />
                  </Fld>

                  {(cur.plant.length > 0 || cur.harvest.length > 0) && (
                    <div className="border border-[var(--line-soft)] p-4">
                      <Eyebrow>伏笔账本联动</Eyebrow>
                      <div className="mt-2.5 space-y-2">
                        {cur.plant.map((fid) => {
                          const t = items.find((x) => x.fid === fid)
                          if (!t) return null
                          const done = t.planted_ch === cur.no
                          return (
                            <div key={fid} className="flex items-center gap-2 text-[14px]">
                              <Chip tone="good">埋</Chip>
                              <span className="num text-[var(--text-faint)]">{fid}</span>
                              <span className="min-w-0 flex-1 truncate text-[var(--text-dim)]">{t.content}</span>
                              <Button
                                size="sm"
                                variant={done ? 'quiet' : 'ghost'}
                                disabled={done}
                                onClick={() => updateThread(project.id, t.id, { planted_ch: cur.no, status: '已埋设' })}
                              >
                                {done ? '已登账' : '登账'}
                              </Button>
                            </div>
                          )
                        })}
                        {cur.harvest.map((fid) => {
                          const t = items.find((x) => x.fid === fid)
                          if (!t) return null
                          const done = t.actual_ch === cur.no
                          return (
                            <div key={fid} className="flex items-center gap-2 text-[14px]">
                              <Chip tone="accent">收</Chip>
                              <span className="num text-[var(--text-faint)]">{fid}</span>
                              <span className="min-w-0 flex-1 truncate text-[var(--text-dim)]">{t.content}</span>
                              <Button
                                size="sm"
                                variant={done ? 'quiet' : 'ghost'}
                                disabled={done}
                                onClick={() => updateThread(project.id, t.id, { actual_ch: cur.no, status: '已回收' })}
                              >
                                {done ? '已回收' : '标记回收'}
                              </Button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <p className="text-[12px] leading-relaxed text-[var(--text-faint)]">
                    人物状态与新设定的变更去
                    <a href={`/p/${project.id}/s/d1-hero`} className="mx-1 text-[var(--accent)]">人物档案</a>
                    改。记录员的产出必须过人眼再落库 —— 状态库写错一次，错误会在后续生成里自我复制。
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 右栏：流水线 + 门禁。自主模式下整条流水线由引擎跑，不需要手点 */}
      {mode === 'manual' && cur && (
        <aside className="w-[340px] flex-none overflow-y-auto border-l border-[var(--line-soft)] px-6 py-6">
          <Eyebrow>五角色流水线</Eyebrow>
          <div className="mt-2.5 space-y-1.5">
            {[
              { role: '写手', label: '写手 · 生成正文', accept: (t: string) => { setBody(t); save({ body: t, status: '已生成' }) }, acceptLabel: '写入正文' },
              { role: '审稿人', label: '审稿人 · 只批判不改', accept: (t: string) => { setReview(t); save({ review: t, status: '审校中' }) }, acceptLabel: '写入问题列表' },
              { role: '修订师', label: '修订师 · 按列表精修', accept: (t: string) => { setBody(t); save({ body: t }) }, acceptLabel: '替换正文' },
              { role: '记录员', label: '记录员 · 产出状态增量', accept: undefined, acceptLabel: '' },
              { role: '读者模型', label: '读者模型 · 会不会弃书', accept: undefined, acceptLabel: '' },
              { role: '运营模型', label: '运营模型 · 平台适配', accept: undefined, acceptLabel: '' },
            ].map((r) => (
              <div key={r.role} className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-1 justify-start"
                  disabled={ai.running}
                  onClick={() =>
                    ai.run({ kind: 'chapter', projectId: project.id, chapterId: cur.id, role: r.role, extra: r.role === '修订师' ? review : undefined })
                  }
                >
                  {r.label}
                </Button>
                <Button
                  size="sm"
                  variant="quiet"
                  aria-label="复制提示词"
                  title="只复制提示词到剪贴板"
                  onClick={() => ai.copyPrompt({ kind: 'chapter', projectId: project.id, chapterId: cur.id, role: r.role })}
                >
                  ⧉
                </Button>
              </div>
            ))}
          </div>

          <AiOutput
            ai={ai}
            acceptLabel={
              ai.meta?.role === '主笔作者' ? '写入正文' : ai.meta?.role === '审稿人' ? '写入问题列表' : ai.meta?.role === '修订师' ? '替换正文' : '采纳'
            }
            onAccept={(t) => {
              if (ai.meta?.role === '主笔作者') {
                setBody(t)
                save({ body: t, status: '已生成' })
              } else if (ai.meta?.role === '审稿人') {
                setReview(t)
                save({ review: t, status: '审校中' })
              } else if (ai.meta?.role === '修订师') {
                setBody(t)
                save({ body: t })
              }
            }}
          />

          <section className="mt-7">
            <div className="flex items-baseline justify-between">
              <Eyebrow>本节拍门禁</Eyebrow>
              <span className="num text-[12px] text-[var(--text-faint)]">
                {gDone}/{gateList.length}
              </span>
            </div>
            <Meter
              value={gDone}
              max={gateList.length}
              tone={gDone === gateList.length ? 'good' : gHard ? 'accent' : 'mute'}
              className="mt-2"
            />
            <div className="mt-2">
              {gateList.map((g) => (
                <Check key={g.id} checked={!!gate[g.id]} onChange={(v) => toggleGate(g.id, v)} hard={g.hard}>
                  {g.text}
                </Check>
              ))}
            </div>
          </section>

          <section className="mt-7">
            <Eyebrow>注入的上下文</Eyebrow>
            <div className="mt-2 space-y-1 text-[12px] leading-relaxed text-[var(--text-faint)]">
              <div>L0 创作圣经 · 规则差 / 等级表 / 文风样例 / 禁忌</div>
              <div>L1 世界观 · 六件套 / 势力 / 术语 / 当前卷</div>
              <div>L2 人物 · 勾选的 {cur.cast.length} 人（含"知道什么秘密"）</div>
              <div>L3 游标 · 近 3 章摘要 / 未兑现钩子 / 进行中伏笔</div>
              <div>L4 brief · 本章五行</div>
              <div className="pt-1">正文永不回读 —— 连续性靠状态文件，不靠把小说读一遍。</div>
            </div>
          </section>
        </aside>
      )}
    </div>
  )
}

function Fld({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline gap-2">
        <span className="text-[14px] font-medium">{label}</span>
        {hint && <span className="text-[12px] text-[var(--text-faint)]">{hint}</span>}
      </div>
      {children}
    </div>
  )
}
