import { describe, expect, it } from 'vitest'
import { routeLabel, routeTitle, savingsLabel, splitFences, usageLabel } from './components/MessageList.jsx'
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

  it('formats usage labels', () => {
    expect(usageLabel({ tokens_in: 1500, tokens_out: 200, cost_usd: 0.0021 })).toBe('1.5k in · 200 out · $0.0021')
    expect(usageLabel({ tokens_in: 0, tokens_out: 0, cost_usd: 0 })).toBe('no model · $0')
    expect(usageLabel({ cached: true })).toBe('cached · $0')
    expect(usageLabel(undefined)).toBeNull()
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

describe('model preference', () => {
  it('comes from snapshots and model_pref events', () => {
    let s = applyEvent(initialChat, { type: 'snapshot', messages: [], model_pref: { tool: 'claude', model: 'opus' } })
    expect(s.modelPref).toEqual({ tool: 'claude', model: 'opus' })
    s = applyEvent(s, { type: 'model_pref', pref: null })
    expect(s.modelPref).toBeNull()
  })
})

describe('routeLabel', () => {
  it('names the model, marks free ones, and says when no model ran', () => {
    expect(routeLabel({ executor: 'ollama', model: 'qwen2.5-coder:7b', free: true })).toBe('qwen2.5-coder:7b (free)')
    expect(routeLabel({ executor: 'claude-sonnet', model: 'sonnet', free: false })).toBe('claude-sonnet')
    expect(routeLabel({ executor: 'direct', free: true })).toBe('no model')
    expect(routeLabel(undefined)).toBeNull()
  })

  it('says when a free answer failed its checks and Sonnet answered instead', () => {
    const route = {
      executor: 'claude-sonnet',
      model: 'sonnet',
      free: false,
      reasons: ['fix (+3)'],
      escalated_from: { executor: 'ollama-coder', model: 'qwen2.5-coder:32b', reason: 'python block does not parse' },
    }
    expect(routeLabel(route)).toBe('claude-sonnet (escalated from qwen2.5-coder:32b)')
    expect(routeTitle(route)).toBe('escalated: python block does not parse, fix (+3)')
    expect(savingsLabel(route)).toBeNull()
  })

  it('prices a free answer at Sonnet rates', () => {
    expect(savingsLabel({ executor: 'ollama', free: true, would_cost_usd: 0.006 })).toBe('saved $0.0060 vs Sonnet')
    expect(savingsLabel({ executor: 'ollama', free: true })).toBeNull()
  })
})
