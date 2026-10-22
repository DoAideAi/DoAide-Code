// Line diff for the diff checker page. Plain JS, no library: common head and tail are matched
// first, the middle goes through a longest-common-subsequence table, and anything too big for
// that falls back to "everything changed".

// Above this many DP cells (lines × lines) the LCS is skipped; ~700 kB of table at most.
const MAX_CELLS = 4_000_000

// Rows in display order: [{ kind: 'same' | 'del' | 'add', text, old, new }]. `old`/`new` are
// 1-based line numbers (null where the line does not exist on that side). In a changed block all
// removed lines come before the added ones.
export function diffLines(oldText, newText) {
  const a = oldText.split('\n')
  const b = newText.split('\n')
  let head = 0
  while (head < a.length && head < b.length && a[head] === b[head]) head++
  let endA = a.length
  let endB = b.length
  while (endA > head && endB > head && a[endA - 1] === b[endB - 1]) {
    endA--
    endB--
  }

  const rows = []
  for (let i = 0; i < head; i++) rows.push({ kind: 'same', text: a[i], old: i + 1, new: i + 1 })

  // The middle as 'keep both' / 'del' / 'add' ops, deletions first within a changed block.
  const ops = middleOps(a, b, head, endA, endB)
  let oldNo = head + 1
  let newNo = head + 1
  let dels = []
  let adds = []
  const flush = () => {
    rows.push(...dels, ...adds)
    dels = []
    adds = []
  }
  for (const op of ops) {
    if (op === 0) {
      flush()
      rows.push({ kind: 'same', text: a[oldNo - 1], old: oldNo++, new: newNo++ })
    } else if (op === -1) {
      dels.push({ kind: 'del', text: a[oldNo - 1], old: oldNo++, new: null })
    } else {
      adds.push({ kind: 'add', text: b[newNo - 1], old: null, new: newNo++ })
    }
  }
  flush()

  for (let i = endA; i < a.length; i++) rows.push({ kind: 'same', text: a[i], old: i + 1, new: i - endA + endB + 1 })
  return rows
}

// The middle [head, endA) vs [head, endB) as ops: 0 keep, -1 delete from a, +1 add from b.
function middleOps(a, b, head, endA, endB) {
  const n = endA - head
  const m = endB - head
  if (!n) return Array(m).fill(1)
  if (!m) return Array(n).fill(-1)
  if (n * m > MAX_CELLS) return [...Array(n).fill(-1), ...Array(m).fill(1)]

  // dp[i][j] = LCS length of a-middle[i:] and b-middle[j:], flattened; walked forward to emit
  // ops in display order.
  const width = m + 1
  const dp = new Uint32Array((n + 1) * width)
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i * width + j] =
        a[head + i] === b[head + j]
          ? dp[(i + 1) * width + j + 1] + 1
          : Math.max(dp[(i + 1) * width + j], dp[i * width + j + 1])
    }
  }
  const ops = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[head + i] === b[head + j]) {
      ops.push(0)
      i++
      j++
    } else if (dp[(i + 1) * width + j] >= dp[i * width + j + 1]) {
      ops.push(-1)
      i++
    } else {
      ops.push(1)
      j++
    }
  }
  while (i++ < n) ops.push(-1)
  while (j++ < m) ops.push(1)
  return ops
}

// How many lines were added and removed.
export function diffStats(rows) {
  let added = 0
  let removed = 0
  for (const r of rows) {
    if (r.kind === 'add') added++
    else if (r.kind === 'del') removed++
  }
  return { added, removed }
}

// Rows for the side-by-side view: same lines sit on both sides, and in a changed block the k-th
// removed line shares a row with the k-th added one (null fills the shorter side).
export function splitRows(rows) {
  const out = []
  let i = 0
  while (i < rows.length) {
    if (rows[i].kind === 'same') {
      out.push({ left: rows[i], right: rows[i] })
      i++
      continue
    }
    const dels = []
    const adds = []
    while (i < rows.length && rows[i].kind === 'del') dels.push(rows[i++])
    while (i < rows.length && rows[i].kind === 'add') adds.push(rows[i++])
    for (let k = 0; k < Math.max(dels.length, adds.length); k++)
      out.push({ left: dels[k] ?? null, right: adds[k] ?? null })
  }
  return out
}
