import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'
import { useChat } from './store.js'

class FakeSocket {
  static instances = []
  static OPEN = 1
  constructor(url) {
    this.url = url
    this.readyState = 0
    this.sent = []
    FakeSocket.instances.push(this)
  }
  send(data) {
    this.sent.push(JSON.parse(data))
  }
  close() {}
  open() {
    this.readyState = 1
    this.onopen?.()
  }
  emit(event) {
    this.onmessage?.({ data: JSON.stringify(event) })
  }
  drop(code) {
    this.readyState = 3
    this.onclose?.({ code })
  }
}

// Node 26 ships its own (flag-gated, here undefined) localStorage that shadows jsdom's.
class MemoryStorage {
  constructor() {
    this.items = new Map()
  }
  getItem(key) {
    return this.items.has(key) ? this.items.get(key) : null
  }
  setItem(key, value) {
    this.items.set(key, String(value))
  }
  removeItem(key) {
    this.items.delete(key)
  }
  clear() {
    this.items.clear()
  }
}
Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true })

function setViewport(desktop) {
  window.matchMedia = (query) => ({
    matches: desktop,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })
}

// Routes keyed by path (without query). `validTokens` decides what /api/me accepts.
let validTokens
let config
function mockFetch() {
  globalThis.fetch = vi.fn(async (url, init = {}) => {
    const [path, query = ''] = url.split('?')
    const bearer = init.headers?.Authorization?.replace('Bearer ', '')
    const reply = (body, ok = true, status = 200) => ({ ok, status, json: async () => body })
    switch (path) {
      case '/api/config':
        return reply(config)
      case '/api/auth/local':
        return config.local_login ? reply({ token: 'tok', refresh_token: 'ref', email: 'me' }) : reply({}, false, 403)
      case '/api/me':
        return reply({}, validTokens.has(bearer), validTokens.has(bearer) ? 200 : 401)
      case '/api/auth/refresh': {
        const { refresh_token: refresh } = JSON.parse(init.body)
        if (refresh !== 'ref') return reply({ detail: 'Sign in again' }, false, 401)
        validTokens.add('renewed')
        return reply({ token: 'renewed', email: 'me' })
      }
      case '/api/agent-token':
        return reply({ token: 'agent-tok', hub_url: 'wss://code.doaide.com/agent' })
      case '/api/files':
        return query === 'path=src'
          ? reply({ root: 'alpha', path: 'src', entries: [{ name: 'app.py', path: 'src/app.py', type: 'file', size: 3 }] })
          : reply({
              root: 'alpha',
              path: '',
              entries: [
                { name: 'src', path: 'src', type: 'dir', size: null },
                { name: 'README.md', path: 'README.md', type: 'file', size: 7 },
              ],
            })
      case '/api/file':
        return reply({ path: decodeURIComponent(query.slice(5)), content: 'line one\nline two\n', binary: false })
      default:
        return reply({})
    }
  })
}

const flush = () => act(async () => new Promise((r) => setTimeout(r, 0)))

async function boot(desktop, snapshot = {}) {
  setViewport(desktop)
  render(<App />)
  await flush()
  await flush()
  const ws = FakeSocket.instances.at(-1)
  await act(async () => {
    ws.open()
    ws.emit({
      type: 'snapshot',
      session_id: 's',
      project: 'alpha',
      status: 'idle',
      messages: [{ id: '1', role: 'assistant', content: 'hi there', status: 'done' }],
      ...snapshot,
    })
  })
  return ws
}

beforeEach(() => {
  FakeSocket.instances = []
  globalThis.WebSocket = FakeSocket
  useChat.setState({
    messages: [],
    project: null,
    serverStatus: 'idle',
    mode: 'local',
    agentOnline: false,
    connection: 'closed',
  })
  localStorage.clear()
  validTokens = new Set(['tok'])
  config = { google_client_id: '', local_login: true }
  mockFetch()
})

afterEach(cleanup)

describe('App', () => {
  it('desktop: /ws, project pill, green dot, and an input box', async () => {
    const ws = await boot(true)
    expect(ws.url).toContain('/ws?token=tok')
    expect(screen.getByTestId('project-pill').textContent).toBe('alpha')
    expect(screen.getByTestId('status-dot').dataset.color).toBe('green')
    expect(screen.getByText('hi there')).toBeTruthy()
    expect(screen.getByLabelText('Message')).toBeTruthy()
  })

  it('mobile: just the conversation and a visible input box, no file panel', async () => {
    const ws = await boot(false)
    expect(ws.url).toContain('/ws?token=tok')
    const composer = screen.getByTestId('composer')
    expect(composer.className).not.toContain('hidden')
    expect(screen.getByLabelText('Message')).toBeTruthy()
    expect(screen.queryByTestId('files-toggle')).toBeNull()
    expect(screen.queryByTestId('file-tree')).toBeNull()
  })

  it('fills the visible viewport so the input stays on screen on phones', async () => {
    await boot(false)
    expect(screen.getByTestId('composer').closest('.h-\\[100dvh\\]')).toBeTruthy()
  })

  it('shows a red dot after a failed run', async () => {
    const ws = await boot(true)
    await act(async () => ws.emit({ type: 'status', state: 'error' }))
    expect(screen.getByTestId('status-dot').dataset.color).toBe('red')
  })

  it('local mode never shows the laptop banner', async () => {
    await boot(true)
    expect(screen.queryByTestId('laptop-banner')).toBeNull()
  })

  it('hub with laptop offline: gray dot, banner, queued replies, and a connect command', async () => {
    const ws = await boot(false, {
      mode: 'hub',
      agent_online: false,
      messages: [
        { id: 'u', role: 'user', content: 'fix the bug', status: 'done' },
        { id: 'a', role: 'assistant', content: '', status: 'queued' },
      ],
    })
    expect(screen.getByTestId('status-dot').dataset.color).toBe('gray')
    expect(screen.getByText('Queued for your laptop…')).toBeTruthy()
    expect(screen.getByLabelText('Message').disabled).toBe(false)

    await act(async () => fireEvent.click(screen.getByText('Connect laptop')))
    expect(screen.getByTestId('agent-command').textContent).toBe(
      'DOAIDE_HUB_URL=wss://code.doaide.com/agent DOAIDE_HUB_TOKEN=agent-tok doaide-code agent',
    )

    await act(async () => ws.emit({ type: 'agent', online: true }))
    expect(screen.queryByTestId('laptop-banner')).toBeNull()
    expect(screen.getByTestId('status-dot').dataset.color).toBe('green')
  })

  it('phone prompts are sent to the hub for the laptop to run', async () => {
    const ws = await boot(false, { mode: 'hub', agent_online: true })
    const input = screen.getByLabelText('Message')
    await act(async () => fireEvent.change(input, { target: { value: 'run tests' } }))
    await act(async () => fireEvent.keyDown(input, { key: 'Enter' }))
    expect(ws.sent.at(-1)).toEqual({ type: 'send', text: 'run tests' })
  })
})

describe('file panel (desktop)', () => {
  it('is hidden until toggled, then shows a lazy tree and a read-only viewer', async () => {
    await boot(true)
    expect(screen.queryByTestId('file-tree')).toBeNull()

    await act(async () => fireEvent.click(screen.getByTestId('files-toggle')))
    await flush()
    expect(screen.getByTestId('file-tree').textContent).toContain('README.md')

    await act(async () => fireEvent.click(screen.getByText('src')))
    await flush()
    await act(async () => fireEvent.click(screen.getByText('app.py')))
    await flush()
    const viewer = screen.getByTestId('code-viewer')
    expect(viewer.textContent).toContain('src/app.py')
    expect(viewer.textContent).toContain('line two')
    expect(viewer.querySelector('textarea, [contenteditable]')).toBeNull()

    await act(async () => fireEvent.click(screen.getByLabelText('Close file')))
    expect(screen.queryByTestId('code-viewer')).toBeNull()
    expect(localStorage.getItem('doaide-code-files-open')).toBe('1')
  })

  it('reloads the open file after an answer finishes', async () => {
    const ws = await boot(true)
    await act(async () => fireEvent.click(screen.getByTestId('files-toggle')))
    await flush()
    await act(async () => fireEvent.click(screen.getByText('README.md')))
    await flush()
    const reads = () => fetch.mock.calls.filter(([u]) => u.startsWith('/api/file?')).length
    const before = reads()
    await act(async () => {
      ws.emit({ type: 'message', message: { id: 'r', role: 'assistant', content: '', status: 'streaming' } })
      ws.emit({ type: 'done', id: 'r', status: 'done', content: 'edited README' })
    })
    await flush()
    expect(reads()).toBeGreaterThan(before)
  })
})

describe('sign-in never expires', () => {
  it('stores the refresh token from the first sign-in', async () => {
    await boot(true)
    expect(localStorage.getItem('doaide-code-refresh')).toBe('ref')
  })

  it('renews an expired access token with the refresh token instead of signing in', async () => {
    config = { google_client_id: 'gid', local_login: false }
    localStorage.setItem('doaide-code-token', 'expired')
    localStorage.setItem('doaide-code-refresh', 'ref')
    const ws = await boot(false)
    expect(ws.url).toContain('token=renewed')
    expect(localStorage.getItem('doaide-code-token')).toBe('renewed')
    expect(screen.queryByText('Doaide Code', { selector: 'h1' })).toBeNull()
  })

  it('renews when the socket rejects the token mid-session', async () => {
    const ws = await boot(true)
    await act(async () => ws.drop(4401))
    await flush()
    expect(FakeSocket.instances.at(-1).url).toContain('token=renewed')
  })

  it('asks for Google sign-in only when the refresh token is revoked', async () => {
    config = { google_client_id: 'gid', local_login: false }
    localStorage.setItem('doaide-code-refresh', 'revoked')
    setViewport(false)
    render(<App />)
    await flush()
    await flush()
    expect(screen.getByText('Doaide Code', { selector: 'h1' })).toBeTruthy()
    expect(FakeSocket.instances).toHaveLength(0)
  })
})
