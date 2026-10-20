import { socketUrl } from './api.js'

// Keeps one WebSocket open with backoff reconnects.
export function connect({ path, token, onEvent, onState, onUnauthorized }) {
  let ws = null
  let closed = false
  let retry = 0
  let timer = null
  let pinger = null

  const open = () => {
    onState('connecting')
    ws = new WebSocket(socketUrl(path, token))
    ws.onopen = () => {
      retry = 0
      onState('open')
      pinger = setInterval(() => send({ type: 'ping' }), 25000)
    }
    ws.onmessage = (msg) => {
      try {
        onEvent(JSON.parse(msg.data))
      } catch {
        // Ignore malformed frames.
      }
    }
    ws.onclose = (ev) => {
      clearInterval(pinger)
      onState('closed')
      if (closed) return
      if (ev.code === 4401) {
        onUnauthorized()
        return
      }
      timer = setTimeout(open, Math.min(1000 * 2 ** retry++, 15000))
    }
  }

  const send = (data) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data))
      return true
    }
    return false
  }

  open()
  return {
    send,
    close() {
      closed = true
      clearTimeout(timer)
      clearInterval(pinger)
      ws?.close()
    },
  }
}
