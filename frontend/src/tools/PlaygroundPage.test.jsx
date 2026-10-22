import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import PlaygroundPage from './PlaygroundPage.jsx'

afterEach(cleanup)

// What the runner iframe would post; jsdom never runs iframe scripts, so tests post it themselves.
function postFromFrame(frameTestId, data) {
  const frame = screen.getByTestId(frameTestId)
  act(() => {
    window.dispatchEvent(new MessageEvent('message', { data: { doaide: true, ...data }, source: frame.contentWindow }))
  })
}

describe('PlaygroundPage', () => {
  it('mounts a sandboxed runner iframe on Run and shows its output', async () => {
    render(<PlaygroundPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Run JavaScript or Python in your browser')
    expect(screen.queryByTestId('playground-frame')).toBeNull()
    fireEvent.click(screen.getByTestId('playground-run'))
    await screen.findByTestId('playground-frame')
    const frame = screen.getByTestId('playground-frame')
    expect(frame.getAttribute('sandbox')).toBe('allow-scripts')
    expect(frame.getAttribute('srcdoc')).toContain('squares')
    postFromFrame('playground-frame', { type: 'log', text: 'squares: [0,1,4,9,16]' })
    postFromFrame('playground-frame', { type: 'done' })
    expect(screen.getByTestId('playground-output').textContent).toContain('squares: [0,1,4,9,16]')
    expect(screen.getByTestId('playground-run').textContent).toBe('Run')
  })

  it('ignores messages that are not from its own runner', async () => {
    render(<PlaygroundPage />)
    fireEvent.click(screen.getByTestId('playground-run'))
    await screen.findByTestId('playground-frame')
    act(() => {
      window.dispatchEvent(new MessageEvent('message', { data: { doaide: true, type: 'log', text: 'spoofed' } }))
    })
    expect(screen.getByTestId('playground-output').textContent).not.toContain('spoofed')
  })

  it('swaps the example when the language changes, and starts Python via a persistent frame', async () => {
    render(<PlaygroundPage />)
    fireEvent.change(screen.getByTestId('playground-language'), { target: { value: 'Python' } })
    expect(screen.getByTestId('playground-code').value).toContain('range(5)')
    fireEvent.click(screen.getByTestId('playground-run'))
    await screen.findByTestId('playground-py-frame')
    postFromFrame('playground-py-frame', { type: 'loading' })
    expect(screen.getByTestId('playground-output').textContent).toContain('Downloading the Python runtime')
    postFromFrame('playground-py-frame', { type: 'log', text: 'sum: 30' })
    postFromFrame('playground-py-frame', { type: 'done' })
    expect(screen.getByTestId('playground-output').textContent).toContain('sum: 30')
  })

  it('says so when a run produces no output', async () => {
    render(<PlaygroundPage />)
    fireEvent.click(screen.getByTestId('playground-run'))
    await screen.findByTestId('playground-frame')
    postFromFrame('playground-frame', { type: 'done' })
    expect(screen.getByTestId('playground-output').textContent).toContain('Ran with no output.')
  })
})
