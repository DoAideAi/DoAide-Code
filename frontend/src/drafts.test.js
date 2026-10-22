import { beforeEach, describe, expect, it } from 'vitest'
import { clearUnsent, echoed, loadDraft, recordUnsent, saveDraft, unsent } from './drafts.js'

beforeEach(() => localStorage.clear())

describe('drafts', () => {
  it('keeps one draft per conversation and forgets blank ones', () => {
    saveDraft('a', 'first')
    saveDraft('b', 'second')
    expect([loadDraft('a'), loadDraft('b'), loadDraft('c')]).toEqual(['first', 'second', ''])
    saveDraft('a', '   ')
    expect(localStorage.getItem('doaide-draft:a')).toBeNull()
    saveDraft(null, 'nowhere')
    expect(loadDraft(null)).toBe('')
  })

  it('keeps the sent message until its echo is seen', () => {
    recordUnsent('s', 'hello ', 5)
    expect(unsent()).toEqual({ sessionId: 's', text: 'hello ', at: 5 })
    expect(echoed([{ role: 'assistant', content: 'hello' }])).toBe(false)
    expect(echoed([{ role: 'user', content: 'hello' }])).toBe(true)
    clearUnsent()
    expect(unsent()).toBeNull()
    expect(echoed([{ role: 'user', content: 'hello' }])).toBe(false)
    localStorage.setItem('doaide-unsent', '{junk')
    expect(unsent()).toBeNull()
  })
})
