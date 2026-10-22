import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ModelPicker, { modelLabel } from './ModelPicker.jsx'

afterEach(cleanup)

const models = {
  tools: [],
  pinned: null,
  executors: [
    { name: 'ollama', tier: 0, model: 'qwen2.5-coder:7b', usable: true },
    { name: 'claude-sonnet', tier: 2, model: 'sonnet', usable: true },
    { name: 'claude-opus', tier: 3, model: 'opus', usable: false },
  ],
}

describe('ModelPicker', () => {
  it('stays hidden until the laptop reports its executors', () => {
    const { container } = render(<ModelPicker models={{ tools: [] }} onChoose={() => {}} />)
    expect(container.innerHTML).toBe('')
  })

  it('shows Auto, and sends the chosen model', () => {
    const onChoose = vi.fn()
    render(<ModelPicker models={models} onChoose={onChoose} />)
    expect(screen.getByTestId('model-picker').textContent).toBe('Auto')
    fireEvent.click(screen.getByTestId('model-picker'))
    fireEvent.click(screen.getByTestId('model-option-claude-sonnet'))
    expect(onChoose).toHaveBeenCalledWith('claude-sonnet')
    expect(screen.queryByTestId('model-menu')).toBeNull()
  })

  it('goes back to auto, marks the choice, and disables what cannot run', () => {
    const onChoose = vi.fn()
    render(<ModelPicker models={{ ...models, pinned: 'claude-sonnet' }} onChoose={onChoose} />)
    expect(screen.getByTestId('model-picker').textContent).toBe('Claude Sonnet')
    fireEvent.click(screen.getByTestId('model-picker'))
    expect(screen.getByTestId('model-option-claude-opus').disabled).toBe(true)
    expect(screen.getByTestId('model-option-claude-sonnet').closest('li').getAttribute('aria-selected')).toBe('true')
    // Choosing the current one again sends nothing.
    fireEvent.click(screen.getByTestId('model-option-claude-sonnet'))
    expect(onChoose).not.toHaveBeenCalled()
    fireEvent.click(screen.getByTestId('model-picker'))
    fireEvent.click(screen.getByTestId('model-option-auto'))
    expect(onChoose).toHaveBeenCalledWith('auto')
  })

  it('only shows the choice while offline or busy', () => {
    render(<ModelPicker models={models} />)
    expect(screen.getByTestId('model-picker').disabled).toBe(true)
  })

  it('Escape closes the menu without reaching the app', () => {
    const appEscape = vi.fn()
    window.addEventListener('keydown', appEscape)
    render(<ModelPicker models={models} onChoose={() => {}} />)
    fireEvent.click(screen.getByTestId('model-picker'))
    fireEvent.keyDown(document.body, { key: 'Escape' })
    window.removeEventListener('keydown', appEscape)
    expect(screen.queryByTestId('model-menu')).toBeNull()
    expect(appEscape).not.toHaveBeenCalled()
  })

  it('names executors kindly', () => {
    expect(modelLabel('ollama-coder')).toBe('Local coder')
    expect(modelLabel('mystery')).toBe('mystery')
    expect(modelLabel(null)).toBe('Auto')
  })
})
