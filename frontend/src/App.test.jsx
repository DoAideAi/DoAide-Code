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
// What the local server probe (http://127.0.0.1:3097/api/health) finds: null for nothing running.
let localServer
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
      case '/api/benchmarks':
        return reply(BENCH)
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
      case 'http://127.0.0.1:3097/api/health':
        if (!localServer) throw new TypeError('Failed to fetch')
        return reply(localServer)
      case '/api/models/compare':
        return reply(COMPARE)
      case '/api/v1/tasks/history':
        return reply({ tasks: HISTORY })
      case '/api/usage': {
        const days = Number(new URLSearchParams(query).get('days'))
        return reply({ ...USAGE, days, daily: USAGE.daily.slice(0, days) })
      }
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
  localServer = null
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

  it('one minimal screen: the conversation and the input box, nothing to switch or browse', async () => {
    const ws = await boot(true)
    expect(ws.url).toContain('/ws?token=tok')
    expect(screen.getByTestId('composer').className).not.toContain('hidden')
    expect(screen.getByLabelText('Message')).toBeTruthy()
    for (const gone of ['files-toggle', 'file-tree', 'sessions-toggle', 'model-picker', 'laptop-status']) {
      expect(screen.queryByTestId(gone)).toBeNull()
    }
    expect(screen.getByTestId('models-toggle').textContent).toBe('Models')
    expect(screen.getByTestId('usage-toggle').textContent).toBe('Usage')
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeTruthy()
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
    expect(screen.getByTestId('laptop-banner')).toBeTruthy()
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
  })

  it('on the laptop itself, the hosted UI offers the local server (no server round trip)', async () => {
    localServer = { ok: true, mode: 'local' }
    await boot(true, { mode: 'hub', agent_online: true })
    await flush()
    expect(screen.getByTestId('open-local').getAttribute('href')).toBe('http://127.0.0.1:3097')
  })

  it('a phone (no local server) and the local UI itself show no such link', async () => {
    await boot(false, { mode: 'hub', agent_online: true })
    await flush()
    expect(screen.queryByTestId('open-local')).toBeNull()
    cleanup()
    localServer = { ok: true, mode: 'local' }
    await boot(true, { mode: 'local' })
    await flush()
    expect(screen.queryByTestId('open-local')).toBeNull()
  })

  it('Stop shows only while a reply is streaming, even if a busy status is stale', async () => {
    const ws = await boot(true, { status: 'busy', messages: [{ id: 'r', role: 'assistant', content: '', status: 'streaming' }] })
    expect(screen.getByText('Stop')).toBeTruthy()
    await act(async () => ws.emit({ type: 'done', id: 'r', status: 'done', content: 'Done.' }))
    // No idle status arrived (lost in a restart): the finished reply still clears Stop.
    expect(screen.queryByText('Stop')).toBeNull()
  })

  it('phone prompts are sent to the hub for the laptop to run', async () => {
    const ws = await boot(false, { mode: 'hub', agent_online: true })
    const input = screen.getByLabelText('Message')
    await act(async () => fireEvent.change(input, { target: { value: 'run tests' } }))
    await act(async () => fireEvent.keyDown(input, { key: 'Enter' }))
    expect(ws.sent.at(-1)).toEqual({ type: 'send', text: 'run tests' })
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

  it('shows no chat (and no dead composer) while the saved session is being checked', async () => {
    config = { google_client_id: 'gid', local_login: false }
    setViewport(false)
    render(<App />)
    expect(screen.getByText('Signing in…')).toBeTruthy()
    expect(screen.queryByPlaceholderText(/Message/)).toBeNull()
    await flush()
    await flush()
    expect(screen.getByText('Doaide Code', { selector: 'h1' })).toBeTruthy()
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

  it('shows the instruction, a collapsed diff and usage, with no Apply / Discard step', async () => {
    const ws = await boot(true, {
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
    // Held back (an MCP proposal): a summary line, the diff one click away.
    expect(screen.getByTestId('changeset-status').textContent).toBe('1 file not written')
    expect(screen.getByTestId('changeset').textContent).not.toContain('+b')
    fireEvent.click(screen.getByText('app.py'))
    expect(screen.getByTestId('changeset').textContent).toContain('+b')
    expect(screen.getByTestId('usage').textContent).toBe('cost not reported')
    expect(screen.queryByText('Apply')).toBeNull()
    expect(screen.queryByText('Discard')).toBeNull()
    // Applied by the caller (or another device): it shows as written, with no Undo button.
    await act(async () => ws.emit({ type: 'changes', id: 'r', changes: { ...changes, status: 'applied' } }))
    expect(screen.getByTestId('changeset-status').textContent).toBe('Wrote 1 file')
    expect(screen.queryByText('Undo')).toBeNull()
  })

  it('written changes show a summary, not the code, and no Undo button', async () => {
    const ws = await boot(true, {
      messages: [
        { id: 'r', role: 'assistant', content: 'Renamed old to new.', status: 'done', meta: { changes: { ...changes, status: 'applied' } } },
      ],
    })
    expect(screen.getByTestId('changeset-status').textContent).toBe('Wrote 1 file')
    expect(screen.getByTestId('changeset').textContent).not.toContain('+b')
    expect(screen.queryByText('Undo')).toBeNull()
    expect(screen.queryByRole('button', { name: /undo/i })).toBeNull()
    // A /undo typed in the chat still shows on the changeset.
    await act(async () => ws.emit({ type: 'changes', id: 'r', changes: { ...changes, status: 'undone' } }))
    expect(screen.getByTestId('changeset-status').textContent).toBe('Undid 1 file')
    expect(screen.queryByText('Undo')).toBeNull()
  })

  it('collapses long code blocks in replies and keeps short ones', async () => {
    const long = '```python\na = 1\nb = 2\nc = 3\nd = 4\n```'
    await boot(true, {
      messages: [{ id: 'r', role: 'assistant', content: `Use \`x[::-1]\`.\n\`\`\`python\nx[::-1]\n\`\`\`\n${long}`, status: 'done' }],
    })
    const collapsed = screen.getAllByTestId('collapsed-code')
    expect(collapsed).toHaveLength(1)
    expect(collapsed[0].querySelector('summary').textContent).toBe('Show code (4 lines, python)')
    expect(collapsed[0].open).toBe(false)
  })

  it('copies a code block with its Copy button', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    await boot(false, {
      messages: [{ id: 'r', role: 'assistant', content: 'Run:\n```bash\nnpm test\n```', status: 'done' }],
    })
    Object.defineProperty(globalThis.navigator, 'clipboard', { value: { writeText }, configurable: true })
    const button = screen.getByTestId('copy-code')
    await act(async () => fireEvent.click(button))
    expect(writeText).toHaveBeenCalledWith('npm test')
    expect(button.textContent).toBe('Copied')
    writeText.mockImplementationOnce(() => Promise.reject(new Error('denied')))
    document.execCommand = vi.fn(() => true)
    await act(async () => fireEvent.click(button))
    expect(document.execCommand).toHaveBeenCalledWith('copy')
    expect(button.textContent).toBe('Copied')
    delete globalThis.navigator.clipboard
  })

  it('shows progress while a reply has no text yet', async () => {
    await boot(false, { messages: [{ id: 'r', role: 'assistant', content: '', status: 'streaming', created_at: 0 }] })
    expect(screen.getByTestId('working').textContent).toContain('Working on your laptop')
  })

  it('shows the local draft faded while it is checked', async () => {
    await boot(false, {
      messages: [{ id: 'r', role: 'assistant', content: '', draft: 'It picks the model.', status: 'streaming', created_at: 0 }],
    })
    expect(screen.getByTestId('draft').textContent).toContain('It picks the model.')
    expect(screen.getByTestId('draft').textContent).toContain('Checking this answer')
    expect(screen.queryByTestId('working')).toBeNull()
    expect(screen.getByTestId('reply-status').textContent).toBe('Checking…')
  })

  it('shows each reply as a bubble with its progress in a few words', async () => {
    await boot(false, {
      messages: [
        { id: 'u', role: 'user', content: 'what does router.py do?', status: 'done' },
        { id: 'a', role: 'assistant', content: 'It picks the model.', status: 'done' },
        { id: 'b', role: 'assistant', content: 'Half', status: 'streaming' },
        { id: 'c', role: 'assistant', content: 'Edited.', status: 'done', meta: { checks: { items: [{ name: 'tests', ok: false, detail: '1 failed' }] } } },
        { id: 'd', role: 'assistant', content: 'Partial.', status: 'stopped' },
      ],
    })
    const labels = screen.getAllByTestId('reply-status').map((s) => s.textContent)
    expect(labels).toEqual(['Done', 'Writing…', 'Needs a look', 'Stopped'])
  })

  it('shows inline code and bold in replies without the markup', async () => {
    await boot(false, { messages: [{ id: 'r', role: 'assistant', content: 'Call `route()` **first**.', status: 'done' }] })
    expect(screen.getByText('route()', { selector: 'code' })).toBeTruthy()
    expect(screen.getByText('first', { selector: 'strong' })).toBeTruthy()
    expect(document.body.textContent).not.toContain('`route()`')
  })

  it('an empty chat offers suggestions that send in one tap', async () => {
    const ws = await boot(false, { messages: [] })
    expect(screen.getByText('What can I help with?')).toBeTruthy()
    await act(async () => fireEvent.click(screen.getByText('What does this project do?')))
    expect(ws.sent.at(-1)).toEqual({ type: 'send', text: 'What does this project do?' })
  })

  it('sends with the round send button', async () => {
    const ws = await boot(false)
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'hello' } })
    await act(async () => fireEvent.click(screen.getByLabelText('Send')))
    expect(ws.sent.at(-1)).toEqual({ type: 'send', text: 'hello' })
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
    {
      id: 'ollama',
      label: 'Ollama',
      state: 'ready',
      usable: true,
      detail: '',
      models: ['llama3:latest', 'codellama:7b'],
      choices: ['llama3:latest', 'codellama:7b'],
    },
    {
      id: 'claude',
      label: 'Claude CLI',
      state: 'signed_in',
      usable: true,
      detail: 'signed in',
      version: '2.1.0',
      choices: ['haiku', 'sonnet', 'opus'],
    },
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
  it('shows only what the laptop reported, on the Models page', async () => {
    const ws = await boot(true)
    const dot = () => screen.getByTestId('models-toggle').querySelector('span')
    // Nothing reported yet: no readiness dot, no invented list.
    expect(dot()).toBeNull()
    await act(async () => ws.emit({ type: 'models', models: REPORT }))
    expect(dot().className).toContain('bg-emerald-400')
    await act(async () => fireEvent.click(screen.getByTestId('models-toggle')))
    await flush()
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
    expect(screen.getByTestId('models-toggle').querySelector('span').className).toContain('bg-red-500')
  })

  it('drops the report when the laptop disconnects', async () => {
    const ws = await boot(true, { mode: 'hub', agent_online: true, models: REPORT })
    expect(screen.getByTestId('models-toggle').querySelector('span')).toBeTruthy()
    await act(async () => ws.emit({ type: 'agent', online: false }))
    expect(screen.getByTestId('models-toggle').querySelector('span')).toBeNull()
    expect(screen.getByTestId('laptop-banner')).toBeTruthy()
  })
})

const COMPARE = {
  days: 30,
  baseline: 'claude-sonnet',
  models: [
    { model: 'ollama-coder · qwen2.5-coder:32b', kind: 'local', tasks: 8, escalated: 2, quality: 0.8, cost_per_task: 0,
      tokens_per_task: 3000, median_seconds: 20, saved_usd: 0.08, enough_data: true, cost_vs_sonnet: 0 },
    { model: 'claude-sonnet', kind: 'paid', tasks: 5, escalated: 0, quality: 0.8, cost_per_task: 0.4,
      tokens_per_task: 80000, median_seconds: 30, saved_usd: 0, enough_data: true, cost_vs_sonnet: 1 },
    { model: 'claude-opus', kind: 'paid', tasks: 1, escalated: 0, quality: 1, cost_per_task: 1.2,
      tokens_per_task: 400000, median_seconds: 60, saved_usd: 0, enough_data: false, cost_vs_sonnet: 3 },
  ],
}

const BENCH = {
  source: 'measured on this laptop',
  tasks: ['fix-bug', 'implement'],
  rows: [
    { model: 'auto', quality: 0.9, cost_per_task: 0.01, cost_known: true, median_seconds: 8, tasks: 10 },
    { model: 'codex', quality: 1, cost_per_task: 0, cost_known: false, median_seconds: 17.5, tasks: 6 },
    { model: 'qwen2.5-coder:7b', quality: 0.67, cost_per_task: 0, cost_known: true, median_seconds: 0.9, tasks: 18 },
  ],
}

describe('models are view only', () => {
  it('offers no way to pick a model', async () => {
    await boot(true, { models: REPORT })
    expect(screen.queryByTestId('model-picker')).toBeNull()
    expect(screen.queryByRole('combobox')).toBeNull()
  })

  it('compares cost, quality and speed on the Models page', async () => {
    await boot(true, { models: REPORT })
    await act(async () => fireEvent.click(screen.getByTestId('models-toggle')))
    await flush()
    expect(screen.getByTestId('models-page')).toBeTruthy()
    expect(globalThis.fetch.mock.calls.some(([url]) => url === '/api/models/compare?days=30')).toBe(true)
    expect(screen.getByTestId('models-detected').textContent).toContain('Claude CLI')
    const rows = [...screen.getByTestId('models-compare').querySelectorAll('tbody tr')].map((r) =>
      [...r.querySelectorAll('td')].map((td) => td.textContent),
    )
    expect(rows[0]).toEqual(['ollama-coder · qwen2.5-coder:32bfree', '8 (+2 escalated)', '80%', '$0', 'free', '20s'])
    expect(rows[1]).toEqual(['claude-sonnet', '5', '80%', '$0.40', '1×', '30s'])
    expect(rows[2]).toEqual(['claude-opusfew tasks', '1', '100%', '$1.20', '3×', '60s'])
    const bench = [...screen.getByTestId('models-bench').querySelectorAll('tbody tr')].map((r) =>
      [...r.querySelectorAll('td')].map((td) => td.textContent),
    )
    expect(bench).toEqual([
      ['autoDoAide routing', '90%', '$0.01', '8.0s', '10'],
      ['codex', '100%', 'not reported', '17.5s', '6'],
      ['qwen2.5-coder:7b', '67%', 'free', '0.9s', '18'],
    ])
    expect(screen.getByTestId('bench-source').textContent).toContain('measured on this laptop')
    fireEvent.click(screen.getByText('Close'))
    expect(screen.queryByTestId('models-page')).toBeNull()
  })
})

const USAGE = {
  days: 7,
  totals: { tasks: 5, free_tasks: 4, tokens_in: 9000, tokens_out: 1200, cost_usd: 0.031, saved_usd: 0.04, free_share: 0.8 },
  headline: 'Free local models and direct answers handled 80% of 5 tasks at no cost.',
  daily: Array.from({ length: 30 }, (_, i) => ({
    date: `2026-10-${String(i + 1).padStart(2, '0')}`,
    tasks: i === 6 ? 5 : 0,
    free_tasks: i === 6 ? 4 : 0,
    tokens: i === 6 ? 10200 : 0,
    cost_usd: i === 6 ? 0.031 : 0,
  })),
  by_model: [
    { model: 'ollama-coder · qwen2.5-coder:32b', tasks: 3, tokens_in: 6000, tokens_out: 900, cost_usd: 0, free: true },
    { model: 'No model (direct)', tasks: 1, tokens_in: 0, tokens_out: 0, cost_usd: 0, free: true },
    { model: 'claude-sonnet', tasks: 1, tokens_in: 3000, tokens_out: 300, cost_usd: 0.031, free: false },
  ],
  recent: [
    { id: 'a', prompt: 'refactor auth across all files', model: 'claude-sonnet', cost_usd: 0.031, free: false, checks_ok: true, source: 'chat' },
    { id: 'b', prompt: 'explain runner.py', model: 'ollama-coder · qwen2.5-coder:32b', cost_usd: 0, free: true, checks_ok: false, source: 'mcp' },
  ],
}

const HISTORY = [
  { id: 'a', model: 'sonnet', executor: 'claude-sonnet', cost_usd: 0.05, response_time_seconds: 20, escalated: true },
  { id: 'b', model: 'qwen2.5-coder:7b', executor: 'ollama', cost_usd: 0, response_time_seconds: 2, escalated: false },
  { id: 'c', model: 'qwen2.5-coder:7b', executor: 'ollama', cost_usd: 0, response_time_seconds: 4, escalated: false },
  { id: 'd', model: null, executor: 'direct', cost_usd: 0, response_time_seconds: null, escalated: false },
]

describe('usage dashboard', () => {
  it('shows savings, totals, a daily chart, cost by model and the model behind each task', async () => {
    await boot(true)
    await act(async () => fireEvent.click(screen.getByTestId('usage-toggle')))
    await flush()
    expect(screen.getByTestId('usage-headline').textContent).toContain('handled 80% of 5 tasks')
    expect(screen.getByTestId('usage-headline').textContent).toContain('$0.04 saved')
    expect(screen.getAllByTestId('day-bar')).toHaveLength(7)
    const rows = [...screen.getByTestId('by-model').querySelectorAll('tbody tr')].map((r) => r.textContent)
    expect(rows[0]).toContain('ollama-coder · qwen2.5-coder:32b')
    expect(rows[0]).toContain('free')
    expect(rows[2]).toContain('$0.03')
    const recent = screen.getByTestId('recent-tasks').textContent
    expect(recent).toContain('refactor auth across all files')
    expect(recent).toContain('Claude Code ·explain runner.py')

    // Task performance, from the Tasks API history.
    const perf = screen.getByTestId('task-performance').textContent
    expect(perf).toContain('Total tasks4')
    expect(perf).toContain('Total cost$0.05')
    expect(perf).toContain('Avg response8.7s')
    expect(perf).toContain('Escalated25%')
    const costs = [...screen.getByTestId('task-cost-by-model').querySelectorAll('tbody tr')].map((r) => r.textContent)
    expect(costs).toEqual(['sonnet120s$0.05', 'qwen2.5-coder:7b23.0s$0', 'direct1–$0'])
    const bars = screen.getAllByTestId('model-cost-bar').map((b) => b.style.width)
    expect(bars).toEqual(['100%', '0%', '0%'])

    await act(async () => fireEvent.mouseEnter(screen.getAllByTestId('day-bar')[6]))
    expect(screen.getByTestId('chart-tooltip').textContent).toContain('5 tasks · 4 free')

    await act(async () => fireEvent.click(screen.getByText('30 days')))
    await flush()
    expect(screen.getAllByTestId('day-bar')).toHaveLength(30)
    expect(globalThis.fetch.mock.calls.some(([url]) => url.startsWith('/api/usage?days=30&tz='))).toBe(true)

    await act(async () => fireEvent.click(screen.getByText('Close')))
    expect(screen.queryByTestId('usage-page')).toBeNull()
    expect(screen.getByLabelText('Message')).toBeTruthy()
  })
})

describe('reply footer', () => {
  it('is one line of model, cost and time, and shows only failed checks', async () => {
    await boot(true, {
      messages: [
        {
          id: 'r',
          role: 'assistant',
          content: 'done',
          status: 'done',
          meta: {
            usage: { tokens_in: 1200, tokens_out: 80, cost_usd: 0 },
            route: { executor: 'ollama-coder', model: 'qwen2.5-coder:32b', free: true, reasons: ['fix (+3)'], elapsed_ms: 4_200, would_cost_usd: 0.01 },
            checks: {
              items: [
                { name: 'complete', ok: true, detail: 'retried on claude-sonnet with more context (empty answer from ollama)' },
                { name: 'python block', ok: false, detail: 'line 1: invalid syntax' },
              ],
            },
          },
        },
      ],
    })
    expect(screen.getByTestId('usage').textContent).toBe('qwen2.5-coder:32b · free, saved $0.01 · 4.2s')
    expect(screen.getByTestId('usage').title).toBe('1.2k in, 80 out; fix (+3)')
    const checks = [...screen.getByTestId('checks').querySelectorAll('li')]
    expect(checks.map((c) => c.textContent)).toEqual(['✗ python block: line 1: invalid syntax'])
  })
})

describe('how it works', () => {
  it('opens from the top bar, explains routing, edits and models, and closes back to the chat', async () => {
    await boot(true)
    expect(screen.getByTestId('how-toggle').textContent).toBe('How it works')
    await act(async () => fireEvent.click(screen.getByTestId('how-toggle')))
    const page = screen.getByTestId('how-page')
    expect(screen.queryByTestId('composer')).toBeNull()
    const steps = [...screen.getByTestId('how-steps').querySelectorAll('li')].map((li) => li.textContent)
    expect(steps[0]).toContain('Ollama')
    expect(steps[0]).toContain('free')
    expect(steps[2]).toContain('Claude Sonnet')
    for (const text of ['no Undo button', 'no Apply or Discard', 'summarized', 'relays your phone', '$20 a month']) {
      expect(page.textContent.replace(/\s+/g, ' ')).toContain(text.replace(/\s+/g, ' '))
    }
    const models = [...screen.getByTestId('how-models').querySelectorAll('tbody tr')].map((r) => r.firstChild.textContent)
    expect(models).toEqual(['qwen2.5-coder 7b', 'qwen2.5-coder 32b', 'Claude Sonnet', 'Claude Opus', 'Codex'])
    fireEvent.click(screen.getByText('Close'))
    expect(screen.queryByTestId('how-page')).toBeNull()
    expect(screen.getByTestId('composer')).toBeTruthy()
  })

  it('is one page at a time: opening Models replaces it, and its link toggles it shut', async () => {
    await boot(true, { models: REPORT })
    await act(async () => fireEvent.click(screen.getByTestId('how-toggle')))
    await act(async () => fireEvent.click(screen.getByTestId('models-toggle')))
    await flush()
    expect(screen.queryByTestId('how-page')).toBeNull()
    expect(screen.getByTestId('models-page')).toBeTruthy()
    await act(async () => fireEvent.click(screen.getByTestId('how-toggle')))
    expect(screen.queryByTestId('models-page')).toBeNull()
    await act(async () => fireEvent.click(screen.getByTestId('how-toggle')))
    expect(screen.queryByTestId('how-page')).toBeNull()
  })
})

describe('tasks from Dispatch', () => {
  it('show in the conversation labelled Dispatch, with a normal reply and footer', async () => {
    await boot(true, {
      messages: [
        { id: 'u', role: 'user', content: 'add a docstring to router.py', status: 'done', meta: { via: 'dispatch' } },
        {
          id: 'r',
          role: 'assistant',
          content: 'Added a module docstring.',
          status: 'done',
          meta: { via: 'dispatch', usage: { tokens_in: 900, tokens_out: 40, cost_usd: 0 }, route: { executor: 'ollama', free: true } },
        },
      ],
    })
    const instruction = screen.getByTestId('dispatch-instruction')
    expect(instruction.textContent).toContain('Dispatch')
    expect(instruction.textContent).toContain('add a docstring to router.py')
    expect(instruction.textContent).not.toContain('Claude Code')
    expect(screen.queryByTestId('mcp-instruction')).toBeNull()
    expect(screen.getByText('Added a module docstring.')).toBeTruthy()
  })
})

describe('errors in the chat', () => {
  const FAILED = [
    { id: 'u1', role: 'user', content: 'refactor the parser', status: 'done' },
    { id: 'a1', role: 'assistant', content: 'Your laptop is offline', status: 'error' },
  ]

  it('a failed task says so and Retry sends its prompt again', async () => {
    const ws = await boot(true, { messages: FAILED })
    const error = screen.getByTestId('reply-error')
    expect(error.textContent).toContain('This task failed.')
    expect(screen.getByText('Your laptop is offline')).toBeTruthy()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Retry' })))
    expect(ws.sent.at(-1)).toEqual({ type: 'send', text: 'refactor the parser' })
  })

  it('a failed reply with no text still explains itself', async () => {
    await boot(true, { messages: [FAILED[0], { ...FAILED[1], content: '' }] })
    expect(screen.getByText('The task stopped with an error before it answered.')).toBeTruthy()
  })

  it('no Retry while another task is running', async () => {
    await boot(true, {
      status: 'busy',
      messages: [...FAILED, { id: 'u2', role: 'user', content: 'next', status: 'done' }, { id: 'a2', role: 'assistant', content: '', status: 'streaming' }],
    })
    expect(screen.getByTestId('reply-error')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull()
  })

  it('a dropped connection shows a banner whose Retry reconnects at once', async () => {
    const ws = await boot(true)
    expect(screen.queryByTestId('connection-banner')).toBeNull()
    await act(async () => ws.drop(1006))
    expect(screen.getByTestId('connection-banner').textContent).toContain('Can’t reach DoAide')
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Retry' })))
    expect(FakeSocket.instances).toHaveLength(2)
    expect(screen.getByTestId('connection-banner').textContent).toContain('Reconnecting')
    await act(async () => FakeSocket.instances[1].open())
    expect(screen.queryByTestId('connection-banner')).toBeNull()
  })
})
