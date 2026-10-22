import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import GettingStarted, { onboardingSteps, quoteArg } from './GettingStarted.jsx'
import { shortcutHints } from './MessageList.jsx'

beforeEach(() => localStorage.clear())
afterEach(cleanup)

const READY = { any_usable: true, tools: [] }

describe('onboardingSteps', () => {
  it('asks for the laptop only on the hub, and ticks steps off from live state', () => {
    expect(onboardingSteps({ mode: 'local', models: READY, project: 'shop' }).map((s) => s.id)).toEqual(['model', 'project'])
    const hub = onboardingSteps({ mode: 'hub', agentOnline: false, models: null, project: null })
    expect(hub.map((s) => [s.id, s.done])).toEqual([['laptop', false], ['model', false], ['project', false]])
    // Not "checking" models while the laptop that would report them is offline.
    expect(hub[1].checking).toBe(false)
  })
})

describe('GettingStarted', () => {
  it('is gone once everything is done', () => {
    const { container } = render(<GettingStarted models={READY} project="shop" />)
    expect(container.innerHTML).toBe('')
  })

  it('shows what is left, with the action for each step', () => {
    const onSetup = vi.fn()
    const onModels = vi.fn()
    render(<GettingStarted mode="hub" agentOnline models={{ any_usable: false, tools: [] }} onSetup={onSetup} onModels={onModels} />)
    expect(screen.getByTestId('onboarding-laptop').dataset.done).toBe('true')
    expect(screen.getByText(/2 steps left/)).toBeTruthy()
    fireEvent.click(screen.getByText("See what's missing"))
    expect(onModels).toHaveBeenCalled()
  })

  it('adds a project from a pasted path, quoted when it has spaces', () => {
    const onSend = vi.fn(() => true)
    render(<GettingStarted models={READY} onSend={onSend} />)
    fireEvent.change(screen.getByTestId('onboarding-path'), { target: { value: ' ~/code/My App ' } })
    fireEvent.submit(screen.getByTestId('onboarding-path').closest('form'))
    expect(onSend).toHaveBeenCalledWith('/add-project "~/code/My App"')
    expect(screen.getByTestId('onboarding-path').value).toBe('')
  })

  it('offers existing projects to pick', async () => {
    const onSwitch = vi.fn()
    render(<GettingStarted models={READY} onSend={() => true} loadProjects={async () => ({ projects: [{ name: 'shop' }] })} onSwitchProject={onSwitch} />)
    fireEvent.click(await screen.findByRole('button', { name: 'shop' }))
    expect(onSwitch).toHaveBeenCalledWith('shop')
  })

  it('stays hidden once dismissed', () => {
    const { unmount } = render(<GettingStarted models={null} />)
    fireEvent.click(screen.getByTestId('onboarding-hide'))
    expect(screen.queryByTestId('getting-started')).toBeNull()
    unmount()
    render(<GettingStarted models={null} />)
    expect(screen.queryByTestId('getting-started')).toBeNull()
  })
})

describe('helpers', () => {
  it('quotes command arguments only when needed', () => {
    expect(quoteArg('~/code/app')).toBe('~/code/app')
    expect(quoteArg('C:\\My "App"')).toBe('"C:\\\\My \\"App\\""')
  })

  it('shortcut hints follow the chosen keys', () => {
    expect(shortcutHints({ newChat: 'j', clear: null, stop: 'escape' })).toMatch(/J new chat · Esc stop$/)
  })
})
