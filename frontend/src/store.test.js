import { describe, expect, it } from 'vitest'
import { footer, hideEdits, splitFences } from './components/MessageList.jsx'
import { applyEvent, initialChat, statusColor, usableTools } from './store.js'

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

describe('hub events', () => {
  it('tracks mode, laptop presence, and system replies to relayed commands', () => {
    let s = applyEvent(initialChat, {
      type: 'snapshot',
      session_id: 's',
      project: null,
      status: 'busy',
      mode: 'hub',
      agent_online: false,
      messages: [msg('r', 'assistant', '', 'queued')],
    })
    expect(s).toMatchObject({ mode: 'hub', agentOnline: false })
    s = applyEvent(s, { type: 'agent', online: true })
    expect(s.agentOnline).toBe(true)
    s = applyEvent(s, { type: 'done', id: 'r', status: 'done', content: '* alpha', role: 'system' })
    expect(s.messages[0]).toMatchObject({ role: 'system', content: '* alpha', status: 'done' })
  })

  it('local snapshots default to local mode', () => {
    const s = applyEvent(initialChat, { type: 'snapshot', session_id: 's', project: null, status: 'idle', messages: [] })
    expect(s.mode).toBe('local')
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

  it('is gray on the hub while the laptop is offline', () => {
    expect(statusColor('open', 'idle', 'hub', false)).toBe('gray')
    expect(statusColor('open', 'idle', 'hub', true)).toBe('green')
    expect(statusColor('open', 'error', 'hub', true)).toBe('red')
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

describe('reply meta', () => {
  it('keeps usage from done and updates changes in place', () => {
    let s = applyEvent(initialChat, { type: 'message', message: msg('a', 'assistant', '', 'streaming') })
    const changes = { id: 'c1', status: 'pending', files: [] }
    s = applyEvent(s, { type: 'done', id: 'a', status: 'done', content: 'x', meta: { usage: { tokens_in: 5 }, changes } })
    expect(s.messages[0].meta.usage.tokens_in).toBe(5)
    s = applyEvent(s, { type: 'changes', id: 'a', changes: { ...changes, status: 'applied' } })
    expect(s.messages[0].meta).toMatchObject({ usage: { tokens_in: 5 }, changes: { status: 'applied' } })
  })

})

describe('models report', () => {
  const report = { any_usable: true, tools: [{ id: 'ollama', usable: true }, { id: 'codex', usable: false }] }

  it('is set by models events, kept across local snapshots, and cleared when the laptop leaves', () => {
    let s = applyEvent(initialChat, { type: 'models', models: report })
    expect(s.models).toBe(report)
    s = applyEvent(s, { type: 'snapshot', session_id: 's', project: null, status: 'idle', messages: [] })
    expect(s.models).toBe(report)
    s = applyEvent(s, { type: 'snapshot', session_id: 's', project: null, status: 'idle', messages: [], models: null })
    expect(s.models).toBeNull()
    s = applyEvent({ ...s, models: report }, { type: 'agent', online: false })
    expect(s.models).toBeNull()
  })

  it('lists usable tools', () => {
    expect(usableTools(report).map((t) => t.id)).toEqual(['ollama'])
    expect(usableTools(null)).toEqual([])
  })
})

describe('reply footer: model · cost · time', () => {
  const usage = { tokens_in: 1500, tokens_out: 200, cost_usd: 0.21 }

  it('names the model, its cost and the time; tokens and reasons on hover', () => {
    const f = footer({ usage, route: { executor: 'claude-sonnet', model: 'sonnet', free: false, elapsed_ms: 18_400, reasons: ['fix (+3)'] } })
    expect(f.text).toBe('claude-sonnet · $0.21 · 18s')
    expect(f.title).toBe('1.5k in, 200 out; fix (+3)')
  })

  it('shows free answers with what Sonnet would have cost', () => {
    const route = { executor: 'ollama', model: 'qwen2.5-coder:7b', free: true, would_cost_usd: 0.004, elapsed_ms: 3_210 }
    expect(footer({ usage: { ...usage, cost_usd: 0 }, route }).text).toBe('qwen2.5-coder:7b · free, saved $0.0040 · 3.2s')
    expect(footer({ route: { executor: 'direct', free: true } }).text).toBe('no model · free')
    expect(footer({ usage: { cached: true }, route: { executor: 'ollama', free: true } }).text).toBe('ollama · cached, free')
  })

  it('says when a free answer was escalated, and never calls an unpriced paid model free', () => {
    const route = {
      executor: 'claude-sonnet',
      model: 'sonnet',
      free: false,
      escalated_from: { executor: 'ollama-coder', model: 'qwen2.5-coder:32b', reason: 'python block does not parse' },
    }
    const f = footer({ usage, route })
    expect(f.text).toBe('claude-sonnet (escalated from qwen2.5-coder:32b) · $0.21')
    expect(f.title).toBe('1.5k in, 200 out; escalated: python block does not parse')
    expect(footer({ usage: { ...usage, cost_usd: 0 }, route: { executor: 'codex', model: 'gpt-6-astra', free: false } }).text).toBe(
      'gpt-6-astra · cost not reported',
    )
    expect(footer(undefined)).toBeNull()
  })
})

describe('edit blocks in replies', () => {
  it('become one line each, also while still streaming in', () => {
    const done = 'Fix add.\n\ncalc.py\n```python\n<<<<<<< SEARCH\n    return a - b\n=======\n    return a + b\n>>>>>>> REPLACE\n```\nDone.'
    expect(hideEdits(done)).toBe('Fix add.\n\n✎ Editing calc.py…\nDone.')
    const partial = 'Fix add.\n\ncalc.py\n<<<<<<< SEARCH\n    return a - b\n====='
    expect(hideEdits(partial)).toBe('Fix add.\n\n✎ Editing calc.py…')
    expect(hideEdits('No edits here.')).toBe('No edits here.')
  })
})
