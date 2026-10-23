import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import HttpStatusPage from './HttpStatusPage.jsx'
import { STATUS_CODES } from './httpStatusTool.js'

afterEach(cleanup)

describe('HttpStatusPage', () => {
  it('lists every code by default', () => {
    render(<HttpStatusPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('HTTP status codes, explained')
    expect(screen.getByTestId('status-list').children).toHaveLength(STATUS_CODES.length)
  })

  it('narrows with the search box', () => {
    render(<HttpStatusPage />)
    fireEvent.change(screen.getByTestId('status-search'), { target: { value: '418' } })
    expect(screen.getByTestId('status-list').children).toHaveLength(1)
    expect(screen.getByTestId('status-count').textContent).toBe('1 status code')
  })

  it('filters by category chip and toggles back off', () => {
    render(<HttpStatusPage />)
    fireEvent.click(screen.getByTestId('status-cat-5'))
    const after = screen.getByTestId('status-list').children.length
    expect(after).toBeLessThan(STATUS_CODES.length)
    fireEvent.click(screen.getByTestId('status-cat-5'))
    expect(screen.getByTestId('status-list').children).toHaveLength(STATUS_CODES.length)
  })

  it('says so when nothing matches', () => {
    render(<HttpStatusPage />)
    fireEvent.change(screen.getByTestId('status-search'), { target: { value: 'zzzznothing' } })
    expect(screen.getByTestId('status-empty')).toBeTruthy()
  })
})
