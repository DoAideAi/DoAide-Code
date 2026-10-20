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
}

function setViewport(desktop) {
  window.matchMedia = (query) => ({
    matches: desktop,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })
}

function mockFetch() {
  globalThis.fetch = vi.fn(async (path) => {
    const body =
      path === '/api/config'
        ? { google_client_id: '', local_login: true }
        : path === '/api/auth/local'
          ? { token: 'tok', email: 'local' }
          : path === '/api/agent-token'
            ? { token: 'agent-tok', hub_url: 'wss://code.doaide.com/agent' }
            : {}
    return { ok: path !== '/api/me', json: async () => body }
  })
}

async function boot(desktop, snapshot = {}) {
  setViewport(desktop)
  render(<App />)
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
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
  try {
    localStorage.clear()
  } catch {}
  mockFetch()
})

afterEach(cleanup)

describe('App', () => {
  it('desktop connects to /ws, shows project pill, green dot, and an input', async () => {
    const ws = await boot(true)
    expect(ws.url).toContain('/ws?token=tok')
    expect(screen.getByTestId('project-pill').textContent).toBe('alpha')
    expect(screen.getByTestId('status-dot').dataset.color).toBe('green')
    expect(screen.getByText('hi there')).toBeTruthy()
    expect(screen.getByLabelText('Message')).toBeTruthy()
  })

  it('mobile uses the same /ws chat and can send prompts', async () => {
    const ws = await boot(false)
    expect(ws.url).toContain('/ws?token=tok')
    expect(screen.getByTestId('composer')).toBeTruthy()
    expect(screen.getByText('hi there')).toBeTruthy()
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

  it('hub relays typed prompts over the socket', async () => {
    const ws = await boot(false, { mode: 'hub', agent_online: true })
    const input = screen.getByLabelText('Message')
    await act(async () => fireEvent.change(input, { target: { value: 'run tests' } }))
    await act(async () => fireEvent.keyDown(input, { key: 'Enter' }))
    expect(ws.sent.at(-1)).toEqual({ type: 'send', text: 'run tests' })
  })

  it('shows a red dot after a failed run', async () => {
    const ws = await boot(true)
    await act(async () => ws.emit({ type: 'status', state: 'error' }))
    expect(screen.getByTestId('status-dot').dataset.color).toBe('red')
  })
})
