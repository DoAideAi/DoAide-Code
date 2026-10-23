import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import NginxPage from './NginxPage.jsx'

afterEach(cleanup)

describe('NginxPage', () => {
  it('starts with an HTTPS SPA config and follows the form', () => {
    render(<NginxPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Generate an nginx config')
    expect(screen.getByTestId('nginx-out').textContent).toContain('try_files $uri $uri/ /index.html;')
    fireEvent.change(screen.getByTestId('nginx-domain'), { target: { value: 'myapp.io' } })
    fireEvent.click(screen.getByTestId('nginx-type-proxy'))
    fireEvent.click(screen.getByTestId('nginx-websocket'))
    const out = screen.getByTestId('nginx-out').textContent
    expect(out).toContain('server_name myapp.io;')
    expect(out).toContain('proxy_set_header Upgrade $http_upgrade;')
    expect(screen.getByTestId('nginx-commands').textContent).toContain('certbot certonly --nginx -d myapp.io -d www.myapp.io')
  })

  it('drops TLS when HTTPS is off', () => {
    render(<NginxPage />)
    fireEvent.click(screen.getByTestId('nginx-https'))
    expect(screen.getByTestId('nginx-out').textContent).not.toContain('ssl_certificate')
    expect(screen.queryByTestId('nginx-http2')).toBeNull()
  })
})
