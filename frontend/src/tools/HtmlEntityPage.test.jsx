import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import HtmlEntityPage from './HtmlEntityPage.jsx'

afterEach(cleanup)

describe('HtmlEntityPage', () => {
  it('encodes the sample with named entities', () => {
    render(<HtmlEntityPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Encode and decode HTML entities')
    expect(screen.getByTestId('entity-output').textContent).toBe('&lt;p class=&quot;note&quot;&gt;Fish &amp; chips &mdash; &pound;5 &copy; 2026&lt;/p&gt;')
  })

  it('switches mode and round-trips with the swap button', () => {
    render(<HtmlEntityPage />)
    fireEvent.change(screen.getByTestId('entity-mode'), { target: { value: 'numeric' } })
    expect(screen.getByTestId('entity-output').textContent).toContain('&#8212;')
    fireEvent.click(screen.getByTestId('entity-swap'))
    expect(screen.getByTestId('entity-decode').getAttribute('aria-selected')).toBe('true')
    expect(screen.getByTestId('entity-output').textContent).toBe('<p class="note">Fish & chips — £5 © 2026</p>')
  })

  it('decodes typed input and shows the reference', () => {
    render(<HtmlEntityPage />)
    fireEvent.click(screen.getByTestId('entity-decode'))
    fireEvent.change(screen.getByTestId('entity-input'), { target: { value: '5 &lt; 6 &amp;&amp; &#x2713;' } })
    expect(screen.getByTestId('entity-output').textContent).toBe('5 < 6 && ✓')
    expect(screen.getByTestId('entity-reference').textContent).toContain('&nbsp;')
  })
})
