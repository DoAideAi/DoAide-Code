import { describe, expect, it } from 'vitest'
import { promptFor } from './MessageList.jsx'

describe('promptFor', () => {
  it('is the closest user message before the reply, skipping notes and tool output', () => {
    const messages = [
      { role: 'user', content: 'first' },
      { role: 'assistant', content: 'ok' },
      { role: 'user', content: 'second' },
      { role: 'system', content: 'note' },
      { role: 'assistant', content: 'failed' },
    ]
    expect(promptFor(messages, 4)).toBe('second')
    expect(promptFor(messages, 1)).toBe('first')
  })

  it('is null when nothing was asked before it', () => {
    expect(promptFor([{ role: 'assistant', content: 'x' }], 0)).toBeNull()
  })
})
