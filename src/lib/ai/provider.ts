import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { getSetting } from '../db'

export type ProviderId = 'claude-cli' | 'codex-cli' | 'anthropic-api'

export interface ProviderInfo {
  id: ProviderId
  label: string
  desc: string
  needsKey: boolean
  defaultModel: string
}

export const PROVIDERS: ProviderInfo[] = [
  {
    id: 'claude-cli',
    label: 'Claude CLI',
    desc: '调用本机 claude 命令，复用你已登录的订阅，无需 API key。',
    needsKey: false,
    defaultModel: 'opus',
  },
  {
    id: 'anthropic-api',
    label: 'Anthropic API',
    desc: '直接调 Messages API，延迟最低、可控性最好。需要 ANTHROPIC_API_KEY。',
    needsKey: true,
    defaultModel: 'claude-opus-5',
  },
  {
    id: 'codex-cli',
    label: 'Codex CLI',
    desc: '调用本机 codex 命令。作为备用后端 / 交叉验证用。',
    needsKey: false,
    defaultModel: 'gpt-5-codex',
  },
]

export function currentProvider(): ProviderId {
  const v = getSetting('ai.provider', process.env.TENON_AI_PROVIDER ?? 'claude-cli')
  return (PROVIDERS.some((p) => p.id === v) ? v : 'claude-cli') as ProviderId
}

export function currentModel(p: ProviderId = currentProvider()): string {
  return getSetting(`ai.model.${p}`, '') || PROVIDERS.find((x) => x.id === p)!.defaultModel
}

/** 跑 AI 的工作目录：独立空目录，避免 CLI 把本仓库的 CLAUDE.md / git 状态带进上下文 */
function workdir(): string {
  const d = path.join(os.tmpdir(), 'tenon-ai')
  fs.mkdirSync(d, { recursive: true })
  return d
}

export interface RunOpts {
  system?: string
  provider?: ProviderId
  model?: string
  /** 流式回调：拿到增量文本 */
  onChunk?: (t: string) => void
  signal?: AbortSignal
}

export interface RunResult {
  text: string
  provider: ProviderId
  model: string
  ms: number
}

export async function runAI(prompt: string, opts: RunOpts = {}): Promise<RunResult> {
  const provider = opts.provider ?? currentProvider()
  const model = opts.model ?? currentModel(provider)
  const t0 = Date.now()
  let text = ''

  if (provider === 'anthropic-api') {
    text = await viaApi(prompt, model, opts)
  } else if (provider === 'codex-cli') {
    text = await viaCodex(prompt, model, opts)
  } else {
    text = await viaClaude(prompt, model, opts)
  }

  return { text: text.trim(), provider, model, ms: Date.now() - t0 }
}

/* ── Anthropic API ────────────────────────────── */

async function viaApi(prompt: string, model: string, opts: RunOpts): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('未设置 ANTHROPIC_API_KEY。在项目根目录的 .env.local 里加上，或在设置里改用 Claude CLI 后端。')
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey: key })
  let out = ''
  const stream = client.messages.stream(
    {
      model,
      max_tokens: 16000,
      system: opts.system,
      messages: [{ role: 'user', content: prompt }],
    },
    { signal: opts.signal },
  )
  stream.on('text', (t) => {
    out += t
    opts.onChunk?.(t)
  })
  await stream.finalMessage()
  return out
}

/* ── CLI 通用执行 ─────────────────────────────── */

/**
 * CLI 子进程的环境。
 * 若本应用是从另一个 agent 会话里启动的，父进程环境里可能带着**那个会话专用**的鉴权变量，
 * 传给子 CLI 会直接 401。这里把它们摘掉，让 CLI 走用户自己的登录态。
 */
const STRIP =
  /^(ANTHROPIC_(API_KEY|AUTH_TOKEN|BASE_URL|MODEL|SMALL_FAST_MODEL|CUSTOM_HEADERS)|CLAUDE_CODE_.*|CLAUDECODE|CLAUDE_CONFIG_DIR|AWS_BEARER_TOKEN_BEDROCK|OPENAI_API_KEY)$/

function cliEnv(): Record<string, string> {
  const env: Record<string, string> = { NO_COLOR: '1' }
  for (const [k, v] of Object.entries(process.env))
    if (!STRIP.test(k) && typeof v === 'string') env[k] = v
  return env
}

function exec(
  cmd: string,
  args: string[],
  stdin: string,
  opts: RunOpts,
  hint: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: workdir(), env: cliEnv() as NodeJS.ProcessEnv })
    let out = ''
    let err = ''
    const kill = () => child.kill('SIGTERM')
    opts.signal?.addEventListener('abort', kill)

    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (d: string) => {
      out += d
      opts.onChunk?.(d)
    })
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (d: string) => (err += d))
    child.on('error', (e) =>
      reject(new Error(`无法启动 ${cmd}：${e.message}。${hint}`)),
    )
    child.on('close', (code) => {
      opts.signal?.removeEventListener('abort', kill)
      if (code === 0) resolve(out)
      else reject(new Error(`${cmd} 退出码 ${code}${err ? `：${err.slice(0, 600)}` : ''}`))
    })
    child.stdin.write(stdin)
    child.stdin.end()
  })
}

/* ── claude CLI ───────────────────────────────── */

async function viaClaude(prompt: string, model: string, opts: RunOpts): Promise<string> {
  const args = [
    '-p',
    '--output-format', 'text',
    '--model', model,
    // 不加载任何 MCP server，省启动时间也避免副作用
    '--strict-mcp-config',
    '--mcp-config', '{"mcpServers":{}}',
  ]
  if (opts.system) args.push('--append-system-prompt', opts.system)
  return exec('claude', args, prompt, opts, '确认 claude CLI 已安装并已登录（终端里跑一次 `claude` 试试）。')
}

/* ── codex CLI ────────────────────────────────── */

async function viaCodex(prompt: string, model: string, opts: RunOpts): Promise<string> {
  const outFile = path.join(workdir(), `out-${Date.now()}.txt`)
  const args = [
    'exec',
    '--skip-git-repo-check',
    '--color', 'never',
    '-m', model,
    '-o', outFile,
    '-',
  ]
  const body = opts.system ? `${opts.system}\n\n---\n\n${prompt}` : prompt
  // codex 的 stdout 混着执行日志，最终答案取 --output-last-message 落盘的那份
  const raw = await exec('codex', args, body, { ...opts, onChunk: undefined }, '确认 codex CLI 已安装并已登录。')
  try {
    const last = fs.readFileSync(outFile, 'utf8')
    fs.unlinkSync(outFile)
    if (last.trim()) {
      opts.onChunk?.(last)
      return last
    }
  } catch {
    /* 落盘失败就退回 stdout */
  }
  opts.onChunk?.(raw)
  return raw
}

/* ── 可用性自检 ───────────────────────────────── */

export async function probe(p: ProviderId): Promise<{ ok: boolean; detail: string }> {
  if (p === 'anthropic-api')
    return process.env.ANTHROPIC_API_KEY
      ? { ok: true, detail: '已读到 ANTHROPIC_API_KEY' }
      : { ok: false, detail: '未设置 ANTHROPIC_API_KEY' }
  const cmd = p === 'claude-cli' ? 'claude' : 'codex'
  return new Promise((resolve) => {
    const c = spawn(cmd, ['--version'], { cwd: workdir(), env: cliEnv() as NodeJS.ProcessEnv })
    let out = ''
    c.stdout.on('data', (d) => (out += d))
    c.on('error', () => resolve({ ok: false, detail: `未找到 ${cmd} 命令` }))
    c.on('close', (code) =>
      resolve(code === 0 ? { ok: true, detail: out.trim().slice(0, 80) } : { ok: false, detail: `${cmd} --version 失败` }),
    )
  })
}
