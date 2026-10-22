import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { copyText } from '../copy.js'
import { explainFailure } from '../errors.js'
import { TOKEN_CLASS, highlight, langFor } from '../highlight.js'
import { parseDiff } from '../diff.js'
import { Markdown } from '../markdown.jsx'
import { loadKeys, shortcutLabel } from '../hooks/useShortcuts.js'
import useTypewriter from '../hooks/useTypewriter.js'

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

// Copies `text`; false when the browser refuses (no clipboard API and the fallback failed).
export { copyText }

const COPY_HEADER = 'rounded px-1.5 py-0.5 font-sans text-[11px] text-zinc-400 hover:bg-zinc-700/60 hover:text-zinc-100'
const COPY_INLINE = 'rounded-full bg-shade/25 px-2.5 py-1 font-sans text-xs text-zinc-400 hover:text-zinc-200'

function CopyButton({ text, inline = false }) {
  const [state, setState] = useState('idle') // idle | copied | failed
  useEffect(() => {
    if (state === 'idle') return undefined
    const timer = setTimeout(() => setState('idle'), 1500)
    return () => clearTimeout(timer)
  }, [state])
  return (
    <button
      type="button"
      data-testid="copy-code"
      aria-label={state === 'copied' ? 'Copied' : 'Copy code'}
      title="Copy code"
      // Without the fence's trailing newline: pasted into a terminal, it would run at once.
      onClick={async () => setState((await copyText(text.replace(/\n+$/, ''))) ? 'copied' : 'failed')}
      className={inline ? COPY_INLINE : COPY_HEADER}
    >
      {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : 'Copy'}
    </button>
  )
}

// Wrap long lines in code blocks, or scroll sideways: one choice for every block, remembered.
const WRAP_KEY = 'doaide-code-wrap'
const WRAP_EVENT = 'doaide-code-wrap'

function savedWrap() {
  try {
    return localStorage.getItem(WRAP_KEY) === '1'
  } catch {
    return false
  }
}

export function useWrap() {
  const [wrap, setWrap] = useState(savedWrap)
  useEffect(() => {
    const sync = () => setWrap(savedWrap())
    window.addEventListener(WRAP_EVENT, sync)
    return () => window.removeEventListener(WRAP_EVENT, sync)
  }, [])
  const toggle = () => {
    try {
      localStorage.setItem(WRAP_KEY, wrap ? '0' : '1')
    } catch {
      // Storage unavailable: this block still toggles.
    }
    setWrap(!wrap)
    window.dispatchEvent(new Event(WRAP_EVENT))
  }
  return [wrap, toggle]
}

// Highlighted tokens split into lines (a comment or string can span several).
export function tokenLines(tokens) {
  const lines = [[]]
  for (const t of tokens) {
    t.text.split('\n').forEach((part, i) => {
      if (i > 0) lines.push([])
      if (part) lines.at(-1).push({ text: part, kind: t.kind })
    })
  }
  // The fence's last newline ends the last line; it does not start an empty one.
  if (lines.length > 1 && lines.at(-1).length === 0) lines.pop()
  return lines
}

// A code block: a header with the language, Wrap and Copy; line numbers when it has more than one
// line (drawn by CSS, so they are never selected or copied).
export function CodeBlock({ value, lang = '' }) {
  const lines = useMemo(() => tokenLines(highlight(value, lang)), [value, lang])
  const [wrap, toggleWrap] = useWrap()
  const numbered = lines.length > 1
  return (
    <div className="my-2 overflow-hidden rounded-xl bg-shade/40">
      <div className="flex items-center gap-1 border-b border-line/[0.06] py-1 pl-3 pr-1.5 font-sans text-[11px] text-zinc-500">
        <span data-testid="code-lang" className="min-w-0 flex-1 truncate">
          {lang || 'code'}
        </span>
        <button
          type="button"
          data-testid="wrap-code"
          aria-pressed={wrap}
          title={wrap ? 'Scroll long lines' : 'Wrap long lines'}
          onClick={toggleWrap}
          className={`rounded px-1.5 py-0.5 hover:bg-zinc-700/60 hover:text-zinc-100 ${wrap ? 'text-sky-300' : 'text-zinc-400'}`}
        >
          Wrap
        </button>
        <CopyButton text={value} />
      </div>
      <pre
        className={`p-3 font-mono text-[13px] leading-relaxed text-zinc-200 ${
          wrap ? 'whitespace-pre-wrap break-words [overflow-wrap:anywhere]' : 'overflow-x-auto'
        }`}
      >
        <code
          data-lang={lang || undefined}
          className={numbered ? 'code-lines' : undefined}
          style={numbered ? { '--gutter': `${String(lines.length).length}ch` } : undefined}
        >
          {lines.map((line, i) => (
            <span key={i}>
              <span className={numbered ? 'code-line' : undefined}>
                {line.map((t, j) =>
                  t.kind ? (
                    <span key={j} className={TOKEN_CLASS[t.kind]}>
                      {t.text}
                    </span>
                  ) : (
                    t.text
                  ),
                )}
              </span>
              {i < lines.length - 1 && '\n'}
            </span>
          ))}
        </code>
      </pre>
    </div>
  )
}

// SEARCH/REPLACE edit blocks (complete, or still streaming in) shown as one line each: DoAide
// writes them to the files, and the finished reply carries only the summary.
const EDIT_BLOCK = /(^|\n)(?:([^\n`]+?\.\w{1,6})[ \t]*\n)?(?:```[\w+-]*\n)?<<<<<<< SEARCH\n[\s\S]*?(?:\n>>>>>>> REPLACE(?:\n```)?|$)/g

export function hideEdits(text) {
  return text.replace(EDIT_BLOCK, (_, start, path) => `${start}✎ Editing ${path ? path.trim() : 'a file'}…`)
}

// A long code block behind "Show code", copyable without opening it.
function CollapsedCode({ value, lang }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={open ? 'my-1.5' : 'my-1.5 flex flex-wrap items-center gap-1.5'}>
      <details data-testid="collapsed-code" className="text-xs text-zinc-400" onToggle={(e) => setOpen(e.currentTarget.open)}>
        <summary className="inline-flex cursor-pointer select-none items-center gap-1 rounded-full bg-shade/25 px-2.5 py-1 hover:text-zinc-200">
          {open ? 'Hide code' : 'Show code'} ({codeLines(value)} lines{lang ? `, ${lang}` : ''})
        </summary>
        <CodeBlock value={value} lang={lang} />
      </details>
      {!open && <CopyButton text={value} inline />}
    </div>
  )
}

function Body({ content }) {
  return splitFences(hideEdits(content)).map((part, i) =>
    part.kind === 'code' ? (
      codeLines(part.value) <= SHOWN_CODE_LINES ? (
        <CodeBlock key={i} value={part.value} lang={part.lang} />
      ) : (
        <CollapsedCode key={i} value={part.value} lang={part.lang} />
      )
    ) : (
      <Markdown key={i} text={part.value} />
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
    <ul data-testid="checks" className="mt-1 flex max-w-full flex-col gap-0.5 break-words px-1 text-[11px] [overflow-wrap:anywhere]">
      {failed.map((c, i) => (
        <li key={i} className="text-amber-300/90">
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

function ClaudeBadge({ tool, label = 'Claude Code' }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300">
      {label}
      {tool && <span className="text-amber-300/60">· {TOOL_LABELS[tool] ?? tool}</span>}
    </span>
  )
}

const DIFF_ROW = {
  add: 'bg-emerald-500/10',
  del: 'bg-red-500/10',
  ctx: '',
  note: 'text-zinc-500 italic',
}
const DIFF_SIGN = { add: ['+', 'text-emerald-400'], del: ['-', 'text-red-400'], ctx: [' ', ''], note: [' ', ''] }

// A file's diff: old and new line numbers, +/- marks, and the code highlighted for its language.
export function Diff({ text, path = '' }) {
  const lang = langFor(path)
  const rows = useMemo(() => parseDiff(text).map((r) => ({ ...r, tokens: r.kind === 'note' ? [{ text: r.text, kind: null }] : highlight(r.text, lang) })), [text, lang])
  return (
    <div data-testid="diff" className="max-h-96 overflow-auto bg-shade/40 font-mono text-[12px] leading-[1.45]">
      <table className="w-full border-collapse">
        <tbody>
          {rows.map((r, i) =>
            r.kind === 'hunk' ? (
              <tr key={i} data-kind="hunk" className="bg-sky-500/[0.06] text-sky-300/70">
                <td colSpan={4} className="select-none px-2 py-0.5">
                  ⋯ {r.text}
                </td>
              </tr>
            ) : (
              <tr key={i} data-kind={r.kind} className={DIFF_ROW[r.kind]}>
                <td className="w-0 select-none whitespace-nowrap px-1.5 text-right align-top text-zinc-600">{r.old ?? ''}</td>
                <td className="w-0 select-none whitespace-nowrap px-1.5 text-right align-top text-zinc-600">{r.new ?? ''}</td>
                <td className={`w-0 select-none pl-1 align-top ${DIFF_SIGN[r.kind][1]}`}>{DIFF_SIGN[r.kind][0]}</td>
                <td className="whitespace-pre pr-3 text-zinc-200">
                  {r.tokens.map((t, j) =>
                    t.kind ? (
                      <span key={j} className={TOKEN_CLASS[t.kind]}>
                        {t.text}
                      </span>
                    ) : (
                      t.text
                    ),
                  )}
                  {!r.text && ' '}
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
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

function Chevron({ open }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`h-3.5 w-3.5 shrink-0 text-zinc-500 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

// Edits under a reply, as a compact card inside the bubble: one line per file with its +/- counts,
// the diff one tap away. Chat edits are written at once, with no confirmation step and no Undo
// button (`/undo` in the chat still restores the files).
export function ChangeSet({ changes }) {
  // Diffs start collapsed: the reply is the summary, the code is in the files.
  const [open, setOpen] = useState(() => new Set())
  const toggle = (path) =>
    setOpen((prev) => {
      const next = new Set(prev)
      next.has(path) ? next.delete(path) : next.add(path)
      return next
    })
  return (
    <div data-testid="changeset" className="mt-2.5 overflow-hidden rounded-xl bg-shade/25 text-xs">
      <div className="flex items-center gap-1.5 px-3 pb-1 pt-2">
        <svg viewBox="0 0 24 24" aria-hidden="true" className={`h-3.5 w-3.5 ${CHANGE_STATUS[changes.status] ?? 'text-zinc-400'}`} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 20h4L19 9l-4-4L4 16v4z" />
        </svg>
        <span data-testid="changeset-status" className={`font-medium ${CHANGE_STATUS[changes.status] ?? 'text-zinc-400'}`}>
          {changeHeadline(changes)}
        </span>
      </div>
      {changes.files.map((file) => (
        <div key={file.path}>
          <button
            type="button"
            onClick={() => toggle(file.path)}
            aria-expanded={open.has(file.path)}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-line/[0.04]"
          >
            <Chevron open={open.has(file.path)} />
            <span className="min-w-0 flex-1 truncate font-mono text-zinc-200">{file.path}</span>
            {file.new_file && <span className="shrink-0 rounded bg-sky-500/15 px-1.5 text-[10px] text-sky-300">new</span>}
            <span className="shrink-0 font-mono">
              <span className="text-emerald-400">+{file.additions}</span>{' '}
              <span className="text-red-400">-{file.deletions}</span>
            </span>
          </button>
          {file.problems?.length > 0 && (
            <ul className="px-3 pb-1.5 pl-8 text-amber-300">
              {file.problems.map((p, i) => (
                <li key={i}>⚠ {p}</li>
              ))}
            </ul>
          )}
          {open.has(file.path) && <Diff text={file.diff} path={file.path} />}
        </div>
      ))}
      {changes.problems?.length > 0 && (
        <ul className="border-t border-line/[0.06] px-3 py-1.5 text-amber-300">
          {changes.problems.map((p, i) => (
            <li key={i}>⚠ {p}</li>
          ))}
        </ul>
      )}
      <div className="h-1" />
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

// Three bouncing dots, as in a messaging app while the other side types.
function TypingDots() {
  return (
    <span aria-hidden="true" className="inline-flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span key={i} className="typing-dot h-2 w-2 rounded-full bg-zinc-400" style={{ animationDelay: `${i * 0.16}s` }} />
      ))}
    </span>
  )
}

function Avatar() {
  return (
    <div aria-hidden="true" className="mb-5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-xs font-semibold text-white">
      D
    </div>
  )
}

// The reply's progress in a few words: working, done, stopped or failed; failed checks say "needs a look".
export function replyStatus(message) {
  if (message.status === 'streaming') {
    const label = message.content ? 'Writing…' : message.draft ? 'Checking…' : 'Working…'
    return { label, tone: 'text-sky-300' }
  }
  if (message.status === 'error') return { label: 'Couldn’t finish', tone: 'text-red-300' }
  if (message.status === 'stopped') return { label: 'Stopped', tone: 'text-zinc-400' }
  if ((message.meta?.checks?.items ?? []).some((c) => !c.ok)) return { label: 'Needs a look', tone: 'text-amber-300' }
  return { label: 'Done', tone: 'text-emerald-300/90' }
}

// A failed reply in plain words, with the raw error folded away for whoever needs it.
function Explained({ failure }) {
  return (
    <div data-testid="explained-error">
      <p className="font-medium">{failure.summary}</p>
      <div className="mt-1 text-sm text-red-200/80">
        <Body content={failure.hint} />
      </div>
      <details className="mt-2 text-xs text-red-200/70">
        <summary className="cursor-pointer select-none">Technical details</summary>
        <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-shade/40 p-2 font-mono">
          {failure.details}
        </pre>
      </details>
    </div>
  )
}

// Under a failed reply: what happened and, when the prompt is known, a button to send it again.
function Failure({ onRetry }) {
  return (
    <div data-testid="reply-error" role="alert" className="mt-1.5 flex items-center gap-2 px-1 text-xs text-red-300">
      <span>This task failed.</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full border border-red-500/40 px-2.5 py-0.5 text-red-200 hover:bg-red-500/10"
        >
          Retry
        </button>
      )}
    </div>
  )
}

// Keeps the bottom in view while a reply types out (if the reader is already near it).
const Follow = createContext(null)

function Reply({ message, onRetry }) {
  const streaming = message.status === 'streaming'
  // The faded draft the reader saw: the answer it became is not typed out a second time.
  const draftSeen = useRef('')
  if (message.draft) draftSeen.current = message.draft
  const content = useTypewriter(message.content ?? '', streaming, draftSeen.current)
  const typing = content.length < (message.content ?? '').length
  const follow = useContext(Follow)
  useEffect(() => {
    if (typing || streaming) follow?.()
  }, [content, typing, streaming, follow])
  const foot = footer(message.meta)
  const changes = message.meta?.changes
  const status = replyStatus(message)
  const error = message.status === 'error'
  const explained = error ? explainFailure(message.content) : null
  return (
    <div className="flex items-end gap-2">
      <Avatar />
      <div className="flex min-w-0 max-w-[88%] flex-col items-start sm:max-w-[80%]">
        <div
          className={`min-w-0 max-w-full rounded-[20px] rounded-bl-md px-4 py-2.5 leading-relaxed ${
            error ? 'bg-red-500/10 text-red-200' : 'bg-zinc-800/80 text-zinc-100'
          }`}
        >
          {streaming && !message.content && message.draft && (
            // The local model's attempt as it streams: shown faded until it passes its checks.
            <div data-testid="draft" className="opacity-60">
              <Body content={message.draft} />
              <div className="mt-1 text-xs text-zinc-400">
                Checking this answer…
                <Elapsed since={message.created_at} />
              </div>
            </div>
          )}
          {streaming && !message.content && !message.draft && (
            <div className="flex flex-col gap-0.5">
              <TypingDots />
              <div data-testid="working" className="text-xs text-zinc-400">
                Working on your laptop…
                <Elapsed since={message.created_at} />
              </div>
            </div>
          )}
          {explained ? (
            <Explained failure={explained} />
          ) : content ? (
            <Body content={content} />
          ) : null}
          {error && !message.content && <p>The task stopped with an error before it answered.</p>}
          {(streaming || typing) && content && (
            <span className="ml-1 inline-block h-2 w-2 animate-pulse rounded-full bg-zinc-400 align-middle" />
          )}
          {changes?.files?.length > 0 && !typing && <ChangeSet changes={changes} />}
        </div>
        <div className="mt-1 flex max-w-full flex-wrap items-center gap-x-1.5 px-1 text-[11px] text-zinc-500 [overflow-wrap:anywhere]">
          <span data-testid="reply-status" className={status.tone}>
            {status.label}
          </span>
          {foot && !streaming && (
            <>
              <span aria-hidden="true">·</span>
              <span data-testid="usage" title={foot.title}>
                {foot.text}
              </span>
            </>
          )}
        </div>
        {!streaming && <Checks checks={message.meta?.checks} />}
        {error && <Failure onRetry={onRetry} />}
      </div>
    </div>
  )
}

function Message({ message, onRetry }) {
  const via = message.meta?.via === 'mcp'
  // A task Dispatch sent through the Tasks API: labelled like a Claude Code call; the reply is a normal one.
  const dispatch = message.meta?.via === 'dispatch'
  if ((via || dispatch) && message.role === 'user') {
    return (
      <div data-testid={dispatch ? 'dispatch-instruction' : 'mcp-instruction'} className="flex flex-col items-end gap-1">
        {dispatch ? <ClaudeBadge label="Dispatch" /> : <ClaudeBadge tool={message.meta.tool} />}
        <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-[20px] rounded-br-md bg-amber-500/15 px-4 py-2.5 text-zinc-100 sm:max-w-[75%]">
          {message.content}
        </div>
      </div>
    )
  }
  if (via && message.meta.tool !== 'execute_code' && message.status !== 'streaming') {
    // Tool output (file reads, commands): kept, but folded away.
    const first = message.content.split('\n')[0] || '(no output)'
    return (
      <details className="ml-9 max-w-[85%] self-start rounded-xl bg-zinc-900/80 text-xs">
        <summary className={`cursor-pointer truncate px-3 py-1.5 font-mono ${message.status === 'error' ? 'text-red-300' : 'text-zinc-400'}`}>
          {first}
        </summary>
        <pre className="max-h-80 overflow-auto rounded-b-xl bg-shade/40 p-2 font-mono text-[12px] text-zinc-300">
          {message.content}
        </pre>
      </details>
    )
  }
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-[20px] rounded-br-md bg-sky-600 px-4 py-2.5 text-white sm:max-w-[75%]">
          {message.content}
        </div>
      </div>
    )
  }
  if (message.role === 'system') {
    // Command output and notices: a quiet note in the middle of the conversation.
    return (
      <div className="mx-auto w-full max-w-[92%] whitespace-pre-wrap break-words rounded-2xl bg-zinc-900/70 px-4 py-2.5 font-mono text-xs leading-relaxed text-zinc-400">
        {message.content}
      </div>
    )
  }
  if (message.status === 'queued') {
    return (
      <div className="flex items-end gap-2">
        <Avatar />
        <div role="status" className="flex flex-col gap-0.5 rounded-[20px] rounded-bl-md bg-zinc-800/50 px-4 py-2.5 text-sm text-zinc-400">
          <TypingDots />
          <span data-testid="queued">
            Queued for your laptop…
            <Elapsed since={message.created_at} />
          </span>
        </div>
      </div>
    )
  }
  return <Reply message={message} onRetry={onRetry} />
}

// Between pressing Send and the server's echo: the message is on its way.
function Pending() {
  return (
    <div className="flex items-end gap-2">
      <Avatar />
      <div role="status" data-testid="pending" className="flex flex-col gap-0.5 rounded-[20px] rounded-bl-md bg-zinc-800/50 px-4 py-2.5 text-xs text-zinc-400">
        <TypingDots />
        Sending…
      </div>
    </div>
  )
}

// The prompt a reply answered: the closest user message before it.
export function promptFor(messages, index) {
  for (let i = index - 1; i >= 0; i--) {
    if (messages[i].role === 'user') return messages[i].content
  }
  return null
}

const SUGGESTIONS = ['What does this project do?', 'Explain the main file in simple words', 'Find bugs in my latest changes']

// "⌘P commands · ⌘K new chat · ⌘L clear · Esc stop", with the keys chosen in Settings (off ones left out).
export function shortcutHints(keys = loadKeys()) {
  return [['palette', 'commands'], ['newChat', 'new chat'], ['clear', 'clear'], ['stop', 'stop']]
    .map(([action, what]) => shortcutLabel(keys, action) && `${shortcutLabel(keys, action)} ${what}`)
    .filter(Boolean)
    .join(' · ')
}

// `intro`: shown above the suggestions (the Getting started checklist).
function Welcome({ onSend, intro = null }) {
  return (
    <div className="mt-[12vh] flex flex-col items-center gap-4 px-2 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-xl font-semibold text-white">
        D
      </div>
      <div>
        <p className="text-lg font-medium text-zinc-100">What can I help with?</p>
        <p className="mt-1 text-sm text-zinc-500">Ask anything about your code. Type /help for commands.</p>
        <p data-testid="shortcut-hints" className="mt-2 hidden text-xs text-zinc-600 sm:block">
          {shortcutHints()}
        </p>
      </div>
      {intro}
      {onSend && (
        <div className="flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSend(s)}
              className="rounded-full border border-line/[0.08] bg-zinc-900 px-3.5 py-2 text-sm text-zinc-300 hover:border-sky-500/40 hover:text-zinc-100"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// onRetry(prompt) sends a failed reply's prompt again; null hides Retry (offline or busy).
// The oldest message the server knows (notices are client-only), to page back from.
export function oldestServerId(messages) {
  return messages.find((m) => !String(m.id).startsWith('notice-'))?.id ?? null
}

function LoadEarlier({ onLoad }) {
  const [state, setState] = useState('idle') // idle | loading | failed
  const load = async () => {
    setState('loading')
    try {
      await onLoad()
      setState('idle')
    } catch {
      setState('failed')
    }
  }
  return (
    <button
      type="button"
      data-testid="load-earlier"
      onClick={load}
      disabled={state === 'loading'}
      className="self-center rounded-full border border-zinc-700/60 px-3 py-1 text-xs text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-60"
    >
      {state === 'loading' ? 'Loading…' : state === 'failed' ? 'Could not load, try again' : 'Load earlier messages'}
    </button>
  )
}

export default function MessageList({
  messages,
  onSend = null,
  onRetry = null,
  hasMore = false,
  onLoadEarlier = null,
  pending = false,
  welcome = null,
}) {
  const scroller = useRef(null)
  const end = useRef(null)
  const last = messages[messages.length - 1]
  // Distance from the bottom before older messages were added above, to keep the view still.
  const fromBottom = useRef(null)
  useEffect(() => {
    end.current?.scrollIntoView?.({ block: 'end' })
  }, [last?.id, last?.content, pending])
  const follow = useCallback(() => {
    const el = scroller.current
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 200) el.scrollTop = el.scrollHeight
  }, [])
  useLayoutEffect(() => {
    const el = scroller.current
    if (el && fromBottom.current !== null) el.scrollTop = el.scrollHeight - fromBottom.current
    fromBottom.current = null
  }, [messages[0]?.id])

  const loadEarlier = async () => {
    const el = scroller.current
    fromBottom.current = el ? el.scrollHeight - el.scrollTop : null
    try {
      await onLoadEarlier()
    } catch (error) {
      fromBottom.current = null
      throw error
    }
  }

  return (
    <main ref={scroller} className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
      <Follow.Provider value={follow}>
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-3 py-5 text-[15px] sm:px-4">
        {hasMore && onLoadEarlier && <LoadEarlier onLoad={loadEarlier} />}
        {messages.length === 0 && !pending && <Welcome onSend={onSend} intro={welcome} />}
        {messages.map((m, i) => {
          const prompt = onRetry && m.status === 'error' ? promptFor(messages, i) : null
          return (
            // The anchor search results jump to.
            <div key={m.id} id={`msg-${m.id}`} className="scroll-mt-4">
              <Message message={m} onRetry={prompt ? () => onRetry(prompt) : null} />
            </div>
          )
        })}
        {pending && <Pending />}
        <div ref={end} />
      </div>
      </Follow.Provider>
    </main>
  )
}
