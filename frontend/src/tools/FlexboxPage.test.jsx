import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import FlexboxPage from './FlexboxPage.jsx'

afterEach(cleanup)

describe('FlexboxPage', () => {
  it('renders three items and the base CSS', () => {
    render(<FlexboxPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Flexbox playground')
    expect(screen.getByTestId('flex-item-2')).toBeTruthy()
    expect(screen.getByTestId('flex-css').textContent).toContain('display: flex;')
  })

  it('container controls change the CSS and the preview style', () => {
    render(<FlexboxPage />)
    fireEvent.change(screen.getByTestId('flex-justifyContent'), { target: { value: 'center' } })
    expect(screen.getByTestId('flex-css').textContent).toContain('justify-content: center;')
    expect(screen.getByTestId('flex-preview').style.justifyContent).toBe('center')
  })

  it('selecting an item and growing it emits an item rule', () => {
    render(<FlexboxPage />)
    fireEvent.click(screen.getByTestId('flex-item-1'))
    fireEvent.change(screen.getByTestId('flex-grow'), { target: { value: '3' } })
    expect(screen.getByTestId('flex-css').textContent).toContain('.item-2')
    expect(screen.getByTestId('flex-css').textContent).toContain('flex: 3 1 auto;')
  })

  it('adds and removes items within bounds', () => {
    render(<FlexboxPage />)
    fireEvent.click(screen.getByTestId('flex-add-item'))
    expect(screen.getByTestId('flex-item-3')).toBeTruthy()
    fireEvent.click(screen.getByTestId('flex-remove-item'))
    fireEvent.click(screen.getByTestId('flex-remove-item'))
    fireEvent.click(screen.getByTestId('flex-remove-item'))
    expect(screen.queryByTestId('flex-item-1')).toBeNull()
    expect(screen.getByTestId('flex-item-0')).toBeTruthy()
  })
})
