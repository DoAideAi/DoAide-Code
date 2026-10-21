import { useEffect, useRef, useState } from 'react'

// Split text into prose and ``` fenced code segments. An unclosed fence (mid-stream) is code.
export function splitFences(text) {
  const parts = []
  const re = /```([\w+-]*)\n?([\s\S]*?)(```|$)/g
  let last = 0
  let m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ kind: 'text', value: text.slice(last, m.index) })
    parts.push({ kind: 'code', lang: m[1], value: m[2] })
    last = re.lastIndex
    if (m[0].length === 0) break
  }
  if (last < text.length) parts.push({ kind: 'text', value: text.slice(last) })
  return parts
}

// Code blocks longer than this many lines are collapsed: replies are summaries, and the code
// itself is in the files (or one click away).
export const SHOWN_CODE_LINES = 3

export function codeLines(value) {
  return value.replace(/\n$/, '').split('\n').length
}

function Code({ value }) {
  return (
    <pre className="my-2 overflow-x-auto rounded-md border border-zinc-800 bg-black/40 p-3 font-mono text-[13px] leading-relaxed text-zinc-200">
      <code>{value}</code>
    </pre>
  )
}

function Body({ content }) {
  return splitFences(content).map((part, i) =>
    part.kind === 'code' ? (
      codeLines(part.value) <= SHOWN_CODE_LINES ? (
        <Code key={i} value={part.value} />
      ) : (
        <details key={i} data-testid="collapsed-code" className="my-1 text-xs text-zinc-500">
          <summary className="cursor-pointer select-none hover:text-zinc-300">
            Show code ({codeLines(part.value)} lines{part.lang ? `, ${part.lang}` : ''})
          </summary>
          <Code value={part.value} />
        </details>
      )
    ) : (
      <span key={i} className="whitespace-pre-wrap">
        {part.value}
      </span>
    ),
  )
}

export function formatTokens(n) {
  if (!n) return '0'
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n)
}

export function formatCost(usd) {
  if (!usd) return '$0'
  return usd < 0.01 ? `$${usd.toFixed(4)}` : `$${usd.toFixed(2)}`
}

function modelName(route) {
  return route.model && !route.executor.includes(route.model) ? route.model : route.executor
}

export function formatSeconds(ms) {
  if (!ms && ms !== 0) return null
  return ms < 10_000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms / 1000)}s`
}

// The reply's footer in the three metrics: which model (quality is shown by failed checks),
// what it cost, how long it took. Tokens and the routing reasons are on hover.
export function footer(meta) {
  const route = meta?.route
  const usage = meta?.usage
  if (!route && !usage) return null
  let model = null
  if (route) {
    model = route.executor === 'direct' ? 'no model' : modelName(route)
    if (route.escalated_from) model += ` (escalated from ${modelName(route.escalated_from)})`
  }
  let cost
  if (usage?.cached) cost = 'cached, free'
  else if (route?.free || route?.executor === 'direct')
    cost = route?.would_cost_usd > 0 ? `free, saved ${formatCost(route.would_cost_usd)}` : 'free'
  else cost = usage?.cost_usd ? formatCost(usage.cost_usd) : 'cost not reported'
  const why = [...(route?.escalated_from ? [`escalated: ${route.escalated_from.reason}`] : []), ...(route?.reasons ?? [])]
  const tokens = usage && (usage.tokens_in || usage.tokens_out) ? `${formatTokens(usage.tokens_in)} in, ${formatTokens(usage.tokens_out)} out` : null
  return {
    text: [model, cost, formatSeconds(route?.elapsed_ms)].filter(Boolean).join(' · '),
    title: [tokens, ...why].filter(Boolean).join('; ') || undefined,
  }
}

// Failed checks under a reply (completeness, code syntax, edits); passing ones are not shown.
function Checks({ checks }) {
  const failed = (checks?.items ?? []).filter((c) => !c.ok)
  if (!failed.length) return null
  return (
    <ul data-testid="checks" className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
      {failed.map((c, i) => (
        <li key={i} className="text-red-300/90">
          ✗ {c.name}: {c.detail}
        </li>
      ))}
    </ul>
  )
}

const TOOL_LABELS = {
  execute_code: 'task',
  run_command: 'command',
  read_file: 'read',
  write_file: 'write',
  edit_file: 'edit',
  list_files: 'list',
  search_code: 'search',
  get_status: 'status',
  apply_changes: 'apply',
  discard_changes: 'discard',
}

function ClaudeBadge({ tool }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300">
      Claude Code
      {tool && <span className="text-amber-300/60">· {TOOL_LABELS[tool] ?? tool}</span>}
    </span>
  )
}

function Diff({ text }) {
  return (
    <pre className="overflow-x-auto bg-black/40 p-2 font-mono text-[12px] leading-snug">
      {text.split('\n').map((line, i) => {
        let color = 'text-zinc-400'
        if (line.startsWith('+++') || line.startsWith('---')) color = 'text-zinc-500'
        else if (line.startsWith('+')) color = 'text-emerald-300 bg-emerald-500/10'
        else if (line.startsWith('-')) color = 'text-red-300 bg-red-500/10'
        else if (line.startsWith('@@')) color = 'text-sky-300'
        return (
          <div key={i} className={color}>
            {line || ' '}
          </div>
        )
      })}
    </pre>
  )
}

const CHANGE_STATUS = {
  pending: 'text-amber-300',
  applied: 'text-emerald-300',
  discarded: 'text-zinc-500',
  undone: 'text-zinc-500',
}

// "Wrote 2 files", "1 file not written", "Undid 1 file".
export function changeHeadline(changes) {
  const n = changes.files.length
  const files = `${n} file${n === 1 ? '' : 's'}`
  if (changes.status === 'applied') return `Wrote ${files}`
  if (changes.status === 'pending') return `${files} not written`
  if (changes.status === 'undone') return `Undid ${files}`
  return `${files} discarded`
}

// Edits under a reply: written at once when every check passed (Undo restores the files), else
// held back with Apply / Discard. Diffs are one click away, collapsed by default.
export function ChangeSet({ changes, onSend }) {
  // Diffs start collapsed: the reply is the summary, the code is in the files.
  const [open, setOpen] = useState(() => new Set())
  const toggle = (path) =>
    setOpen((prev) => {
      const next = new Set(prev)
      next.has(path) ? next.delete(path) : next.add(path)
      return next
    })
  const pending = changes.status === 'pending'
  return (
    <div data-testid="changeset" className="mt-3 overflow-hidden rounded-md border border-zinc-800">
      <div className="flex items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs">
        <span data-testid="changeset-status" className={CHANGE_STATUS[changes.status] ?? 'text-zinc-400'}>
          {changeHeadline(changes)}
        </span>
        {changes.status === 'applied' && onSend && (
          <button
            type="button"
            onClick={() => onSend(`/undo ${changes.id}`)}
            className="rounded border border-zinc-700 px-2 py-0.5 text-zinc-300 hover:bg-zinc-800"
          >
            Undo
          </button>
        )}
        {pending && onSend && (
          <span className="flex gap-2">
            <button
              type="button"
              onClick={() => onSend(`/discard ${changes.id}`)}
              className="rounded border border-zinc-700 px-2 py-0.5 text-zinc-300 hover:bg-zinc-800"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={() => onSend(`/apply ${changes.id}`)}
              className="rounded bg-emerald-500/90 px-2 py-0.5 font-medium text-zinc-950 hover:bg-emerald-400"
            >
              Apply
            </button>
          </span>
        )}
      </div>
      {changes.files.map((file) => (
        <div key={file.path} className="border-b border-zinc-800/60 last:border-b-0">
          <button
            type="button"
            onClick={() => toggle(file.path)}
            className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left font-mono text-xs hover:bg-zinc-900"
          >
            <span className="truncate text-zinc-200">
              {file.path}
              {file.new_file && <span className="ml-2 text-zinc-500">new</span>}
            </span>
            <span className="shrink-0">
              <span className="text-emerald-400">+{file.additions}</span>{' '}
              <span className="text-red-400">-{file.deletions}</span>
            </span>
          </button>
          {file.problems?.length > 0 && (
            <ul className="px-3 pb-1.5 text-xs text-amber-300">
              {file.problems.map((p, i) => (
                <li key={i}>⚠ {p}</li>
              ))}
            </ul>
          )}
          {open.has(file.path) && <Diff text={file.diff} />}
        </div>
      ))}
      {changes.problems?.length > 0 && (
        <ul className="border-t border-zinc-800 px-3 py-1.5 text-xs text-amber-300">
          {changes.problems.map((p, i) => (
            <li key={i}>⚠ {p}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Seconds since a reply started, so a long run visibly makes progress.
function Elapsed({ since }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  const seconds = since ? Math.max(0, Math.round(now / 1000 - since)) : null
  return seconds === null ? null : <span className="tabular-nums"> {seconds}s</span>
}

function Message({ message, onSend }) {
  const via = message.meta?.via === 'mcp'
  if (via && message.role === 'user') {
    return (
      <div data-testid="mcp-instruction" className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] px-3 py-2">
        <ClaudeBadge tool={message.meta.tool} />
        <div className="mt-1.5 whitespace-pre-wrap text-zinc-100">{message.content}</div>
      </div>
    )
  }
  if (via && message.meta.tool !== 'execute_code' && message.status !== 'streaming') {
    // Tool output (file reads, commands): kept, but folded away.
    const first = message.content.split('\n')[0] || '(no output)'
    return (
      <details className="-mt-3 rounded-md border border-zinc-800/80 text-xs">
        <summary className={`cursor-pointer truncate px-3 py-1.5 font-mono ${message.status === 'error' ? 'text-red-300' : 'text-zinc-400'}`}>
          {first}
        </summary>
        <pre className="max-h-80 overflow-auto border-t border-zinc-800 bg-black/40 p-2 font-mono text-[12px] text-zinc-300">
          {message.content}
        </pre>
      </details>
    )
  }
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-zinc-800 px-4 py-2 text-zinc-100">
          {message.content}
        </div>
      </div>
    )
  }
  if (message.role === 'system') {
    return (
      <div className="whitespace-pre-wrap border-l-2 border-zinc-700 pl-3 font-mono text-xs text-zinc-400">
        {message.content}
      </div>
    )
  }
  const streaming = message.status === 'streaming'
  if (message.status === 'queued') {
    return <div className="text-sm text-zinc-500">Queued for your laptop…</div>
  }
  const foot = footer(message.meta)
  const changes = message.meta?.changes
  return (
    <div className={`leading-relaxed ${message.status === 'error' ? 'text-red-300' : 'text-zinc-200'}`}>
      {streaming && !message.content && (
        <div data-testid="working" className="text-sm text-zinc-500">
          Working on your laptop…
          <Elapsed since={message.created_at} />
        </div>
      )}
      {message.content ? <Body content={message.content} /> : null}
      {streaming && message.content && (
        <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-zinc-400 align-middle" />
      )}
      {changes?.files?.length > 0 && <ChangeSet changes={changes} onSend={onSend} />}
      {message.status === 'stopped' && <div className="mt-1 text-xs text-zinc-500">stopped</div>}
      {foot && !streaming && (
        <div data-testid="usage" title={foot.title} className="mt-1.5 text-[11px] text-zinc-600">
          {foot.text}
        </div>
      )}
      {!streaming && <Checks checks={message.meta?.checks} />}
    </div>
  )
}

export default function MessageList({ messages, onSend }) {
  const end = useRef(null)
  const last = messages[messages.length - 1]
  useEffect(() => {
    end.current?.scrollIntoView?.({ block: 'end' })
  }, [messages.length, last?.content])

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6 text-[15px]">
        {messages.length === 0 && (
          <p className="mt-24 text-center text-sm text-zinc-500">
            Ask anything about your code. Type /help for commands.
          </p>
        )}
        {messages.map((m) => (
          <Message key={m.id} message={m} onSend={onSend} />
        ))}
        <div ref={end} />
      </div>
    </main>
  )
}
