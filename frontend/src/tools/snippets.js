// Recent snippets on the tool pages: the last few things each tool ran, kept in localStorage so
// closing the tab doesn't lose them. One pool per scope ('ai' for all the AI tools, else the
// utility's slug), newest first, deduplicated by content.

const KEY = 'doaide-tool-snippets'
const MAX_PER_SCOPE = 10
// Enough to recognize and restore a snippet without filling localStorage.
const MAX_SAVED_CHARS = 20_000

function load() {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(all) ? all.filter((s) => s && typeof s.code === 'string' && s.scope) : []
  } catch {
    return []
  }
}

function store(all) {
  try {
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    // Storage unavailable or full: history is a convenience, never an error.
  }
}

// Newest first, for one scope.
export function savedSnippets(scope) {
  return load().filter((s) => s.scope === scope)
}

export function rememberSnippet(scope, code, language = '', now = Date.now()) {
  const trimmed = code.slice(0, MAX_SAVED_CHARS)
  if (!trimmed.trim()) return
  const rest = load().filter((s) => !(s.scope === scope && s.code === trimmed))
  const mine = rest.filter((s) => s.scope === scope).slice(0, MAX_PER_SCOPE - 1)
  const others = rest.filter((s) => s.scope !== scope)
  store([{ scope, code: trimmed, language, at: now }, ...mine, ...others])
}

export function clearSnippets(scope) {
  store(load().filter((s) => s.scope !== scope))
}

// "5m ago · Python · def f(): return 1" — what the Recent menu shows for one snippet.
export function snippetLabel(snippet, now = Date.now()) {
  const minutes = Math.max(0, Math.round((now - snippet.at) / 60_000))
  const age =
    minutes < 1 ? 'just now' : minutes < 60 ? `${minutes}m ago` : minutes < 60 * 24 ? `${Math.round(minutes / 60)}h ago` : `${Math.round(minutes / (60 * 24))}d ago`
  const head = snippet.code.trim().split('\n')[0].slice(0, 40)
  return [age, snippet.language, head].filter(Boolean).join(' · ')
}
