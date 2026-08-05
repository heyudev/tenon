'use client'

import { useMemo, useState } from 'react'
import type { Concept, Edge, Rule } from '@/lib/types'
import { Button, Chip, Eyebrow, Segmented, Ticks, cx } from '@/components/ui'
import { addEdge } from '@/lib/actions'

/* 六类按「底层 → 上层」的语义顺序绕圈，不是随便排的：
   物理 / 生理是基座，经济 / 社会 / 信息是其上长出的资源，制度结构收口。 */
const CATS = ['物理基座', '生理基座', '经济资源', '社会资源', '信息资源', '制度结构']

/* 六个色相拉到间隔 ≥40°，明度压在 52–64 之间，墨底宣纸底都立得住。
   制度结构用褐灰——它是「结构」不是「资源」，也避开朱砂边的红。 */
const CAT_COLOR: Record<string, string> = {
  物理基座: 'hsl(212 44% 60%)',
  生理基座: 'hsl(348 46% 63%)',
  经济资源: 'hsl(40 56% 56%)',
  社会资源: 'hsl(160 34% 52%)',
  信息资源: 'hsl(272 36% 65%)',
  制度结构: 'hsl(24 24% 58%)',
}
const catColor = (cat: string) => CAT_COLOR[cat] ?? 'var(--text-faint)'

/* 坐标一律量化到千分位再进 DOM。
   Math.cos/sin 不是 IEEE754 正确舍入的，Node 与浏览器的 V8 会差最后一个 ULP，
   原样写进 cx/cy 就是一次水合失配。 */
const q = (v: number) => Math.round(v * 1000) / 1000

const R = 228 // 概念环半径
const GAP = 0.06 // 类与类之间的留白（弧度）
const VB = 400 // viewBox 半边长

interface Placed extends Concept {
  ang: number
  deg: number
  x: number
  y: number
  r: number
}

const feedbackColor = (f: Edge['feedback']) =>
  f === '正' ? 'var(--accent)' : f === '负' ? 'var(--color-celadon)' : 'var(--text-faint)'

/** 圆弧路径；reverse 用于让下半圈的曲线文字不倒着写 */
function arcPath(r: number, a0: number, a1: number, reverse = false) {
  const [s, e] = reverse ? [a1, a0] : [a0, a1]
  const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0
  return `M${(r * Math.cos(s)).toFixed(2)} ${(r * Math.sin(s)).toFixed(2)}A${r} ${r} 0 ${large} ${
    reverse ? 0 : 1
  } ${(r * Math.cos(e)).toFixed(2)} ${(r * Math.sin(e)).toFixed(2)}`
}

export default function ConceptGraph({
  concepts,
  edges,
  rules,
  focusInit,
}: {
  concepts: Concept[]
  edges: Edge[]
  rules: Rule[]
  focusInit?: string
}) {
  const [focus, setFocus] = useState<string | null>(focusInit ?? null)
  const [hover, setHover] = useState<string | null>(null)
  const [hoverCat, setHoverCat] = useState<string | null>(null)
  const [mode, setMode] = useState<'explore' | 'propagate'>(focusInit ? 'propagate' : 'explore')
  const [depth, setDepth] = useState(3)
  const [showWeak, setShowWeak] = useState(false)

  /* ── 布局：纯函数、确定性 ────────────────────────
     六类各占一段弧（弧长 ∝ 类内概念数），类内按度数降序——
     枢纽概念永远在每类的开头，刷新多少次位置都不变。 */
  const { placed, arcs } = useMemo(() => {
    const deg: Record<string, number> = {}
    for (const e of edges) {
      deg[e.src] = (deg[e.src] ?? 0) + 1
      deg[e.dst] = (deg[e.dst] ?? 0) + 1
    }
    const known = CATS.filter((c) => concepts.some((x) => x.cat === c))
    const extra = [...new Set(concepts.map((c) => c.cat))].filter((c) => !CATS.includes(c)).sort()
    const groups = [...known, ...extra]
      .map((cat) => ({
        cat,
        // 同度数时靠 sort 的稳定性回落到入库顺序。
        // 不能用 localeCompare 兜底——中文排序结果在 Node 与浏览器的 ICU 下不一致，会撕裂水合。
        items: concepts.filter((c) => c.cat === cat).sort((a, b) => (deg[b.name] ?? 0) - (deg[a.name] ?? 0)),
      }))
      .filter((g) => g.items.length)

    const span = Math.PI * 2 - GAP * groups.length
    const placed = new Map<string, Placed>()
    const arcs: { cat: string; a0: number; a1: number; mid: number; n: number }[] = []
    let a = -Math.PI / 2 + GAP / 2
    for (const g of groups) {
      const w = (span * g.items.length) / concepts.length
      g.items.forEach((c, i) => {
        const ang = a + (w * (i + 0.5)) / g.items.length
        const d = deg[c.name] ?? 0
        placed.set(c.name, {
          ...c,
          ang,
          deg: d,
          x: q(R * Math.cos(ang)),
          y: q(R * Math.sin(ang)),
          r: q(3.2 + Math.sqrt(d) * 1.5),
        })
      })
      arcs.push({ cat: g.cat, a0: a, a1: a + w, mid: a + w / 2, n: g.items.length })
      a += w + GAP
    }
    return { placed, arcs }
  }, [concepts, edges])

  const adj = useMemo(() => {
    const out = new Map<string, Edge[]>()
    const inc = new Map<string, Edge[]>()
    for (const e of edges) {
      ;(out.get(e.src) ?? out.set(e.src, []).get(e.src)!).push(e)
      ;(inc.get(e.dst) ?? inc.set(e.dst, []).get(e.dst)!).push(e)
      if (e.direction === '双向') {
        ;(out.get(e.dst) ?? out.set(e.dst, []).get(e.dst)!).push({ ...e, src: e.dst, dst: e.src })
        ;(inc.get(e.src) ?? inc.set(e.src, []).get(e.src)!).push({ ...e, src: e.dst, dst: e.src })
      }
    }
    return { out, inc }
  }, [edges])

  // 图上高亮跟随 focus；没有 focus 时跟随鼠标悬停，划到哪预览到哪
  const active = focus ?? hover
  const activeIsFocus = !!focus

  // ── 扰动传导：从入口概念 BFS 到 depth 阶，弱边计为截断 ──
  const wave = useMemo(() => {
    if (!focus || mode !== 'propagate') return null
    const level = new Map<string, number>([[focus, 0]])
    const path = new Set<string>()
    let frontier = [focus]
    for (let d = 1; d <= depth; d++) {
      const next: string[] = []
      for (const cur of frontier)
        for (const e of adj.out.get(cur) ?? []) {
          if (e.strength === '弱' && d >= depth) continue // 遇弱边即停
          if (!level.has(e.dst)) {
            level.set(e.dst, d)
            next.push(e.dst)
          }
          if ((level.get(e.dst) ?? 9) <= depth) path.add(`${e.src}→${e.dst}`)
        }
      frontier = next
    }
    return { level, path }
  }, [focus, mode, depth, adj])

  // ── 环路检测：经过入口概念的简单环（≤4 步）──
  const loops = useMemo(() => {
    if (!focus) return []
    const found: { nodes: string[]; feedback: string }[] = []
    const seen = new Set<string>()
    const walk = (cur: string, trail: string[], signs: string[]) => {
      if (trail.length > 4) return
      for (const e of adj.out.get(cur) ?? []) {
        if (e.dst === focus && trail.length >= 2) {
          const cyc = [...trail, focus]
          const key = [...trail].sort().join('|')
          if (seen.has(key)) continue
          seen.add(key)
          const all = [...signs, e.feedback]
          // 环的总反馈符号：负边数为偶数 → 正反馈（放大），奇数 → 负反馈（刹车）
          const neg = all.filter((s) => s === '负').length
          found.push({ nodes: cyc, feedback: neg % 2 === 0 ? '正' : '负' })
        } else if (!trail.includes(e.dst) && e.dst !== focus) {
          walk(e.dst, [...trail, e.dst], [...signs, e.feedback])
        }
      }
    }
    walk(focus, [focus], [])
    return found.slice(0, 12)
  }, [focus, adj])

  const focusEdges = useMemo(
    () => (focus ? { out: adj.out.get(focus) ?? [], inc: adj.inc.get(focus) ?? [] } : null),
    [focus, adj],
  )
  const mountedRules = useMemo(
    () => (focus ? rules.filter((r) => r.concepts.includes(focus)).sort((a, b) => b.star - a.star) : []),
    [focus, rules],
  )

  const isLit = (id: string) => {
    if (hoverCat) return placed.get(id)?.cat === hoverCat
    if (!active) return true
    if (activeIsFocus && mode === 'propagate') return wave?.level.has(id) ?? false
    return (
      id === active ||
      (adj.out.get(active) ?? []).some((e) => e.dst === id) ||
      (adj.inc.get(active) ?? []).some((e) => e.src === id)
    )
  }
  const edgeLit = (e: Edge) => {
    if (hoverCat) return placed.get(e.src)?.cat === hoverCat || placed.get(e.dst)?.cat === hoverCat
    if (!active) return true
    if (activeIsFocus && mode === 'propagate')
      return (
        wave?.path.has(`${e.src}→${e.dst}`) ||
        (e.direction === '双向' && wave?.path.has(`${e.dst}→${e.src}`)) ||
        false
      )
    return e.src === active || e.dst === active
  }

  /** 两个概念之间的边：向圆心内弯的二次贝塞尔。
      邻近的一对弯得浅、对角的一对几乎穿心，天然形成束状收拢。 */
  const edgePath = (a: Placed, b: Placed) => {
    const pa = { x: (R - a.r - 4) * Math.cos(a.ang), y: (R - a.r - 4) * Math.sin(a.ang) }
    const pb = { x: (R - b.r - 5) * Math.cos(b.ang), y: (R - b.r - 5) * Math.sin(b.ang) }
    const cx = ((pa.x + pb.x) / 2) * 0.32
    const cy = ((pa.y + pb.y) / 2) * 0.32
    return `M${pa.x.toFixed(1)} ${pa.y.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${pb.x.toFixed(1)} ${pb.y.toFixed(1)}`
  }

  const drawn = edges.filter((e) => showWeak || e.strength === '强')
  const stats = {
    pos: edges.filter((e) => e.feedback === '正').length,
    neg: edges.filter((e) => e.feedback === '负').length,
  }
  const focused = focus ? placed.get(focus) : null

  return (
    <div className="flex h-full flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
      {/* 流式三段：头 / 图 / 图例。不用绝对定位的魔数偏移——标题字号一变就会撞 */}
      <div className="flex min-h-[64vh] min-w-0 flex-1 flex-col lg:min-h-0">
        <header className="flex-none px-8 pt-6">
          <h1 className="display text-[26px] tracking-tight">概念图谱</h1>
          <p className="mt-1.5 max-w-[520px] text-[12px] leading-relaxed text-[var(--text-faint)]">
            {concepts.length} 个文明基本变量 · {edges.length} 条因果边。改一条规则 = 扰动它挂载的概念，扰动沿边传导，新稳态就是你的新文明。
          </p>
        </header>

        <div className="flex flex-none flex-wrap items-center gap-2 px-8 pt-4">
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: 'explore', label: '探索邻接' },
              { value: 'propagate', label: '扰动传导' },
            ]}
          />
          {mode === 'propagate' && (
            <div className="flex items-center gap-1.5 text-[14px] text-[var(--text-faint)]">
              阶数
              {[1, 2, 3].map((d) => (
                <button
                  key={d}
                  onClick={() => setDepth(d)}
                  className={cx(
                    'h-5 w-5 rounded-[2px] border text-[12px] transition-colors',
                    depth === d
                      ? 'border-[var(--accent)] text-[var(--accent)]'
                      : 'border-[var(--line)] text-[var(--text-faint)] hover:border-[var(--text-faint)]',
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          )}
          <label className="flex cursor-pointer items-center gap-1.5 text-[14px] text-[var(--text-faint)]">
            <input
              type="checkbox"
              checked={showWeak}
              onChange={(e) => setShowWeak(e.target.checked)}
              className="accent-[var(--accent)]"
            />
            显示弱边 {edges.length - drawn.length > 0 && `(${edges.length - drawn.length})`}
          </label>
          {focus && (
            <Button size="sm" variant="quiet" onClick={() => setFocus(null)}>
              取消聚焦
            </Button>
          )}
          {mode === 'propagate' && !focus && (
            <span className="text-[12px] text-[var(--accent)]">← 先点一个概念作为扰动入口</span>
          )}
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-3">
          <svg
            viewBox={`${-VB} ${-VB} ${VB * 2} ${VB * 2}`}
            preserveAspectRatio="xMidYMid meet"
            className="h-full w-full"
            aria-label={`概念图谱：${concepts.length} 个概念按六类排成环，${edges.length} 条因果边。Tab 逐个聚焦，回车展开详情。`}
            onMouseLeave={() => setHover(null)}
          >
            <defs>
              <marker id="cg-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto">
                <path d="M0 0.8 L7.2 4 L0 7.2" fill="none" stroke="context-stroke" strokeWidth="1.4" />
              </marker>
            </defs>

            {/* 空白处点一下 = 取消聚焦 */}
            {/* 鼠标便利，不是可达路径——键盘走「取消聚焦」按钮 */}
            <rect
              aria-hidden
              x={-VB}
              y={-VB}
              width={VB * 2}
              height={VB * 2}
              fill="transparent"
              onClick={() => setFocus(null)}
              onMouseEnter={() => setHover(null)}
            />

            {/* 因果边 */}
            <g fill="none">
              {drawn.map((e) => {
                const a = placed.get(e.src)
                const b = placed.get(e.dst)
                if (!a || !b) return null
                const lit = edgeLit(e)
                const color = feedbackColor(e.feedback)
                return (
                  <path
                    key={e.id}
                    d={edgePath(a, b)}
                    stroke={color}
                    strokeWidth={lit && active ? (e.strength === '强' ? 1.5 : 1) : e.strength === '强' ? 0.9 : 0.6}
                    strokeDasharray={e.strength === '弱' ? '2.5 3' : undefined}
                    strokeLinecap="round"
                    opacity={active || hoverCat ? (lit ? 0.9 : 0.04) : 0.3}
                    markerEnd={lit && activeIsFocus ? 'url(#cg-arrow)' : undefined}
                    className="transition-opacity duration-300"
                  />
                )
              })}
            </g>

            {/* 六类色带 + 曲线类名 */}
            <g>
              {arcs.map((g) => {
                const activeCat = active ? placed.get(active)?.cat : null
                const dim = hoverCat ? hoverCat !== g.cat : activeCat ? activeCat !== g.cat : false
                // 类名一律横排——中文沿弧走会在左右两侧变成竖排，读不动
                const c = Math.cos(g.mid)
                const lx = q((R + 92) * c)
                const ly = q((R + 92) * Math.sin(g.mid))
                const anchor = Math.abs(c) < 0.3 ? 'middle' : c > 0 ? 'start' : 'end'
                return (
                  <g
                    key={g.cat}
                    className="cursor-pointer transition-opacity duration-300"
                    opacity={dim ? 0.3 : 1}
                    onMouseEnter={() => setHoverCat(g.cat)}
                    onMouseLeave={() => setHoverCat(null)}
                  >
                    <path d={arcPath(R + 7, g.a0, g.a1)} fill="none" stroke={catColor(g.cat)} strokeWidth={2.5} strokeLinecap="round" opacity={0.75} />
                    <text
                      x={lx}
                      y={ly}
                      textAnchor={anchor}
                      dominantBaseline="middle"
                      style={{ fontSize: 11, fill: catColor(g.cat), letterSpacing: '0.2em', fontWeight: 500 }}
                    >
                      {g.cat}
                    </text>
                  </g>
                )
              })}
            </g>

            {/* 概念节点 */}
            <g>
              {[...placed.values()].map((n) => {
                const lit = isLit(n.name)
                const isFocus = n.name === focus
                const isHover = n.name === hover
                const lvl = activeIsFocus && mode === 'propagate' ? wave?.level.get(n.name) : undefined
                const deg = q((n.ang * 180) / Math.PI)
                const flip = Math.cos(n.ang) < 0
                return (
                  <g
                    key={n.name}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isFocus}
                    aria-label={`${n.name}，${n.cat}，${n.deg} 条边${lvl != null && lvl > 0 ? `，${lvl} 阶` : ''}`}
                    className="cursor-pointer outline-none transition-opacity duration-300"
                    opacity={lit ? 1 : 0.14}
                    onClick={(ev) => {
                      ev.stopPropagation()
                      setFocus(n.name === focus ? null : n.name)
                    }}
                    onKeyDown={(ev) => {
                      if (ev.key !== 'Enter' && ev.key !== ' ') return
                      ev.preventDefault()
                      setFocus(n.name === focus ? null : n.name)
                    }}
                    onMouseEnter={() => setHover(n.name)}
                    // 键盘聚焦复用悬停那套高亮：Tab 到哪就预览到哪
                    onFocus={() => setHover(n.name)}
                    onBlur={() => setHover(null)}
                  >
                    {/* 命中区：比圆点大，好点 */}
                    <circle cx={n.x} cy={n.y} r={13} fill="transparent" />
                    {(isFocus || isHover) && (
                      <circle
                        cx={n.x}
                        cy={n.y}
                        r={n.r + 6}
                        fill="none"
                        stroke={isFocus ? 'var(--accent)' : catColor(n.cat)}
                        strokeWidth={1}
                        opacity={0.55}
                      />
                    )}
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={n.r}
                      fill={isFocus ? 'var(--accent)' : catColor(n.cat)}
                      stroke="var(--bg)"
                      strokeWidth={1.5}
                    />
                    <g transform={`rotate(${deg} ${n.x} ${n.y}) translate(${n.x} ${n.y})`}>
                      <text
                        x={flip ? -(n.r + 9) : n.r + 9}
                        y={0}
                        transform={flip ? 'rotate(180)' : undefined}
                        textAnchor={flip ? 'end' : 'start'}
                        dominantBaseline="middle"
                        className="pointer-events-none select-none"
                        style={{
                          fontSize: 12,
                          fill: isFocus ? 'var(--accent)' : isHover ? 'var(--text)' : 'var(--text-dim)',
                          fontWeight: isFocus || isHover ? 600 : 400,
                        }}
                      >
                        {n.name}
                        {lvl != null && lvl > 0 && (
                          <tspan style={{ fill: 'var(--text-faint)', fontSize: 11 }}> {lvl}阶</tspan>
                        )}
                      </text>
                    </g>
                  </g>
                )
              })}
            </g>

            {/* 圆心：聚焦对象，兼作视觉重心 */}
            {focused && (
              <g className="pointer-events-none seat">
                <circle r={62} fill="var(--bg)" opacity={0.82} />
                <text
                  textAnchor="middle"
                  y={-4}
                  style={{ fontSize: 26, fontFamily: 'var(--font-serif)', fill: 'var(--text)', letterSpacing: '0.04em' }}
                >
                  {focused.name}
                </text>
                <text textAnchor="middle" y={17} style={{ fontSize: 11, fill: catColor(focused.cat), letterSpacing: '0.18em' }}>
                  {focused.cat}
                </text>
                <text textAnchor="middle" y={33} style={{ fontSize: 11, fill: 'var(--text-faint)' }}>
                  {focused.deg} 条边
                </text>
              </g>
            )}
          </svg>
        </div>

        {/* 图例：六类可划过高亮，正/负反馈色对照 */}
        <div className="flex flex-none flex-wrap items-center gap-x-5 gap-y-2 px-8 pb-5 pt-1 text-[12px] text-[var(--text-faint)]">
          {arcs.map((g) => (
            <button
              key={g.cat}
              onMouseEnter={() => setHoverCat(g.cat)}
              onMouseLeave={() => setHoverCat(null)}
              className={cx(
                'flex items-center gap-1.5 transition-colors',
                hoverCat === g.cat ? 'text-[var(--text)]' : 'hover:text-[var(--text-dim)]',
              )}
            >
              <span className="h-[7px] w-[7px] rounded-full" style={{ background: catColor(g.cat) }} />
              {g.cat}
              <span className="num opacity-60">{g.n}</span>
            </button>
          ))}
          <span className="ml-auto flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-[2px] w-4 rounded-full" style={{ background: 'var(--accent)' }} /> 正反馈 {stats.pos}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-[2px] w-4 rounded-full" style={{ background: 'var(--color-celadon)' }} /> 负反馈 {stats.neg}
            </span>
            <span>正反馈过采样 {(stats.pos / Math.max(1, stats.neg)).toFixed(1)}:1，推演时必须人工补刹车</span>
          </span>
        </div>
      </div>

      <aside className="w-full flex-none border-t border-[var(--line-soft)] lg:w-[340px] lg:overflow-y-auto lg:border-l lg:border-t-0 xl:w-[400px]">
        {focus ? (
          <div key={focus} className="seat seat-r px-7 py-6">
            <Eyebrow>{concepts.find((c) => c.name === focus)?.cat}</Eyebrow>
            <h2 className="mt-2 text-[18px] font-semibold tracking-tight">{focus}</h2>
            <p className="mt-1 text-[14px] text-[var(--text-dim)]">
              {concepts.find((c) => c.name === focus)?.desc}
            </p>

            {mode === 'propagate' && wave && (
              <div className="mt-5 border border-[var(--line-soft)] p-4">
                <Eyebrow>扰动路径图 · {depth} 阶</Eyebrow>
                <p className="mt-1.5 text-[12px] text-[var(--text-faint)]">
                  被波及 {wave.level.size - 1} 个概念。人工推到三阶足够支撑一本书。
                </p>
                <div className="mt-2.5 space-y-1.5">
                  {[1, 2, 3].slice(0, depth).map((d) => {
                    const hit = [...wave.level.entries()].filter(([, v]) => v === d).map(([k]) => k)
                    if (!hit.length) return null
                    return (
                      <div key={d} className="flex gap-2.5 text-[14px]">
                        <span className="w-8 flex-none text-[var(--text-faint)]">{d} 阶</span>
                        <span className="flex-1 leading-relaxed text-[var(--text-dim)]">{hit.join(' · ')}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {loops.length > 0 && (
              <div className="mt-5">
                <Eyebrow>反馈环</Eyebrow>
                <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--text-faint)]">
                  正反馈环＝阶层固化引擎（反派的结构性根基）；负反馈环＝世界为什么还没崩（主角的杠杆）。
                </p>
                <div className="mt-2.5 space-y-1.5">
                  {loops.map((l, i) => (
                    <div key={i} className="flex items-baseline gap-2">
                      <Chip tone={l.feedback === '正' ? 'accent' : 'good'}>{l.feedback}</Chip>
                      <span className="text-[14px] leading-relaxed text-[var(--text-dim)]">{l.nodes.join(' → ')}</span>
                    </div>
                  ))}
                </div>
                {loops.every((l) => l.feedback === '正') && (
                  <p className="mt-2.5 rounded-[2px] border border-[var(--accent)]/30 bg-[var(--accent)]/6 px-3 py-2 text-[12px] leading-relaxed text-[var(--accent)]">
                    全是正反馈环 —— 任何扰动都会指数发散，世界三卷内必崩。补一个刹车：制度（税收/配额/禁令）、物理（上限/递减）、社会（伦理反弹）、或对手（既得利益者的镇压，刹车本身就是反派）。
                  </p>
                )}
              </div>
            )}

            {focusEdges && (
              <div className="mt-5 space-y-4">
                {(['out', 'inc'] as const).map((dir) => {
                  const arr = focusEdges[dir]
                  if (!arr.length) return null
                  return (
                    <div key={dir}>
                      <Eyebrow>{dir === 'out' ? `出边 ${focus} → …` : `入边 … → ${focus}`}</Eyebrow>
                      <table className="mt-1.5 w-full">
                        <tbody>
                          {arr.map((e, i) => (
                            <tr key={i} className="border-b border-[var(--line-soft)] last:border-0">
                              <td className="py-1.5 pr-2 text-[14px] font-medium">{dir === 'out' ? e.dst : e.src}</td>
                              <td className="py-1.5 pr-2 text-[12px] text-[var(--text-faint)]">{e.strength}</td>
                              <td className="py-1.5 pr-2">
                                <Chip tone={e.feedback === '正' ? 'accent' : e.feedback === '负' ? 'good' : 'mute'}>
                                  {e.feedback}
                                </Chip>
                              </td>
                              <td className="py-1.5 text-[14px] leading-snug text-[var(--text-dim)]">{e.mechanism}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                })}
              </div>
            )}

            <EdgeForge focus={focus} concepts={concepts} />

            {mountedRules.length > 0 && (
              <div className="mt-6">
                <Eyebrow>挂载规则 {mountedRules.length} 条</Eyebrow>
                <div className="mt-2 space-y-1">
                  {mountedRules.slice(0, 24).map((r) => (
                    <div key={r.id} className="flex items-center gap-2">
                      <Ticks n={r.star} />
                      <span className="flex-1 truncate text-[14px] text-[var(--text-dim)]">{r.name}</span>
                      {r.embodiable && <span className="text-[11px] text-[var(--color-celadon)]">握</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="px-7 py-10">
            <Eyebrow>用法</Eyebrow>
            <div className="mt-3 space-y-4 text-[14px] leading-[1.85] text-[var(--text-dim)]">
              <p>
                环上按六类排布，类内按连边数降序——每类开头那几个就是枢纽概念。
                划过预览，点一下聚焦；切到<span className="text-[var(--accent)]">扰动传导</span>
                模式，看改写这个概念之后波及到哪些变量，这就是《扰动路径图》。
              </p>
              <p>
                <span className="font-medium text-[var(--text)]">最高级的玩法不是改规则，是改边。</span>
                把一条现实弱边改成强边——"婚姻→信用→贷款额度"——不需要任何超自然设定，一个社会立刻长出相亲黑市、假结婚产业、离婚做空基金。
              </p>
              <p className="text-[var(--text-faint)]">判据：改边后问"最先失业的是谁、最先暴富的是谁"。答得出来，边就改对了。</p>
            </div>
            <div className="mt-7">
              <Eyebrow>连边最多的概念</Eyebrow>
              <div className="mt-2.5 space-y-1">
                {[...placed.values()]
                  .sort((a, b) => b.deg - a.deg)
                  .slice(0, 10)
                  .map((n) => (
                    <button
                      key={n.name}
                      onClick={() => setFocus(n.name)}
                      onMouseEnter={() => setHover(n.name)}
                      onMouseLeave={() => setHover(null)}
                      className="flex w-full items-center gap-2 rounded-[2px] px-1 py-[3px] text-left text-[14px] text-[var(--text-dim)] transition-colors hover:bg-[var(--bg-sunk)] hover:text-[var(--text)]"
                    >
                      <span className="h-[6px] w-[6px] flex-none rounded-full" style={{ background: catColor(n.cat) }} />
                      <span className="flex-1 truncate">{n.name}</span>
                      <span className="num text-[12px] text-[var(--text-faint)]">{n.deg}</span>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}

/** 改边：把一条现实弱边改成强边，或补一条负反馈刹车 */
function EdgeForge({ focus, concepts }: { focus: string; concepts: Concept[] }) {
  const [open, setOpen] = useState(false)
  const [dst, setDst] = useState('')
  const [feedback, setFeedback] = useState('负')
  const [mech, setMech] = useState('')
  const [busy, setBusy] = useState(false)

  if (!open)
    return (
      <div className="mt-5">
        <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
          改边 / 补一条刹车
        </Button>
      </div>
    )

  return (
    <div className="mt-5 border border-[var(--line-soft)] p-4">
      <Eyebrow>新增因果边</Eyebrow>
      <div className="mt-2.5 space-y-2">
        <div className="flex items-center gap-2 text-[14px]">
          <span className="text-[var(--text-dim)]">{focus}</span>
          <span className="text-[var(--text-faint)]">→</span>
          <select value={dst} onChange={(e) => setDst(e.target.value)} className="field h-8 flex-1">
            <option value="">目标概念</option>
            {concepts.filter((c) => c.name !== focus).map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-1">
          {['正', '负', '中'].map((f) => (
            <button
              key={f}
              onClick={() => setFeedback(f)}
              className={cx(
                'flex-1 rounded-[2px] border px-2 py-1 text-[12px]',
                feedback === f ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--line)] text-[var(--text-faint)]',
              )}
            >
              {f}反馈
            </button>
          ))}
        </div>
        <input
          value={mech}
          onChange={(e) => setMech(e.target.value)}
          placeholder="传导机制：为什么会这样（一句话）"
          className="field h-8"
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="solid"
            disabled={!dst || busy}
            onClick={async () => {
              setBusy(true)
              await addEdge({ src: focus, dst, strength: '强', direction: '单向', feedback, mechanism: mech })
              setBusy(false)
              setOpen(false)
              setDst('')
              setMech('')
            }}
          >
            加入图谱
          </Button>
          <Button size="sm" variant="quiet" onClick={() => setOpen(false)}>
            取消
          </Button>
        </div>
      </div>
    </div>
  )
}
