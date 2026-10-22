import { socketUrl } from './api.js'

// A ping every PING_MS; no frame back within PONG_WAIT_MS means the socket is dead.
export const PING_MS = 25000
export const PONG_WAIT_MS = 5000

// Keeps one WebSocket open with backoff reconnects. A socket can die without a close event (a
// phone or laptop that slept, a dropped Wi-Fi): it then delivers nothing, and the chat stops
// updating while it looks connected. So the server's pong is checked, and coming back to the
// page or the network probes the socket (or reconnects at once). Every connect gets a fresh
// snapshot, so nothing said in the meantime is missed.
export function connect({ path, token, onEvent, onState, onUnauthorized }) {
  let ws = null
  let closed = false
  let retry = 0
  let timer = null
  let pinger = null
  let check = null
  // Frames received on the current socket; unchanged since a ping means no pong came.
  let frames = 0

  const stopTimers = () => {
    clearInterval(pinger)
    clearTimeout(check)
  }

  const reconnect = (delay) => {
    clearTimeout(timer)
    timer = setTimeout(open, delay)
  }

  const open = () => {
    onState('connecting')
    const socket = new WebSocket(socketUrl(path, token))
    ws = socket
    socket.onopen = () => {
      retry = 0
      onState('open')
      pinger = setInterval(probe, PING_MS)
    }
    socket.onmessage = (msg) => {
      frames += 1
      try {
        onEvent(JSON.parse(msg.data))
      } catch {
        // Ignore malformed frames.
      }
    }
    socket.onclose = (ev) => {
      stopTimers()
      onState('closed')
      if (closed) return
      if (ev.code === 4401) {
        onUnauthorized()
        return
      }
      reconnect(Math.min(1000 * 2 ** retry++, 15000))
    }
  }

  // Give up on a socket that stopped answering and connect again now, without waiting for the
  // browser to notice (that can take minutes).
  const drop = () => {
    const dead = ws
    ws = null
    stopTimers()
    if (dead) {
      dead.onopen = dead.onmessage = dead.onclose = null
      try {
        dead.close()
      } catch {
        // Already gone.
      }
    }
    onState('closed')
    if (!closed) {
      retry = 0
      reconnect(0)
    }
  }

  const send = (data) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data))
      return true
    }
    return false
  }

  const probe = () => {
    const before = frames
    if (!send({ type: 'ping' })) return
    clearTimeout(check)
    check = setTimeout(() => frames === before && drop(), PONG_WAIT_MS)
  }

  // Check the socket at once, or reconnect now instead of waiting out the backoff.
  const retryNow = () => {
    if (closed) return
    if (ws && ws.readyState === WebSocket.OPEN) probe()
    else if (!ws || ws.readyState > 1) {
      retry = 0
      clearTimeout(timer)
      open()
    }
  }
  // Back on the page or the network.
  const wake = () => document.visibilityState !== 'hidden' && retryNow()
  document.addEventListener('visibilitychange', wake)
  window.addEventListener('online', wake)

  open()
  return {
    send,
    retryNow,
    close() {
      closed = true
      clearTimeout(timer)
      stopTimers()
      document.removeEventListener('visibilitychange', wake)
      window.removeEventListener('online', wake)
      ws?.close()
    },
  }
}
