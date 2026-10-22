import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import JwtPage from './JwtPage.jsx'

afterEach(cleanup)

const enc = (obj) => btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const token = (payload) => `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc(payload)}.the-signature`

describe('JwtPage', () => {
  it('decodes a token as you type and shows claims', () => {
    render(<JwtPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Decode a JWT')
    fireEvent.change(screen.getByTestId('jwt-in'), {
      target: { value: token({ sub: 'user-1', iss: 'auth.example.com', exp: Math.floor(Date.now() / 1000) + 3600 }) },
    })
    expect(screen.getByTestId('jwt-payload').textContent).toContain('"sub": "user-1"')
    expect(screen.getByTestId('jwt-header').textContent).toContain('"alg": "HS256"')
    expect(screen.getByTestId('jwt-claims').textContent).toContain('auth.example.com')
    expect(screen.getByTestId('jwt-status').textContent).toMatch(/expires in/i)
  })

  it('flags an expired token', () => {
    render(<JwtPage />)
    fireEvent.change(screen.getByTestId('jwt-in'), {
      target: { value: token({ exp: Math.floor(Date.now() / 1000) - 3600 }) },
    })
    const status = screen.getByTestId('jwt-status')
    expect(status.textContent).toMatch(/Expired/)
    expect(status.className).toContain('red')
  })

  it('explains a malformed token', () => {
    render(<JwtPage />)
    fireEvent.change(screen.getByTestId('jwt-in'), { target: { value: 'not-a-jwt' } })
    expect(screen.getByTestId('jwt-error').textContent).toMatch(/three dot-separated parts/)
  })
})
