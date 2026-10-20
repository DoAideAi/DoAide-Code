import { useEffect, useRef } from 'react'

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

function Body({ content }) {
  return splitFences(content).map((part, i) =>
    part.kind === 'code' ? (
      <pre
        key={i}
        className="my-2 overflow-x-auto rounded-md border border-zinc-800 bg-black/40 p-3 font-mono text-[13px] leading-relaxed text-zinc-200"
      >
        <code>{part.value}</code>
      </pre>
    ) : (
      <span key={i} className="whitespace-pre-wrap">
        {part.value}
      </span>
    ),
  )
}

function Message({ message }) {
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
  return (
    <div className={`leading-relaxed ${message.status === 'error' ? 'text-red-300' : 'text-zinc-200'}`}>
      {message.content ? <Body content={message.content} /> : null}
      {streaming && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-zinc-400 align-middle" />}
      {message.status === 'stopped' && <div className="mt-1 text-xs text-zinc-500">stopped</div>}
    </div>
  )
}

export default function MessageList({ messages }) {
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
          <Message key={m.id} message={m} />
        ))}
        <div ref={end} />
      </div>
    </main>
  )
}
