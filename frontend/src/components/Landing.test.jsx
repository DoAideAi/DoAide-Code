import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import Landing from './Landing.jsx'

afterEach(cleanup)

describe('Landing', () => {
  it('explains the product to signed-out visitors', () => {
    render(<Landing clientId="" onCredential={() => {}} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/free models first/i)
    expect(screen.getByText('Claude only when needed')).toBeTruthy()
    expect(screen.getByText('Get started in three steps')).toBeTruthy()
  })

  it('shows sign-in errors', () => {
    render(<Landing clientId="" onCredential={() => {}} error="Sign-in was rejected for this account." />)
    expect(screen.getByText('Sign-in was rejected for this account.')).toBeTruthy()
  })
})
