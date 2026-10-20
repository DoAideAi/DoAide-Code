import { act, cleanup, render, screen } from '@testing-library/react'
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
          : {}
    return { ok: path !== '/api/me', json: async () => body }
  })
}

async function boot(desktop) {
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
    })
  })
  return ws
}

beforeEach(() => {
  FakeSocket.instances = []
  globalThis.WebSocket = FakeSocket
  useChat.setState({ messages: [], project: null, serverStatus: 'idle', connection: 'closed' })
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

  it('mobile is a read-only /sync view with no input', async () => {
    const ws = await boot(false)
    expect(ws.url).toContain('/sync?token=tok')
    expect(screen.queryByTestId('composer')).toBeNull()
    expect(screen.getByText('hi there')).toBeTruthy()
  })

  it('shows a red dot after a failed run', async () => {
    const ws = await boot(true)
    await act(async () => ws.emit({ type: 'status', state: 'error' }))
    expect(screen.getByTestId('status-dot').dataset.color).toBe('red')
  })
})
