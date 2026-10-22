import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { CodeBlock, tokenLines } from './MessageList.jsx'

beforeEach(() => localStorage.clear())
afterEach(cleanup)

describe('tokenLines', () => {
  it('splits tokens into lines, multi-line comments included, without an empty last line', () => {
    const lines = tokenLines([
      { text: 'a = 1 ', kind: null },
      { text: '/* x\ny */', kind: 'comment' },
      { text: '\n', kind: null },
    ])
    expect(lines).toEqual([
      [{ text: 'a = 1 ', kind: null }, { text: '/* x', kind: 'comment' }],
      [{ text: 'y */', kind: 'comment' }],
    ])
  })
})

describe('CodeBlock', () => {
  it('has a header with the language, numbers lines, and keeps the code text exact', () => {
    const { container } = render(<CodeBlock value={'def f():\n    return 1\n'} lang="python" />)
    expect(screen.getByTestId('code-lang').textContent).toBe('python')
    const code = container.querySelector('code')
    expect(code.className).toBe('code-lines')
    expect(code.querySelectorAll('.code-line')).toHaveLength(2)
    expect(code.style.getPropertyValue('--gutter')).toBe('1ch')
    // The numbers are CSS: not in the text, so not copied.
    expect(code.textContent).toBe('def f():\n    return 1')
  })

  it('one-line blocks have no numbers; no language reads "code"', () => {
    const { container } = render(<CodeBlock value="npm test" />)
    expect(container.querySelector('.code-line')).toBeNull()
    expect(screen.getByTestId('code-lang').textContent).toBe('code')
  })

  it('Wrap toggles every block and is remembered', () => {
    const { container } = render(
      <>
        <CodeBlock value="a" />
        <CodeBlock value="b" />
      </>,
    )
    const [first] = screen.getAllByTestId('wrap-code')
    expect(first.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(first)
    expect(screen.getAllByTestId('wrap-code').map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'true'])
    expect([...container.querySelectorAll('pre')].every((p) => p.className.includes('whitespace-pre-wrap'))).toBe(true)
    expect(localStorage.getItem('doaide-code-wrap')).toBe('1')
    cleanup()
    render(<CodeBlock value="c" />)
    expect(screen.getByTestId('wrap-code').getAttribute('aria-pressed')).toBe('true')
  })
})
