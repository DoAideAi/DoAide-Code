// Unified diffs (as changes.py writes them) into rows for the diff view: each line with its old
// and new line numbers. File headers (---/+++) are dropped; the file name is shown above.

const HUNK = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@ ?(.*)$/

// [{ kind: 'hunk' | 'add' | 'del' | 'ctx' | 'note', text, old, new }]; `text` is the code without
// its +/-/space marker; `old`/`new` are line numbers (null where the line does not exist).
export function parseDiff(diff) {
  const rows = []
  if (!diff) return rows
  let oldNo = 0
  let newNo = 0
  // Lines before any @@ header have no known line numbers.
  let inHunk = false
  for (const line of diff.replace(/\n$/, '').split('\n')) {
    // One file per diff: headers only come before the first hunk (later, "--- x" is a removed "-- x").
    if (!inHunk && /^(?:--- |\+\+\+ |diff |index )/.test(line)) continue
    const hunk = HUNK.exec(line)
    if (hunk) {
      oldNo = Number(hunk[1])
      newNo = Number(hunk[2])
      inHunk = true
      rows.push({ kind: 'hunk', text: hunk[3], old: null, new: null })
    } else if (line.startsWith('+')) {
      rows.push({ kind: 'add', text: line.slice(1), old: null, new: inHunk ? newNo++ : null })
    } else if (line.startsWith('-')) {
      rows.push({ kind: 'del', text: line.slice(1), old: inHunk ? oldNo++ : null, new: null })
    } else if (line.startsWith('\\')) {
      // "\ No newline at end of file"
      rows.push({ kind: 'note', text: line.slice(2), old: null, new: null })
    } else {
      rows.push({ kind: 'ctx', text: line.slice(1), old: inHunk ? oldNo++ : null, new: inHunk ? newNo++ : null })
    }
  }
  return rows
}
