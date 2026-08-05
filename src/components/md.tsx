import React from 'react'

/** 零依赖 markdown 渲染。够用即可：标题/粗体/行内码/代码块/引用/列表/任务/表格/分隔线。 */

function inline(text: string, key: string | number = 0): React.ReactNode {
  const nodes: React.ReactNode[] = []
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[\[[^\]]+\]\])/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index))
    const t = m[0]
    if (t.startsWith('**')) nodes.push(<strong key={`${key}-${i++}`}>{t.slice(2, -2)}</strong>)
    else if (t.startsWith('`')) nodes.push(<code key={`${key}-${i++}`}>{t.slice(1, -1)}</code>)
    else nodes.push(<em key={`${key}-${i++}`}>{t.slice(2, -2)}</em>)
    last = m.index + t.length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

const splitRow = (line: string) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim())

export function Markdown({ src, className = '' }: { src: string; className?: string }) {
  const lines = src.replace(/\r\n/g, '\n').split('\n')
  const out: React.ReactNode[] = []
  let i = 0
  let k = 0

  while (i < lines.length) {
    const line = lines[i]

    // 代码块
    if (line.trimStart().startsWith('```')) {
      const buf: string[] = []
      i++
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) buf.push(lines[i++])
      i++
      out.push(
        <pre key={k++}>
          <code>{buf.join('\n')}</code>
        </pre>,
      )
      continue
    }

    // 表格
    if (line.trim().startsWith('|') && lines[i + 1]?.includes('---')) {
      const head = splitRow(line)
      i += 2
      const rows: string[][] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(splitRow(lines[i++]))
      out.push(
        <table key={k++}>
          <thead>
            <tr>
              {head.map((h, x) => (
                <th key={x}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, y) => (
              <tr key={y}>
                {r.map((c, x) => (
                  <td key={x}>{inline(c, `${y}-${x}`)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>,
      )
      continue
    }

    // 引用
    if (line.startsWith('>')) {
      const buf: string[] = []
      while (i < lines.length && lines[i].startsWith('>')) buf.push(lines[i++].replace(/^>\s?/, ''))
      out.push(<blockquote key={k++}>{inline(buf.join(' '), k)}</blockquote>)
      continue
    }

    // 列表（含任务项）
    if (/^\s*([-*]|\d+\.)\s/.test(line)) {
      const ordered = /^\s*\d+\.\s/.test(line)
      const items: React.ReactNode[] = []
      while (i < lines.length && /^\s*([-*]|\d+\.)\s/.test(lines[i])) {
        let t = lines[i++].replace(/^\s*([-*]|\d+\.)\s/, '')
        const task = /^\[[ xX]\]\s?/.test(t)
        if (task) t = t.replace(/^\[[ xX]\]\s?/, '')
        items.push(
          <li key={items.length} className={task ? 'task' : undefined}>
            <span>{inline(t, items.length)}</span>
          </li>,
        )
      }
      out.push(ordered ? <ol key={k++}>{items}</ol> : <ul key={k++}>{items}</ul>)
      continue
    }

    // 标题
    const h = line.match(/^(#{1,6})\s+(.*)$/)
    if (h) {
      const Tag = (h[1].length <= 2 ? 'h2' : 'h3') as 'h2' | 'h3'
      out.push(<Tag key={k++}>{inline(h[2], k)}</Tag>)
      i++
      continue
    }

    // 分隔线
    if (/^\s*([-*_]\s*){3,}$/.test(line)) {
      out.push(<hr key={k++} className="hairline my-4 border-0" />)
      i++
      continue
    }

    // 段落
    if (line.trim()) {
      const buf: string[] = [line]
      i++
      while (
        i < lines.length &&
        lines[i].trim() &&
        !/^\s*([-*]|\d+\.)\s/.test(lines[i]) &&
        !lines[i].startsWith('>') &&
        !lines[i].startsWith('#') &&
        !lines[i].trim().startsWith('|') &&
        !lines[i].trimStart().startsWith('```')
      )
        buf.push(lines[i++])
      out.push(<p key={k++}>{inline(buf.join(' '), k)}</p>)
      continue
    }
    i++
  }

  return <div className={`prose-tenon ${className}`}>{out}</div>
}
