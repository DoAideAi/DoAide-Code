import { describe, expect, it } from 'vitest'
import { parseDiff } from './diff.js'

const DIFF = `--- a/app.py
+++ b/app.py
@@ -3,4 +3,4 @@ def main():
 x = 1
-y = 2
--- old comment
+y = 3
 return x
\\ No newline at end of file
`

describe('parseDiff', () => {
  it('numbers old and new lines from the hunk header and drops file headers', () => {
    const rows = parseDiff(DIFF)
    expect(rows.map((r) => [r.kind, r.old, r.new, r.text])).toEqual([
      ['hunk', null, null, 'def main():'],
      ['ctx', 3, 3, 'x = 1'],
      ['del', 4, null, 'y = 2'],
      // A removed "-- old comment" line, not a file header.
      ['del', 5, null, '-- old comment'],
      ['add', null, 4, 'y = 3'],
      ['ctx', 6, 5, 'return x'],
      ['note', null, null, 'No newline at end of file'],
    ])
  })

  it('handles new files and text without hunks', () => {
    expect(parseDiff('@@ -0,0 +1,2 @@\n+a\n+b\n').map((r) => r.new)).toEqual([null, 1, 2])
    expect(parseDiff('+loose')).toEqual([{ kind: 'add', text: 'loose', old: null, new: null }])
    expect(parseDiff('')).toEqual([])
    expect(parseDiff(null)).toEqual([])
  })
})
