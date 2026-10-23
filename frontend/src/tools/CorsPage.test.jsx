import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import CorsPage from './CorsPage.jsx'

afterEach(cleanup)

describe('CorsPage', () => {
  it('explains why the sample request is blocked, then passes once fixed', () => {
    render(<CorsPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Test and fix CORS headers')
    expect(screen.getByTestId('cors-verdict').textContent).toMatch(/Blocked/)
    expect(screen.getByTestId('cors-preflight-reason').textContent).toMatch(/authorization header is not CORS-safelisted/)
    expect(screen.getByTestId('cors-steps').textContent).toMatch(/authorization is not allowed/)
    fireEvent.change(screen.getByTestId('cors-preflight'), {
      target: { value: 'Access-Control-Allow-Origin: http://localhost:5173\nAccess-Control-Allow-Headers: Content-Type, Authorization' },
    })
    expect(screen.getByTestId('cors-verdict').textContent).toMatch(/Allowed/)
  })

  it('generates configs per server', () => {
    render(<CorsPage />)
    expect(screen.getByTestId('cors-config').textContent).toContain('"https://app.example.com" $http_origin;')
    fireEvent.click(screen.getByTestId('cors-server-FastAPI'))
    expect(screen.getByTestId('cors-config').textContent).toContain('allow_origins=["http://localhost:5173", "https://app.example.com"]')
  })
})
