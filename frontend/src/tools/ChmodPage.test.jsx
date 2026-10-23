import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import ChmodPage from './ChmodPage.jsx'

afterEach(cleanup)

describe('ChmodPage', () => {
  it('starts at 755 and updates from checkboxes', () => {
    render(<ChmodPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Calculate chmod permissions')
    expect(screen.getByTestId('chmod-octal').textContent).toBe('755')
    fireEvent.click(screen.getByTestId('chmod-gx'))
    fireEvent.click(screen.getByTestId('chmod-ox'))
    expect(screen.getByTestId('chmod-octal').textContent).toBe('744')
    expect(screen.getByTestId('chmod-symbolic').textContent).toBe('rwxr--r--')
    expect(screen.getByTestId('chmod-cmd-octal').textContent).toBe('chmod 744 file.sh')
  })

  it('parses a typed symbolic mode with special bits', () => {
    render(<ChmodPage />)
    fireEvent.change(screen.getByTestId('chmod-input'), { target: { value: 'drwxrwxrwt' } })
    expect(screen.getByTestId('chmod-octal').textContent).toBe('1777')
    expect(screen.getByTestId('chmod-sticky').checked).toBe(true)
    expect(screen.getByTestId('chmod-cmd-symbolic').textContent).toBe('chmod u=rwx,g=rwx,o=rwx,+t file.sh')
    fireEvent.change(screen.getByTestId('chmod-input'), { target: { value: '999' } })
    expect(screen.getByRole('alert').textContent).toContain('Not a mode')
  })
})
