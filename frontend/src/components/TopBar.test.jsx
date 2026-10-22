import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TopBar from './TopBar.jsx'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('refresh button', () => {
  it('is an icon shown on phones and desktop alike, with an accessible name', () => {
    render(<TopBar project="alpha" color="green" busy={false} />)
    const button = screen.getByRole('button', { name: 'Refresh' })
    expect(button.querySelector('svg').getAttribute('class')).not.toContain('sm:hidden')
    expect(button.className).not.toContain('hidden')
  })

  it('reloads the page when tapped', () => {
    const reload = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload })
    render(<TopBar project="alpha" color="green" busy={false} />)
    fireEvent.click(screen.getByTestId('refresh'))
    expect(reload).toHaveBeenCalledOnce()
  })
})

describe('theme toggle', () => {
  it('flips dark and light, saves the choice and offers the other mode', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
    render(<TopBar project="alpha" color="green" busy={false} />)
    const toggle = screen.getByTestId('theme-toggle')
    expect(toggle.getAttribute('aria-label')).toBe('Switch to light mode')
    expect(toggle.querySelector('svg').getAttribute('class')).not.toContain('sm:hidden')
    fireEvent.click(toggle)
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(localStorage.getItem('doaide-theme')).toBe('light')
    expect(toggle.getAttribute('aria-label')).toBe('Switch to dark mode')
    fireEvent.click(toggle)
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem('doaide-theme')).toBe('dark')
  })

  it('starts from the saved choice', () => {
    localStorage.setItem('doaide-theme', 'light')
    render(<TopBar project="alpha" color="green" busy={false} />)
    expect(screen.getByTestId('theme-toggle').getAttribute('aria-label')).toBe('Switch to dark mode')
  })
})

describe('project switcher', () => {
  it('is plain text when switching is not possible', () => {
    render(<TopBar project="alpha" color="green" busy={false} />)
    expect(screen.getByTestId('project-pill').tagName).toBe('SPAN')
  })

  it('lists projects and switches to the one picked', async () => {
    const onSwitch = vi.fn()
    const load = vi.fn(() => Promise.resolve({ projects: [{ name: 'alpha' }, { name: 'beta' }], active: 'alpha' }))
    render(<TopBar project="alpha" color="green" busy={false} loadProjects={load} onSwitchProject={onSwitch} />)
    fireEvent.click(screen.getByTestId('project-pill'))
    const beta = await screen.findByRole('button', { name: 'beta' })
    expect(screen.getByRole('option', { selected: true }).textContent).toContain('alpha')
    fireEvent.click(beta)
    expect(onSwitch).toHaveBeenCalledWith('beta')
    expect(screen.queryByTestId('project-menu')).toBeNull()
  })

  it('picking the current project does nothing; Escape closes; empty and failed lists say so', async () => {
    const onSwitch = vi.fn()
    let load = () => Promise.resolve({ projects: [{ name: 'alpha' }] })
    const { rerender } = render(<TopBar project="alpha" color="green" busy={false} loadProjects={load} onSwitchProject={onSwitch} />)
    fireEvent.click(screen.getByTestId('project-pill'))
    fireEvent.click(await screen.findByRole('button', { name: /alpha/ }))
    expect(onSwitch).not.toHaveBeenCalled()
    load = () => Promise.resolve({ projects: [] })
    rerender(<TopBar project={null} color="green" busy={false} loadProjects={load} onSwitchProject={onSwitch} />)
    fireEvent.click(screen.getByTestId('project-pill'))
    expect(await screen.findByText(/No projects yet/)).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByTestId('project-menu')).toBeNull()
    load = () => Promise.reject(new Error('down'))
    rerender(<TopBar project={null} color="green" busy={false} loadProjects={load} onSwitchProject={onSwitch} />)
    fireEvent.click(screen.getByTestId('project-pill'))
    expect(await screen.findByText(/Couldn’t load projects/)).toBeTruthy()
  })
})

describe('phone header', () => {
  it('keeps the secondary buttons out of the phone header and in the More menu', () => {
    const onUsage = vi.fn()
    render(<TopBar project="alpha" color="green" busy={false} onUsage={onUsage} onSettings={() => {}} onSearch={() => {}} />)
    expect(screen.getByTestId('usage-toggle').parentElement.className).toMatch(/^hidden .*sm:flex/)
    expect(screen.getByTestId('more-toggle').parentElement.className).toContain('sm:hidden')
    fireEvent.click(screen.getByTestId('more-toggle'))
    expect([...screen.getByTestId('more-menu').children].map((b) => b.textContent)).toEqual(['Search', 'Usage', 'Settings'])
    fireEvent.click(screen.getByTestId('more-usage'))
    expect(onUsage).toHaveBeenCalledOnce()
    expect(screen.queryByTestId('more-menu')).toBeNull()
  })

  it('Escape closes the menu without reaching the app', () => {
    const appEscape = vi.fn()
    window.addEventListener('keydown', appEscape)
    render(<TopBar project="alpha" color="green" busy={false} onSearch={() => {}} />)
    fireEvent.click(screen.getByTestId('more-toggle'))
    fireEvent.keyDown(document.body, { key: 'Escape' })
    window.removeEventListener('keydown', appEscape)
    expect(screen.queryByTestId('more-menu')).toBeNull()
    expect(appEscape).not.toHaveBeenCalled()
  })

  it('has no More button when there is nothing to put in it', () => {
    render(<TopBar project="alpha" color="green" busy={false} />)
    expect(screen.queryByTestId('more-toggle')).toBeNull()
  })
})
