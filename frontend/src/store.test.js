import { describe, expect, it } from 'vitest'
import { splitFences } from './components/MessageList.jsx'
import { applyEvent, initialChat, statusColor } from './store.js'

const msg = (id, role, content, status = 'done') => ({ id, role, content, status, created_at: 0 })

describe('applyEvent', () => {
  it('replaces state on snapshot', () => {
    const s = applyEvent(initialChat, {
      type: 'snapshot',
      session_id: 's1',
      project: 'alpha',
      status: 'idle',
      messages: [msg('1', 'user', 'hi')],
    })
    expect(s.sessionId).toBe('s1')
    expect(s.project).toBe('alpha')
    expect(s.messages).toHaveLength(1)
  })

  it('streams deltas into a message and finishes it', () => {
    let s = applyEvent(initialChat, { type: 'message', message: msg('a', 'assistant', '', 'streaming') })
    s = applyEvent(s, { type: 'delta', id: 'a', text: 'Hel' })
    s = applyEvent(s, { type: 'delta', id: 'a', text: 'lo' })
    expect(s.messages[0].content).toBe('Hello')
    s = applyEvent(s, { type: 'done', id: 'a', status: 'done', content: 'Hello!' })
    expect(s.messages[0]).toMatchObject({ content: 'Hello!', status: 'done' })
  })

  it('does not duplicate a repeated message event', () => {
    let s = applyEvent(initialChat, { type: 'message', message: msg('a', 'user', 'x') })
    s = applyEvent(s, { type: 'message', message: msg('a', 'user', 'x') })
    expect(s.messages).toHaveLength(1)
  })

  it('tracks project, status and notices; ignores unknown events', () => {
    let s = applyEvent(initialChat, { type: 'project', project: 'beta' })
    s = applyEvent(s, { type: 'status', state: 'busy' })
    s = applyEvent(s, { type: 'notice', text: 'wait' })
    expect(s.project).toBe('beta')
    expect(s.serverStatus).toBe('busy')
    expect(s.messages[0]).toMatchObject({ role: 'system', content: 'wait' })
    expect(applyEvent(s, { type: 'pong' })).toBe(s)
  })
})

describe('statusColor', () => {
  it('maps connection and server state to green/gray/red', () => {
    expect(statusColor('closed', 'idle')).toBe('gray')
    expect(statusColor('connecting', 'error')).toBe('gray')
    expect(statusColor('open', 'idle')).toBe('green')
    expect(statusColor('open', 'busy')).toBe('green')
    expect(statusColor('open', 'error')).toBe('red')
  })
})

describe('splitFences', () => {
  it('splits prose and code, including an unclosed fence mid-stream', () => {
    expect(splitFences('a\n```py\nx = 1\n```\nb')).toEqual([
      { kind: 'text', value: 'a\n' },
      { kind: 'code', lang: 'py', value: 'x = 1\n' },
      { kind: 'text', value: '\nb' },
    ])
    expect(splitFences('see ```js\nlet')).toEqual([
      { kind: 'text', value: 'see ' },
      { kind: 'code', lang: 'js', value: 'let' },
    ])
  })
})
