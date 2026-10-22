// Nothing typed is lost: the message box is saved per conversation as you type, and a sent
// message is kept until the server echoes it back (a crash or a dropped connection in between
// would otherwise lose it). Messages themselves are saved by the server as they happen.

const DRAFT = 'doaide-draft:'
const UNSENT = 'doaide-unsent'

function read(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key, value) {
  try {
    if (value) localStorage.setItem(key, value)
    else localStorage.removeItem(key)
  } catch {
    // Storage unavailable (private mode, full): nothing is kept, as before.
  }
}

export function loadDraft(sessionId) {
  return sessionId ? (read(DRAFT + sessionId) ?? '') : ''
}

export function saveDraft(sessionId, text) {
  if (sessionId) write(DRAFT + sessionId, text.trim() ? text : null)
}

export function recordUnsent(sessionId, text, now = Date.now()) {
  write(UNSENT, JSON.stringify({ sessionId, text, at: now }))
}

export function clearUnsent() {
  write(UNSENT, null)
}

export function unsent() {
  try {
    const value = JSON.parse(read(UNSENT) ?? 'null')
    return value && typeof value.text === 'string' ? value : null
  } catch {
    return null
  }
}

// True when `messages` hold the echo of the unsent message (so it did arrive).
export function echoed(messages, pending = unsent()) {
  if (!pending) return false
  const text = pending.text.trim()
  return messages.some((m) => m.role === 'user' && m.content?.trim() === text)
}
