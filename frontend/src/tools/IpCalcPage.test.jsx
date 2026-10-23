import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import IpCalcPage from './IpCalcPage.jsx'

afterEach(cleanup)

describe('IpCalcPage', () => {
  it('calculates the default /24 and splits it', () => {
    render(<IpCalcPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('IP subnet calculator')
    expect(screen.getByTestId('ip-network-address').textContent).toBe('192.168.1.0')
    expect(screen.getByTestId('ip-usable-hosts').textContent).toBe('254')
    expect(screen.getByTestId('ip-split-table').querySelectorAll('tbody tr')).toHaveLength(4)
  })

  it('follows a netmask, the prefix picker and the membership check', () => {
    render(<IpCalcPage />)
    fireEvent.change(screen.getByTestId('ip-input'), { target: { value: '10.20.30.40 255.255.252.0' } })
    expect(screen.getByTestId('ip-cidr-notation').textContent).toBe('10.20.28.0/22')
    fireEvent.change(screen.getByTestId('ip-prefix'), { target: { value: '30' } })
    expect(screen.getByTestId('ip-usable-host-range').textContent).toBe('10.20.30.41 – 10.20.30.42')
    fireEvent.change(screen.getByTestId('ip-probe'), { target: { value: '10.20.30.43' } })
    expect(screen.getByTestId('ip-probe-result').textContent).toContain('Yes')
    fireEvent.change(screen.getByTestId('ip-input'), { target: { value: '300.1.1.1/8' } })
    expect(screen.getByRole('alert').textContent).toContain('not a valid IPv4')
  })
})
