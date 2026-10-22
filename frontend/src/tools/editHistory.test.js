import { describe, expect, it } from 'vitest'
import { MAX_VERSIONS, canRedo, canUndo, current, diffBase, emptyHistory, record, redo, undo, versionLabel } from './editHistory.js'

describe('editHistory', () => {
  it('records distinct versions and skips repeats', () => {
    let h = emptyHistory('a')
    h = record(h, 'a')
    expect(h.versions.length).toBe(1)
    h = record(h, 'b')
    h = record(h, 'c')
    expect(h.versions.map((v) => v.code)).toEqual(['a', 'b', 'c'])
    expect(current(h).code).toBe('c')
  })

  it('undoes and redoes', () => {
    let h = record(record(emptyHistory('a'), 'b'), 'c')
    expect(canUndo(h)).toBe(true)
    h = undo(h)
    expect(current(h).code).toBe('b')
    expect(canRedo(h)).toBe(true)
    h = redo(h)
    expect(current(h).code).toBe('c')
    expect(canRedo(h)).toBe(false)
    expect(current(undo(undo(undo(h)))).code).toBe('a')
  })

  it('drops the redo tail when recording after an undo', () => {
    let h = record(record(emptyHistory('a'), 'b'), 'c')
    h = undo(h)
    h = record(h, 'd')
    expect(h.versions.map((v) => v.code)).toEqual(['a', 'b', 'd'])
    expect(canRedo(h)).toBe(false)
  })

  it('caps the stack at MAX_VERSIONS', () => {
    let h = emptyHistory('0')
    for (let i = 1; i <= MAX_VERSIONS + 10; i++) h = record(h, String(i))
    expect(h.versions.length).toBe(MAX_VERSIONS)
    expect(current(h).code).toBe(String(MAX_VERSIONS + 10))
  })

  it('picks the diff base: previous version normally, current one for unsaved edits', () => {
    const h = record(record(emptyHistory('a'), 'b'), 'c')
    expect(diffBase(h, 'c').code).toBe('b')
    expect(diffBase(h, 'c edited').code).toBe('c')
    expect(diffBase(emptyHistory('a'), 'a')).toBeNull()
  })

  it('labels version ages readably', () => {
    const now = 1_000_000
    expect(versionLabel(now - 2000, now)).toBe('just now')
    expect(versionLabel(now - 30_000, now)).toBe('30s ago')
    expect(versionLabel(now - 5 * 60_000, now)).toBe('5 min ago')
    expect(versionLabel(now - 2 * 3_600_000, now)).toBe('2 h ago')
  })
})
