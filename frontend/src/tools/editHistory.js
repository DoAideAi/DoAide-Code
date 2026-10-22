// Session history for the AI tools editor: every run (and restore) snapshots the code, so you
// can step back and forward between versions and see a visual diff of what changed. Lives only
// in memory — versions vanish when the page closes, like an editor's undo stack.

export const MAX_VERSIONS = 50

export function emptyHistory(code = '', at = Date.now()) {
  return { versions: [{ code, at }], index: 0 }
}

export function current(history) {
  return history.versions[history.index]
}

// A new history with `code` as the newest version. A no-op when the code already is the current
// version; stepping back and then editing drops the versions ahead (like every undo stack).
export function record(history, code, at = Date.now()) {
  if (current(history).code === code) return history
  const versions = [...history.versions.slice(0, history.index + 1), { code, at }].slice(-MAX_VERSIONS)
  return { versions, index: versions.length - 1 }
}

export const canUndo = (history) => history.index > 0
export const canRedo = (history) => history.index < history.versions.length - 1

export function undo(history) {
  return canUndo(history) ? { ...history, index: history.index - 1 } : history
}

export function redo(history) {
  return canRedo(history) ? { ...history, index: history.index + 1 } : history
}

// The version a diff should compare the editor against: the one before the current index when
// the editor still shows the current version, else the current version itself.
export function diffBase(history, editorCode) {
  const cur = current(history)
  if (editorCode !== cur.code) return cur
  return canUndo(history) ? history.versions[history.index - 1] : null
}

export function versionLabel(at, now = Date.now()) {
  const s = Math.max(0, Math.round((now - at) / 1000))
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  return `${Math.round(m / 60)} h ago`
}
