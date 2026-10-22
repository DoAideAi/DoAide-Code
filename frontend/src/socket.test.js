import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PING_MS, PONG_WAIT_MS, connect } from './socket.js'

class FakeSocket {
  static instances = []
  static OPEN = 1
  constructor(url) {
    this.url = url
    this.readyState = 0
    this.sent = []
    this.closed = false
    FakeSocket.instances.push(this)
  }
  send(data) {
    this.sent.push(JSON.parse(data))
  }
  close() {
    this.closed = true
  }
  open() {
    this.readyState = 1
    this.onopen?.()
  }
  emit(event) {
    this.onmessage?.({ data: JSON.stringify(event) })
  }
}

let conn
let events
let states

function start() {
  events = []
  states = []
  conn = connect({ path: '/ws', token: 't', onEvent: (e) => events.push(e), onState: (s) => states.push(s), onUnauthorized() {} })
  const ws = FakeSocket.instances.at(-1)
  ws.open()
  return ws
}

beforeEach(() => {
  vi.useFakeTimers()
  FakeSocket.instances = []
  globalThis.WebSocket = FakeSocket
})

afterEach(() => {
  conn?.close()
  vi.useRealTimers()
})

describe('socket liveness', () => {
  it('keeps a socket that answers its pings', () => {
    const ws = start()
    vi.advanceTimersByTime(PING_MS)
    expect(ws.sent.at(-1)).toEqual({ type: 'ping' })
    ws.emit({ type: 'pong' })
    vi.advanceTimersByTime(PONG_WAIT_MS)
    expect(FakeSocket.instances).toHaveLength(1)
    expect(ws.closed).toBe(false)
  })

  it('reconnects at once when a socket stops answering (no close event ever comes)', () => {
    const dead = start()
    vi.advanceTimersByTime(PING_MS + PONG_WAIT_MS)
    expect(dead.closed).toBe(true)
    vi.advanceTimersByTime(1) // a 0ms timer set during a tick runs 1ms later
    expect(FakeSocket.instances).toHaveLength(2)
    // The new connection's snapshot and live events arrive; the dead one is ignored.
    const fresh = FakeSocket.instances[1]
    fresh.open()
    fresh.emit({ type: 'snapshot', messages: [] })
    dead.emit({ type: 'delta', id: 'old', text: 'x' })
    expect(events).toEqual([{ type: 'snapshot', messages: [] }])
    expect(states.at(-1)).toBe('open')
  })

  it('checks the socket when the page becomes visible again', () => {
    const ws = start()
    document.dispatchEvent(new Event('visibilitychange'))
    expect(ws.sent.at(-1)).toEqual({ type: 'ping' })
    vi.advanceTimersByTime(PONG_WAIT_MS)
    vi.advanceTimersByTime(1) // a 0ms timer set during a tick runs 1ms later
    expect(FakeSocket.instances).toHaveLength(2)
  })

  it('reconnects right away when the network comes back, without waiting out the backoff', () => {
    const ws = start()
    ws.readyState = 3
    ws.onclose({ code: 1006 })
    expect(FakeSocket.instances).toHaveLength(1) // backoff timer pending
    window.dispatchEvent(new Event('online'))
    expect(FakeSocket.instances).toHaveLength(2)
    vi.advanceTimersByTime(20000)
    expect(FakeSocket.instances).toHaveLength(2) // the backoff reconnect was cancelled
  })

  it('retryNow reconnects at once after a drop, even on a hidden page', () => {
    const ws = start()
    ws.readyState = 3
    ws.onclose({ code: 1006 })
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    try {
      conn.retryNow()
    } finally {
      delete document.visibilityState
    }
    expect(FakeSocket.instances).toHaveLength(2)
    vi.advanceTimersByTime(20000)
    expect(FakeSocket.instances).toHaveLength(2) // the backoff reconnect was cancelled
  })

  it('retryNow on a live socket only checks it', () => {
    const ws = start()
    conn.retryNow()
    expect(ws.sent.at(-1)).toEqual({ type: 'ping' })
    expect(FakeSocket.instances).toHaveLength(1)
  })
})
