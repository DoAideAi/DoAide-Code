// Conversation export: the whole conversation (not just the page on screen) as a Markdown file.
import { fetchEarlierMessages } from './api.js'
import { footer } from './components/MessageList.jsx'

const PAGE = 100
// 50 pages of 100: far past any real conversation, and a loop that cannot run forever.
const MAX_PAGES = 50

// Every message of the session, oldest first, by paging back from the latest.
export async function fetchAllMessages(token, sessionId, fetchPage = fetchEarlierMessages) {
  let messages = []
  let before = null
  for (let i = 0; i < MAX_PAGES; i++) {
    const page = await fetchPage(token, sessionId, before, PAGE)
    messages = [...(page.messages ?? []), ...messages]
    if (!page.has_more || !page.messages?.length) break
    before = page.messages[0].id
  }
  return messages
}

const SPEAKER = { user: 'You', assistant: 'DoAide', system: 'DoAide (command)' }

function stamp(seconds) {
  if (!seconds) return ''
  const d = new Date(seconds * 1000)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// The title: the session's, else the first thing the user asked.
export function conversationTitle(messages, title = null) {
  if (title) return title
  const first = messages.find((m) => m.role === 'user')?.content?.trim().split('\n')[0] ?? ''
  if (!first) return 'Conversation'
  return first.length > 60 ? `${first.slice(0, 57)}…` : first
}

export function toMarkdown(messages, { title = null, project = null, now = new Date() } = {}) {
  const lines = [`# ${conversationTitle(messages, title)}`, '']
  const about = [project && `Project: ${project}`, `Exported from DoAide Code on ${stamp(now.getTime() / 1000)}`]
  lines.push(`_${about.filter(Boolean).join(' · ')}_`, '')
  for (const m of messages) {
    if (!m.content?.trim()) continue
    const when = stamp(m.created_at)
    lines.push('---', '', `### ${SPEAKER[m.role] ?? m.role}${when ? ` · ${when}` : ''}`, '')
    lines.push(m.content.trimEnd(), '')
    const meta = m.role === 'assistant' ? footer(m.meta)?.text : null
    const notes = [meta, m.status === 'error' && 'failed', m.status === 'stopped' && 'stopped'].filter(Boolean)
    if (notes.length) lines.push(`_${notes.join(' · ')}_`, '')
  }
  return `${lines.join('\n').trimEnd()}\n`
}

// e.g. doaide-fix-the-login-bug-2026-10-22.md
export function exportFilename(title, now = new Date()) {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '')
  const date = stamp(now.getTime() / 1000).slice(0, 10)
  return `doaide-${slug || 'conversation'}-${date}.md`
}

export function downloadText(filename, text, type = 'text/markdown') {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }))
  const link = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

// Fetches the whole conversation and downloads it; returns the file name.
export async function exportConversation(token, sessionId, { title = null, project = null } = {}) {
  const messages = await fetchAllMessages(token, sessionId)
  const name = conversationTitle(messages, title)
  const filename = exportFilename(name)
  downloadText(filename, toMarkdown(messages, { title: name, project }))
  return filename
}
