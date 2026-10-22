import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import FeedbackWidget from './FeedbackWidget.jsx'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

beforeEach(() => {
  localStorage.clear()
})

function stubFetch() {
  const calls = []
  vi.stubGlobal('fetch', (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) })
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) })
  })
  return calls
}

describe('FeedbackWidget', () => {
  it('sends a thumbs-up right away, then an optional comment', () => {
    const calls = stubFetch()
    render(<FeedbackWidget tool="code-review" />)
    fireEvent.click(screen.getByTestId('feedback-yes'))
    expect(calls).toEqual([{ url: '/api/public/feedback', body: { tool: 'code-review', helpful: true, comment: '' } }])
    fireEvent.change(screen.getByTestId('feedback-text'), { target: { value: 'great reviews' } })
    fireEvent.click(screen.getByTestId('feedback-send'))
    expect(calls[1].body).toEqual({ tool: 'code-review', helpful: true, comment: 'great reviews' })
    expect(screen.getByTestId('feedback-done')).toBeTruthy()
  })

  it('lets a thumbs-down skip the comment', () => {
    const calls = stubFetch()
    render(<FeedbackWidget tool="regex-tester" />)
    fireEvent.click(screen.getByTestId('feedback-no'))
    expect(calls[0].body.helpful).toBe(false)
    expect(screen.getByTestId('feedback-send').textContent).toBe('Skip')
    fireEvent.click(screen.getByTestId('feedback-send'))
    expect(calls).toHaveLength(1)
    expect(screen.getByTestId('feedback-done')).toBeTruthy()
  })

  it('does not ask the same browser about the same tool twice', () => {
    stubFetch()
    const first = render(<FeedbackWidget tool="diff-checker" />)
    fireEvent.click(screen.getByTestId('feedback-yes'))
    first.unmount()
    render(<FeedbackWidget tool="diff-checker" />)
    expect(screen.queryByTestId('feedback-ask')).toBeNull()
    expect(screen.getByTestId('feedback-done')).toBeTruthy()
  })

  it('still asks about a different tool', () => {
    stubFetch()
    const first = render(<FeedbackWidget tool="diff-checker" />)
    fireEvent.click(screen.getByTestId('feedback-yes'))
    first.unmount()
    render(<FeedbackWidget tool="json-formatter" />)
    expect(screen.getByTestId('feedback-ask')).toBeTruthy()
  })
})
