import { describe, expect, it, vi } from 'vitest'
import { conversationTitle, exportFilename, fetchAllMessages, toMarkdown } from './export.js'

const at = (iso) => new Date(iso).getTime() / 1000

describe('fetchAllMessages', () => {
  it('pages back from the latest until there is nothing older', async () => {
    const pages = {
      null: { messages: [{ id: 'm3' }, { id: 'm4' }], has_more: true },
      m3: { messages: [{ id: 'm1' }, { id: 'm2' }], has_more: false },
    }
    const fetchPage = vi.fn(async (_t, _s, before) => pages[before])
    const all = await fetchAllMessages('tok', 's1', fetchPage)
    expect(all.map((m) => m.id)).toEqual(['m1', 'm2', 'm3', 'm4'])
    expect(fetchPage).toHaveBeenCalledWith('tok', 's1', 'm3', 100)
  })

  it('stops on an empty page even if more is claimed', async () => {
    const fetchPage = vi.fn(async () => ({ messages: [], has_more: true }))
    expect(await fetchAllMessages('tok', 's1', fetchPage)).toEqual([])
    expect(fetchPage).toHaveBeenCalledOnce()
  })
})

describe('toMarkdown', () => {
  const messages = [
    { id: '1', role: 'user', content: 'fix the login bug\nit 500s', created_at: at('2026-10-22T09:05:00') },
    {
      id: '2',
      role: 'assistant',
      content: 'Fixed it:\n\n```py\nreturn user\n```\n',
      status: 'done',
      created_at: at('2026-10-22T09:06:00'),
      meta: { route: { executor: 'claude-sonnet', elapsed_ms: 4200 }, usage: { cost_usd: 0.012 } },
    },
    { id: '3', role: 'assistant', content: '', status: 'done' },
    { id: '4', role: 'assistant', content: 'Half', status: 'stopped' },
  ]

  it('writes a titled document with each message, its time and the reply footer', () => {
    const md = toMarkdown(messages, { project: 'shop', now: new Date('2026-10-22T10:00:00') })
    expect(md.startsWith('# fix the login bug\n\n_Project: shop · Exported from DoAide Code on 2026-10-22 10:00_')).toBe(true)
    expect(md).toContain('### You · 2026-10-22 09:05\n\nfix the login bug\nit 500s')
    expect(md).toContain('### DoAide · 2026-10-22 09:06\n\nFixed it:\n\n```py\nreturn user\n```\n\n_claude-sonnet · $0.01 · 4.2s_')
    expect(md).toContain('Half\n\n_stopped_')
    // Empty messages are left out.
    expect(md.match(/### /g)).toHaveLength(3)
    expect(md.endsWith('\n')).toBe(true)
  })

  it('titles by the session, else the first question, shortened', () => {
    expect(conversationTitle(messages, 'Login fix')).toBe('Login fix')
    expect(conversationTitle([{ role: 'user', content: 'x'.repeat(80) }])).toHaveLength(58)
    expect(conversationTitle([])).toBe('Conversation')
  })

  it('names the file from the title and the date', () => {
    const now = new Date('2026-10-22T10:00:00')
    expect(exportFilename('Fix the login bug!', now)).toBe('doaide-fix-the-login-bug-2026-10-22.md')
    expect(exportFilename('???', now)).toBe('doaide-conversation-2026-10-22.md')
  })
})
