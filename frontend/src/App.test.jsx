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
let setup
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
      case '/api/v1/setup/status':
        return reply(setup)
      case '/api/v1/setup/installer': {
        const filename = query === 'platform=windows' ? 'DoAide-Code-Setup.bat' : 'DoAide-Code-Setup.zip'
        return {
          ok: true,
          status: 200,
          headers: { get: () => `attachment; filename="${filename}"` },
          blob: async () => new Blob(['script']),
        }
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
    models: null,
    connection: 'closed',
  })
  localStorage.clear()
  validTokens = new Set(['tok'])
  config = { google_client_id: '', local_login: true }
  setup = { agent_online: false, ever_connected: true }
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

  it('local mode never shows the laptop banner or laptop dot', async () => {
    await boot(true)
    expect(screen.queryByTestId('laptop-banner')).toBeNull()
    expect(screen.queryByTestId('laptop-status')).toBeNull()
    expect(globalThis.fetch.mock.calls.some(([url]) => url.startsWith('/api/v1/setup'))).toBe(false)
  })

  it('hub with laptop offline: gray dot, red laptop dot, banner, queued replies, and a connect command', async () => {
    const ws = await boot(false, {
      mode: 'hub',
      agent_online: false,
      messages: [
        { id: 'u', role: 'user', content: 'fix the bug', status: 'done' },
        { id: 'a', role: 'assistant', content: '', status: 'queued' },
      ],
    })
    expect(screen.getByTestId('status-dot').dataset.color).toBe('gray')
    expect(screen.getByTestId('laptop-status').dataset.online).toBe('false')
    expect(screen.getByText('Queued for your laptop…')).toBeTruthy()
    expect(screen.getByLabelText('Message').disabled).toBe(false)

    await act(async () => fireEvent.click(screen.getByText('Set up laptop')))
    expect(screen.getByTestId('setup-page')).toBeTruthy()
    await act(async () => fireEvent.click(screen.getByText(/Show the command instead/)))
    expect(screen.getByTestId('agent-command').textContent).toBe(
      'DOAIDE_HUB_URL=wss://code.doaide.com/agent DOAIDE_HUB_TOKEN=agent-tok doaide-code agent',
    )
    await act(async () => fireEvent.click(screen.getByText('Skip for now')))

    await act(async () => ws.emit({ type: 'agent', online: true }))
    expect(screen.queryByTestId('laptop-banner')).toBeNull()
    expect(screen.getByTestId('status-dot').dataset.color).toBe('green')
    expect(screen.getByTestId('laptop-status').dataset.online).toBe('true')
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

describe('Claude Code activity and diff previews', () => {
  const changes = {
    id: 'c1',
    status: 'pending',
    problems: [],
    files: [{ path: 'app.py', new_file: false, additions: 1, deletions: 1, diff: '@@ -1 +1 @@\n-a\n+b\n', problems: [] }],
  }

  it('shows the instruction, the diff, usage, and applies via /apply', async () => {
    const ws = await boot(true, {
      title: 'Claude Code: rename it',
      source: 'mcp',
      messages: [
        { id: 'u', role: 'user', content: 'rename it', status: 'done', meta: { via: 'mcp', tool: 'execute_code' } },
        {
          id: 'r',
          role: 'assistant',
          content: 'Renamed.',
          status: 'done',
          meta: { via: 'mcp', tool: 'execute_code', usage: { tokens_in: 10, tokens_out: 2, cost_usd: 0 }, changes },
        },
      ],
    })
    expect(screen.getByTestId('mcp-instruction').textContent).toContain('Claude Code')
    expect(screen.getByTestId('mcp-instruction').textContent).toContain('rename it')
    expect(screen.getByTestId('sessions-toggle').textContent).toContain('Claude Code: rename it')
    expect(screen.getByTestId('changeset').textContent).toContain('+b')
    expect(screen.getByTestId('usage').textContent).toBe('10 in · 2 out · $0')
    fireEvent.click(screen.getByText('Apply'))
    expect(ws.sent.at(-1)).toEqual({ type: 'send', text: '/apply c1' })
    await act(async () => ws.emit({ type: 'changes', id: 'r', changes: { ...changes, status: 'applied' } }))
    expect(screen.queryByText('Apply')).toBeNull()
    expect(screen.getByTestId('changeset').textContent).toContain('applied')
  })

  it('shows progress while a reply has no text yet', async () => {
    await boot(false, { messages: [{ id: 'r', role: 'assistant', content: '', status: 'streaming', created_at: 0 }] })
    expect(screen.getByTestId('working').textContent).toContain('Working on your laptop')
  })

  it('switches conversations from the menu', async () => {
    const ws = await boot(true)
    globalThis.fetch.mockImplementationOnce(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ sessions: [{ id: 'other', title: 'Older chat', source: 'mcp', updated_at: 0 }] }),
    }))
    fireEvent.click(screen.getByTestId('sessions-toggle'))
    await flush()
    fireEvent.click(screen.getByText('Older chat'))
    expect(ws.sent.at(-1)).toEqual({ type: 'open', session_id: 'other' })
  })
})

describe('laptop setup (hub)', () => {
  const MAC_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15'
  let clicked

  beforeEach(() => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(MAC_UA)
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel')
    URL.createObjectURL = vi.fn(() => 'blob:installer')
    URL.revokeObjectURL = vi.fn()
    clicked = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      clicked.push(this.download)
    })
  })

  afterEach(() => vi.restoreAllMocks())

  it('first sign-in with no laptop ever connected opens the setup page', async () => {
    setup = { agent_online: false, ever_connected: false }
    const ws = await boot(true, { mode: 'hub', agent_online: false })
    await flush()
    expect(screen.getByTestId('setup-page')).toBeTruthy()
    expect(screen.getByTestId('setup-agent-status').dataset.online).toBe('false')
    expect(screen.queryByLabelText('Message')).toBeNull()

    await act(async () => fireEvent.click(screen.getByTestId('setup-download')))
    await flush()
    const call = globalThis.fetch.mock.calls.find(([url]) => url.startsWith('/api/v1/setup/installer'))
    expect(call[0]).toBe('/api/v1/setup/installer?platform=macos')
    expect(call[1].headers.Authorization).toBe('Bearer tok')
    expect(clicked).toEqual(['DoAide-Code-Setup.zip'])
    expect(screen.getByTestId('setup-steps').textContent).toContain('DoAide-Code-Setup.command')

    // The laptop connects while the page is open: it turns green and offers to continue.
    await act(async () => ws.emit({ type: 'agent', online: true }))
    expect(screen.getByTestId('setup-agent-status').dataset.online).toBe('true')
    await act(async () => fireEvent.click(screen.getByText('Start coding')))
    expect(screen.queryByTestId('setup-page')).toBeNull()
    expect(screen.getByLabelText('Message')).toBeTruthy()
  })

  it('offers the other platforms too', async () => {
    setup = { agent_online: false, ever_connected: false }
    await boot(true, { mode: 'hub', agent_online: false })
    await flush()
    await act(async () => fireEvent.click(screen.getByText('Windows')))
    await flush()
    expect(globalThis.fetch.mock.calls.some(([url]) => url === '/api/v1/setup/installer?platform=windows')).toBe(true)
    expect(clicked).toEqual(['DoAide-Code-Setup.bat'])
    expect(screen.getByTestId('setup-steps').textContent).toContain('Run anyway')
  })

  it('does not interrupt a user whose laptop has connected before', async () => {
    setup = { agent_online: false, ever_connected: true }
    await boot(true, { mode: 'hub', agent_online: false })
    await flush()
    expect(screen.queryByTestId('setup-page')).toBeNull()
    expect(screen.getByTestId('laptop-banner')).toBeTruthy()
  })
})

const REPORT = {
  checked_at: 1,
  any_usable: true,
  tools: [
    { id: 'ollama', label: 'Ollama', state: 'ready', usable: true, detail: '', models: ['llama3:latest', 'codellama:7b'] },
    { id: 'claude', label: 'Claude CLI', state: 'signed_in', usable: true, detail: 'signed in', version: '2.1.0' },
    {
      id: 'codex',
      label: 'Codex CLI',
      state: 'not_found',
      usable: false,
      detail: '',
      setup: 'Install Codex CLI: `npm install -g @openai/codex`, then `codex login`.',
    },
  ],
}

describe('detected models', () => {
  it('shows only what the laptop reported, in the top bar menu', async () => {
    const ws = await boot(true)
    // Nothing reported yet: no invented list.
    expect(screen.queryByTestId('models-toggle')).toBeNull()
    await act(async () => ws.emit({ type: 'models', models: REPORT }))
    expect(screen.getByTestId('models-toggle').textContent).toBe('2 of 3 models ready')
    await act(async () => fireEvent.click(screen.getByTestId('models-toggle')))
    expect(screen.getByTestId('model-tool-ollama').textContent).toContain('Ollama:llama3:latest, codellama:7b')
    expect(screen.getByTestId('model-tool-claude').textContent).toContain('Claude CLI:signed in · v2.1.0')
    expect(screen.getByTestId('model-tool-codex').textContent).toContain('Codex CLI:not found')
    expect(screen.getByTestId('model-tool-codex').textContent).toContain('npm install -g @openai/codex')
    expect(screen.queryByTestId('no-models-banner')).toBeNull()
  })

  it('shows a setup guide when nothing can run', async () => {
    const none = {
      checked_at: 1,
      any_usable: false,
      tools: [
        { id: 'ollama', label: 'Ollama', state: 'not_running', usable: false, detail: '', setup: 'Start Ollama.' },
        { id: 'claude', label: 'Claude CLI', state: 'signed_out', usable: false, detail: '', setup: 'Sign in: `claude auth login`.' },
        { id: 'codex', label: 'Codex CLI', state: 'disabled', usable: false, detail: '' },
      ],
    }
    await boot(true, { mode: 'hub', agent_online: true, models: none })
    const banner = screen.getByTestId('no-models-banner')
    expect(banner.textContent).toContain('No model is available on your laptop yet')
    expect(banner.textContent).toContain('Ollama (not running): Start Ollama.')
    expect(banner.textContent).toContain('Claude CLI (not signed in): Sign in: `claude auth login`.')
    expect(banner.textContent).not.toContain('Codex')
    expect(screen.getByTestId('models-toggle').textContent).toBe('No models')
  })

  it('drops the report when the laptop disconnects', async () => {
    const ws = await boot(true, { mode: 'hub', agent_online: true, models: REPORT })
    expect(screen.getByTestId('models-toggle')).toBeTruthy()
    await act(async () => ws.emit({ type: 'agent', online: false }))
    expect(screen.queryByTestId('models-toggle')).toBeNull()
    expect(screen.getByTestId('laptop-banner')).toBeTruthy()
  })
})
