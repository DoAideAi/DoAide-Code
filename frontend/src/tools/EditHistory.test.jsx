import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import EditHistory from './EditHistory.jsx'
import { emptyHistory, record } from './editHistory.js'

afterEach(cleanup)

const history = () => record(record(emptyHistory('one'), 'one\ntwo'), 'one\nthree')

describe('EditHistory', () => {
  it('stays hidden until there is history', () => {
    render(<EditHistory history={emptyHistory('')} code="" onNavigate={() => {}} />)
    expect(screen.queryByTestId('edit-history')).toBeNull()
  })

  it('steps back to the previous version', () => {
    const onNavigate = vi.fn()
    render(<EditHistory history={history()} code={'one\nthree'} onNavigate={onNavigate} />)
    expect(screen.getByText(/Version 3 of 3/)).toBeTruthy()
    fireEvent.click(screen.getByTestId('hist-undo'))
    const [next, restored] = onNavigate.mock.calls[0]
    expect(restored).toBe('one\ntwo')
    expect(next.index).toBe(1)
  })

  it('saves unsaved edits as a version before stepping away', () => {
    const onNavigate = vi.fn()
    render(<EditHistory history={history()} code="edited beyond" onNavigate={onNavigate} />)
    fireEvent.click(screen.getByTestId('hist-undo'))
    const [next, restored] = onNavigate.mock.calls[0]
    expect(next.versions.map((v) => v.code)).toContain('edited beyond')
    expect(restored).toBe('one\nthree')
  })

  it('shows a diff against the previous version', () => {
    render(<EditHistory history={history()} code={'one\nthree'} onNavigate={() => {}} />)
    fireEvent.click(screen.getByTestId('hist-diff'))
    const panel = screen.getByTestId('hist-diff-panel')
    expect(panel.textContent).toContain('+1')
    expect(panel.textContent).toContain('−1')
    expect(panel.textContent).toContain('- two')
    expect(panel.textContent).toContain('+ three')
  })
})
