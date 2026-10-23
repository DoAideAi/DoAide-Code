import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import AnimationPage from './AnimationPage.jsx'

afterEach(cleanup)

const css = () => screen.getByTestId('anim-css').textContent

describe('AnimationPage', () => {
  it('starts with the bounce preset', () => {
    render(<AnimationPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('CSS animation generator')
    expect(css()).toContain('@keyframes bounce {')
    expect(css()).toContain('animation: bounce 1.2s ease-in-out 0s infinite normal both;')
    expect(screen.getByTestId('anim-preview').style.animation).toContain('doaide-anim-preview')
  })

  it('edits stops, timing and easing', () => {
    render(<AnimationPage />)
    fireEvent.click(screen.getByTestId('anim-preset-spin'))
    fireEvent.click(screen.getByTestId('anim-stop-100'))
    fireEvent.click(screen.getByTestId('anim-use-opacity'))
    fireEvent.change(screen.getByTestId('anim-opacity'), { target: { value: '0.25' } })
    expect(css()).toContain('100% {\n    transform: rotate(360deg);\n    opacity: 0.25;')
    expect(css()).toContain('0% {\n    transform: rotate(0deg);\n    opacity: 1;')

    fireEvent.change(screen.getByTestId('anim-new-at'), { target: { value: '50' } })
    fireEvent.click(screen.getByTestId('anim-add-stop'))
    expect(css()).toContain('50% {')

    fireEvent.change(screen.getByTestId('anim-easing'), { target: { value: 'custom' } })
    fireEvent.change(screen.getByTestId('anim-bezier-y2'), { target: { value: '1.5' } })
    fireEvent.change(screen.getByTestId('anim-iterations'), { target: { value: '3' } })
    expect(css()).toContain('animation: spin 1s cubic-bezier(0.25, 0.1, 0.25, 1.5) 0s 3 normal both;')
  })
})
