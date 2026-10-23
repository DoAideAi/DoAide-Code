import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import EmojiPage from './EmojiPage.jsx'
import { EMOJIS } from './emojiTool.js'

afterEach(cleanup)

describe('EmojiPage', () => {
  it('shows the full grid by default', () => {
    render(<EmojiPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Emoji picker for developers')
    expect(screen.getByTestId('emoji-grid').children).toHaveLength(EMOJIS.length)
    expect(screen.queryByTestId('emoji-detail')).toBeNull()
  })

  it('search narrows the grid', () => {
    render(<EmojiPage />)
    fireEvent.change(screen.getByTestId('emoji-search'), { target: { value: 'docker' } })
    expect(screen.getByTestId('emoji-grid').children).toHaveLength(1)
  })

  it('clicking an emoji opens the detail card with all formats', () => {
    render(<EmojiPage />)
    fireEvent.click(screen.getByRole('button', { name: 'rocket' }))
    const detail = screen.getByTestId('emoji-detail')
    expect(detail.textContent).toContain('U+1F680')
    expect(detail.textContent).toContain('&#x1F680;')
    expect(detail.textContent).toContain('\\u{1F680}')
  })

  it('says so when nothing matches', () => {
    render(<EmojiPage />)
    fireEvent.change(screen.getByTestId('emoji-search'), { target: { value: 'zzzznothing' } })
    expect(screen.getByTestId('emoji-empty')).toBeTruthy()
  })
})
